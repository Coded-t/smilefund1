const axios = require("axios");
const crypto = require("crypto");
const User = require("../models/User");
const Transaction = require("../models/Transaction"); // YOU MUST CREATE THIS MODEL
const { createInternalNotification } = require("./notificationController");

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

/* =====================================================
   INITIALIZE TRANSACTION (CARD OR BANK TRANSFER)
===================================================== */
exports.initializeTransaction = async (req, res) => {
    try {
        const { amount, email, metadata, paymentMethod } = req.body;

        const amountInKobo = amount * 100;

        const response = await axios.post(
            "https://api.paystack.co/transaction/initialize",
            {
                amount: amountInKobo,
                email,
                metadata,
                channels:
                    paymentMethod === "bank_transfer"
                        ? ["bank_transfer"]
                        : ["card"],
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET}`,
                    "Content-Type": "application/json",
                },
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error("Paystack init error:", error.response?.data || error.message);

        const paystackError = error.response?.data?.message || "";
        if (paystackError.includes('IP address is not allowed')) {
            return res.status(500).json({
                message: 'Server IP not whitelisted in Paystack Dashboard.',
                error: 'IP_NOT_WHITELISTED'
            });
        }

        res.status(500).json({
            message: "Failed to initialize transaction",
        });
    }
};

/* =====================================================
   VERIFY TRANSACTION (OPTIONAL MANUAL CHECK)
===================================================== */
exports.verifyTransaction = async (req, res) => {
    try {
        const { reference } = req.params;

        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET}`,
                },
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error("Verify error:", error.response?.data || error.message);
        res.status(500).json({ message: "Verification failed" });
    }
};

/* =====================================================
   DEDICATED VIRTUAL ACCOUNT (BANK TRANSFER)
===================================================== */
exports.getOrCreateDedicatedAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.dedicatedAccount && user.dedicatedAccount.accountNumber) {
            return res.json({ status: true, data: user.dedicatedAccount });
        }

        // 1. Create Paystack Customer if not exists
        let customerCode = user.dedicatedAccount?.customerCode;
        if (!customerCode) {
            try {
                const customerResponse = await axios.post(
                    "https://api.paystack.co/customer",
                    {
                        email: user.email,
                        first_name: user.name.split(" ")[0],
                        last_name: user.name.split(" ")[1] || "User",
                        phone: user.phone || "",
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${PAYSTACK_SECRET}`,
                            "Content-Type": "application/json",
                        },
                    }
                );
                customerCode = customerResponse.data.data.customer_code;
            } catch (err) {
                if (err.response?.data?.message?.includes("already exists")) {
                    const getCust = await axios.get(
                        `https://api.paystack.co/customer/${user.email}`,
                        {
                            headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
                        }
                    );
                    customerCode = getCust.data.data.customer_code;
                } else {
                    throw err;
                }
            }
        }

        // 2. Create Dedicated Account
        const accountResponse = await axios.post(
            "https://api.paystack.co/dedicated_account",
            {
                customer: customerCode,
                preferred_bank: "test-bank", // Replace with valid slug if needed e.g., 'wema-bank'
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const accountData = accountResponse.data.data;

        user.dedicatedAccount = {
            bankName: accountData.bank.name,
            accountNumber: accountData.account_number,
            accountName: accountData.account_name,
            customerCode: customerCode,
            assignmentCode: accountData.assignment.code,
        };

        await user.save();
        res.json({ status: true, data: user.dedicatedAccount });
    } catch (error) {
        console.error("Dedicated account error:", error.response?.data || error.message);
        const paystackError = error.response?.data?.message || "";
        if (paystackError.includes("IP address is not allowed")) {
            return res.status(500).json({
                message: "Server IP not whitelisted in Paystack Dashboard.",
                error: "IP_NOT_WHITELISTED",
                detail: "Please whitelist your server IP in the Paystack Dashboard settings.",
            });
        }
        res.status(500).json({
            message: "Failed to manage dedicated account",
            error: error.response?.data || error.message,
        });
    }
};

/* =====================================================
   WEBHOOK HANDLER (SOURCE OF TRUTH)
===================================================== */
exports.handleWebhook = async (req, res) => {
    try {
        /* 🔐 VERIFY SIGNATURE (RAW BODY CAPTURED IN APP.JS) */
        if (!req.rawBody) {
            console.error("Webhook Error: Raw body missing. Check app.js middleware.");
            return res.status(400).send("Raw body missing");
        }

        const signature = req.headers["x-paystack-signature"];
        const hash = crypto
            .createHmac("sha512", PAYSTACK_SECRET)
            .update(req.rawBody)
            .digest("hex");

        if (hash !== signature) {
            console.warn("Webhook signature mismatch");
            return res.status(401).send("Invalid signature");
        }

        const event = JSON.parse(req.rawBody.toString());
        console.log(`Paystack Webhook received: ${event.event}`);

        /* ==========================================
           HANDLE SUCCESSFUL PAYMENT
        ========================================== */
        if (event.event === "charge.success") {
            const data = event.data;
            const reference = data.reference;
            const amountInNaira = data.amount / 100;
            const email = data.customer.email;
            const metadata = data.metadata || {};

            /* 🛑 PREVENT DOUBLE CREDIT */
            const existingTx = await Transaction.findOne({ reference });
            if (existingTx) {
                return res.sendStatus(200);
            }

            /* 🔍 VERIFY TRANSACTION WITH PAYSTACK */
            const verify = await axios.get(
                `https://api.paystack.co/transaction/verify/${reference}`,
                {
                    headers: {
                        Authorization: `Bearer ${PAYSTACK_SECRET}`,
                    },
                }
            );

            if (verify.data.data.status !== "success") {
                return res.sendStatus(200);
            }

            const user = await User.findOne({ email });
            if (!user) {
                console.warn("User not found:", email);
                return res.sendStatus(200);
            }

            /* 💰 CREDIT USER */
            if (metadata.category === "donation") {
                user.totalDonated = (user.totalDonated || 0) + amountInNaira;
            } else {
                user.totalSaving = (user.totalSaving || 0) + amountInNaira;
            }

            await user.save();

            /* 🧾 SAVE TRANSACTION */
            await Transaction.create({
                user: user._id,
                reference,
                amount: amountInNaira,
                type: metadata.category || "saving",
                status: "success",
            });

            // Notify User
            await createInternalNotification(
                user._id,
                'Payment Received',
                `Your payment of Le ${amountInNaira.toLocaleString()} for ${metadata.category || 'savings'} was successful.`,
                'transaction'
            );

            // Notify Admins
            const admins = await User.find({ roles: 'Admin' });
            for (const admin of admins) {
                await createInternalNotification(
                    admin._id,
                    'New Payment Received',
                    `${user.name} just paid Le ${amountInNaira.toLocaleString()} for ${metadata.category || 'savings'}.`,
                    'transaction'
                );
            }
        }

        /* ==========================================
           HANDLE REFUND
        ========================================== */
        if (event.event === "refund.processed") {
            const data = event.data;
            const reference = data.transaction.reference;
            const amountInNaira = data.amount / 100;
            const email = data.customer.email;

            const tx = await Transaction.findOne({ reference });
            if (!tx) return res.sendStatus(200);

            const user = await User.findOne({ email });
            if (!user) return res.sendStatus(200);

            if (tx.type === "donation") {
                user.totalDonated = Math.max(
                    0,
                    (user.totalDonated || 0) - amountInNaira
                );
            } else {
                user.totalSaving = Math.max(
                    0,
                    (user.totalSaving || 0) - amountInNaira
                );
            }

            tx.status = "refunded";

            await user.save();
            await tx.save();
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("Webhook error:", error);
        res.sendStatus(500);
    }
};

/* =====================================================
   GET TRANSACTION HISTORY
===================================================== */
exports.getTransactionHistory = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user._id || req.user.id })
            .sort({ createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


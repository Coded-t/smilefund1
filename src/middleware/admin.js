const admin = (req, res, next) => {
    if (req.user && req.user.roles.includes('Admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }
};

module.exports = admin;

const Goal = require('../models/Goal');

exports.getGoals = async (req, res) => {
    try {
        const goals = await Goal.find({ user: req.user._id });
        res.json(goals);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createGoal = async (req, res) => {
    try {
        const goal = new Goal({
            ...req.body,
            user: req.user._id
        });
        await goal.save();
        res.status(201).json(goal);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateGoal = async (req, res) => {
    try {
        const goal = await Goal.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            req.body,
            { new: true }
        );
        if (!goal) {
            return res.status(404).json({ message: 'Goal not found' });
        }
        res.json(goal);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getGoalById = async (req, res) => {
    try {
        const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
        if (!goal) {
            return res.status(404).json({ message: 'Goal not found' });
        }
        res.json(goal);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

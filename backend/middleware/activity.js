const User = require('../models/User');

const trackActivity = async (req, res, next) => {
  try {
    const userId = req.get('x-user-id') || req.body?.userId;
    if (userId) {
      // Upsert user record with latest activity + sync name/email from headers
      const update = { lastActive: new Date() };
      const userName = req.get('x-user-name');
      const userEmail = req.get('x-user-email');
      if (userName) update.name = userName;
      if (userEmail) update.email = userEmail;

      await User.findOneAndUpdate(
        { userId },
        { $set: update, $setOnInsert: { createdAt: new Date(), searchCount: 0 } },
        { upsert: true }
      );
    }
  } catch (err) {
    // Don't block the request if tracking fails
    console.error('[ACTIVITY] Tracking error:', err.message);
  }
  next();
};

module.exports = trackActivity;

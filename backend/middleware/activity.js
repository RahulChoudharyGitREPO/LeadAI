const User = require('../models/User');

const trackActivity = (req, res, next) => {
  const userId = req.get('x-user-id') || req.body?.userId;
  if (userId) {
    // Fire-and-forget: don't block the request
    const update = { lastActive: new Date() };
    const userName = req.get('x-user-name');
    const userEmail = req.get('x-user-email');
    if (userName) update.name = userName;
    if (userEmail) update.email = userEmail;

    User.findOneAndUpdate(
      { userId },
      { $set: update, $setOnInsert: { createdAt: new Date(), searchCount: 0 } },
      { upsert: true }
    ).catch(err => console.error('[ACTIVITY] Tracking error:', err.message));
  }
  next();
};

module.exports = trackActivity;

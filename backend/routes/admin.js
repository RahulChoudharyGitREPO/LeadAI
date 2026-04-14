const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Lead = require('../models/Lead');
const ChatSession = require('../models/ChatSession');

// Admin user IDs or emails - comma separated
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

const isAdminUser = (req) => {
  const userId = req.get('x-user-id') || '';
  const userEmail = (req.get('x-user-email') || '').toLowerCase();
  return ADMIN_IDS.includes(userId) || ADMIN_EMAILS.includes(userEmail);
};

const isAdmin = (req, res, next) => {
  if (!isAdminUser(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// GET /api/admin/users — all users with stats
router.get('/users', isAdmin, async (req, res) => {
  try {
    const users = await User.find({}).sort({ lastActive: -1 }).lean();
    const now = Date.now();

    // Enrich each user with lead count and session count
    const enriched = await Promise.all(users.map(async (user) => {
      const [leadCount, sessionCount] = await Promise.all([
        Lead.countDocuments({ userId: user.userId }),
        ChatSession.countDocuments({ userId: user.userId })
      ]);

      const lastActiveMs = new Date(user.lastActive).getTime();
      const diffMins = (now - lastActiveMs) / 60000;

      return {
        ...user,
        leadCount,
        sessionCount,
        isOnline: diffMins < 5,
        lastActiveAgo: diffMins < 1 ? 'Just now'
          : diffMins < 60 ? `${Math.floor(diffMins)}m ago`
          : diffMins < 1440 ? `${Math.floor(diffMins / 60)}h ago`
          : `${Math.floor(diffMins / 1440)}d ago`
      };
    }));

    // Summary stats
    const totalUsers = enriched.length;
    const activeNow = enriched.filter(u => u.isOnline).length;
    const totalSearches = enriched.reduce((sum, u) => sum + (u.searchCount || 0), 0);
    const totalLeads = enriched.reduce((sum, u) => sum + u.leadCount, 0);

    res.json({
      summary: { totalUsers, activeNow, totalSearches, totalLeads },
      users: enriched
    });
  } catch (error) {
    console.error('[ADMIN] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch admin data' });
  }
});

// GET /api/admin/check — check if current user is admin
router.get('/check', (req, res) => {
  res.json({ isAdmin: isAdminUser(req) });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Lead = require('../models/Lead');
const ChatSession = require('../models/ChatSession');
const SupportMessage = require('../models/SupportMessage');

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

    // Revenue stats
    const PLAN_PRICES = { streamMini: 199, stream: 349, streamMax: 1000 };
    const now2 = new Date();
    const activeSubs = enriched.filter(u => u.plan && u.plan !== 'free' && u.plan !== 'grandfathered' && u.subscriptionEnd && new Date(u.subscriptionEnd) > now2);
    const planBreakdown = { streamMini: 0, stream: 0, streamMax: 0, grandfathered: 0, free: 0 };
    const PAID_PLANS = ['streamMini', 'stream', 'streamMax'];
    enriched.forEach(u => {
      const isPaid = PAID_PLANS.includes(u.plan);
      const isActive = isPaid && u.subscriptionEnd && new Date(u.subscriptionEnd) > now2;
      const effectivePlan = isPaid && !isActive ? 'free' : u.plan;
      if (planBreakdown[effectivePlan] !== undefined) planBreakdown[effectivePlan]++;
    });
    const mrr = activeSubs.reduce((sum, u) => sum + (PLAN_PRICES[u.plan] || 0), 0);
    const totalRevenue = enriched.reduce((sum, u) => {
      if (!u.razorpayPaymentId) return sum;
      // Use the plan they paid for (current plan if still active, otherwise still count the payment)
      const paidPlan = PAID_PLANS.includes(u.plan) ? u.plan : null;
      return sum + (paidPlan ? (PLAN_PRICES[paidPlan] || 0) : 0);
    }, 0);

    res.json({
      summary: { totalUsers, activeNow, totalSearches, totalLeads },
      revenue: { mrr, totalRevenue, activeSubscribers: activeSubs.length, planBreakdown },
      users: enriched
    });
  } catch (error) {
    console.error('[ADMIN] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch admin data' });
  }
});

// GET /api/admin/support — all support messages newest first
router.get('/support', isAdmin, async (req, res) => {
  try {
    const messages = await SupportMessage.find({}).sort({ createdAt: -1 }).lean();
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch support messages' });
  }
});

// PATCH /api/admin/support/:id — mark open/resolved
router.patch('/support/:id', isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const msg = await SupportMessage.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// GET /api/admin/check — check if current user is admin
router.get('/check', (req, res) => {
  res.json({ isAdmin: isAdminUser(req) });
});

module.exports = router;

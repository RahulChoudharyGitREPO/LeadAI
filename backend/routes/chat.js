const express = require('express');
const router = express.Router();
const { processChat, saveLead, generatePitch } = require('../controllers/chatController');
const ChatSession = require('../models/ChatSession');

const getUserId = (req) => req.get('x-user-id') || req.body.userId;

// Existing chat routes
router.post('/', processChat);
router.post('/save-lead', saveLead);
router.post('/generate-pitch', generatePitch);

// === CHAT SESSION ROUTES ===

// GET all sessions for user (sidebar list)
router.get('/sessions', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'User required' });

    const sessions = await ChatSession.find({ userId })
      .sort({ updatedAt: -1 })
      .select('title updatedAt createdAt')
      .limit(50)
      .lean();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET single session with full messages
router.get('/sessions/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'User required' });

    const session = await ChatSession.findOne({ _id: req.params.id, userId }).lean();
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// POST create new session
router.post('/sessions', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'User required' });

    const session = new ChatSession({
      userId,
      title: req.body.title || 'New Chat',
      messages: req.body.messages || []
    });
    await session.save();
    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create session' });
  }
});

// PATCH update session (save messages / rename)
router.patch('/sessions/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'User required' });

    const updates = { updatedAt: new Date() };
    if (req.body.messages) updates.messages = req.body.messages;
    if (req.body.title) updates.title = req.body.title;

    const session = await ChatSession.findOneAndUpdate(
      { _id: req.params.id, userId },
      updates,
      { new: true }
    );
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update session' });
  }
});

// DELETE session
router.delete('/sessions/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'User required' });

    await ChatSession.findOneAndDelete({ _id: req.params.id, userId });
    res.json({ message: 'Session deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

module.exports = router;

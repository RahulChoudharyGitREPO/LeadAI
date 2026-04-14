const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');

const getUserId = (req) => req.get('x-user-id') || req.body.userId;

router.use((req, res, next) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'User is required' });
  }
  req.userId = userId;
  next();
});

// GET lead statistics for dashboard
router.get('/stats', async (req, res) => {
  try {
    const ownerFilter = { userId: req.userId };
    const totalLeads = await Lead.countDocuments(ownerFilter);
    
    // Aggregate status counts
    const statusAgg = await Lead.aggregate([
      { $match: ownerFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const statusCounts = statusAgg.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {});

    // Aggregate score counts
    const scoreAgg = await Lead.aggregate([
      { $match: ownerFilter },
      { $group: { _id: "$leadScore", count: { $sum: 1 } } }
    ]);
    const scoreCounts = scoreAgg.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {});

    // Aggregate source counts
    const sourceAgg = await Lead.aggregate([
      { $match: ownerFilter },
      { $group: { _id: "$source", count: { $sum: 1 } } }
    ]);
    const sourceCounts = sourceAgg.reduce((acc, curr) => ({ ...acc, [curr._id || 'manual']: curr.count }), {});

    res.json({
      total: totalLeads,
      status: statusCounts,
      scores: scoreCounts,
      sources: sourceCounts
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET all leads with advanced filtering + PAGINATION
router.get('/', async (req, res) => {
  try {
    const { status, query, score, page = 1, limit = 50 } = req.query;
    let filter = { userId: req.userId };

    if (status && status !== 'all') filter.status = status;
    if (score && score !== 'all') filter.leadScore = score;
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
        { service: { $regex: query, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .sort({ aiScore: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Lead.countDocuments(filter)
    ]);

    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// POST new lead (with duplicate check)
router.post('/', async (req, res) => {
  try {
    // Check for duplicates by name + userId (case insensitive)
    const leadName = (req.body.name || '').trim();
    if (leadName) {
      const existing = await Lead.findOne({ 
        userId: req.userId, 
        name: { $regex: new RegExp('^' + leadName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
      });
      if (existing) {
        return res.status(409).json({ error: 'Lead already exists', lead: existing });
      }
    }

    const lead = new Lead({ ...req.body, userId: req.userId });
    await lead.save();

    // Auto-cleanup: keep last 5000 leads
    await Lead.cleanupOldLeads(req.userId);

    res.status(201).json(lead);
  } catch (error) {
    console.error('[LEADS POST] Error:', error.message, error.errors ? JSON.stringify(error.errors) : '');
    res.status(400).json({ error: 'Failed to create lead', details: error.message });
  }
});

// POST bulk leads (with dedup + cleanup)
router.post('/bulk', async (req, res) => {
  try {
    const incoming = req.body.map(lead => ({ ...lead, userId: req.userId }));
    
    // Filter out duplicates against existing DB entries
    const existingLeads = await Lead.find({ userId: req.userId })
      .select('name')
      .lean();
    const existingNames = new Set(existingLeads.map(e => e.name?.toLowerCase()));
    
    const unique = incoming.filter(l => l.name && !existingNames.has(l.name.toLowerCase()));
    
    if (unique.length === 0) {
      return res.json({ message: 'All leads already exist', inserted: 0 });
    }

    const leads = await Lead.insertMany(unique);
    
    // Auto-cleanup
    await Lead.cleanupOldLeads(req.userId);
    
    res.status(201).json(leads);
  } catch (error) {
    console.error('[BULK] Error:', error.message);
    res.status(400).json({ error: 'Failed to create bulk leads' });
  }
});

// PATCH update lead
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const lead = await Lead.findOneAndUpdate({ _id: id, userId: req.userId }, {
      ...updates, 
      lastActivity: new Date() 
    }, { new: true });
    
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update lead' });
  }
});

// DELETE lead
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedLead = await Lead.findOneAndDelete({ _id: id, userId: req.userId });
    
    if (!deletedLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// POST follow-up simulation
router.post('/followup/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findOne({ _id: id, userId: req.userId });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    lead.notes.push({ text: `Follow-up sent on ${new Date().toLocaleString()}` });
    lead.lastActivity = new Date();
    await lead.save();

    res.json({ message: 'Follow-up simulated successfully', lead });
  } catch (error) {
    res.status(500).json({ error: 'Failed to simulate follow-up' });
  }
});

module.exports = router;

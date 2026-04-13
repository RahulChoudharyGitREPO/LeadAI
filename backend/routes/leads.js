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

// GET all leads with advanced filtering
router.get('/', async (req, res) => {
  try {
    const { status, query, score } = req.query;
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

    const leads = await Lead.find(filter).sort({ createdAt: -1 });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// POST new lead
router.post('/', async (req, res) => {
  try {
    const lead = new Lead({ ...req.body, userId: req.userId });
    await lead.save();
    res.status(201).json(lead);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create lead' });
  }
});

// POST bulk leads (for AI discovery)
router.post('/bulk', async (req, res) => {
  try {
    const leads = await Lead.insertMany(req.body.map((lead) => ({ ...lead, userId: req.userId })));
    res.status(201).json(leads);
  } catch (error) {
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

const express = require('express');
const router = express.Router();
const SearchTemplate = require('../models/SearchTemplate');
const { searchWeb } = require('../services/search.service');
const { parseSearchQuery } = require('../services/queryParser.service');

const getUserId = (req) => req.get('x-user-id') || req.body.userId;

router.use((req, res, next) => {
  req.userId = getUserId(req);
  if (!req.userId) return res.status(401).json({ error: 'User required' });
  next();
});

// GET all templates for user
router.get('/', async (req, res) => {
  try {
    const templates = await SearchTemplate.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
    res.json(templates);
  } catch {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST create template
router.post('/', async (req, res) => {
  try {
    const { name, niche, location } = req.body;
    if (!niche || !location) return res.status(400).json({ error: 'niche and location are required' });

    const template = await SearchTemplate.create({
      userId: req.userId,
      name: name || `${niche} in ${location}`,
      niche,
      location,
    });
    res.status(201).json(template);
  } catch {
    res.status(400).json({ error: 'Failed to create template' });
  }
});

// DELETE template
router.delete('/:id', async (req, res) => {
  try {
    await SearchTemplate.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// POST re-run a template (returns result count + new count)
router.post('/:id/run', async (req, res) => {
  try {
    const template = await SearchTemplate.findOne({ _id: req.params.id, userId: req.userId });
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const parsed = await parseSearchQuery(`${template.niche} in ${template.location}`);
    const searchResults = await searchWeb(parsed.niche || template.niche, parsed.location || template.location);
    const currentCount = searchResults.results?.length || 0;
    const newSinceLastRun = template.lastResultCount ? Math.max(0, currentCount - template.lastResultCount) : 0;

    await SearchTemplate.findByIdAndUpdate(template._id, {
      lastRunAt: new Date(),
      lastResultCount: currentCount,
      newSinceLastRun,
    });

    res.json({ results: searchResults.results || [], currentCount, newSinceLastRun, template: template.name });
  } catch (err) {
    console.error('[TEMPLATE RUN]', err.message);
    res.status(500).json({ error: 'Failed to run template' });
  }
});

module.exports = router;

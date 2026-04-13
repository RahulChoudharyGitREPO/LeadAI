const express = require('express');
const router = express.Router();
const { processChat, saveLead, generatePitch } = require('../controllers/chatController');

router.post('/', processChat);
router.post('/save-lead', saveLead);
router.post('/generate-pitch', generatePitch);

module.exports = router;

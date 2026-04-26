const rateLimit = require('express-rate-limit');

// Per-user rate limit on discovery — max 5 requests per minute
const discoveryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.get('x-user-id') || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: 'RATE_LIMITED',
      message: 'Too many searches in a short time. Please wait a moment and try again.',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { discoveryLimiter };

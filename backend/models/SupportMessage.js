const mongoose = require('mongoose');

const SupportMessageSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  name: String,
  email: String,
  subject: String,
  message: { type: String, required: true },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SupportMessage', SupportMessageSchema);

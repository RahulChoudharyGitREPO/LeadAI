const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  email: String,
  name: String,
  searchCount: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  plan: { type: String, enum: ['free', 'streamMini', 'stream', 'streamMax', 'grandfathered'], default: 'free' },
  searchLimit: { type: Number, default: 2 },
  searchesUsed: { type: Number, default: 0 },
  subscriptionStart: { type: Date },
  subscriptionEnd: { type: Date },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  pendingPlan: { type: String },
  pendingOrderCreatedAt: { type: Date }
});

module.exports = mongoose.model('User', UserSchema);

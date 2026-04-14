const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  service: { type: String },
  date: { type: String },
  location: { type: String },
  phone: { type: String, default: 'N/A' },
  email: { type: String, default: '' },
  website: { type: String, default: '' },
  linkedIn: { type: String, default: '' },
  source: { type: String, default: 'manual' },
  status: { 
    type: String, 
    enum: ['new', 'contacted', 'booked', 'closed'], 
    default: 'new' 
  },
  leadScore: { 
    type: String, 
    enum: ['Hot', 'Warm', 'Cold'], 
    default: 'Warm' 
  },
  aiScore: { type: Number, min: 1, max: 10 },
  intentSignals: [String],
  opportunityLevel: { 
    type: String, 
    enum: ['high', 'medium', 'low'], 
    default: 'medium' 
  },
  notes: [{ 
    text: String, 
    createdAt: { type: Date, default: Date.now } 
  }],
  lastActivity: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lead', LeadSchema);

const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  service: { type: String },
  date: { type: String },
  location: { type: String },
  phone: { type: String, default: 'N/A' },
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
  notes: [{ 
    text: String, 
    createdAt: { type: Date, default: Date.now } 
  }],
  lastActivity: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lead', LeadSchema);

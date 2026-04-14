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
  aiScore: { type: Number, default: null },
  intentSignals: [String],
  opportunityLevel: { 
    type: String, 
    enum: ['high', 'medium', 'low'], 
    default: 'medium' 
  },
  reason: { type: String, default: '' },
  description: { type: String, default: '' },
  url: { type: String, default: '' },
  notes: [{ 
    text: String, 
    createdAt: { type: Date, default: Date.now } 
  }],
  lastActivity: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// === INDEXES (fast search + filtering) ===
LeadSchema.index({ name: 1 });
LeadSchema.index({ phone: 1 });
LeadSchema.index({ aiScore: -1 });
LeadSchema.index({ userId: 1, createdAt: -1 });
LeadSchema.index({ userId: 1, status: 1 });
LeadSchema.index({ userId: 1, leadScore: 1 });
LeadSchema.index({ userId: 1, name: 1, phone: 1 }, { unique: false });

// === PRE-SAVE: trim data size ===
LeadSchema.pre('save', function () {
  if (this.description && this.description.length > 200) {
    this.description = this.description.slice(0, 200);
  }
  if (this.notes && this.notes.length > 0) {
    this.notes.forEach(note => {
      if (note.text && note.text.length > 300) {
        note.text = note.text.slice(0, 300);
      }
    });
  }
});

// === STATIC: cleanup old leads (keep last 5000 per user) ===
LeadSchema.statics.cleanupOldLeads = async function (userId, maxLeads = 5000) {
  const count = await this.countDocuments({ userId });
  if (count <= maxLeads) return 0;

  const cutoff = await this.find({ userId })
    .sort({ createdAt: -1 })
    .skip(maxLeads)
    .limit(1)
    .select('createdAt')
    .lean();

  if (cutoff.length === 0) return 0;

  const result = await this.deleteMany({ 
    userId, 
    createdAt: { $lte: cutoff[0].createdAt } 
  });
  return result.deletedCount;
};

module.exports = mongoose.model('Lead', LeadSchema);

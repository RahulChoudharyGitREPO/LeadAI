const mongoose = require('mongoose');

const SearchTemplateSchema = new mongoose.Schema({
  userId:          { type: String, required: true, index: true },
  name:            { type: String, required: true },
  niche:           { type: String, required: true },
  location:        { type: String, required: true },
  lastRunAt:       { type: Date },
  lastResultCount: { type: Number, default: 0 },
  newSinceLastRun: { type: Number, default: 0 },
  createdAt:       { type: Date, default: Date.now },
});

module.exports = mongoose.model('SearchTemplate', SearchTemplateSchema);

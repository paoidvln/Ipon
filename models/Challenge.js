const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  saved: { type: Boolean, default: false },
  savedAt: { type: Date, default: null }
}, { _id: false });

const challengeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['week52', 'env100', 'custom'], required: true },
  goal: { type: Number, required: true },
  entries: { type: [entrySchema], required: true },
  createdAt: { type: Date, default: Date.now }
});

// One active challenge per type per user. Resetting/rebuilding replaces this document.
challengeSchema.index({ user: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Challenge', challengeSchema);

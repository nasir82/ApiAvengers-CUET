const mongoose = require('mongoose');

const outboxSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    index: true
  },
  aggregateId: {
    type: String,
    required: true,
    index: true
  },
  aggregateType: {
    type: String,
    default: 'Pledge'
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'PUBLISHED', 'FAILED'],
    default: 'PENDING',
    index: true
  },
  publishedAt: {
    type: Date
  },
  retryCount: {
    type: Number,
    default: 0
  },
  lastError: {
    type: String
  }
}, {
  timestamps: true
});

// Index for polling
outboxSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('Outbox', outboxSchema);


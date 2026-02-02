const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema({
  provider: {
    type: String,
    required: true,
    index: true
  },
  eventId: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  processed: {
    type: Boolean,
    default: false,
    index: true
  },
  paymentId: {
    type: String,
    index: true
  },
  processedAt: {
    type: Date
  },
  error: {
    type: String
  }
}, {
  timestamps: true
});

// Unique index on provider + eventId for idempotency
webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);


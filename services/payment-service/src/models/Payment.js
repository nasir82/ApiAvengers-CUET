const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  pledgeId: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['INITIATED', 'AUTHORIZED', 'CAPTURED', 'COMPLETED', 'FAILED'],
    default: 'INITIATED',
    index: true
  },
  paymentProvider: {
    type: String,
    enum: ['STRIPE', 'PAYPAL', 'RAZORPAY'],
    required: true
  },
  providerPaymentId: {
    type: String,
    index: true
  },
  idempotencyKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  stateHistory: [{
    fromState: String,
    toState: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);


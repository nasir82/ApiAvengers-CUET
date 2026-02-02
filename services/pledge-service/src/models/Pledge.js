const mongoose = require('mongoose');

const pledgeSchema = new mongoose.Schema({
  campaignId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'FAILED'],
    default: 'PENDING',
    index: true
  },
  idempotencyKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  message: {
    type: String
  },
  anonymous: {
    type: Boolean,
    default: false
  },
  paymentId: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Pledge', pledgeSchema);


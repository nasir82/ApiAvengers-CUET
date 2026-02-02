const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  goalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
    default: 'ACTIVE',
    index: true
  },
  createdBy: {
    type: String,
    required: true,
    index: true
  },
  imageUrl: {
    type: String
  },
  category: {
    type: String,
    enum: ['MEDICAL', 'EDUCATION', 'DISASTER', 'OTHER'],
    default: 'OTHER',
    index: true
  },
  deadline: {
    type: Date
  },
  tags: [{
    type: String
  }]
}, {
  timestamps: true
});

// Indexes
campaignSchema.index({ status: 1, createdAt: -1 });
campaignSchema.index({ createdBy: 1 });
campaignSchema.index({ category: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);


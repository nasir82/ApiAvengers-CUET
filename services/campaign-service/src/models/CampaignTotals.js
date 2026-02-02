const mongoose = require('mongoose');

// CQRS Read Model - Pre-calculated totals for fast reads
const campaignTotalsSchema = new mongoose.Schema({
  campaignId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  totalRaised: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPledges: {
    type: Number,
    default: 0,
    min: 0
  },
  averagePledge: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CampaignTotals', campaignTotalsSchema);


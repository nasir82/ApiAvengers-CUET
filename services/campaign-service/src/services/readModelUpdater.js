const Campaign = require('../models/Campaign');
const CampaignTotals = require('../models/CampaignTotals');
const logger = require('../utils/logger');

class ReadModelUpdater {
  /**
   * Update read model when pledge is created/confirmed
   */
  async updateOnPledgeCreated(payload) {
    try {
      const { campaignId, amount } = payload;
      
      // Update campaign currentAmount
      await Campaign.findByIdAndUpdate(
        campaignId,
        { $inc: { currentAmount: amount } },
        { new: true }
      );

      // Update or create totals read model
      await CampaignTotals.findOneAndUpdate(
        { campaignId },
        {
          $inc: {
            totalRaised: amount,
            totalPledges: 1
          },
          $set: {
            lastUpdated: new Date()
          }
        },
        {
          upsert: true,
          new: true
        }
      );

      // Recalculate average
      await this.recalculateAverage(campaignId);

      logger.info('Read model updated on pledge created', { campaignId, amount });
    } catch (error) {
      logger.error('Read model update failed', { error: error.message, payload });
      throw error;
    }
  }

  /**
   * Update read model when payment is completed
   */
  async updateOnPaymentCompleted(payload) {
    try {
      const { pledgeId, campaignId, amount } = payload;
      
      // Update pledge status in campaign (if needed)
      // For now, we just ensure totals are correct
      await this.recalculateTotals(campaignId);

      logger.info('Read model updated on payment completed', { campaignId, pledgeId });
    } catch (error) {
      logger.error('Read model update failed', { error: error.message, payload });
      throw error;
    }
  }

  /**
   * Recalculate totals for a campaign
   */
  async recalculateTotals(campaignId) {
    try {
      // This would typically query the pledge service or event store
      // For now, we'll just recalculate average from existing totals
      await this.recalculateAverage(campaignId);
    } catch (error) {
      logger.error('Recalculate totals failed', { error: error.message, campaignId });
    }
  }

  /**
   * Recalculate average pledge amount
   */
  async recalculateAverage(campaignId) {
    try {
      const totals = await CampaignTotals.findOne({ campaignId });
      if (totals && totals.totalPledges > 0) {
        totals.averagePledge = totals.totalRaised / totals.totalPledges;
        await totals.save();
      }
    } catch (error) {
      logger.error('Recalculate average failed', { error: error.message, campaignId });
    }
  }
}

module.exports = new ReadModelUpdater();


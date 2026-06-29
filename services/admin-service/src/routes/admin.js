const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const logger = require('../utils/logger');

// All services share one MongoDB instance (separate databases). The admin
// service reads those databases over its existing connection to build live
// platform statistics.
router.get('/stats', async (req, res) => {
  try {
    const conn = mongoose.connection;
    const campaigns = conn.useDb('campaigns', { useCache: true }).collection('campaigns');
    const pledges = conn.useDb('pledges', { useCache: true }).collection('pledges');
    const users = conn.useDb('users', { useCache: true }).collection('users');

    const [
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      totalUsers,
      totalPledges,
      donationAgg
    ] = await Promise.all([
      campaigns.countDocuments({}),
      campaigns.countDocuments({ status: 'ACTIVE' }),
      campaigns.countDocuments({ status: 'COMPLETED' }),
      users.countDocuments({}),
      pledges.countDocuments({}),
      pledges.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]).toArray()
    ]);

    const totalDonations = donationAgg[0]?.total || 0;

    res.json({
      success: true,
      data: {
        totalCampaigns,
        activeCampaigns,
        completedCampaigns,
        totalUsers,
        totalPledges,
        totalDonations
      }
    });
  } catch (error) {
    logger.error('Failed to build admin stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();

router.get('/stats', async (req, res) => {
  res.json({
    success: true,
    data: {
      totalCampaigns: 0,
      totalPledges: 0,
      totalAmount: 0,
      activeUsers: 0
    }
  });
});

module.exports = router;


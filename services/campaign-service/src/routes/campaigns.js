const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const CampaignTotals = require('../models/CampaignTotals');
const logger = require('../utils/logger');

// Create campaign
router.post('/', async (req, res) => {
  try {
    const { title, description, goalAmount, createdBy, imageUrl, category, deadline, tags } = req.body;

    if (!title || !description || !goalAmount || !createdBy) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'title, description, goalAmount, and createdBy are required'
        }
      });
    }

    const campaign = new Campaign({
      title,
      description,
      goalAmount,
      createdBy,
      imageUrl: imageUrl || '',
      category: category || 'OTHER',
      deadline: deadline || null,
      tags: tags || [],
      currentAmount: 0,
      status: 'ACTIVE'
    });

    await campaign.save();

    // Initialize read model
    const totals = new CampaignTotals({
      campaignId: campaign._id.toString(),
      totalRaised: 0,
      totalPledges: 0,
      averagePledge: 0
    });
    await totals.save();

    logger.info('Campaign created', { campaignId: campaign._id });

    res.status(201).json({
      success: true,
      data: { campaign }
    });
  } catch (error) {
    logger.error('Campaign creation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

// Get campaign by ID (with totals from read model)
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Campaign not found'
        }
      });
    }

    // Get totals from read model
    const totals = await CampaignTotals.findOne({ campaignId: req.params.id });

    res.json({
      success: true,
      data: {
        campaign,
        totals: totals || {
          totalRaised: 0,
          totalPledges: 0,
          averagePledge: 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

// List campaigns (with pagination)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) {
      query.status = status;
    }
    if (category) {
      query.category = category;
    }

    const campaigns = await Campaign.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Campaign.countDocuments(query);

    // Get totals for each campaign
    const campaignsWithTotals = await Promise.all(
      campaigns.map(async (campaign) => {
        const totals = await CampaignTotals.findOne({ campaignId: campaign._id.toString() });
        return {
          ...campaign.toObject(),
          totals: totals || {
            totalRaised: 0,
            totalPledges: 0,
            averagePledge: 0
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        campaigns: campaignsWithTotals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

module.exports = router;


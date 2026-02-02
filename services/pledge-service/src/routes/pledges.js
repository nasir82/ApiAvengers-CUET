const express = require('express');
const router = express.Router();
const Pledge = require('../models/Pledge');
const Outbox = require('../models/Outbox');
const idempotencyService = require('../services/idempotencyService');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

// Create pledge with Transactional Outbox
router.post('/', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { campaignId, amount, idempotencyKey, userId, anonymous, message } = req.body;

    // Validation
    if (!campaignId || !amount || !idempotencyKey) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'campaignId, amount, and idempotencyKey are required'
        }
      });
    }

    // Check idempotency (Redis first, then MongoDB)
    const cached = await idempotencyService.checkIdempotency(idempotencyKey);
    if (cached) {
      await session.abortTransaction();
      return res.json({
        success: true,
        data: {
          ...cached,
          message: 'Duplicate request - returning existing pledge'
        }
      });
    }

    // Check if pledge already exists in MongoDB
    const existing = await Pledge.findOne({ idempotencyKey }).session(session);
    if (existing) {
      await idempotencyService.storeIdempotency(idempotencyKey, existing.toObject());
      await session.abortTransaction();
      return res.json({
        success: true,
        data: {
          ...existing.toObject(),
          message: 'Duplicate request - returning existing pledge'
        }
      });
    }

    // Create pledge
    const pledge = new Pledge({
      campaignId,
      userId: userId || null,
      amount,
      idempotencyKey,
      message: message || '',
      anonymous: anonymous || false,
      status: 'PENDING'
    });

    await pledge.save({ session });

    // Create outbox event in SAME transaction
    const outboxEvent = new Outbox({
      eventType: 'pledge.created',
      aggregateId: pledge._id.toString(),
      aggregateType: 'Pledge',
      payload: {
        pledgeId: pledge._id.toString(),
        campaignId,
        userId: userId || null,
        amount,
        status: 'PENDING'
      },
      status: 'PENDING'
    });

    await outboxEvent.save({ session });

    // Commit transaction (atomic)
    await session.commitTransaction();

    // Store in Redis for fast lookup
    const pledgeObj = pledge.toObject();
    await idempotencyService.storeIdempotency(idempotencyKey, pledgeObj);

    logger.info('Pledge created with outbox event', {
      pledgeId: pledge._id,
      campaignId,
      idempotencyKey
    });

    res.status(201).json({
      success: true,
      data: { pledge: pledgeObj }
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error('Pledge creation failed', { error: error.message });
    
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'Idempotency key already exists'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  } finally {
    session.endSession();
  }
});

// Get pledge by ID
router.get('/:id', async (req, res) => {
  try {
    const pledge = await Pledge.findById(req.params.id);
    
    if (!pledge) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Pledge not found'
        }
      });
    }

    res.json({
      success: true,
      data: { pledge }
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

// Get user's pledges
router.get('/user/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    const query = { userId: req.params.userId };
    if (status) {
      query.status = status;
    }

    const pledges = await Pledge.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Pledge.countDocuments(query);

    res.json({
      success: true,
      data: {
        pledges,
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


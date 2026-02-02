const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const StateMachine = require('../services/stateMachine');
const idempotencyService = require('../services/idempotencyService');
const eventPublisher = require('../services/eventPublisher');
const logger = require('../utils/logger');

// Process payment
router.post('/', async (req, res) => {
  try {
    const { pledgeId, paymentMethod, paymentToken, idempotencyKey, amount, currency = 'USD' } = req.body;

    if (!pledgeId || !idempotencyKey || !amount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'pledgeId, idempotencyKey, and amount are required'
        }
      });
    }

    // Check idempotency
    const cached = await idempotencyService.checkWebhookIdempotency('internal', idempotencyKey);
    if (cached) {
      return res.json({
        success: true,
        data: {
          ...cached,
          message: 'Duplicate request - returning existing payment'
        }
      });
    }

    // Create payment
    const payment = new Payment({
      pledgeId,
      amount,
      currency,
      paymentProvider: paymentMethod || 'STRIPE',
      idempotencyKey,
      status: 'INITIATED',
      stateHistory: [{
        fromState: null,
        toState: 'INITIATED',
        timestamp: new Date(),
        reason: 'Payment initiated'
      }]
    });

    await payment.save();

    // Update to AUTHORIZED (simulate payment processing)
    await updatePaymentState(payment._id.toString(), 'AUTHORIZED', 'Payment authorized');

    // Store idempotency
    const paymentObj = payment.toObject();
    await idempotencyService.storeWebhookIdempotency('internal', idempotencyKey, paymentObj);

    // Publish event
    await eventPublisher.publish('payment.authorized', {
      paymentId: payment._id.toString(),
      pledgeId,
      amount,
      status: 'AUTHORIZED'
    });

    res.status(201).json({
      success: true,
      data: { payment: paymentObj }
    });
  } catch (error) {
    logger.error('Payment creation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

// Update payment state (internal helper)
async function updatePaymentState(paymentId, newState, reason = '') {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new Error('Payment not found');
  }

  const currentState = payment.status;

  // Validate transition
  StateMachine.validateTransition(currentState, newState);

  // Update state
  payment.status = newState;
  payment.stateHistory.push({
    fromState: currentState,
    toState: newState,
    timestamp: new Date(),
    reason
  });

  await payment.save();

  logger.info('Payment state updated', {
    paymentId,
    fromState: currentState,
    toState: newState
  });

  return payment;
}

// Handle webhook
router.post('/webhooks/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { id: eventId, type: eventType, data } = req.body;
    const idempotencyKey = req.body.idempotencyKey || `webhook-${provider}-${eventId}`;

    if (!eventId || !eventType) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'eventId and eventType are required'
        }
      });
    }

    // Check webhook idempotency
    const cached = await idempotencyService.checkWebhookIdempotency(provider, eventId);
    if (cached) {
      return res.json({
        success: true,
        data: {
          message: 'Webhook already processed',
          paymentId: cached.paymentId,
          status: cached.status
        }
      });
    }

    // Check MongoDB for existing webhook
    const WebhookEvent = require('../models/WebhookEvent');
    const existing = await WebhookEvent.findOne({ provider, eventId });
    if (existing && existing.processed) {
      await idempotencyService.storeWebhookIdempotency(provider, eventId, {
        paymentId: existing.paymentId,
        status: 'processed'
      });
      return res.json({
        success: true,
        data: {
          message: 'Webhook already processed',
          paymentId: existing.paymentId
        }
      });
    }

    // Store webhook event
    const webhookEvent = new WebhookEvent({
      provider,
      eventId,
      eventType,
      payload: req.body,
      processed: false
    });
    await webhookEvent.save();

    // Process webhook based on event type
    let payment = null;
    let newStatus = null;

    if (eventType.includes('authorized') || eventType.includes('succeeded')) {
      // Find or create payment
      const providerPaymentId = data?.object?.id || data?.id;
      payment = await Payment.findOne({ providerPaymentId });
      
      if (payment) {
        try {
          payment = await updatePaymentState(payment._id.toString(), 'AUTHORIZED', 'Webhook: Payment authorized');
          newStatus = 'AUTHORIZED';
        } catch (error) {
          // Invalid transition - log but don't fail
          logger.warn('Invalid state transition attempted', {
            paymentId: payment._id,
            currentState: payment.status,
            attemptedState: 'AUTHORIZED',
            error: error.message
          });
        }
      }
    }

    if (eventType.includes('captured')) {
      const providerPaymentId = data?.object?.id || data?.id;
      payment = await Payment.findOne({ providerPaymentId });
      
      if (payment) {
        try {
          payment = await updatePaymentState(payment._id.toString(), 'CAPTURED', 'Webhook: Payment captured');
          newStatus = 'CAPTURED';
        } catch (error) {
          return res.status(422).json({
            success: false,
            error: {
              code: 'INVALID_STATE_TRANSITION',
              message: error.message,
              currentState: payment.status,
              requestedState: 'CAPTURED'
            }
          });
        }
      }
    }

    if (eventType.includes('completed') || eventType.includes('paid')) {
      const providerPaymentId = data?.object?.id || data?.id;
      payment = await Payment.findOne({ providerPaymentId });
      
      if (payment) {
        try {
          payment = await updatePaymentState(payment._id.toString(), 'COMPLETED', 'Webhook: Payment completed');
          newStatus = 'COMPLETED';
        } catch (error) {
          return res.status(422).json({
            success: false,
            error: {
              code: 'INVALID_STATE_TRANSITION',
              message: error.message,
              currentState: payment.status,
              requestedState: 'COMPLETED'
            }
          });
        }
      }
    }

    // Mark webhook as processed
    webhookEvent.processed = true;
    webhookEvent.processedAt = new Date();
    if (payment) {
      webhookEvent.paymentId = payment._id.toString();
    }
    await webhookEvent.save();

    // Store idempotency
    if (payment) {
      await idempotencyService.storeWebhookIdempotency(provider, eventId, {
        paymentId: payment._id.toString(),
        status: payment.status
      });
    }

    // Publish events
    if (newStatus) {
      await eventPublisher.publish(`payment.${newStatus.toLowerCase()}`, {
        paymentId: payment._id.toString(),
        pledgeId: payment.pledgeId,
        amount: payment.amount,
        status: newStatus
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Webhook processed successfully',
        paymentId: payment?._id?.toString(),
        newStatus: newStatus || payment?.status
      }
    });
  } catch (error) {
    logger.error('Webhook processing failed', { error: error.message });
    
    if (error.message.includes('Invalid state transition')) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'INVALID_STATE_TRANSITION',
          message: error.message
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
  }
});

// Get payment by ID
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Payment not found'
        }
      });
    }

    res.json({
      success: true,
      data: { payment }
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


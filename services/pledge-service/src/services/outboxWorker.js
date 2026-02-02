const Outbox = require('../models/Outbox');
const eventPublisher = require('./eventPublisher');
const logger = require('../utils/logger');

class OutboxWorker {
  constructor() {
    this.isRunning = false;
    this.pollInterval = 5000; // 5 seconds
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Outbox worker already running');
      return;
    }

    this.isRunning = true;
    logger.info('Outbox worker started');
    
    // Connect to RabbitMQ
    await eventPublisher.connect();
    
    // Start polling
    this.poll();
  }

  async poll() {
    if (!this.isRunning) return;

    try {
      // Get pending events (limit to 10 at a time)
      const pendingEvents = await Outbox.find({
        status: 'PENDING'
      })
      .sort({ createdAt: 1 })
      .limit(10);

      for (const event of pendingEvents) {
        try {
          // Publish event
          await eventPublisher.publish(event.eventType, event.payload);
          
          // Mark as published
          event.status = 'PUBLISHED';
          event.publishedAt = new Date();
          event.retryCount = 0;
          await event.save();
          
          logger.info('Outbox event published', {
            eventId: event._id,
            eventType: event.eventType
          });
        } catch (error) {
          // Increment retry count
          event.retryCount = (event.retryCount || 0) + 1;
          event.lastError = error.message;
          
          // Mark as failed after 5 retries
          if (event.retryCount >= 5) {
            event.status = 'FAILED';
            logger.error('Outbox event failed after max retries', {
              eventId: event._id,
              retryCount: event.retryCount
            });
          }
          
          await event.save();
          
          logger.warn('Outbox event publish failed, will retry', {
            eventId: event._id,
            retryCount: event.retryCount,
            error: error.message
          });
        }
      }
    } catch (error) {
      logger.error('Outbox polling error', { error: error.message });
    }

    // Schedule next poll
    setTimeout(() => this.poll(), this.pollInterval);
  }

  stop() {
    this.isRunning = false;
    logger.info('Outbox worker stopped');
  }
}

module.exports = new OutboxWorker();


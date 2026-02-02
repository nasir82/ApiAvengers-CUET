const amqplib = require('amqplib');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

class EventConsumer {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    try {
      const rabbitmqUri = process.env.RABBITMQ_URI || 'amqp://admin:admin123@rabbitmq:5672';
      this.connection = await amqplib.connect(rabbitmqUri);
      this.channel = await this.connection.createChannel();
      
      await this.channel.assertExchange('careforall', 'topic', {
        durable: true
      });
      
      const queue = await this.channel.assertQueue('notification-service-events', {
        durable: true
      });
      
      await this.channel.bindQueue(queue.queue, 'careforall', 'pledge.created');
      await this.channel.bindQueue(queue.queue, 'careforall', 'pledge.confirmed');
      await this.channel.bindQueue(queue.queue, 'careforall', 'payment.completed');
      
      await this.channel.consume(queue.queue, async (msg) => {
        if (msg) {
          try {
            const event = JSON.parse(msg.content.toString());
            await this.handleEvent(event);
            this.channel.ack(msg);
          } catch (error) {
            logger.error('Event processing failed', {
              error: error.message,
              content: msg.content.toString()
            });
            this.channel.nack(msg, false, true);
          }
        }
      });
      
      logger.info('Event consumer connected and listening');
    } catch (error) {
      logger.error('Event consumer connection failed', { error: error.message });
      throw error;
    }
  }

  async handleEvent(event) {
    try {
      const { eventType, payload } = event;
      
      logger.info('Processing event', { eventType, aggregateId: payload.pledgeId || payload.paymentId });

      switch (eventType) {
        case 'pledge.created':
          await Notification.create({
            userId: payload.userId,
            type: 'PLEDGE_CONFIRMED',
            title: 'Pledge Created',
            message: `Your pledge of $${payload.amount} has been created`,
            metadata: { pledgeId: payload.pledgeId, campaignId: payload.campaignId }
          });
          break;
        
        case 'payment.completed':
          await Notification.create({
            userId: payload.userId,
            type: 'PAYMENT_COMPLETED',
            title: 'Payment Completed',
            message: `Your payment of $${payload.amount} has been completed successfully`,
            metadata: { paymentId: payload.paymentId, pledgeId: payload.pledgeId }
          });
          break;
        
        default:
          logger.warn('Unknown event type', { eventType });
      }
    } catch (error) {
      logger.error('Event handling failed', {
        error: error.message,
        eventType: event.eventType
      });
      throw error;
    }
  }

  async close() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }
}

module.exports = new EventConsumer();


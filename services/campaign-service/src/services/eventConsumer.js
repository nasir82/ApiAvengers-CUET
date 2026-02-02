const amqplib = require('amqplib');
const readModelUpdater = require('./readModelUpdater');
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
      
      // Declare exchange
      await this.channel.assertExchange('careforall', 'topic', {
        durable: true
      });
      
      // Declare queue
      const queue = await this.channel.assertQueue('campaign-service-events', {
        durable: true
      });
      
      // Bind to relevant events
      await this.channel.bindQueue(queue.queue, 'careforall', 'pledge.created');
      await this.channel.bindQueue(queue.queue, 'careforall', 'pledge.confirmed');
      await this.channel.bindQueue(queue.queue, 'careforall', 'payment.completed');
      
      // Consume messages
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
            // Reject and requeue (with limit)
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
      
      logger.info('Processing event', { eventType, aggregateId: payload.pledgeId || payload.id });

      switch (eventType) {
        case 'pledge.created':
          await readModelUpdater.updateOnPledgeCreated(payload);
          break;
        
        case 'pledge.confirmed':
          await readModelUpdater.updateOnPledgeCreated(payload);
          break;
        
        case 'payment.completed':
          await readModelUpdater.updateOnPaymentCompleted(payload);
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


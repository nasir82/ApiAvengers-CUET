const amqplib = require('amqplib');
const logger = require('../utils/logger');

class EventPublisher {
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
      
      logger.info('Event publisher connected to RabbitMQ');
    } catch (error) {
      logger.error('Event publisher connection failed', { error: error.message });
      throw error;
    }
  }

  async publish(eventType, payload) {
    try {
      if (!this.channel) {
        await this.connect();
      }

      const message = {
        eventType,
        payload,
        timestamp: new Date().toISOString(),
        source: 'payment-service'
      };

      await this.channel.publish(
        'careforall',
        eventType,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      logger.info('Event published', { eventType, paymentId: payload.paymentId || payload.id });
      return true;
    } catch (error) {
      logger.error('Event publish failed', { error: error.message, eventType });
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

module.exports = new EventPublisher();


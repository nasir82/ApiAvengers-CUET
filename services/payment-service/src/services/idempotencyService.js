const redis = require('redis');
const logger = require('../utils/logger');

class IdempotencyService {
  constructor() {
    this.redisClient = null;
  }

  async connect() {
    try {
      const redisUri = process.env.REDIS_URI || 'redis://redis:6379';
      this.redisClient = redis.createClient({ url: redisUri });
      
      this.redisClient.on('error', (err) => {
        logger.error('Redis Client Error', { error: err.message });
      });
      
      await this.redisClient.connect();
      logger.info('Redis connected for idempotency');
    } catch (error) {
      logger.error('Redis connection failed', { error: error.message });
    }
  }

  async checkWebhookIdempotency(provider, eventId) {
    try {
      if (this.redisClient) {
        const key = `webhook:${provider}:${eventId}`;
        const cached = await this.redisClient.get(key);
        if (cached) {
          logger.info('Webhook idempotency key found in Redis', { provider, eventId });
          return JSON.parse(cached);
        }
      }
    } catch (error) {
      logger.warn('Redis check failed', { error: error.message });
    }
    return null;
  }

  async storeWebhookIdempotency(provider, eventId, response, ttl = 86400) {
    try {
      if (this.redisClient) {
        const key = `webhook:${provider}:${eventId}`;
        await this.redisClient.setEx(key, ttl, JSON.stringify(response));
        logger.info('Webhook idempotency stored in Redis', { provider, eventId });
      }
    } catch (error) {
      logger.warn('Redis store failed', { error: error.message });
    }
  }

  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

module.exports = new IdempotencyService();


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
      // Continue without Redis (fallback to MongoDB only)
    }
  }

  async checkIdempotency(key) {
    try {
      // Check Redis first (fast)
      if (this.redisClient) {
        const cached = await this.redisClient.get(`idempotency:${key}`);
        if (cached) {
          logger.info('Idempotency key found in Redis', { key });
          return JSON.parse(cached);
        }
      }
    } catch (error) {
      logger.warn('Redis check failed, continuing', { error: error.message });
    }
    
    return null;
  }

  async storeIdempotency(key, response, ttl = 86400) {
    try {
      if (this.redisClient) {
        await this.redisClient.setEx(
          `idempotency:${key}`,
          ttl,
          JSON.stringify(response)
        );
        logger.info('Idempotency key stored in Redis', { key });
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


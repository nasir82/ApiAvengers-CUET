const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/payments';
    await mongoose.connect(mongoUri);
    logger.info('MongoDB connected', { uri: mongoUri.replace(/:[^:@]+@/, ':****@') });
  } catch (error) {
    logger.error('MongoDB connection error', { error: error.message });
    throw error;
  }
}

module.exports = { connectDB };


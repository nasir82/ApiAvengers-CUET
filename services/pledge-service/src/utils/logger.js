const winston = require('winston');
const { createLogger, format, transports } = winston;

// Create Winston logger with multiple transports
const logger = createLogger({
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { 
    service: 'pledge-service',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console output
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }),
    // Send to Logstash via HTTP (if LOGSTASH_URL is set)
    ...(process.env.LOGSTASH_URL ? [
      new transports.Http({
        host: process.env.LOGSTASH_URL.split(':')[0] || 'logstash',
        port: parseInt(process.env.LOGSTASH_URL.split(':')[1] || '8080'),
        path: '/',
        format: format.json()
      })
    ] : [])
  ]
});

// If Logstash URL not provided, still log to console
if (!process.env.LOGSTASH_URL) {
  logger.info('Logstash URL not configured, logging to console only');
}

module.exports = logger;

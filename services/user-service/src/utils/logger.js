const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'user-service',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    ...(process.env.LOGSTASH_URL ? [
      new winston.transports.Http({
        host: process.env.LOGSTASH_URL.split(':')[0] || 'logstash',
        port: parseInt(process.env.LOGSTASH_URL.split(':')[1] || '8080'),
        path: '/',
        format: winston.format.json(),
        ssl: false
      })
    ] : [])
  ]
});

module.exports = logger;

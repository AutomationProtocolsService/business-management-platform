/**
 * Logger Configuration
 * 
 * Configures a standardized logging system for the application.
 * Uses pino for performant structured logging with context.
 */

import pino from 'pino-http';

// Configure the logger with custom settings
export const logger = pino({
  // Don't log in test environment
  enabled: process.env.NODE_ENV !== 'test',
  
  // Configure log format
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
  
  // Custom log level based on environment
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  
  // Add timestamp to all logs
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  
  // Redact sensitive information from logs
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'res.headers["set-cookie"]',
    ],
    remove: true,
  },
  
  // Custom serializers to control what information is logged
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      user: (req as any).user?.id || 'anonymous',
      tenant: (req as any).tenant?.id || 'none',
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-request-id': req.headers['x-request-id'],
      },
      ...(Object.keys(req.body || {}).length > 0 && {
        body: {
          ...req.body,
          // Remove sensitive data from logs
          password: req.body.password ? '[REDACTED]' : undefined,
          token: req.body.token ? '[REDACTED]' : undefined,
        },
      }),
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: (err) => ({
      type: err.constructor.name,
      message: err.message,
      stack: err.stack,
      code: (err as any).code,
      statusCode: (err as any).statusCode,
    }),
  },
}).logger;
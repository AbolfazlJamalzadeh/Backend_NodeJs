const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const ErrorHandler = require('../utils/errorHandler');

let rateLimitStore;

// Use Redis for production, in-memory for development
if (process.env.REDIS_URL) {
  const redisClient = new Redis(process.env.REDIS_URL);
  
  rateLimitStore = new RedisStore({
    sendCommand: (...args) => redisClient.call(...args)
  });
}

/**
 * Standard rate limiter for general API endpoints
 * Limits to 100 requests per IP per 15 minutes
 */
exports.standardLimiter = rateLimit({
  store: rateLimitStore,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً پس از مدتی دوباره تلاش کنید.'
  },
  handler: (req, res, next, options) => {
    next(new ErrorHandler(options.message.message, 429));
  }
});

/**
 * Strict limiter for authentication endpoints
 * Limits to 10 requests per IP per 15 minutes
 */
exports.authLimiter = rateLimit({
  store: rateLimitStore,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'تعداد درخواست‌های احراز هویت شما بیش از حد مجاز است. لطفاً پس از مدتی دوباره تلاش کنید.'
  },
  handler: (req, res, next, options) => {
    next(new ErrorHandler(options.message.message, 429));
  }
});

/**
 * Very strict limiter for sensitive operations
 * Limits to 5 requests per IP per 60 minutes
 */
exports.sensitiveOperationLimiter = rateLimit({
  store: rateLimitStore,
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 5, // 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'تعداد درخواست‌ها برای این عملیات حساس بیش از حد مجاز است. لطفاً پس از مدتی دوباره تلاش کنید.'
  },
  handler: (req, res, next, options) => {
    next(new ErrorHandler(options.message.message, 429));
  }
});

/**
 * API key rate limiter for external integrations
 * Limits to 1000 requests per key per hour
 */
exports.apiKeyLimiter = rateLimit({
  store: rateLimitStore,
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 1000, // 1000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  // Use API key as the key instead of IP
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  message: {
    success: false,
    message: 'تعداد درخواست‌های API شما بیش از حد مجاز است. لطفاً پس از مدتی دوباره تلاش کنید.'
  },
  handler: (req, res, next, options) => {
    next(new ErrorHandler(options.message.message, 429));
  }
}); 
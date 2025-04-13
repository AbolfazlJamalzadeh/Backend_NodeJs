const helmet = require('helmet');
const { xss } = require('express-xss-sanitizer');
const mongoSanitize = require('express-mongo-sanitize');

/**
 * Configure Helmet security headers
 */
exports.securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'www.google-analytics.com', 'www.googletagmanager.com', 'shaparak.ir', 'zarinpal.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'cdnjs.cloudflare.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'res.cloudinary.com', 'www.google-analytics.com'],
      connectSrc: ["'self'", 'api.zarinpal.com', 'www.google-analytics.com'],
      frameSrc: ["'self'", 'zarinpal.com', 'shaparak.ir'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false, // May need to be disabled for certain cross-origin resources
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // For payment popups
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // For CDN resources
  originAgentCluster: true,
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 15552000, // 180 days in seconds
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

/**
 * Sanitize request data to protect against XSS attacks
 */
exports.xssSanitizer = xss({
  xssOptions: {
    whiteList: {}, // empty object means no tags allowed (all stripped)
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script'] // remove script tags and their contents
  }
});

/**
 * Sanitize request data to protect against NoSQL injection
 * Modified to be compatible with Node.js v22+
 */
exports.mongoSanitizer = (req, res, next) => {
  try {
    // Create a sanitized copy of req.body
    if (req.body) {
      req.body = mongoSanitize.sanitize(req.body, {
        replaceWith: '_',
        allowDots: true
      });
    }
    
    // Create a sanitized copy of req.params
    if (req.params) {
      req.params = mongoSanitize.sanitize(req.params, {
        replaceWith: '_',
        allowDots: true
      });
    }
    
    // For query, create a sanitized copy without modifying the original
    if (req.query) {
      const sanitizedQuery = mongoSanitize.sanitize({...req.query}, {
        replaceWith: '_',
        allowDots: true
      });
      
      // Only set properties that already exist in query
      Object.keys(sanitizedQuery).forEach(key => {
        if (key in req.query) {
          req.query[key] = sanitizedQuery[key];
        }
      });
    }
    
    next();
  } catch (error) {
    console.error('Mongo sanitizer error:', error);
    next(); // Continue even if sanitization fails
  }
};

/**
 * Log security-related events and suspicious activities
 */
exports.securityLogger = (req, res, next) => {
  // Skip logging for normal requests
  const isApiRequest = req.path.startsWith('/api');
  const isSuspicious = 
    // Check payload for potential SQL injection
    (req.body && JSON.stringify(req.body).toLowerCase().includes('select ')) ||
    (req.body && JSON.stringify(req.body).toLowerCase().includes('union ')) ||
    // Check unusual headers or methods
    (req.method === 'TRACE') ||
    (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',').length > 3) ||
    // Check for common attack patterns in URL
    req.path.includes('../') ||
    req.path.includes('..\\') ||
    req.path.toLowerCase().includes('/admin') ||
    req.path.toLowerCase().includes('wp-') ||
    req.path.toLowerCase().includes('.php');
    
  if (isApiRequest && isSuspicious) {
    console.warn(`Security Warning - Suspicious request: ${req.method} ${req.path}`);
    console.warn(`IP: ${req.ip}`);
    console.warn(`User-Agent: ${req.headers['user-agent']}`);
  }

  next();
};

/**
 * Prevent parameter pollution
 */
exports.cleanBody = (req, res, next) => {
  // Clean up body parameters to prevent parameter pollution
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      // If the parameter is an array when it shouldn't be, take the last value
      if (Array.isArray(req.body[key]) && !['images', 'colors', 'tags', 'sizes', 'categories'].includes(key)) {
        req.body[key] = req.body[key][req.body[key].length - 1];
      }
    });
  }
  
  // Clean up query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      // If the parameter is an array when it shouldn't be, take the last value
      if (Array.isArray(req.query[key]) && !['sort', 'fields', 'colors', 'tags', 'sizes', 'categories'].includes(key)) {
        req.query[key] = req.query[key][req.query[key].length - 1];
      }
    });
  }
  
  next();
}; 
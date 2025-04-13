const crypto = require('crypto');
const ErrorHandler = require('../utils/errorHandler');

// Store for CSRF tokens with expiration
const csrfTokens = new Map();

/**
 * Generate a new CSRF token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.generateCsrfToken = (req, res, next) => {
  // Generate a unique token
  const csrfToken = crypto.randomBytes(32).toString('hex');
  
  // Set expiration time (1 hour)
  const expiry = Date.now() + (60 * 60 * 1000);
  
  // Store the token with its expiration
  csrfTokens.set(csrfToken, {
    expiry,
    userId: req.user ? req.user.id : null
  });
  
  // Clean up expired tokens every time a new token is generated
  cleanupExpiredTokens();
  
  // Attach token to response
  res.cookie('csrf-token', csrfToken, {
    httpOnly: false, // Client needs to read it
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000 // 1 hour
  });
  
  // Make token available to the view/frontend
  res.locals.csrfToken = csrfToken;
  
  next();
};

/**
 * Verify CSRF token on protected routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.verifyCsrfToken = (req, res, next) => {
  // Skip for GET, HEAD, OPTIONS requests as they should be idempotent
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Get token from header, cookie, or body
  const token = 
    req.headers['csrf-token'] || 
    req.cookies['csrf-token'] || 
    req.body._csrf;
  
  if (!token) {
    return next(new ErrorHandler('CSRF token missing', 403));
  }
  
  const tokenData = csrfTokens.get(token);
  
  // Verify token exists and has not expired
  if (!tokenData || tokenData.expiry < Date.now()) {
    if (tokenData) csrfTokens.delete(token); // Clean up expired token
    return next(new ErrorHandler('Invalid or expired CSRF token', 403));
  }
  
  // For authenticated routes, ensure token belongs to the authenticated user
  if (req.user && tokenData.userId && req.user.id !== tokenData.userId) {
    return next(new ErrorHandler('CSRF token user mismatch', 403));
  }
  
  next();
};

/**
 * Clean up expired tokens to prevent memory leaks
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  csrfTokens.forEach((data, token) => {
    if (data.expiry < now) {
      csrfTokens.delete(token);
    }
  });
} 
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');

/**
 * Enhanced JWT utilities with additional security features
 */
class JWTUtils {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || this.generateSecureSecret();
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1d';
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.refreshTokens = new Map(); // In-memory store for refresh tokens
    
    // Show warning if default secret is used
    if (!process.env.JWT_SECRET) {
      console.warn('WARNING: Using auto-generated JWT secret. This will change on server restart!');
      console.warn('Set JWT_SECRET in environment variables for persistent sessions.');
    }
  }
  
  /**
   * Generate a secure random string for JWT secret
   * @returns {string} - A secure random string
   */
  generateSecureSecret() {
    return crypto.randomBytes(64).toString('hex');
  }
  
  /**
   * Generate a refresh token
   * @returns {string} - A secure random string for refresh token
   */
  generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
  }
  
  /**
   * Sign a JWT token with enhanced security
   * @param {Object} payload - Token payload
   * @param {Object} options - Additional options
   * @returns {string} - Signed JWT token
   */
  signToken(payload, options = {}) {
    const defaultOptions = {
      expiresIn: this.jwtExpiresIn,
      algorithm: 'HS256', // HMAC-SHA256 signature
      notBefore: 0, // Token valid immediately
      jwtid: crypto.randomBytes(16).toString('hex'), // Unique token ID
    };
    
    // Add additional security claims
    const enhancedPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000), // Issued at
    };
    
    // Sign the token
    return jwt.sign(
      enhancedPayload,
      this.jwtSecret,
      { ...defaultOptions, ...options }
    );
  }
  
  /**
   * Generate an access token and refresh token pair
   * @param {Object} payload - Token payload
   * @returns {Object} - Object containing access and refresh tokens
   */
  generateTokenPair(payload) {
    // Generate access token
    const accessToken = this.signToken(payload);
    
    // Generate refresh token
    const refreshToken = this.generateRefreshToken();
    const refreshTokenExpiry = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Store refresh token with associated user ID
    this.refreshTokens.set(refreshToken, {
      userId: payload.id,
      expires: refreshTokenExpiry,
      tokenFamily: crypto.randomBytes(10).toString('hex'), // For refresh token rotation
    });
    
    return {
      accessToken,
      refreshToken,
      expiresIn: parseInt(this.jwtExpiresIn) || 86400,
    };
  }
  
  /**
   * Verify a JWT token
   * @param {string} token - JWT token to verify
   * @returns {Promise<Object>} - Decoded token payload
   */
  async verifyToken(token) {
    try {
      return await promisify(jwt.verify)(token, this.jwtSecret);
    } catch (error) {
      throw new Error(`Invalid token: ${error.message}`);
    }
  }
  
  /**
   * Verify and renew tokens using a refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} - New access and refresh tokens
   */
  async refreshTokenPair(refreshToken) {
    // Check if refresh token exists
    if (!this.refreshTokens.has(refreshToken)) {
      throw new Error('Invalid refresh token');
    }
    
    const tokenData = this.refreshTokens.get(refreshToken);
    
    // Check if refresh token is expired
    if (tokenData.expires < Date.now()) {
      // Delete expired token
      this.refreshTokens.delete(refreshToken);
      throw new Error('Refresh token expired');
    }
    
    // Generate new token pair
    const payload = { id: tokenData.userId };
    const newTokens = this.generateTokenPair(payload);
    
    // Delete old refresh token (one-time use)
    this.refreshTokens.delete(refreshToken);
    
    // Store new refresh token with same family
    this.refreshTokens.set(newTokens.refreshToken, {
      userId: tokenData.userId,
      expires: Date.now() + (7 * 24 * 60 * 60 * 1000),
      tokenFamily: tokenData.tokenFamily, // Preserve token family
    });
    
    return newTokens;
  }
  
  /**
   * Invalidate a refresh token
   * @param {string} refreshToken - Refresh token to invalidate
   */
  invalidateRefreshToken(refreshToken) {
    if (this.refreshTokens.has(refreshToken)) {
      this.refreshTokens.delete(refreshToken);
    }
  }
  
  /**
   * Invalidate all refresh tokens for a user
   * @param {string} userId - User ID
   */
  invalidateAllUserTokens(userId) {
    this.refreshTokens.forEach((data, token) => {
      if (data.userId === userId) {
        this.refreshTokens.delete(token);
      }
    });
  }
  
  /**
   * Clean up expired refresh tokens
   */
  cleanupExpiredTokens() {
    const now = Date.now();
    this.refreshTokens.forEach((data, token) => {
      if (data.expires < now) {
        this.refreshTokens.delete(token);
      }
    });
  }
}

// Create a singleton instance
const jwtUtils = new JWTUtils();

// Cleanup expired tokens periodically
setInterval(() => jwtUtils.cleanupExpiredTokens(), 60 * 60 * 1000); // Every hour

module.exports = jwtUtils; 
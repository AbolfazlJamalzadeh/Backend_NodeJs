const jwt = require('jsonwebtoken');
const ErrorHandler = require('../utils/errorHandler');
const User = require('../models/user.model');


// Protect routes - Require authentication
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Log authorization header for debugging
      console.log('Auth header:', req.headers.authorization);
      
      token = req.headers.authorization.split(' ')[1];
      console.log('Extracted token:', token ? token.substring(0, 15) + '...' : 'none');
    }

    // Make sure token exists
    if (!token) {
      console.log('No token provided in request');
      return next(new ErrorHandler('برای دسترسی به این بخش باید وارد شوید', 401));
    }

    try {
      // Verify token
      console.log('Verifying token with secret length:', process.env.JWT_SECRET.length);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully, user ID:', decoded.id);

      // Get user from the token
      const user = await User.findById(decoded.id);

      if (!user) {
        console.log('User not found for ID:', decoded.id);
        return next(new ErrorHandler('کاربر یافت نشد', 404));
      }

      // Set user in request
      req.user = user;
      console.log('User authenticated:', user.email);
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      return next(new ErrorHandler('توکن نامعتبر است. لطفا دوباره وارد شوید', 401));
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    next(error);
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorHandler('برای دسترسی به این بخش باید وارد شوید', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler('شما مجوز دسترسی به این بخش را ندارید', 403)
      );
    }
    next();
  };
};

// Check if profile is complete
exports.requireCompleteProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new ErrorHandler('برای دسترسی به این بخش باید وارد شوید', 401));
    }

    if (!req.user.isProfileCompleted) {
      const profileStatus = req.user.checkProfileCompletion();
      
      if (!profileStatus.isComplete) {
        return next(
          new ErrorHandler(
            `لطفا پروفایل خود را تکمیل کنید. موارد ناقص: ${profileStatus.missingFields.join(', ')}`,
            403
          )
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}; 
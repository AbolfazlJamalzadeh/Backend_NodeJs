const ErrorHandler = require('../utils/errorHandler');
const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error
  logger.error(`${err.statusCode || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

  // Log error stack in development
  if (process.env.NODE_ENV === 'development') {
    logger.error(err.stack);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'شناسه مورد نظر معتبر نیست';
    error = new ErrorHandler(message, 400);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    let field = Object.keys(err.keyValue)[0];
    const message = `مقدار وارد شده برای ${field} تکراری است`;
    error = new ErrorHandler(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ErrorHandler(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'توکن نامعتبر است. لطفا دوباره وارد شوید';
    error = new ErrorHandler(message, 401);
  }

  // JWT expired
  if (err.name === 'TokenExpiredError') {
    const message = 'توکن منقضی شده است. لطفا دوباره وارد شوید';
    error = new ErrorHandler(message, 401);
  }

  // Return response
  res.status(error.statusCode).json({
    success: false,
    error: {
      message: error.message,
      statusCode: error.statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

module.exports = errorHandler; 
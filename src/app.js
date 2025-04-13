const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const hpp = require('hpp');
const compression = require('compression');

// Security middlewares
const { securityHeaders, xssSanitizer, mongoSanitizer, securityLogger, cleanBody } = require('./middlewares/security.middleware');
const { standardLimiter, authLimiter } = require('./middlewares/rateLimiter.middleware');
const { generateCsrfToken, verifyCsrfToken } = require('./middlewares/csrf.middleware');
const ipBlocker = require('./middlewares/ipBlocker.middleware');

const errorMiddleware = require('./middlewares/error.middleware');

// Load env vars
dotenv.config();

// Connect to database
const connectDB = require('./config/db');
connectDB();

// Route files
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const couponRoutes = require('./routes/coupon.routes');
const ticketRoutes = require('./routes/ticket.routes');
const testRoutes = require('./routes/test.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const paymentRoutes = require('./routes/payment.routes');
const reviewRoutes = require('./routes/review.routes');
const questionRoutes = require('./routes/question.routes');
const backupRoutes = require('./routes/backup.routes');
const chatRoutes = require('./routes/chat.routes');

const app = express();

// Apply security middlewares
app.use(securityHeaders); // Apply Helmet security headers
app.use(ipBlocker); // Block suspicious IPs
app.use(securityLogger); // Log suspicious activities

// Protect specific routes with stricter rate limiting
app.use('/api/auth', authLimiter);
app.use('/api/users/password', authLimiter);

// Apply standard rate limiting to all other routes
app.use('/api', standardLimiter);

// Body parser with size limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Clean request body and query to prevent parameter pollution
app.use(cleanBody);
app.use(hpp()); // HTTP Parameter Pollution protection

// Sanitize request data against XSS and NoSQL injection
app.use(xssSanitizer);
app.use(mongoSanitizer);

// Cookie parser with secure settings
app.use(cookieParser(process.env.COOKIE_SECRET || 'secure-cookie-secret', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict'
}));

// File Upload
const fileupload = require('express-fileupload');
app.use(fileupload({
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  useTempFiles: true,
  tempFileDir: '/tmp/',
  safeFileNames: true,
  preserveExtension: true
}));

// Enable compression
app.use(compression());

// Enable CORS with secure configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'csrf-token', 'x-api-key'],
  credentials: true,
  maxAge: 3600
}));

// CSRF protection for non-GET requests
app.get('*', generateCsrfToken); // Generate CSRF token for GET requests
app.use(['POST', 'PUT', 'PATCH', 'DELETE'], verifyCsrfToken); // Verify token for state-changing requests

// Swagger configuration
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'DNG API',
      description: 'DNG E-commerce API Documentation<br><br><strong>Authentication Instructions:</strong><br>1. Use the /api/auth/login endpoint to get a token<br>2. Click the "Authorize" button at the top right<br>3. In the value field, enter just the token (without adding "Bearer " - it\'s added automatically)<br>4. Click "Authorize" and then "Close"<br>5. Now you can use protected endpoints',
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'support@dng.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: process.env.NODE_ENV === 'development' ? 'Development server' : 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'list',
    filter: true,
  }
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, swaggerUiOptions));

// Set static folder
app.use(express.static(path.join(__dirname, '../public')));

// Home route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API is running'
  });
});

// Add a test route
app.get('/api/healthcheck', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy'
  });
});

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/test', testRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/chat', chatRoutes);

// Error handling middleware
app.use(errorMiddleware);

// Simple 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

module.exports = app; 
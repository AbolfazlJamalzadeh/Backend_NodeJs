// Import env variables
require('dotenv').config();

// Config object
const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  
  // Server
  port: process.env.PORT || 3000,
  
  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  
  // Holoo configuration
  holoo: {
    enabled: process.env.HOLOO_ENABLED === 'true' || false,
    apiUrl: process.env.HOLOO_API_URL || 'https://api.holoo.app/v1',
    apiKey: process.env.HOLOO_API_KEY || '',
  },
  
  // Payment
  payment: {
    zarinpal: {
      merchantId: process.env.ZARINPAL_MERCHANT_ID || '',
      callbackUrl: process.env.ZARINPAL_CALLBACK_URL || 'http://localhost:3000/api/payment/verify',
      sandbox: process.env.ZARINPAL_SANDBOX === 'true' || true
    }
  },
  
  // SMS
  sms: {
    active: process.env.SMS_ACTIVE === 'true' || false,
    provider: process.env.SMS_PROVIDER || 'kavenegar',
    apiKey: process.env.SMS_API_KEY || '',
    sender: process.env.SMS_SENDER || '10008663'
  },
  
  // Cloudinary
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || ''
  },
  
  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001'
};

module.exports = config; 
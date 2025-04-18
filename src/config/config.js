// Import env variables
require('dotenv').config();

// Config object
const config = {
  // Environment & Server
  environment: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  
  // MongoDB
  database: {
    url: process.env.MONGO_URI || 'mongodb://localhost:27017/dengi'
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  },
  
  // Holoo API
  holoo: {
    active: process.env.HOLOO_ACTIVE === 'true' || false,
    apiUrl: process.env.HOLOO_API_URL || '',
    username: process.env.HOLOO_USERNAME || '',
    password: process.env.HOLOO_PASSWORD || '',
    dbname: process.env.HOLOO_DBNAME || '',
    syncInterval: parseInt(process.env.HOLOO_SYNC_INTERVAL || '3600', 10) * 1000,
    webhookApiKey: process.env.HOLOO_WEBHOOK_API_KEY || ''
  },
  
  // Payment
  zarinpal: {
    active: process.env.ZARINPAL_ACTIVE === 'true' || false,
    merchantId: process.env.ZARINPAL_MERCHANT || '',
    callbackUrl: process.env.ZARINPAL_CALLBACK_URL || '',
    sandbox: process.env.ZARINPAL_SANDBOX === 'true' || false
  },
  
  // SMS
  sms: {
    active: process.env.SMS_ACTIVE === 'true' || false,
    provider: process.env.SMS_PROVIDER || 'ghasedak',
    apiKey: process.env.GHASEDAK_API_KEY || '',
    sender: process.env.GHASEDAK_LINE_NUMBER || ''
  },
  
  // Cloudinary
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || ''
  },
  
  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
};

module.exports = config; 
# E-commerce Platform

A complete e-commerce solution with advanced features including real-time chat support, payment processing, analytics, and comprehensive product management.

## Features

### User Management
- User registration and authentication with JWT tokens
- Role-based access control (customer, admin, manager)
- User profile management with avatar support
- Password reset functionality via SMS

### Product Management
- Comprehensive product catalog with categories
- Product search, filtering, and sorting
- Product reviews and Q&A system
- Image upload and management

### Shopping Experience
- Shopping cart functionality
- Wishlist management
- Coupon system for discounts
- Order tracking and history

### Payment Processing
- Integrated with Zarinpal payment gateway
- Secure payment processing
- Payment history and refund support

### Customer Support
- Real-time chat support system
- Ticket management system
- Support agent assignment
- Chat history and ratings

### Analytics and Reporting
- Sales analytics dashboard
- User behavior tracking
- Product performance reports
- Revenue and growth metrics

### Security Features
- CSRF protection
- XSS sanitization
- MongoDB sanitization
- Rate limiting
- IP blocking for suspicious activities
- Secured HTTP headers

### System Administration
- System backup and restore
- Data export functionality
- Comprehensive logging
- Error handling and monitoring

## Tech Stack

### Backend
- Node.js and Express.js
- MongoDB with Mongoose
- Socket.IO for real-time communication
- JWT for authentication
- Winston for logging
- Swagger for API documentation

### Security
- Helmet for securing HTTP headers
- Express Rate Limit for rate limiting
- HPP for HTTP Parameter Pollution protection
- XSS-Clean for XSS protection
- Express Mongo Sanitize for NoSQL injection protection

### External Services
- Ghasedak SMS service integration
- Zarinpal payment gateway

## Packages Used

### Core Packages
- **express**: Web framework for Node.js
- **mongoose**: MongoDB object modeling tool
- **socket.io**: Real-time bidirectional event-based communication
- **dotenv**: Environment variable loader

### Authentication & Security
- **jsonwebtoken**: JWT implementation for Node.js
- **bcryptjs**: Library for password hashing
- **helmet**: Helps secure Express apps by setting various HTTP headers
- **express-rate-limit**: Basic rate-limiting middleware
- **hpp**: Express middleware to protect against HTTP Parameter Pollution
- **express-mongo-sanitize**: Sanitize user input to prevent MongoDB operator injection
- **xss-clean**: Middleware to sanitize user input from XSS attacks
- **cors**: CORS middleware for Express
- **cookie-parser**: Cookie parsing middleware

### File Handling & Data Processing
- **multer**: Middleware for handling multipart/form-data (file uploads)
- **express-fileupload**: Express middleware for file uploads
- **archiver**: Creating archives (zip, tar)
- **extract-zip**: Extracting zip archives
- **csv-writer**: CSV file writer
- **pdfkit**: PDF document generation

### Validation & Error Handling
- **joi**: Object schema validation
- **express-validator**: Middleware for input validation
- **http-errors**: Create HTTP errors

### Utilities
- **moment**: Date manipulation library
- **date-fns**: Modern JavaScript date utility library
- **lodash**: Utility library for JavaScript
- **colors**: Add colors to console output
- **morgan**: HTTP request logger middleware
- **winston**: Logging library
- **axios**: Promise based HTTP client
- **compression**: Compression middleware

### API Documentation
- **swagger-jsdoc**: Swagger JSDoc integration
- **swagger-ui-express**: Serve auto-generated swagger-ui docs

### Development
- **nodemon**: Monitor changes and automatically restart server

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/Backend-ecommerce.git
cd dng-ecommerce
```

2. Install the dependencies
```bash
cd backend
npm install
```

3. Create a `.env` file in the backend directory with the following variables:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ecommerce
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRE=7
NODE_ENV=development
GHASEDAK_API_KEY=your_ghasedak_api_key
GHASEDAK_LINE_NUMBER=your_ghasedak_line_number
ZARINPAL_MERCHANT_ID=your_zarinpal_merchant_id
ZARINPAL_CALLBACK_URL=http://localhost:3000/api/payment/verify
MOCK_SMS=true
```

4. Seed the database (optional)
```bash
npm run seed
```

5. Start the development server
```bash
npm run dev
```

The API will be available at `http://localhost:3000` and the Swagger documentation at `http://localhost:3000/api-docs`.

## API Documentation

The API is fully documented using Swagger. Once the server is running, you can access the documentation at `/api-docs`.

### Authentication

To use protected endpoints:
1. Login using `/api/auth/login` to get a JWT token
2. Include the token in the Authorization header of subsequent requests as `Bearer your_token`

## Development

### Available Scripts

- `npm start`: Starts the production server
- `npm run dev`: Starts the development server with nodemon
- `npm run seed`: Seeds the database with initial data
- `npm test`: Runs tests (not implemented yet)

## Deployment

For production deployment:

1. Set the appropriate environment variables in your production environment
2. Build and start the server with `npm start`
3. Use a process manager like PM2 for better uptime

## License

This project is licensed under the ISC License. 
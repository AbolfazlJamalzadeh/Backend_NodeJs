# 🛍️ E-commerce Platform

A complete e-commerce solution with advanced features including real-time chat support, payment processing, analytics, and comprehensive product management.

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

</div>

## ✨ Features

### 👥 User Management
- 🔐 User registration and authentication with JWT tokens
- 👮‍♂️ Role-based access control (customer, admin, manager)
- 👤 User profile management with avatar support
- 🔄 Password reset functionality via SMS

### 📦 Product Management
- 📋 Comprehensive product catalog with categories
- 🔍 Product search, filtering, and sorting
- ⭐ Product reviews and Q&A system
- 🖼️ Image upload and management

### 🛒 Shopping Experience
- 🛍️ Shopping cart functionality
- 💝 Wishlist management
- 🎟️ Coupon system for discounts
- 📦 Order tracking and history

### 💰 Payment Processing
- 💳 Integrated with Zarinpal payment gateway
- 🔒 Secure payment processing
- 📊 Payment history and refund support

### 💬 Customer Support
- 💬 Real-time chat support system
- 🎫 Ticket management system
- 👥 Support agent assignment
- 📜 Chat history and ratings

### 📊 Analytics and Reporting
- 📈 Sales analytics dashboard
- 👤 User behavior tracking
- 📊 Product performance reports
- 💹 Revenue and growth metrics

### 🔒 Security Features
- 🛡️ CSRF protection
- 🧹 XSS sanitization
- 🗄️ MongoDB sanitization
- ⏱️ Rate limiting
- 🚫 IP blocking for suspicious activities
- 🔒 Secured HTTP headers

### ⚙️ System Administration
- 💾 System backup and restore
- 📤 Data export functionality
- 📝 Comprehensive logging
- ⚠️ Error handling and monitoring

## 🛠️ Tech Stack

### Backend
| Technology | Description |
|------------|-------------|
| Node.js & Express.js | Web framework and runtime environment |
| MongoDB & Mongoose | Database and ODM |
| Socket.IO | Real-time communication |
| JWT | Authentication |
| Winston | Logging |
| Swagger | API documentation |

### Security
| Package | Purpose |
|---------|---------|
| Helmet | HTTP headers security |
| Express Rate Limit | Rate limiting |
| HPP | HTTP Parameter Pollution protection |
| XSS-Clean | XSS protection |
| Express Mongo Sanitize | NoSQL injection protection |

### External Services
| Service | Purpose |
|---------|---------|
| Ghasedak | SMS service |
| Zarinpal | Payment gateway |

## 📦 Packages Used

### Core Packages
| Package | Purpose |
|---------|---------|
| express | Web framework |
| mongoose | MongoDB ODM |
| socket.io | Real-time communication |
| dotenv | Environment variables |

### Authentication & Security
| Package | Purpose |
|---------|---------|
| jsonwebtoken | JWT implementation |
| bcryptjs | Password hashing |
| helmet | HTTP headers security |
| express-rate-limit | Rate limiting |

### File Handling & Data Processing
| Package | Purpose |
|---------|---------|
| multer | File uploads |
| express-fileupload | File handling |
| archiver | Archive creation |
| pdfkit | PDF generation |

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/Backend_NodeJs.git
cd Backend_NodeJs
```

2. Install the dependencies
```bash
cd backend
npm install
```

3. Create a `.env` file in the backend directory with the following variables:
```env
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

## 📚 API Documentation

The API is fully documented using Swagger. Once the server is running, you can access the documentation at `/api-docs`.

### Authentication

To use protected endpoints:
1. Login using `/api/auth/login` to get a JWT token
2. Include the token in the Authorization header of subsequent requests as `Bearer your_token`

## 🔧 Development

### Available Scripts
| Script | Purpose |
|--------|---------|
| `npm start` | Starts the production server |
| `npm run dev` | Starts the development server with nodemon |
| `npm run seed` | Seeds the database with initial data |
| `npm test` | Runs tests (not implemented yet) |

## 🚀 Deployment

For production deployment:

1. Set the appropriate environment variables in your production environment
2. Build and start the server with `npm start`
3. Use a process manager like PM2 for better uptime

## 📄 License

This project is licensed under the ISC License. 
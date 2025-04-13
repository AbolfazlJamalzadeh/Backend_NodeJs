const express = require('express');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const app = express();

// Body parser
app.use(express.json());

// Home route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Minimal API is running'
  });
});

// Simple 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

module.exports = app; 
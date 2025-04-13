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
    message: 'Debug API is running'
  });
});

// Start server
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Debug server running on 0.0.0.0:${PORT}`);
}); 
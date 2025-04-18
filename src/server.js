const app = require('./app');
const colors = require('colors');
const { initializeSocket } = require('./utils/socket');
const HolooService = require('./utils/holooService');
const config = require('./config/config');

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Error: ${err.message}`.red);
  // Close server & exit process with failure
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold);
});

// Initialize Socket.IO
const io = initializeSocket(server);
console.log(`Socket.IO initialized`.green);

// Initialize Holoo integration if enabled
if (config.holoo.enabled) {
  try {
    const holooService = new HolooService();
    // Start periodic sync with Holoo
    holooService.startPeriodicSync();
    console.log(`Holoo integration started with sync interval of ${config.holoo.syncInterval / (60 * 1000)} minutes`.cyan);
  } catch (error) {
    console.error(`Failed to initialize Holoo integration: ${error.message}`.red);
  }
}

// Handle unhandled exceptions
process.on('uncaughtException', (err) => {
  console.error(`Error: ${err.message}`.red);
  // Close server & exit process with failure
  server.close(() => process.exit(1));
}); 
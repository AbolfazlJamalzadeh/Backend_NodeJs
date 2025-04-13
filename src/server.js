const app = require('./app');
const colors = require('colors');
const { initializeSocket } = require('./utils/socket');

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

// Handle unhandled exceptions
process.on('uncaughtException', (err) => {
  console.error(`Error: ${err.message}`.red);
  // Close server & exit process with failure
  server.close(() => process.exit(1));
}); 
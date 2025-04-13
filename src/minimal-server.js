const app = require('./minimal-app');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

process.on('unhandledRejection', (err, promise) => {
  console.error(`Error: ${err.message}`);
  server.close(() => process.exit(1));
}); 
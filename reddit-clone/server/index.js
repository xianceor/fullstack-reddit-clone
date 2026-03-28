require('dotenv').config();
const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');

const connectDB = require('./config/database');
const redis = require('./config/redis');
const { initSocket } = require('./config/socket');
const { apiLimiter } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// Security & parsing
app.use(helmet());
app.use(mongoSanitize());
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// HTTP logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// Rate limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/posts',      require('./routes/posts'));
app.use('/api/comments',   require('./routes/comments'));
app.use('/api/subreddits', require('./routes/subreddits'));

// Health check
app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  redis: redis.getStatus() ? 'connected' : 'unavailable',
  env: process.env.NODE_ENV,
}));

// 404
app.all('*', (req, res) => res.status(404).json({ status: 'fail', message: `Route ${req.originalUrl} not found` }));

// Global error handler
app.use(errorHandler);

const start = async () => {
  await connectDB();
  redis.connect();
  initSocket(server);
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`));
};

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

start();

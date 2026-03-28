const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connects to MongoDB with production-safe options.
 * Exits process on failure — no point running without a DB.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Modern Mongoose doesn't need most legacy flags
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);

    // Log slow queries in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', (coll, method, query, doc) => {
        logger.debug(`Mongoose: ${coll}.${method}`, { query, doc });
      });
    }
  } catch (err) {
    logger.error(`❌ MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

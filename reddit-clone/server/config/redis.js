const Redis = require('ioredis');
const logger = require('../utils/logger');

let client = null;
let isConnected = false;

/**
 * Initializes Redis connection. Falls back gracefully if Redis is unavailable.
 * In production, Redis should always be available. In dev, it's optional.
 */
const connect = () => {
  if (!process.env.REDIS_URL) {
    logger.warn('REDIS_URL not set — caching disabled');
    return;
  }

  client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    connectTimeout: 5000,
  });

  client.on('connect', () => {
    isConnected = true;
    logger.info('✅ Redis connected');
  });

  client.on('error', (err) => {
    isConnected = false;
    logger.warn(`Redis error (caching disabled): ${err.message}`);
  });

  client.on('close', () => {
    isConnected = false;
  });

  client.connect().catch((err) => {
    logger.warn(`Redis connection failed: ${err.message}`);
  });
};

/**
 * Get a cached value. Returns null on miss or Redis unavailability.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
const get = async (key) => {
  if (!isConnected || !client) return null;
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.warn(`Cache GET error for "${key}": ${err.message}`);
    return null;
  }
};

/**
 * Set a cached value with TTL.
 * @param {string} key
 * @param {any} value
 * @param {number} ttl - seconds
 */
const set = async (key, value, ttl = 60) => {
  if (!isConnected || !client) return;
  try {
    await client.setex(key, ttl, JSON.stringify(value));
  } catch (err) {
    logger.warn(`Cache SET error for "${key}": ${err.message}`);
  }
};

/**
 * Delete one or more cache keys. Supports glob patterns via SCAN+DEL.
 * @param {string|string[]} pattern
 */
const del = async (pattern) => {
  if (!isConnected || !client) return;
  try {
    if (Array.isArray(pattern)) {
      if (pattern.length) await client.del(...pattern);
      return;
    }
    // If pattern contains wildcard, use SCAN
    if (pattern.includes('*')) {
      const keys = await client.keys(pattern);
      if (keys.length) await client.del(...keys);
    } else {
      await client.del(pattern);
    }
  } catch (err) {
    logger.warn(`Cache DEL error for "${pattern}": ${err.message}`);
  }
};

/**
 * Cache-aside helper: return cached value or compute & cache it.
 * @param {string} key
 * @param {Function} fetchFn - async function that returns fresh data
 * @param {number} ttl - seconds
 */
const getOrSet = async (key, fetchFn, ttl = 60) => {
  const cached = await get(key);
  if (cached !== null) return cached;

  const fresh = await fetchFn();
  await set(key, fresh, ttl);
  return fresh;
};

const getClient = () => client;
const getStatus = () => isConnected;

module.exports = { connect, get, set, del, getOrSet, getClient, getStatus };

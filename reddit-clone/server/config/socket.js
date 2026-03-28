const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io = null;

/**
 * Initialises Socket.io attached to the HTTP server.
 * Authenticates connections via JWT cookie or Authorization header.
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Ping timeout/interval to detect stale connections
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Optional auth middleware — unauthenticated users can still join read rooms
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.username = decoded.username;
      } catch {
        // Token invalid — allow as anonymous
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id} (user: ${socket.userId || 'anon'})`);

    // ── Room management ─────────────────────────────────────────────────────

    /** Join a post room to receive real-time comment/vote updates */
    socket.on('join:post', (postId) => {
      if (!postId) return;
      socket.join(`post:${postId}`);
    });

    socket.on('leave:post', (postId) => {
      if (!postId) return;
      socket.leave(`post:${postId}`);
    });

    /** Join a subreddit room to receive new post notifications */
    socket.on('join:subreddit', (subredditName) => {
      if (!subredditName) return;
      socket.join(`subreddit:${subredditName}`);
    });

    socket.on('leave:subreddit', (subredditName) => {
      if (!subredditName) return;
      socket.leave(`subreddit:${subredditName}`);
    });

    /** Join personal notification room */
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('✅ Socket.io initialised');
  return io;
};

/** Returns the singleton io instance for use in controllers/services */
const getIO = () => {
  if (!io) throw new Error('Socket.io not initialised');
  return io;
};

/**
 * Emits a real-time vote update to all clients in a post room.
 * @param {string} postId
 * @param {{score: number, upvotes: number, downvotes: number, userId: string, direction: number}} data
 */
const emitPostVote = (postId, data) => {
  if (!io) return;
  io.to(`post:${postId}`).emit('post:vote', { postId, ...data });
};

/**
 * Emits a new comment to all clients in a post room.
 * @param {string} postId
 * @param {object} comment - Populated comment document
 */
const emitNewComment = (postId, comment) => {
  if (!io) return;
  io.to(`post:${postId}`).emit('comment:new', comment);
};

/**
 * Emits a comment vote update.
 */
const emitCommentVote = (postId, commentId, score) => {
  if (!io) return;
  io.to(`post:${postId}`).emit('comment:vote', { commentId, score });
};

/**
 * Emits a new post to all clients in a subreddit room.
 */
const emitNewPost = (subredditName, post) => {
  if (!io) return;
  io.to(`subreddit:${subredditName}`).emit('post:new', post);
};

/**
 * Sends a notification to a specific user's room.
 */
const emitNotification = (userId, notification) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification', notification);
};

module.exports = {
  initSocket,
  getIO,
  emitPostVote,
  emitNewComment,
  emitCommentVote,
  emitNewPost,
  emitNotification,
};

# Readit v2 — Production-Ready Reddit Clone

A full-stack Reddit clone rebuilt from the ground up with clean architecture, real-time features, AI moderation, Redis caching, and production-grade security.

![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)
![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-7-green?style=flat-square&logo=mongodb)
![Redis](https://img.shields.io/badge/Redis-7-red?style=flat-square&logo=redis)
![Socket.io](https://img.shields.io/badge/Socket.io-4-black?style=flat-square&logo=socket.io)

---

## Features

| Category | Feature |
|---|---|
| **Auth** | JWT-based auth, bcrypt hashing, protected routes |
| **Posts** | Text & link posts, create/delete, flair |
| **Voting** | Optimistic upvote/downvote with real-time sync |
| **Comments** | Nested threaded replies (up to 10 levels), collapse/expand |
| **Ranking** | Reddit-accurate hot score, Wilson score (best comments), controversy |
| **Real-time** | Socket.io — live votes, live comments, notifications |
| **Caching** | Redis cache-aside for feeds, posts, and user data |
| **AI Moderation** | Claude Haiku toxicity detection — flags/blocks harmful comments |
| **Search** | Full-text search for posts and communities (MongoDB `$text`) |
| **Rate Limiting** | Global API, auth brute-force, vote-farming protection |
| **Security** | Helmet, CORS, NoSQL injection sanitization, input size limits |
| **Performance** | Lazy-loaded pages, memoised components, optimistic UI |
| **UX** | Skeleton loaders, toast notifications, accessible markup |

---

## Project Structure

```
readit/
├── server/
│   ├── config/
│   │   ├── database.js        # MongoDB connection
│   │   ├── redis.js           # Redis cache-aside service
│   │   └── socket.js          # Socket.io setup + room helpers
│   ├── controllers/           # HTTP layer only — no business logic
│   │   ├── authController.js
│   │   ├── postController.js
│   │   ├── commentController.js
│   │   └── subredditController.js
│   ├── services/              # All business logic lives here
│   │   ├── authService.js
│   │   ├── postService.js     # Ranking, caching, pagination, search
│   │   ├── commentService.js  # Tree builder, AI toxicity check
│   │   ├── subredditService.js
│   │   └── aiService.js       # Claude Haiku toxicity detection
│   ├── models/
│   │   ├── User.js            # Password hashing pre-hook
│   │   ├── Post.js            # hotScore, text index, compound indexes
│   │   ├── Comment.js         # wilsonScore, toxicity fields
│   │   └── Subreddit.js       # Text index for search
│   ├── routes/                # Thin route files — validators + controllers
│   ├── middleware/
│   │   ├── auth.js            # JWT protect, optionalAuth, rate limiters
│   │   └── errorHandler.js    # Global error handler
│   ├── validators/index.js    # express-validator chains
│   ├── utils/
│   │   ├── ranking.js         # hotScore, wilsonScore, controversyScore
│   │   ├── appError.js        # AppError + asyncHandler
│   │   └── logger.js          # Winston logger
│   └── index.js               # Express app bootstrap
│
└── client/
    └── src/
        ├── context/
        │   ├── AuthContext.js
        │   ├── SocketContext.js       # Singleton Socket.io connection
        │   └── NotificationContext.js # Real-time notification state
        ├── hooks/
        │   ├── useVote.js             # Optimistic voting with rollback
        │   └── usePostSocket.js       # Post room subscription
        ├── components/
        │   ├── Layout/Navbar.js       # With notification bell + dropdown
        │   ├── Post/PostCard.js       # Memoised, uses useVote hook
        │   ├── Comment/Comment.js     # Recursive, memoised, inline reply
        │   └── UI/
        │       ├── Skeleton.js        # Post + comment skeleton loaders
        │       └── VoteButton.js      # Accessible, shared vote widget
        ├── pages/
        │   ├── Home.js           # Hot/New/Top feed with live socket room
        │   ├── PostDetail.js     # Live votes + comments via Socket.io
        │   ├── SubredditPage.js  # Community feed + join/leave
        │   ├── Search.js         # Full-text search, tabs, sort
        │   ├── Auth.js           # Login + Register
        │   ├── Submit.js         # Create post
        │   ├── CreateSubreddit.js
        │   └── Communities.js
        └── utils/api.js          # Axios with JWT interceptors
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register new user |
| `POST` | `/api/auth/login` | No | Login (returns JWT) |
| `GET`  | `/api/auth/me` | ✅ | Get current user |

### Posts
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET`  | `/api/posts` | No | Feed (`?sort=hot\|new\|top&subreddit=name&page=1`) |
| `GET`  | `/api/posts/search` | No | Full-text search (`?q=query&sort=relevance`) |
| `GET`  | `/api/posts/:id` | No | Single post |
| `POST` | `/api/posts` | ✅ | Create post |
| `POST` | `/api/posts/:id/vote` | ✅ | Vote (`{direction: 1\|-1}`) |
| `DELETE` | `/api/posts/:id` | ✅ | Delete own post |

### Comments
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET`  | `/api/comments?postId=x` | No | Nested comment tree |
| `POST` | `/api/comments` | ✅ | Create comment/reply |
| `POST` | `/api/comments/:id/vote` | ✅ | Vote on comment |
| `DELETE` | `/api/comments/:id` | ✅ | Soft-delete own comment |

### Subreddits
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET`  | `/api/subreddits` | No | List all (sorted by members) |
| `GET`  | `/api/subreddits/search?q=` | No | Full-text search |
| `GET`  | `/api/subreddits/:name` | No | Community detail |
| `POST` | `/api/subreddits` | ✅ | Create community |
| `POST` | `/api/subreddits/:name/join` | ✅ | Join/leave |

### Socket.io Events
| Event (client → server) | Description |
|---|---|
| `join:post <postId>` | Subscribe to live post updates |
| `leave:post <postId>` | Unsubscribe |
| `join:subreddit <name>` | Subscribe to new posts in subreddit |

| Event (server → client) | Payload |
|---|---|
| `post:vote` | `{postId, score, upvotes, downvotes, userVote}` |
| `comment:new` | Full populated comment object |
| `comment:vote` | `{commentId, score}` |
| `post:new` | Full populated post object |
| `notification` | `{type, message, postId, commentId}` |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 | UI framework |
| Routing | React Router v6 | Client-side routing |
| Real-time | Socket.io client | Live updates |
| HTTP client | Axios | API calls with JWT interceptors |
| Backend | Node.js + Express | REST API + WebSocket server |
| Database | MongoDB + Mongoose | Primary data store |
| Cache | Redis (ioredis) | Feed & query caching |
| Real-time | Socket.io | WebSocket server |
| AI | Anthropic Claude Haiku | Comment toxicity detection |
| Auth | JWT + bcryptjs | Authentication |
| Validation | express-validator | Request validation |
| Security | Helmet, mongo-sanitize | HTTP security headers & NoSQL injection |
| Rate limiting | express-rate-limit | Brute-force & abuse prevention |
| Logging | Winston | Structured logging |

---

## Local Setup

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Redis (local or Upstash) — *optional, app works without it*

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/readit.git
cd readit
npm run install-all   # installs root, server, and client deps
```

### 2. Configure environment

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/readit
JWT_SECRET=change_this_to_a_random_32+_character_string
JWT_EXPIRES_IN=7d
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=sk-ant-...   # optional — AI moderation disabled if not set
CLIENT_URL=http://localhost:3000
```

### 3. Run

```bash
# From project root
npm run dev
```

- Frontend: http://localhost:3000  
- Backend API: http://localhost:5000  
- Socket.io: http://localhost:5000 (same server)

---

## Deployment

### Frontend → Vercel

```bash
cd client
npm run build
# Deploy the build/ folder
```

Vercel settings:
- **Framework**: Create React App
- **Build command**: `npm run build`
- **Output directory**: `build`
- **Environment variable**: *(none required — API calls go through proxy in dev, direct URL in prod)*

> Update `client/src/utils/api.js`: change `baseURL` from `/api` to your deployed backend URL.

### Backend → Render / Railway

1. Connect your GitHub repo
2. Set root directory to `server/`
3. Build command: `npm install`
4. Start command: `node index.js`
5. Add all environment variables from `.env.example`

### Database → MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user
3. Whitelist `0.0.0.0/0` (or your server IP)
4. Copy the connection string into `MONGO_URI`

### Redis → Upstash (free tier)

1. Create a database at [upstash.com](https://upstash.com)
2. Copy the Redis URL into `REDIS_URL`

---

## AI Feature — Toxicity Detection

Comments are analysed by **Claude Haiku** before being saved:

- **Score > 0.9** → comment is **blocked** with a user-facing message
- **Score > 0.5** → comment is **saved but flagged** (`isFlagged: true`) for moderator review
- **Score ≤ 0.5** → comment is **allowed** normally
- **API unavailable** → falls back to allow (never blocks on AI failure)

To enable: set `ANTHROPIC_API_KEY` in your environment. To disable: leave it unset.

---

## Architecture Decisions

**Why separate services from controllers?**  
Controllers only read from `req` and write to `res`. All logic — caching, validation, DB queries — lives in services. This makes services independently testable and controllers trivially simple.

**Why denormalise `hotScore` onto the Post document?**  
MongoDB sorts are fast when the sort field is indexed. Computing hot score at query time for thousands of posts would be slow. Storing it and updating on every vote keeps sorting O(log n).

**Why soft-delete comments?**  
Deleting a comment hard-removes it from the tree, breaking reply chains. Soft-delete replaces the body with `[deleted]` but preserves the tree structure — exactly what Reddit does.

**Why cache-aside with Redis?**  
Cache-aside (check cache → miss → fetch DB → populate cache) is the simplest pattern that works with our read-heavy workload. The app is fully functional without Redis — it just hits MongoDB more often.

---

## License

MIT — see `LICENSE` for details.

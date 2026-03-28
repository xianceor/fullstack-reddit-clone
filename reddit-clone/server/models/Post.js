const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema(
  {
    title:     { type: String, required: true, trim: true, maxlength: 300 },
    body:      { type: String, default: '', maxlength: 40000 },
    url:       { type: String, default: '' },
    type:      { type: String, enum: ['text', 'link', 'image'], default: 'text' },
    flair:     { type: String, default: '', maxlength: 64 },
    author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subreddit: { type: mongoose.Schema.Types.ObjectId, ref: 'Subreddit', required: true, index: true },
    upvotes:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Denormalised scores updated on every vote — enables fast DB-level sorting
    score:            { type: Number, default: 1, index: true },
    hotScore:         { type: Number, default: 0, index: true },
    controversyScore: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    isNSFW:    { type: Boolean, default: false },
    isSpoiler: { type: Boolean, default: false },
    isPinned:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Full-text search index (title weighted 10x over body)
PostSchema.index({ title: 'text', body: 'text' }, { weights: { title: 10, body: 1 } });
// Compound feed indexes matching service query patterns
PostSchema.index({ subreddit: 1, hotScore: -1 });
PostSchema.index({ subreddit: 1, createdAt: -1 });
PostSchema.index({ subreddit: 1, score: -1 });

module.exports = mongoose.model('Post', PostSchema);

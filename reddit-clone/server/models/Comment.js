const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema(
  {
    body:      { type: String, required: true, maxlength: 10000 },
    author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    post:      { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    parent:    { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    children:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    upvotes:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    score:       { type: Number, default: 1 },
    wilsonScore: { type: Number, default: 0, index: true }, // for best-comment sorting
    depth:      { type: Number, default: 0 },
    isDeleted:  { type: Boolean, default: false },
    isFlagged:  { type: Boolean, default: false },   // AI toxicity flag
    toxicityScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CommentSchema.index({ post: 1, wilsonScore: -1 });

module.exports = mongoose.model('Comment', CommentSchema);

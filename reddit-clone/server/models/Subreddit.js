const mongoose = require('mongoose');

const SubredditSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 21 },
    description: { type: String, maxlength: 500, default: '' },
    banner:      { type: String, default: '' },
    icon:        { type: String, default: '' },
    creator:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    moderators:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    memberCount: { type: Number, default: 1, index: true },
    rules: [{ title: String, description: String }],
  },
  { timestamps: true }
);

SubredditSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Subreddit', SubredditSchema);

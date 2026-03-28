const Subreddit = require('../models/Subreddit');
const User = require('../models/User');
const cache = require('../config/redis');
const { AppError } = require('../utils/appError');

const CACHE_TTL = { LIST: 120, SINGLE: 60 };

/** Fetches all subreddits sorted by member count (cached). */
const getSubreddits = async () =>
  cache.getOrSet(
    'subreddits:all',
    () =>
      Subreddit.find()
        .sort({ memberCount: -1 })
        .limit(100)
        .populate('creator', 'username')
        .select('-members -__v')
        .lean(),
    CACHE_TTL.LIST
  );

/** Fetches a single subreddit by name. */
const getSubreddit = async (name) =>
  cache.getOrSet(
    `subreddit:${name}`,
    () =>
      Subreddit.findOne({ name })
        .populate('creator', 'username')
        .populate('moderators', 'username avatar')
        .select('-__v')
        .lean(),
    CACHE_TTL.SINGLE
  );

/** Creates a new subreddit and subscribes the creator. */
const createSubreddit = async ({ name, description, userId }) => {
  const exists = await Subreddit.findOne({ name }).lean();
  if (exists) throw new AppError(`r/${name} already exists`, 409);

  const subreddit = await Subreddit.create({
    name,
    description: description?.trim() || '',
    creator: userId,
    moderators: [userId],
    members: [userId],
    memberCount: 1,
  });

  await User.findByIdAndUpdate(userId, {
    $addToSet: { joinedSubreddits: subreddit._id },
  });

  // Invalidate list cache
  await cache.del('subreddits:all');
  await cache.del(`user:${userId}`);

  return subreddit;
};

/** Toggles membership of a user in a subreddit. Returns new state. */
const toggleMembership = async (subredditName, userId) => {
  const subreddit = await Subreddit.findOne({ name: subredditName });
  if (!subreddit) throw new AppError(`r/${subredditName} not found`, 404);

  const isMember = subreddit.members.some((id) => id.toString() === userId);

  if (isMember) {
    subreddit.members.pull(userId);
    subreddit.memberCount = Math.max(0, subreddit.memberCount - 1);
    await User.findByIdAndUpdate(userId, {
      $pull: { joinedSubreddits: subreddit._id },
    });
  } else {
    subreddit.members.push(userId);
    subreddit.memberCount += 1;
    await User.findByIdAndUpdate(userId, {
      $addToSet: { joinedSubreddits: subreddit._id },
    });
  }

  await subreddit.save();

  // Invalidate caches
  await cache.del(`subreddit:${subredditName}`);
  await cache.del('subreddits:all');
  await cache.del(`user:${userId}`);

  return { joined: !isMember, memberCount: subreddit.memberCount };
};

/** Full-text search for subreddits by name/description. */
const searchSubreddits = async (query) => {
  if (!query?.trim()) throw new AppError('Search query required', 400);
  return Subreddit.find({ $text: { $search: query } })
    .sort({ memberCount: -1 })
    .limit(20)
    .select('name description memberCount icon')
    .lean();
};

module.exports = {
  getSubreddits,
  getSubreddit,
  createSubreddit,
  toggleMembership,
  searchSubreddits,
};

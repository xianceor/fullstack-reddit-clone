import React, { memo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import useVote from '../../hooks/useVote';
import VoteButton from '../UI/VoteButton';
import api from '../../utils/api';
import toast from 'react-hot-toast';

/**
 * PostCard — memoised to avoid re-renders when sibling posts update.
 * Delegates vote logic to useVote hook (optimistic updates + rollback).
 */
const PostCard = memo(({ post, onDelete, onLiveVote }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  /* Derive initial vote state from server data */
  const initialVote = user
    ? post.upvotes?.some(id => (id?._id || id)?.toString() === user.id) ? 1
      : post.downvotes?.some(id => (id?._id || id)?.toString() === user.id) ? -1 : 0
    : 0;

  const { score, voteState, vote, isVoting } = useVote({
    initialScore: post.score ?? 0,
    initialVote,
    endpoint: `/posts/${post._id}/vote`,
  });

  const handleDelete = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Delete this post?')) return;
    try {
      await api.delete(`/posts/${post._id}`);
      toast.success('Post deleted');
      onDelete?.(post._id);
    } catch {
      toast.error('Failed to delete post');
    }
  }, [post._id, onDelete]);

  const handleShare = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/r/${post.subreddit?.name}/post/${post._id}`);
    toast.success('Link copied!');
  }, [post._id, post.subreddit?.name]);

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const subName = post.subreddit?.name;
  const postUrl = `/r/${subName}/post/${post._id}`;

  return (
    <article className="post-card card" role="article">
      <VoteButton
        score={score}
        voteState={voteState}
        onVote={vote}
        isVoting={isVoting}
      />

      <div className="post-content">
        {/* Meta line */}
        <div className="post-meta">
          <Link to={`/r/${subName}`} className="post-subreddit" onClick={e => e.stopPropagation()}>
            r/{subName}
          </Link>
          <span className="post-meta-sep">•</span>
          <span className="post-meta-muted">
            Posted by{' '}
            <Link to={`/user/${post.author?.username}`} className="post-author-link" onClick={e => e.stopPropagation()}>
              u/{post.author?.username}
            </Link>
          </span>
          <span className="post-meta-sep">•</span>
          <time className="post-meta-muted" dateTime={post.createdAt}>{timeAgo}</time>
        </div>

        {/* Title */}
        <Link to={postUrl} className="post-title-link">
          <h2 className="post-title">{post.title}</h2>
        </Link>

        {post.flair && <span className="post-flair">{post.flair}</span>}

        {/* Body preview */}
        {post.body && (
          <p className="post-body-preview">
            {post.body.length > 280 ? post.body.slice(0, 280) + '…' : post.body}
          </p>
        )}

        {post.type === 'link' && post.url && (
          <a href={post.url} target="_blank" rel="noopener noreferrer" className="post-link-chip" onClick={e => e.stopPropagation()}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
            {new URL(post.url).hostname}
          </a>
        )}

        {/* Action bar */}
        <div className="post-actions">
          <Link to={postUrl} className="post-action">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            {post.commentCount ?? 0} {post.commentCount === 1 ? 'Comment' : 'Comments'}
          </Link>
          <button className="post-action" onClick={handleShare}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
            Share
          </button>
          {user && (user.id === post.author?._id || user._id === post.author?._id) && (
            <button className="post-action post-action--danger" onClick={handleDelete}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6m5 0V4h4v2"/></svg>
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
});

PostCard.displayName = 'PostCard';
export default PostCard;

import React, { useState, useCallback, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import useVote from '../../hooks/useVote';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './Comment.css';

/**
 * Recursive Comment component.
 * - Uses useVote for optimistic voting
 * - Collapsed/expanded via thread-line click
 * - Inline reply form
 * - Memoised — only re-renders when its own comment data changes
 */
const Comment = memo(({ comment, postId, onReplyAdded }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying]   = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [children, setChildren]   = useState(comment.children || []);

  const initialVote = user
    ? comment.upvotes?.some(id => (id?._id || id)?.toString() === user.id) ? 1
      : comment.downvotes?.some(id => (id?._id || id)?.toString() === user.id) ? -1 : 0
    : 0;

  const { score, voteState, vote } = useVote({
    initialScore: comment.score ?? 0,
    initialVote,
    endpoint: `/comments/${comment._id}/vote`,
  });

  const handleReply = useCallback(async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    if (!user) { navigate('/login'); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/comments', { body: replyText, postId, parentId: comment._id });
      setChildren(prev => [...prev, res.data]);
      setReplyText('');
      setReplying(false);
      onReplyAdded?.();
      toast.success('Reply posted!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to post reply';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [replyText, user, postId, comment._id, onReplyAdded, navigate]);

  const isDeleted = comment.isDeleted || comment.body === '[deleted]';
  const timeAgo   = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });
  const indentStyle = { marginLeft: comment.depth > 0 ? 16 : 0 };

  return (
    <div className="comment" style={indentStyle}>
      {/* Collapsible thread line */}
      <button
        className="comment-thread-line"
        onClick={() => setCollapsed(c => !c)}
        aria-label={collapsed ? 'Expand comment' : 'Collapse comment'}
        title={collapsed ? 'Expand' : 'Collapse'}
      />

      <div className="comment-body-wrap">
        {/* Header */}
        <div className="comment-header">
          <button className="comment-collapse-glyph" onClick={() => setCollapsed(c => !c)} aria-hidden="true">
            [{collapsed ? '+' : '−'}]
          </button>
          <Link to={`/user/${comment.author?.username}`} className="comment-author">
            u/{comment.author?.username ?? '[deleted]'}
          </Link>
          <span className={`comment-score ${voteState === 1 ? 'score-up' : voteState === -1 ? 'score-down' : ''}`}>
            {score} {score === 1 ? 'point' : 'points'}
          </span>
          <time className="comment-time" dateTime={comment.createdAt}>{timeAgo}</time>
          {comment.isFlagged && (
            <span className="comment-flag-badge" title="Flagged by AI moderation">⚠ flagged</span>
          )}
        </div>

        {!collapsed && (
          <>
            <p className={`comment-text ${isDeleted ? 'comment-text--deleted' : ''}`}>
              {comment.body}
            </p>

            {!isDeleted && (
              <div className="comment-actions">
                {/* Inline vote buttons */}
                <button
                  className={`comment-vote-btn ${voteState === 1 ? 'active-up' : ''}`}
                  onClick={() => vote(1)}
                  aria-label="Upvote"
                  aria-pressed={voteState === 1}
                >▲</button>
                <button
                  className={`comment-vote-btn ${voteState === -1 ? 'active-down' : ''}`}
                  onClick={() => vote(-1)}
                  aria-label="Downvote"
                  aria-pressed={voteState === -1}
                >▼</button>

                {user && comment.depth < 10 && (
                  <button
                    className="comment-action-btn"
                    onClick={() => setReplying(r => !r)}
                  >
                    Reply
                  </button>
                )}
              </div>
            )}

            {/* Inline reply form */}
            {replying && (
              <form className="comment-reply-form" onSubmit={handleReply}>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="What are your thoughts?"
                  rows={4}
                  autoFocus
                  maxLength={10000}
                  className="comment-reply-textarea"
                />
                <div className="comment-reply-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setReplying(false); setReplyText(''); }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={submitting || !replyText.trim()}
                  >
                    {submitting ? 'Posting…' : 'Reply'}
                  </button>
                </div>
              </form>
            )}

            {/* Recursive children */}
            {children.length > 0 && (
              <div className="comment-children">
                {children.map(child => (
                  <Comment
                    key={child._id}
                    comment={child}
                    postId={postId}
                    onReplyAdded={onReplyAdded}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

Comment.displayName = 'Comment';
export default Comment;

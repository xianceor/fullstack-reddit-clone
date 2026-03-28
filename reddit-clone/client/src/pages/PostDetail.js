import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import useVote from '../hooks/useVote';
import usePostSocket from '../hooks/usePostSocket';
import VoteButton from '../components/UI/VoteButton';
import { PostSkeleton, CommentSkeleton } from '../components/UI/Skeleton';
import toast from 'react-hot-toast';
import './PostDetail.css';

const Comment = lazy(() => import('../components/Comment/Comment'));

const PostDetail = () => {
  const { postId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost]         = useState(null);
  const [comments, setComments] = useState([]);
  const [postLoading, setPostLoading]       = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [liveVoters, setLiveVoters]   = useState(new Set()); // track who voted live

  /* Fetch post and comments in parallel */
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await api.get(`/posts/${postId}`);
        setPost(res.data);
      } catch { toast.error('Post not found'); navigate('/'); }
      finally { setPostLoading(false); }
    };

    const fetchComments = async () => {
      try {
        const res = await api.get(`/comments?postId=${postId}`);
        setComments(res.data);
      } catch { toast.error('Failed to load comments'); }
      finally { setCommentsLoading(false); }
    };

    fetchPost();
    fetchComments();
  }, [postId, navigate]);

  /* Voting on the post itself */
  const initialVote = user && post
    ? post.upvotes?.some(id => (id?._id || id)?.toString() === user.id) ? 1
      : post.downvotes?.some(id => (id?._id || id)?.toString() === user.id) ? -1 : 0
    : 0;

  const { score, voteState, vote } = useVote({
    initialScore: post?.score ?? 0,
    initialVote,
    endpoint: `/posts/${postId}/vote`,
  });

  /* Real-time handlers via Socket.io */
  const handleLiveVote = useCallback((data) => {
    if (data.postId === postId) {
      // Show a subtle pulse indicator that someone else voted
      setLiveVoters(prev => new Set([...prev, data.userId]));
    }
  }, [postId]);

  const handleNewComment = useCallback((comment) => {
    setComments(prev => {
      // Avoid duplicates if the current user's own post echoes back
      if (prev.some(c => c._id === comment._id)) return prev;
      return [comment, ...prev];
    });
    setPost(p => p ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p);
  }, []);

  const handleCommentVote = useCallback(({ commentId, score: newScore }) => {
    setComments(prev => updateCommentScore(prev, commentId, newScore));
  }, []);

  usePostSocket(postId, {
    onVote:        handleLiveVote,
    onComment:     handleNewComment,
    onCommentVote: handleCommentVote,
  });

  /* Recursive score update helper */
  const updateCommentScore = (comments, id, score) =>
    comments.map(c => ({
      ...c,
      score: c._id === id ? score : c.score,
      children: c.children ? updateCommentScore(c.children, id, score) : [],
    }));

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!user) { navigate('/login'); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/comments', { body: commentText, postId });
      // Socket will echo this back; handleNewComment deduplicates
      setComments(prev => [res.data, ...prev]);
      setPost(p => ({ ...p, commentCount: (p.commentCount || 0) + 1 }));
      setCommentText('');
      toast.success('Comment posted!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (postLoading) return (
    <div className="postdetail-layout">
      <main className="postdetail-main"><PostSkeleton /></main>
    </div>
  );

  if (!post) return null;

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  return (
    <div className="postdetail-layout">
      <main className="postdetail-main">

        {/* Post card */}
        <article className="card postdetail-card">
          <VoteButton score={score} voteState={voteState} onVote={vote} size="lg" />

          <div className="postdetail-content">
            <div className="post-meta">
              <Link to={`/r/${post.subreddit?.name}`} className="post-subreddit">
                r/{post.subreddit?.name}
              </Link>
              <span className="post-meta-sep">•</span>
              <span className="post-meta-muted">
                Posted by <Link to={`/user/${post.author?.username}`} className="post-author-link">
                  u/{post.author?.username}
                </Link>
              </span>
              <span className="post-meta-sep">•</span>
              <time className="post-meta-muted" dateTime={post.createdAt}>{timeAgo}</time>
            </div>

            <h1 className="postdetail-title">{post.title}</h1>
            {post.flair && <span className="post-flair">{post.flair}</span>}
            {post.body && <div className="postdetail-body">{post.body}</div>}
            {post.type === 'link' && post.url && (
              <a href={post.url} target="_blank" rel="noopener noreferrer" className="post-link-chip">
                🔗 {post.url}
              </a>
            )}
          </div>
        </article>

        {/* Comment form */}
        <section className="card comment-box" aria-label="Add a comment">
          {user ? (
            <>
              <p className="comment-box-label">
                Commenting as{' '}
                <Link to={`/user/${user.username}`} className="comment-box-user">
                  u/{user.username}
                </Link>
              </p>
              <form onSubmit={handleComment}>
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="What are your thoughts?"
                  rows={5}
                  maxLength={10000}
                  className="comment-box-textarea"
                  aria-label="Comment text"
                />
                <div className="comment-box-footer">
                  <span className="comment-char-count">{commentText.length}/10,000</span>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={submitting || !commentText.trim()}
                  >
                    {submitting ? 'Posting…' : 'Comment'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <p className="comment-box-guest">
              <Link to="/login">Log in</Link> or <Link to="/register">sign up</Link> to leave a comment
            </p>
          )}
        </section>

        {/* Comments section */}
        <section className="comments-section" aria-label="Comments">
          <div className="comments-header">
            <span>{post.commentCount ?? 0} {post.commentCount === 1 ? 'Comment' : 'Comments'}</span>
            <div className="comments-live-indicator" aria-live="polite">
              {liveVoters.size > 0 && (
                <span className="live-dot" title="Live activity">● Live</span>
              )}
            </div>
          </div>

          {commentsLoading ? (
            <>{[1,2,3].map(i => <CommentSkeleton key={i} />)}</>
          ) : comments.length === 0 ? (
            <p className="comments-empty">No comments yet — be the first!</p>
          ) : (
            <Suspense fallback={<CommentSkeleton />}>
              {comments.map(c => (
                <Comment
                  key={c._id}
                  comment={c}
                  postId={postId}
                  onReplyAdded={() => setPost(p => ({ ...p, commentCount: (p.commentCount || 0) + 1 }))}
                />
              ))}
            </Suspense>
          )}
        </section>
      </main>

      {/* Sidebar */}
      <aside className="postdetail-sidebar">
        {post.subreddit && (
          <div className="card sidebar-section">
            <div className="sidebar-sub-banner" />
            <div className="sidebar-sub-body">
              <Link to={`/r/${post.subreddit.name}`} className="sidebar-sub-name">
                r/{post.subreddit.name}
              </Link>
              {post.subreddit.description && (
                <p className="sidebar-sub-desc">{post.subreddit.description}</p>
              )}
              <div className="sidebar-sub-stat">
                <strong>{post.subreddit.memberCount?.toLocaleString()}</strong>
                <span> members</span>
              </div>
              {user && (
                <Link
                  to={`/submit?subreddit=${post.subreddit.name}`}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
                >
                  Create Post
                </Link>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};

export default PostDetail;

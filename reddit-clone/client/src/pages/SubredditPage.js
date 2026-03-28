import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import PostCard from '../components/Post/PostCard';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './SubredditPage.css';

const SubredditPage = () => {
  const { subredditName } = useParams();
  const { user } = useAuth();
  const [subreddit, setSubreddit] = useState(null);
  const [posts, setPosts] = useState([]);
  const [sort, setSort] = useState('hot');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    api.get(`/subreddits/${subredditName}`)
      .then(res => {
        setSubreddit(res.data);
        setMemberCount(res.data.memberCount);
        if (user) setJoined(res.data.members?.includes(user._id));
      })
      .catch(() => toast.error('Subreddit not found'));
  }, [subredditName, user]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/posts?subreddit=${subredditName}&sort=${sort}&page=${page}`);
      setPosts(res.data.posts);
      setTotalPages(res.data.pages);
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [subredditName, sort, page]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleJoin = async () => {
    if (!user) { toast.error('Please log in first'); return; }
    try {
      const res = await api.post(`/subreddits/${subredditName}/join`);
      setJoined(res.data.joined);
      setMemberCount(res.data.memberCount);
      toast.success(res.data.joined ? `Joined r/${subredditName}!` : `Left r/${subredditName}`);
    } catch { toast.error('Failed to update membership'); }
  };

  const handleDelete = (id) => setPosts(prev => prev.filter(p => p._id !== id));

  return (
    <div className="subreddit-page">
      {/* Banner */}
      <div className="subreddit-banner">
        <div className="subreddit-banner-bg"/>
        <div className="subreddit-banner-content">
          <div className="subreddit-icon">{subredditName[0].toUpperCase()}</div>
          <div className="subreddit-banner-info">
            <h1 className="subreddit-display-name">r/{subredditName}</h1>
            <span className="subreddit-name-sub">r/{subredditName}</span>
          </div>
          <div className="subreddit-banner-actions">
            <button
              className={`btn ${joined ? 'btn-joined' : 'btn-join'}`}
              onClick={handleJoin}
            >
              {joined ? 'Joined' : 'Join'}
            </button>
            {user && (
              <Link to={`/submit?subreddit=${subredditName}`} className="btn btn-primary">
                + Create Post
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="subreddit-layout">
        <main className="subreddit-feed">
          {/* Sort bar */}
          <div className="sort-bar card">
            {['hot', 'new', 'top'].map(s => (
              <button
                key={s}
                className={`sort-btn ${sort === s ? 'active' : ''}`}
                onClick={() => { setSort(s); setPage(1); }}
              >
                {s === 'hot' && '🔥'}{s === 'new' && '✨'}{s === 'top' && '📈'}
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="feed-loading">
              {[1,2,3].map(i => <div key={i} className="post-skeleton card"/>)}
            </div>
          ) : posts.length === 0 ? (
            <div className="feed-empty card">
              <h3>No posts yet</h3>
              <p>Be the first to post in r/{subredditName}!</p>
              {user && (
                <Link to={`/submit?subreddit=${subredditName}`} className="btn btn-primary" style={{marginTop:12}}>
                  Create Post
                </Link>
              )}
            </div>
          ) : (
            <div className="feed-posts">
              {posts.map(post => (
                <PostCard key={post._id} post={post} onDelete={handleDelete} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-secondary btn-sm" disabled={page===1} onClick={() => setPage(p=>p-1)}>← Prev</button>
              <span className="page-info">Page {page} of {totalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>Next →</button>
            </div>
          )}
        </main>

        <aside className="subreddit-sidebar">
          {subreddit && (
            <div className="card sidebar-section">
              <div className="sidebar-section-title">About Community</div>
              <div style={{padding: '12px 16px'}}>
                <p style={{fontSize:14, lineHeight:1.6}}>{subreddit.description || 'No description yet.'}</p>
                <div className="subreddit-stats">
                  <div className="subreddit-stat">
                    <span className="subreddit-stat-value">{memberCount.toLocaleString()}</span>
                    <span className="subreddit-stat-label">Members</span>
                  </div>
                </div>
                <div style={{borderTop:'1px solid var(--border)', paddingTop:12, fontSize:13, color:'var(--text-secondary)'}}>
                  Created by u/{subreddit.creator?.username}
                </div>
                {user && (
                  <Link
                    to={`/submit?subreddit=${subredditName}`}
                    className="btn btn-primary btn-sm"
                    style={{marginTop:12, display:'block', textAlign:'center', justifyContent:'center'}}
                  >
                    Create Post
                  </Link>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default SubredditPage;

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import PostCard from '../components/Post/PostCard';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Home.css';

const SORTS = ['hot', 'new', 'top'];

const Home = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [sort, setSort] = useState('hot');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [topSubs, setTopSubs] = useState([]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/posts?sort=${sort}&page=${page}`);
      setPosts(res.data.posts);
      setTotalPages(res.data.pages);
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [sort, page]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  useEffect(() => {
    api.get('/subreddits').then(res => setTopSubs(res.data.slice(0, 5))).catch(() => {});
  }, []);

  const handleDelete = (id) => setPosts(prev => prev.filter(p => p._id !== id));

  return (
    <div className="home-layout">
      <main className="home-feed">
        {/* Sort bar */}
        <div className="sort-bar card">
          {SORTS.map(s => (
            <button
              key={s}
              className={`sort-btn ${sort === s ? 'active' : ''}`}
              onClick={() => { setSort(s); setPage(1); }}
            >
              {s === 'hot' && '🔥'}
              {s === 'new' && '✨'}
              {s === 'top' && '📈'}
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Posts */}
        {loading ? (
          <div className="feed-loading">
            {[1,2,3,4,5].map(i => <div key={i} className="post-skeleton card"/>)}
          </div>
        ) : (posts?.length === 0) ? (
          <div className="feed-empty card">
            <h3>No posts yet</h3>
            <p>Be the first to post something!</p>
            <Link to="/submit" className="btn btn-primary" style={{marginTop: 12}}>Create Post</Link>
          </div>
        ) : (
          <div className="feed-posts">
            {posts?.map(post => (
              <PostCard key={post._id} post={post} onDelete={handleDelete} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-secondary btn-sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Prev
            </button>
            <span className="page-info">Page {page} of {totalPages}</span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </main>

      {/* Sidebar */}
      <aside className="home-sidebar">
        {/* Create post */}
        {user ? (
          <div className="card sidebar-create">
            <div className="sidebar-create-header">
              <div className="sidebar-avatar">{user.username[0].toUpperCase()}</div>
              <Link to="/submit" className="sidebar-create-input">Create Post</Link>
            </div>
            <div className="sidebar-create-actions">
              <Link to="/submit" className="btn btn-primary" style={{flex:1, justifyContent:'center'}}>
                Post
              </Link>
              <Link to="/r/create" className="btn btn-secondary" style={{flex:1, justifyContent:'center'}}>
                Community
              </Link>
            </div>
          </div>
        ) : (
          <div className="card sidebar-login">
            <div className="sidebar-login-banner"/>
            <div className="sidebar-login-body">
              <p>The front page of the internet.</p>
              <p>Come for the posts. Stay for the community.</p>
              <Link to="/register" className="btn btn-primary" style={{width:'100%', justifyContent:'center', marginTop:12}}>
                Get Started
              </Link>
              <Link to="/login" className="btn btn-secondary" style={{width:'100%', justifyContent:'center', marginTop:8}}>
                Log In
              </Link>
            </div>
          </div>
        )}

        {/* Top Communities */}
        {topSubs.length > 0 && (
          <div className="card sidebar-section">
            <div className="sidebar-section-title">Top Communities</div>
            {topSubs.map((sub, i) => (
              <Link key={sub._id} to={`/r/${sub.name}`} className="sidebar-sub-item">
                <span className="sidebar-sub-rank">{i + 1}</span>
                <div className="sidebar-sub-icon">{sub.name[0].toUpperCase()}</div>
                <div className="sidebar-sub-info">
                  <span className="sidebar-sub-name">r/{sub.name}</span>
                  <span className="sidebar-sub-members">{sub.memberCount.toLocaleString()} members</span>
                </div>
              </Link>
            ))}
            <Link to="/communities" className="btn btn-secondary btn-sm" style={{margin:'12px 16px 4px', display:'block', textAlign:'center'}}>
              View All Communities
            </Link>
          </div>
        )}

        <div className="card sidebar-section sidebar-footer">
          <p>Readit Inc © {new Date().getFullYear()}. All rights reserved.</p>
        </div>
      </aside>
    </div>
  );
};

export default Home;

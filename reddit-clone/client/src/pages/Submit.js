import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Submit.css';

const POST_TYPES = [
  { id: 'text', label: '📝 Text', desc: 'Share your thoughts' },
  { id: 'link', label: '🔗 Link', desc: 'Share a URL' },
];

const Submit = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [type, setType] = useState('text');
  const [form, setForm] = useState({
    title: '',
    body: '',
    url: '',
    subredditName: searchParams.get('subreddit') || '',
    flair: '',
  });
  const [subreddits, setSubreddits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    api.get('/subreddits').then(res => setSubreddits(res.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.subredditName) { setError('Please choose a community'); return; }
    if (type === 'link' && !form.url) { setError('URL is required for link posts'); return; }

    setLoading(true);
    try {
      const res = await api.post('/posts', { ...form, type });
      toast.success('Post created!');
      navigate(`/r/${form.subredditName}/post/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="submit-page">
      <div className="submit-layout">
        <main className="submit-main">
          <h1 className="submit-title">Create a Post</h1>

          {/* Post type tabs */}
          <div className="submit-type-tabs card">
            {POST_TYPES.map(t => (
              <button
                key={t.id}
                className={`submit-type-tab ${type === t.id ? 'active' : ''}`}
                onClick={() => setType(t.id)}
                type="button"
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="card submit-form-card">
            {error && <div className="auth-error" style={{marginBottom:16}}>{error}</div>}

            <form onSubmit={handleSubmit}>
              {/* Community */}
              <div className="form-group" style={{marginBottom:16}}>
                <label>Community *</label>
                <select
                  value={form.subredditName}
                  onChange={e => setForm(f => ({ ...f, subredditName: e.target.value }))}
                  required
                >
                  <option value="">Choose a community</option>
                  {subreddits.map(s => (
                    <option key={s._id} value={s.name}>r/{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="form-group" style={{marginBottom:16}}>
                <label>Title *</label>
                <input
                  type="text"
                  maxLength={300}
                  placeholder="An interesting title"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
                <span style={{fontSize:11, color:'var(--text-secondary)', textAlign:'right'}}>
                  {form.title.length}/300
                </span>
              </div>

              {/* Flair */}
              <div className="form-group" style={{marginBottom:16}}>
                <label>Flair (optional)</label>
                <input
                  type="text"
                  placeholder="Add a flair tag"
                  value={form.flair}
                  onChange={e => setForm(f => ({ ...f, flair: e.target.value }))}
                />
              </div>

              {/* Body / URL */}
              {type === 'text' && (
                <div className="form-group" style={{marginBottom:16}}>
                  <label>Body (optional)</label>
                  <textarea
                    placeholder="What's on your mind? (optional)"
                    rows={8}
                    value={form.body}
                    onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  />
                </div>
              )}

              {type === 'link' && (
                <div className="form-group" style={{marginBottom:16}}>
                  <label>URL *</label>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={form.url}
                    onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    required
                  />
                </div>
              )}

              <div className="submit-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Posting…' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </main>

        <aside className="submit-sidebar">
          <div className="card sidebar-section">
            <div className="sidebar-section-title">Posting Tips</div>
            <ul className="submit-tips">
              <li>Remember the human — be kind and respectful</li>
              <li>Behave like you would in real life</li>
              <li>Look for the original source of content</li>
              <li>Search for duplicates before posting</li>
              <li>Read the community rules before posting</li>
            </ul>
          </div>
          <div className="card sidebar-section" style={{padding:'12px 16px'}}>
            <p style={{fontSize:13, marginBottom:8}}>
              Don't have a community to post in?
            </p>
            <Link to="/r/create" className="btn btn-secondary btn-sm" style={{display:'block', textAlign:'center'}}>
              Create a Community
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Submit;

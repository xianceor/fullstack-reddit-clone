import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './CreateSubreddit.css';

const CreateSubreddit = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) { navigate('/login'); return null; }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.name.length < 3) { setError('Name must be at least 3 characters'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(form.name)) {
      setError('Name can only contain letters, numbers, and underscores');
      return;
    }
    setLoading(true);
    try {
      await api.post('/subreddits', form);
      toast.success(`r/${form.name} created!`);
      navigate(`/r/${form.name}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create community');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-sub-page">
      <div className="create-sub-card card">
        <div className="create-sub-header">
          <h1>Create a Community</h1>
          <p>Build a place for people who share your interests.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{marginBottom:16}}>
            <label>Name *</label>
            <div className="create-sub-name-input">
              <span className="create-sub-prefix">r/</span>
              <input
                type="text"
                placeholder="community_name"
                maxLength={21}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <span style={{fontSize:11, color:'var(--text-secondary)'}}>
              Community names cannot be changed later. Letters, numbers, underscores only.
            </span>
          </div>

          <div className="form-group" style={{marginBottom:24}}>
            <label>Description (optional)</label>
            <textarea
              placeholder="Tell people what your community is about"
              maxLength={500}
              rows={4}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <span style={{fontSize:11, color:'var(--text-secondary)', textAlign:'right'}}>
              {form.description.length}/500
            </span>
          </div>

          <div className="submit-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create Community'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSubreddit;

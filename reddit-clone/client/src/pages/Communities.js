import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './Communities.css';

const Communities = () => {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/subreddits')
      .then(res => setSubs(res.data))
      .catch(() => toast.error('Failed to load communities'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = subs.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="communities-page">
      <div className="communities-header">
        <h1>Explore Communities</h1>
        <p>Find a community for every interest</p>
      </div>

      <div className="communities-content">
        <div className="communities-search-bar">
          <input
            placeholder="Search communities..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Link to="/r/create" className="btn btn-primary">+ Create Community</Link>
        </div>

        {loading ? (
          <div className="communities-grid">
            {[1,2,3,4,5,6].map(i => <div key={i} className="card community-skeleton"/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="communities-empty card">
            <h3>No communities found</h3>
            <p>Try a different search or create your own!</p>
            <Link to="/r/create" className="btn btn-primary" style={{marginTop:12}}>
              Create Community
            </Link>
          </div>
        ) : (
          <div className="communities-grid">
            {filtered.map((sub, i) => (
              <Link key={sub._id} to={`/r/${sub.name}`} className="community-card card">
                <div className="community-card-banner"/>
                <div className="community-card-body">
                  <div className="community-card-icon">{sub.name[0].toUpperCase()}</div>
                  <div className="community-card-info">
                    <h3 className="community-card-name">r/{sub.name}</h3>
                    <p className="community-card-desc">
                      {sub.description || 'No description available.'}
                    </p>
                    <div className="community-card-meta">
                      <span>{sub.memberCount.toLocaleString()} members</span>
                    </div>
                  </div>
                  <button className="btn btn-join btn-sm community-join-btn">Join</button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Communities;

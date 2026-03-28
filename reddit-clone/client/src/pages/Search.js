import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';
import PostCard from '../components/Post/PostCard';
import { PostSkeleton } from '../components/UI/Skeleton';
import toast from 'react-hot-toast';
import './Search.css';

const SORTS = ['relevance', 'new', 'top'];
const TABS  = ['posts', 'communities'];

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query  = searchParams.get('q') || '';
  const sortParam = searchParams.get('sort') || 'relevance';
  const tabParam  = searchParams.get('tab')  || 'posts';

  const [posts,  setPosts]   = useState([]);
  const [subs,   setSubs]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [postsMeta, setPostsMeta] = useState({ total: 0, pages: 1 });
  const [page, setPage] = useState(1);

  const abortRef = useRef(null);

  const search = useCallback(async () => {
    if (!query.trim()) return;

    // Cancel in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      if (tabParam === 'posts') {
        const res = await api.get('/posts/search', {
          params: { q: query, sort: sortParam, page },
          signal: abortRef.current.signal,
        });
        setPosts(res.data.posts);
        setPostsMeta(res.data.pagination);
      } else {
        const res = await api.get('/subreddits/search', {
          params: { q: query },
          signal: abortRef.current.signal,
        });
        setSubs(res.data);
      }
    } catch (err) {
      if (err.name !== 'CanceledError') toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  }, [query, sortParam, tabParam, page]);

  useEffect(() => {
    search();
  }, [search]);

  const setSort = (s) => setSearchParams({ q: query, sort: s, tab: tabParam });
  const setTab  = (t) => setSearchParams({ q: query, sort: sortParam, tab: t });

  if (!query) return (
    <div className="search-empty-state">
      <div className="search-empty-icon">🔍</div>
      <h2>Search Readit</h2>
      <p>Find posts, communities, and more.</p>
    </div>
  );

  return (
    <div className="search-layout">
      <main className="search-main">
        <div className="search-header">
          <h1 className="search-title">
            Results for <em>"{query}"</em>
          </h1>
          {tabParam === 'posts' && postsMeta.total > 0 && (
            <span className="search-count">{postsMeta.total.toLocaleString()} posts</span>
          )}
        </div>

        {/* Tabs */}
        <div className="search-tabs card">
          {TABS.map(t => (
            <button
              key={t}
              className={`search-tab ${tabParam === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'posts' ? '📄 Posts' : '🏘️ Communities'}
            </button>
          ))}
        </div>

        {/* Sort (posts only) */}
        {tabParam === 'posts' && (
          <div className="search-sort card">
            <span className="search-sort-label">Sort by</span>
            {SORTS.map(s => (
              <button
                key={s}
                className={`sort-btn ${sortParam === s ? 'active' : ''}`}
                onClick={() => setSort(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="search-results">
            {[1,2,3].map(i => <PostSkeleton key={i} />)}
          </div>
        ) : tabParam === 'posts' ? (
          posts.length === 0 ? (
            <NoResults query={query} />
          ) : (
            <>
              <div className="search-results">
                {posts.map(p => <PostCard key={p._id} post={p} />)}
              </div>
              {postsMeta.pages > 1 && (
                <div className="pagination">
                  <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  <span className="page-info">Page {page} of {postsMeta.pages}</span>
                  <button className="btn btn-secondary btn-sm" disabled={page === postsMeta.pages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              )}
            </>
          )
        ) : (
          subs.length === 0 ? (
            <NoResults query={query} />
          ) : (
            <div className="search-communities">
              {subs.map(s => (
                <Link key={s._id} to={`/r/${s.name}`} className="card search-community-card">
                  <div className="search-community-icon">{s.name[0].toUpperCase()}</div>
                  <div className="search-community-info">
                    <strong className="search-community-name">r/{s.name}</strong>
                    <span className="search-community-members">{s.memberCount?.toLocaleString()} members</span>
                    {s.description && <p className="search-community-desc">{s.description}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </main>

      <aside className="search-sidebar">
        <div className="card sidebar-section" style={{ padding: 16 }}>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Search Tips</p>
          <ul style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: 16 }}>
            <li>Use quotes for exact phrases</li>
            <li>Switch to Communities tab to find subreddits</li>
            <li>Sort by New to see fresh content</li>
          </ul>
        </div>
      </aside>
    </div>
  );
};

const NoResults = ({ query }) => (
  <div className="search-no-results card">
    <div style={{ fontSize: 48 }}>🤷</div>
    <h3>No results for "{query}"</h3>
    <p>Try different keywords or check your spelling.</p>
  </div>
);

export default Search;

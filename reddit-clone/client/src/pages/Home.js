import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../utils/api";
import PostCard from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import "./Home.css";

const SORTS = ["hot", "new", "top"];

const Home = () => {
  const { user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [sort, setSort] = useState("hot");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/posts?sort=${sort}&page=${page}`);

      const data = res.data;

      // 🧠 HANDLE ALL POSSIBLE BACKEND FORMATS
      let safePosts = [];

      if (Array.isArray(data)) {
        safePosts = data;
      } else if (Array.isArray(data.posts)) {
        safePosts = data.posts;
      } else if (Array.isArray(data.data)) {
        safePosts = data.data;
      }

      setPosts(safePosts);
      setTotalPages(data.pages || 1);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load posts");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [sort, page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="home">
      {/* Sort Buttons */}
      <div className="sort-bar">
        {SORTS.map((s) => (
          <button
            key={s}
            className={sort === s ? "active" : ""}
            onClick={() => setSort(s)}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* POSTS */}
      {loading ? (
        <div className="feed-loading">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="post-skeleton card" />
          ))}
        </div>
      ) : Array.isArray(posts) && posts.length === 0 ? (
        <div className="feed-empty card">
          <h3>No posts yet</h3>
          <p>Be the first to post something!</p>
          <Link to="/submit" className="btn btn-primary">
            Create Post
          </Link>
        </div>
      ) : (
        <div className="feed-posts">
          {Array.isArray(posts) &&
            posts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </button>

          <span>
            Page {page} / {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

/**
 * Reusable hook for voting on posts or comments.
 * Applies optimistic updates so the UI feels instant.
 *
 * @param {object} opts
 * @param {number}  opts.initialScore
 * @param {number}  opts.initialVote  - 1 | 0 | -1
 * @param {string}  opts.endpoint     - '/posts/:id/vote' or '/comments/:id/vote'
 */
const useVote = ({ initialScore = 0, initialVote = 0, endpoint }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [score, setScore] = useState(initialScore);
  const [voteState, setVoteState] = useState(initialVote);
  const [isVoting, setIsVoting] = useState(false);

  const vote = useCallback(
    async (direction) => {
      if (!user) {
        navigate('/login');
        return;
      }
      if (isVoting) return;

      // Optimistic update
      const prevScore = score;
      const prevVote = voteState;

      const newVote = voteState === direction ? 0 : direction;
      const scoreDelta = newVote - voteState;
      setScore((s) => s + scoreDelta);
      setVoteState(newVote);
      setIsVoting(true);

      try {
        const res = await api.post(endpoint, { direction });
        // Reconcile with server response
        setScore(res.data.score);
        setVoteState(res.data.userVote ?? newVote);
      } catch (err) {
        // Rollback on failure
        setScore(prevScore);
        setVoteState(prevVote);
        toast.error(err.response?.data?.message || 'Vote failed');
      } finally {
        setIsVoting(false);
      }
    },
    [user, score, voteState, isVoting, endpoint, navigate]
  );

  return { score, voteState, vote, isVoting };
};

export default useVote;

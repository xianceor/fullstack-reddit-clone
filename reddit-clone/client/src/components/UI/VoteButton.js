import React from 'react';
import './VoteButton.css';

/**
 * Vertical vote widget — upvote / score / downvote.
 * Purely presentational; parent handles vote logic via useVote hook.
 */
const VoteButton = ({ score, voteState, onVote, isVoting, size = 'md' }) => {
  const fmt = (n) => (Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : n);

  return (
    <div className={`vote-widget vote-widget--${size}`} aria-label="Vote">
      <button
        className={`vote-btn vote-up ${voteState === 1 ? 'active' : ''}`}
        onClick={() => onVote(1)}
        disabled={isVoting}
        aria-label="Upvote"
        aria-pressed={voteState === 1}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 4l8 8H4z" />
        </svg>
      </button>

      <span
        className={`vote-score ${voteState === 1 ? 'score-up' : voteState === -1 ? 'score-down' : ''}`}
        aria-label={`${score} points`}
      >
        {fmt(score)}
      </span>

      <button
        className={`vote-btn vote-down ${voteState === -1 ? 'active' : ''}`}
        onClick={() => onVote(-1)}
        disabled={isVoting}
        aria-label="Downvote"
        aria-pressed={voteState === -1}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 20l-8-8h16z" />
        </svg>
      </button>
    </div>
  );
};

export default VoteButton;

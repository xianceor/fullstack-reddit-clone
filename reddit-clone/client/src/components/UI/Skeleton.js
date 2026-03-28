import React from 'react';
import './Skeleton.css';

/**
 * Generic skeleton block for loading states.
 * Pass width/height as inline styles or use preset variants.
 */
export const Skeleton = ({ width = '100%', height = '16px', borderRadius = '4px', style = {} }) => (
  <div
    className="skeleton"
    style={{ width, height, borderRadius, ...style }}
    aria-hidden="true"
  />
);

/** Full post card skeleton */
export const PostSkeleton = () => (
  <div className="post-skeleton-card card" aria-busy="true">
    <div className="post-skeleton-vote">
      <Skeleton width="24px" height="24px" borderRadius="2px" />
      <Skeleton width="24px" height="14px" />
      <Skeleton width="24px" height="24px" borderRadius="2px" />
    </div>
    <div className="post-skeleton-content">
      <Skeleton width="40%" height="12px" style={{ marginBottom: 10 }} />
      <Skeleton width="85%" height="20px" style={{ marginBottom: 6 }} />
      <Skeleton width="60%" height="20px" style={{ marginBottom: 12 }} />
      <Skeleton width="30%" height="12px" />
    </div>
  </div>
);

/** Comment skeleton */
export const CommentSkeleton = () => (
  <div className="comment-skeleton" aria-busy="true">
    <Skeleton width="120px" height="12px" style={{ marginBottom: 8 }} />
    <Skeleton width="100%" height="14px" style={{ marginBottom: 4 }} />
    <Skeleton width="80%" height="14px" style={{ marginBottom: 4 }} />
    <Skeleton width="90%" height="14px" />
  </div>
);

export default Skeleton;

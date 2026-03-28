import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Subscribes to real-time events for a specific post room.
 * Cleans up on unmount or postId change.
 *
 * @param {string} postId
 * @param {object} handlers
 * @param {Function} handlers.onVote     - called with { postId, score, upvotes, downvotes, userId, direction }
 * @param {Function} handlers.onComment  - called with the new comment object
 * @param {Function} handlers.onCommentVote - called with { commentId, score }
 */
const usePostSocket = (postId, { onVote, onComment, onCommentVote } = {}) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !postId) return;

    socket.emit('join:post', postId);

    if (onVote)        socket.on('post:vote',    onVote);
    if (onComment)     socket.on('comment:new',  onComment);
    if (onCommentVote) socket.on('comment:vote', onCommentVote);

    return () => {
      socket.emit('leave:post', postId);
      socket.off('post:vote',    onVote);
      socket.off('comment:new',  onComment);
      socket.off('comment:vote', onCommentVote);
    };
  }, [socket, postId, onVote, onComment, onCommentVote]);
};

export default usePostSocket;

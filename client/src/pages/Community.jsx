import React, { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { Heart, MessageCircle, Send } from 'lucide-react';
import './Community.css';

const Community = () => {
  const { user, token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/community/posts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [token]);

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    try {
      await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ content: newPost })
      });
      setNewPost('');
      fetchPosts();
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + date.toLocaleDateString();
  };

  return (
    <div className="page community-page">
      <h1 className="page-title">Community</h1>
      <p className="text-secondary mb-4">See what your gym buddies are up to!</p>

      <form onSubmit={handlePostSubmit} className="glass-card new-post-card mb-4">
        <div className="post-input-wrapper">
          <img src={user?.avatar} alt="You" className="post-avatar" />
          <textarea 
            className="input post-textarea" 
            placeholder="Share your latest workout or question..."
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            rows="2"
          />
        </div>
        <div className="post-actions">
          <button type="submit" className="btn btn-primary btn-sm" disabled={!newPost.trim()}>
            <Send size={16} /> Post
          </button>
        </div>
      </form>

      {loading ? <p>Loading posts...</p> : (
        <div className="feed">
          {posts.map(post => (
            <div key={post.id} className="glass-card post-card mb-4">
              <div className="post-header">
                <img src={post.avatar} alt={post.name} className="post-avatar" />
                <div>
                  <h4 className="post-author">{post.name}</h4>
                  <p className="post-time">{formatTime(post.timestamp)}</p>
                </div>
              </div>
              <div className="post-content">
                <p>{post.content}</p>
              </div>
              <div className="post-footer">
                <button className="action-btn"><Heart size={18} /> {post.likes} Likes</button>
                <button className="action-btn"><MessageCircle size={18} /> Comment</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Community;

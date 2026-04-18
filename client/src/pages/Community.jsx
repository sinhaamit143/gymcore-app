import React, { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { Heart, MessageCircle, Send, Trash2 } from 'lucide-react';
import './Community.css';

const Community = () => {
  const { user, token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [newImage, setNewImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [commentText, setCommentText] = useState('');

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
        body: JSON.stringify({ content: newPost, imageUrl: newImage })
      });
      setNewPost('');
      setNewImage(null);
      fetchPosts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async (postId) => {
    try {
      await fetch(`/api/community/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchPosts();
    } catch (err) { console.error(err); }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await fetch(`/api/community/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchPosts();
    } catch (err) { console.error(err); }
  };

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await fetch(`/api/community/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ content: commentText })
      });
      setCommentText('');
      setActiveCommentPost(null);
      fetchPosts();
    } catch (err) { console.error(err); }
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
        
        {newImage && (
          <div style={{ margin: '10px 0 10px 52px', position: 'relative', display: 'inline-block' }}>
             <img src={newImage} alt="Preview" style={{ height: '100px', borderRadius: '8px', objectFit: 'cover' }} />
             <button type="button" onClick={() => setNewImage(null)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ff4d4f', border: 'none', borderRadius: '50%', width: '24px', height: '24px', color: '#fff', cursor: 'pointer' }}>×</button>
          </div>
        )}

        <div className="post-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <input 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) return alert('File too large (max 10MB)');
                    const reader = new FileReader();
                    reader.onloadend = () => setNewImage(reader.result);
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <span className="btn btn-secondary btn-sm" style={{ padding: '6px 12px' }}>📷 Add Photo</span>
            </label>
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={!newPost.trim() && !newImage}>
            <Send size={16} /> Post
          </button>
        </div>
      </form>

      {loading ? <p>Loading posts...</p> : (
        <div className="feed">
          {posts.map(post => (
            <div key={post._id} className="glass-card post-card mb-4">
              <div className="post-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <img src={post.user_avatar} alt={post.user_name} className="post-avatar" />
                  <div>
                    <h4 className="post-author">{post.user_name}</h4>
                    <p className="post-time">{formatTime(post.createdAt)}</p>
                  </div>
                </div>
                {(['SUPER_ADMIN', 'GYM_OWNER'].includes(user?.role) || post.user_id === user?.id) && (
                  <button onClick={() => handleDeletePost(post._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                    <Trash2 size={16} color="#ff4d4f" />
                  </button>
                )}
              </div>
              <div className="post-content">
                <p>{post.content}</p>
                {post.imageUrl && (
                  <img src={post.imageUrl} alt="User upload" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '12px', marginTop: '12px' }} />
                )}
              </div>
              <div className="post-footer" style={{ display: 'flex', gap: '16px' }}>
                <button 
                  className={`action-btn ${post.likedBy?.includes(user?.id) ? 'liked' : ''}`} 
                  onClick={() => handleLike(post._id)}
                  style={{ color: post.likedBy?.includes(user?.id) ? '#ff4d4f' : 'inherit' }}
                >
                  <Heart size={18} fill={post.likedBy?.includes(user?.id) ? '#ff4d4f' : 'none'} /> {post.likes} Likes
                </button>
                <button 
                  className="action-btn" 
                  onClick={() => {
                    setActiveCommentPost(activeCommentPost === post._id ? null : post._id);
                    setCommentText('');
                  }}
                >
                  <MessageCircle size={18} /> {post.comments?.length || 0} Comments
                </button>
              </div>

              {post.comments && post.comments.length > 0 && (
                <div className="comments-list" style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                  {post.comments.map(c => (
                    <div key={c._id} className="comment-item" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <img src={c.user_avatar} alt={c.user_name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div className="comment-content" style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '12px', flex: 1 }}>
                        <h5 style={{ fontSize: '13px', marginBottom: '4px', color: '#fff' }}>{c.user_name}</h5>
                        <p style={{ fontSize: '14px', color: '#ccc' }}>{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeCommentPost === post._id && (
                <form className="comment-form flex-between" style={{ marginTop: '12px', gap: '8px' }} onSubmit={(e) => handleCommentSubmit(e, post._id)}>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Write a reply..." 
                    value={commentText} 
                    onChange={e => setCommentText(e.target.value)} 
                    autoFocus 
                    style={{ padding: '10px 14px' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px' }} disabled={!commentText.trim()}>
                    <Send size={16} />
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Community;

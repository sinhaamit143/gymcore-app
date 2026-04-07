import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { LogOut, Settings, Award, CheckCircle, ShieldAlert, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Profile.css';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const Profile = () => {
  const { user, token, logout, setUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [allServices, setAllServices] = useState([]);
  const [myReels, setMyReels] = useState([]);
  const [formData, setFormData] = useState({ 
    name: user?.name || '',  
    avatar: user?.avatar || '',
    age: user?.age || '',
    phone: user?.phone || '',
    bio: user?.bio || ''
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  React.useEffect(() => {
    const fetchServicesAndReels = async () => {
      try {
        const [servRes, postRes] = await Promise.all([
          fetch('/api/services', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/community/posts', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        if (servRes.ok) setAllServices(await servRes.json());
        if (postRes.ok) {
           const allPosts = await postRes.json();
           setMyReels(allPosts.filter(p => p.user_id === user.id && p.imageUrl));
        }
      } catch (err) { console.error(err); }
    };
    if (user) fetchServicesAndReels();
  }, [token, user?.purchasedServices]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setUser({ ...user, ...formData });
        setEditMode(false);
      }
    } catch (err) {
      console.error('Update failed', err);
    }
  };

  const subscribeUserToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications not supported on your device/browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
         alert('Permission for notifications denied.');
         return;
      }

      const swRegistration = await navigator.serviceWorker.ready;
      
      const keyRes = await fetch('/api/notifications/key');
      const { publicKey } = await keyRes.json();

      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subscription)
      });
      
      if (res.ok) {
        setUser({ ...user, pushSubscription: subscription });
        alert('Push Notifications enabled and saved to your account!');
      } else {
        throw new Error('Failed to save subscription');
      }
    } catch (err) {
      console.error('Failed subscribing to push', err);
      alert('Failed to subscribe to notifications.');
    }
  };

  return (
    <div className="page profile-page">
      <div className="profile-header text-center mb-4 cursor-pointer" style={{ position: 'relative' }}>
        <div className="avatar-wrapper mb-2">
           <img src={user?.avatar} alt="Profile" className="profile-avatar" />
        </div>
        <h1 className="profile-name">
          {user?.name} 
          {user?.subscriptionPlan === 'elite' && (
            <span className="elite-badge-inline" title="Elite Member Status">
               <ShieldAlert size={14} fill="#00ffaa" color="#000" style={{ marginLeft: '8px' }} />
            </span>
          )}
        </h1>
        <p className="text-secondary">{user?.email}</p>
        <div className="points-badge mt-2">
           <Award size={16} className="text-accent"/> {user?.points} Points Total
        </div>
      </div>

      <div className="glass-card mb-4 section-settings">
         <div className="flex-between mb-4">
            <h3>Personal Information</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(!editMode)}>
              {editMode ? 'Cancel' : <><Settings size={14}/> Edit</>}
            </button>
         </div>

         {editMode ? (
            <form onSubmit={handleUpdate}>
               <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <input type="text" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
               </div>
               <div className="flex-between" style={{gap: '10px'}}>
                 <div className="input-group flex-1">
                    <label className="input-label">Age</label>
                    <input type="number" className="input" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
                 </div>
                 <div className="input-group flex-1">
                    <label className="input-label">Phone</label>
                    <input type="text" className="input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                 </div>
               </div>
               <div className="input-group">
                  <label className="input-label">Bio</label>
                  <textarea className="input" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} rows="3"></textarea>
               </div>
               <div className="input-group">
                  <label className="input-label">Profile Picture (Max 5MB)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="input" 
                    onChange={handleImageChange}
                    style={{ padding: '10px' }}
                  />
                  {formData.avatar && formData.avatar.startsWith('data:') && (
                     <div style={{ marginTop: '8px', fontSize: '13px', color: '#00ffaa' }}>✓ New image loaded</div>
                  )}
               </div>
               <button type="submit" className="btn btn-primary btn-full mt-2">Save Changes</button>
            </form>
         ) : (
            <div className="info-display">
               <div className="info-row">
                  <span className="info-label">Name</span>
                  <span className="info-value">{user?.name}</span>
               </div>
               <div className="info-row">
                  <span className="info-label">Email</span>
                  <span className="info-value">{user?.email}</span>
               </div>
               <div className="info-row">
                  <span className="info-label">Age</span>
                  <span className="info-value">{user?.age || 'Not provided'}</span>
               </div>
               <div className="info-row">
                  <span className="info-label">Phone</span>
                  <span className="info-value">{user?.phone || 'Not provided'}</span>
               </div>
               <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                  <span className="info-label">Bio</span>
                  <span className="info-value text-secondary" style={{ lineHeight: '1.5' }}>{user?.bio || 'No bio yet.'}</span>
               </div>
            </div>
         )}
      </div>

      {myReels.length > 0 && (
        <div className="glass-card mb-4 section-settings">
          <h3 className="mb-4">My Progress Reels</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
             {myReels.map(reel => (
               <img key={reel.id} src={reel.imageUrl} alt="Progress" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }} />
             ))}
          </div>
        </div>
      )}

      <div className="glass-card mb-4 section-settings">
        <div className="flex-between mb-4">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} className="text-accent" /> Membership Tier
          </h3>
          {user?.subscriptionPlan !== 'elite' && (
            <Link to="/pricing">
              <button className="btn btn-primary btn-sm">Upgrade Plan</button>
            </Link>
          )}
        </div>
        <div className="info-display">
          <div className="info-row">
            <span className="info-label">Active Plan</span>
            <span className="info-value" style={{ textTransform: 'capitalize', color: user?.subscriptionPlan === 'elite' ? '#00ffaa' : (user?.subscriptionPlan === 'pro' ? '#00a3ff' : 'var(--text-secondary)'), fontWeight: 'bold' }}>
              {user?.subscriptionPlan || 'Free'}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Status</span>
            <span className="info-value" style={{ color: '#00ffaa', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle size={14} /> Active
            </span>
          </div>
        </div>

        {user?.subscriptionPlan === 'elite' && (
          <div className="elite-features-box mt-4 animate-fade-in" style={{ background: 'rgba(0, 255, 170, 0.05)', border: '1px solid rgba(0, 255, 170, 0.2)', padding: '16px', borderRadius: '12px' }}>
             <h4 style={{ color: '#00ffaa', marginBottom: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <ShieldAlert size={16} /> Elite Member Privileges
             </h4>
             <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={14} color="#00ffaa" /> Custom 1-on-1 Workout Plans</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={14} color="#00ffaa" /> Personalized Meal Plans</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={14} color="#00ffaa" /> VIP Event Access</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={14} color="#00ffaa" /> Global Recognition Badge</li>
             </ul>
          </div>
        )}
      </div>

      {user?.purchasedServices?.length > 0 && (
        <div className="glass-card mb-4 section-settings">
          <h3 className="mb-4">Legacy Purchases</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {allServices.filter(s => user.purchasedServices.includes(s.id)).map(svc => (
              <div key={svc.id} className="flex-between" style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '12px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CheckCircle size={18} color="#00ffaa" />
                    <span style={{ fontWeight: '500', color: '#fff' }}>{svc.title}</span>
                 </div>
                 <span className="text-secondary" style={{ fontSize: '12px' }}>Active</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card mb-4 section-settings text-center">
         <h3 className="mb-2">Notifications</h3>
         <p className="text-secondary mb-3" style={{ fontSize: '14px' }}>Get alerts for new community comments and app updates.</p>
         <button 
           onClick={subscribeUserToPush} 
           className="btn btn-secondary btn-sm" 
           style={{ 
             width: '100%', 
             display: 'flex', 
             justifyContent: 'center', 
             gap: '8px',
             color: user?.pushSubscription ? '#00ffaa' : 'inherit',
             borderColor: user?.pushSubscription ? 'rgba(0,255,170,0.3)' : 'inherit'
           }}
           disabled={!!user?.pushSubscription}
         >
            <Bell size={16} /> {user?.pushSubscription ? 'Notifications Enabled' : 'Enable Push Notifications'}
         </button>
      </div>

      {user?.role === 'admin' && (
        <Link to="/admin" style={{ textDecoration: 'none' }}>
          <button className="btn mb-4 btn-full" style={{ background: 'rgba(0, 255, 170, 0.1)', color: '#00ffaa', border: '1px solid rgba(0,255,170,0.3)', display: 'flex', justifyContent: 'center' }}>
            <ShieldAlert size={18} style={{ marginRight: '8px' }} /> Admin Panel
          </button>
        </Link>
      )}

      <button className="btn btn-secondary btn-full logout-btn" onClick={logout}>
         <LogOut size={18} color="#ff4d4f" /> <span style={{color: '#ff4d4f'}}>Logout</span>
      </button>

    </div>
  );
};

export default Profile;

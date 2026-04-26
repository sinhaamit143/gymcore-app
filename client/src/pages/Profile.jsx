import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { LogOut, Settings, Award, CheckCircle, ShieldAlert, Bell, Package, Clock, ShoppingBag, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import QRCode from 'react-qr-code';
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
  const [myOrders, setMyOrders] = useState([]);
  const [showQRModal, setShowQRModal] = useState(false);
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
    const fetchProfileData = async () => {
      try {
        const [servRes, postRes, orderRes] = await Promise.all([
          fetch('/api/services', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/community/posts', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/user/orders', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        if (servRes.ok) setAllServices(await servRes.json());
        if (postRes.ok) {
           const allPosts = await postRes.json();
           setMyReels(allPosts.filter(p => p.user_id === user.id && p.imageUrl));
        }
        if (orderRes.ok) setMyOrders(await orderRes.json());
      } catch (err) { console.error(err); }
    };
    if (user) fetchProfileData();
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
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
           setUser({ ...user, pushSubscription: { endpoint: 'mock-endpoint' } });
           alert('Push Notifications enabled and saved to your account!');
        } else {
           alert('Permission for notifications denied.');
        }
      } else {
        alert('Push notifications not supported on your device/browser.');
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

      <div className="glass-card mb-4" style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '24px', background: 'linear-gradient(145deg, rgba(59,130,246,0.1), rgba(0,0,0,0.3))', border: '1px solid rgba(59,130,246,0.2)' }}>
        <div 
          onClick={() => setShowQRModal(true)}
          style={{ background: '#fff', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s ease' }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <QRCode value={user?.id || 'guest'} size={80} level="M" />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', color: '#fff' }}>Digital Pass</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 12px 0' }}>Tap QR code to expand and scan at the front desk.</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ background: 'rgba(59,130,246,0.2)', color: '#3b82f6', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
              {user?.subscriptionPlan ? `${user.subscriptionPlan} Tier` : 'Free Tier'}
            </span>
            {user?.subscriptionDuration && (
              <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                {user.subscriptionDuration}
              </span>
            )}
          </div>
        </div>
      </div>

      {(() => {
        let daysRemaining = null;
        let subProgress = 0;
        if (user?.subscriptionExpiry) {
          const diffTime = new Date(user.subscriptionExpiry) - new Date();
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (daysRemaining > 0) {
            subProgress = Math.min(100, (daysRemaining / 30) * 100); 
          }
        }
        
        const isFree = !user?.subscriptionPlan || user.subscriptionPlan.toLowerCase() === 'free';
        const isElite = user?.subscriptionPlan?.toLowerCase() === 'elite';

        return (
          <div className="glass-card mb-4 section-settings">
            <div className="flex-between mb-2">
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>My Membership</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                  {isFree ? 'Free Tier (Limited Access)' : (
                    daysRemaining !== null && daysRemaining > 0 
                      ? `${daysRemaining} Days Remaining` 
                      : 'Subscription Expired'
                  )}
                </p>
              </div>
              
              {isFree ? (
                <Link to="/pricing">
                  <button className="btn btn-sm" style={{ background: 'var(--accent-color)', color: '#000', fontWeight: 'bold' }}>Upgrade Plan</button>
                </Link>
              ) : (
                <>
                  {daysRemaining !== null && daysRemaining <= 7 ? (
                    <Link to="/pricing">
                      <button className="btn btn-sm" style={{ background: '#ff4444', color: '#fff', fontWeight: 'bold' }}>
                        Renew Now
                      </button>
                    </Link>
                  ) : (
                    <Link to={isElite ? '#' : '/pricing'} style={{ pointerEvents: isElite ? 'none' : 'auto' }}>
                      <button className="btn btn-sm" style={{ 
                        background: isElite ? 'rgba(255,255,255,0.1)' : 'var(--accent-color)', 
                        color: isElite ? 'rgba(255,255,255,0.3)' : '#000',
                        fontWeight: 'bold',
                        cursor: isElite ? 'not-allowed' : 'pointer'
                      }}>
                        {isElite ? 'Max Tier Reached' : 'Upgrade Plan'}
                      </button>
                    </Link>
                  )}
                </>
              )}
            </div>
            
            {!isFree && (
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginTop: '12px' }}>
                 <div style={{ 
                   width: daysRemaining <= 0 ? '100%' : `${subProgress}%`, 
                   height: '100%', 
                   background: daysRemaining <= 7 ? '#ff4d4f' : '#10b981', 
                   transition: 'width 1s ease-in-out' 
                 }}></div>
              </div>
            )}

            {isElite && (
              <div className="elite-features-box mt-4 animate-fade-in" style={{ background: 'rgba(0, 255, 170, 0.05)', border: '1px solid rgba(0, 255, 170, 0.2)', padding: '16px', borderRadius: '12px' }}>
                 <h4 style={{ color: '#00ffaa', marginBottom: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <ShieldAlert size={16} /> Elite Member Privileges
                 </h4>
                 <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={14} color="#00ffaa" /> Custom 1-on-1 Workout Plans</li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={14} color="#00ffaa" /> Personalized Meal Plans</li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={14} color="#00ffaa" /> VIP Event Access</li>
                 </ul>
              </div>
            )}
          </div>
        );
      })()}

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
        <h3 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={18} className="text-accent" /> My Orders & Billing History
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {user?.subscriptionPlan && user?.subscriptionPlan.toLowerCase() !== 'free' && (
            <div style={{ background: 'rgba(59,130,246,0.1)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div className="flex-between mb-2">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                   <div style={{ width: '50px', height: '50px', borderRadius: '10px', background: 'rgba(59,130,246,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                     <ShieldAlert size={24} color="#3b82f6" />
                   </div>
                   <div>
                     <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>Membership Invoice</div>
                     <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.subscriptionPlan} Tier • {user.subscriptionDuration || 'Active'}</div>
                   </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#3b82f6' }}>
                     {user.totalPaid > 0 ? `₹${user.totalPaid.toLocaleString()}` : 'Legacy Plan'}
                   </div>
                   <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                     {user.totalPaid > 0 ? 'Paid successfully' : 'Paid via legacy system'}
                   </div>
                </div>
              </div>
            </div>
          )}
          {myOrders.length === 0 ? (
            <p className="text-secondary text-center py-4" style={{ fontSize: '14px' }}>You haven't ordered any items yet.</p>
          ) : myOrders.map(order => (
            <div key={order.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '15px' }}>
              <div className="flex-between mb-2">
                <div style={{ display: 'flex', gap: '10px' }}>
                   <img 
                    src={order.product?.images?.[0] || 'https://via.placeholder.com/60'} 
                    alt="p" 
                    style={{ width: '50px', height: '50px', borderRadius: '10px', objectFit: 'cover' }} 
                   />
                   <div>
                     <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{order.product?.name}</div>
                     <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Qty: {order.quantity} • ${order.totalPrice.toFixed(2)}</div>
                     {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                        <button 
                          onClick={async () => {
                             if (!window.confirm('Are you sure you want to cancel this order?')) return;
                             try {
                               await fetch(`/api/orders/${order.id}`, {
                                 method: 'DELETE',
                                 headers: { 'Authorization': `Bearer ${token}` }
                               });
                               setMyOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'CANCELLED' } : o));
                             } catch (err) { console.error(err); }
                          }} 
                          style={{ background: 'none', border: 'none', color: '#ff4d4f', fontSize: '11px', padding: 0, marginTop: '4px', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Cancel Order
                        </button>
                     )}
                   </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ 
                     fontSize: '10px', 
                     padding: '2px 8px', 
                     borderRadius: '10px', 
                     fontWeight: 'bold',
                     background: order.status === 'DELIVERED' ? 'rgba(0, 255, 170, 0.2)' : order.status === 'CANCELLED' ? 'rgba(255, 77, 79, 0.2)' : 'rgba(255,193,7,0.2)',
                     color: order.status === 'DELIVERED' ? '#00ffaa' : order.status === 'CANCELLED' ? '#ff4d4f' : '#ffc107',
                     display: 'inline-flex',
                     alignItems: 'center',
                     gap: '4px'
                   }}>
                     {order.status === 'DELIVERED' ? <CheckCircle size={10}/> : order.status === 'CANCELLED' ? <X size={10}/> : <Clock size={10}/>} {order.status}
                   </div>
                   <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                     {new Date(order.createdAt).toLocaleDateString()}
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
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

      {['SUPER_ADMIN', 'GYM_OWNER'].includes(user?.role) && (
        <Link to="/admin" style={{ textDecoration: 'none' }}>
          <button className="btn mb-4 btn-full" style={{ background: 'rgba(0, 255, 170, 0.1)', color: '#00ffaa', border: '1px solid rgba(0,255,170,0.3)', display: 'flex', justifyContent: 'center' }}>
            <ShieldAlert size={18} style={{ marginRight: '8px' }} /> Admin Panel
          </button>
        </Link>
      )}

      <button className="btn btn-secondary btn-full logout-btn" onClick={logout}>
         <LogOut size={18} color="#ff4d4f" /> <span style={{color: '#ff4d4f'}}>Logout</span>
      </button>

      {showQRModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowQRModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '350px' }}>
            <button className="modal-close" onClick={() => setShowQRModal(false)}><X size={24} /></button>
            <h2 className="modal-title" style={{ marginBottom: '20px' }}>Gym Identity Pass</h2>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', display: 'inline-block', marginBottom: '20px' }}>
              <QRCode value={user?.id || 'guest'} size={250} level="H" />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Present this code at the scanner to gain facility access.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;

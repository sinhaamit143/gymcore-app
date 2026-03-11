import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Users, Trash2, Search, ShieldAlert, LogOut, Bell, X, User, Activity, Plus } from 'lucide-react';

const Admin = () => {
  const { token, user: currentUser, logout } = useAuth();
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [announcement, setAnnouncement] = useState({ title: '', body: '' });
  
  // Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [planForm, setPlanForm] = useState({ type: 'workout', title: '', details: '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setUsersList(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setUsersList(prev => prev.filter(u => u.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnnounce = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/announce', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(announcement)
      });
      if (res.ok) {
        alert('Announcement broadcasted!');
        setAnnouncement({ title: '', body: '' });
      }
    } catch (err) { console.error(err); }
  };

  const openUserDetails = async (u) => {
    setSelectedUser(u);
    setUserDetails(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setUserDetails(await res.json());
      }
    } catch (err) { console.error(err); }
  };

  const handleAssignPlan = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await fetch('/api/admin/assign-plan', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ ...planForm, user_id: selectedUser.id })
      });
      if (res.ok) {
        const newPlan = await res.json();
        setUserDetails(prev => ({ ...prev, plans: [newPlan, ...prev.plans] }));
        setPlanForm({ type: 'workout', title: '', details: '' });
      }
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="page"><p>Loading Admin Dashboard...</p></div>;
  if (currentUser?.role !== 'admin') {
     return (
       <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
         <ShieldAlert size={64} color="#ff4d4f" style={{ marginBottom: '20px' }} />
         <h2>Unauthorized</h2>
         <p className="text-secondary mt-2">You do not have permission to view the Admin Dashboard.</p>
       </div>
     );
  }

  const filtered = usersList.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="page" style={{ paddingBottom: '100px' }}>
      <div className="flex-between mb-4">
        <div>
          <h1 className="page-title mb-2" style={{ margin: 0 }}><ShieldAlert className="inline-icon text-accent" /> Admin Panel</h1>
          <p className="text-secondary" style={{ margin: 0 }}>Coaching & Moderation Suite</p>
        </div>
        <button onClick={logout} className="btn btn-secondary btn-sm" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
           <LogOut size={16} color="#ff4d4f" /> Logout
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' }}>
         <div className="glass-card text-center" style={{ padding: '20px' }}>
            <Users size={24} className="text-accent mb-2 mx-auto" />
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{usersList.length}</div>
            <div className="text-secondary" style={{ fontSize: '13px' }}>Total Users</div>
         </div>
         <div className="glass-card text-center" style={{ padding: '20px' }}>
            <Activity size={24} className="text-accent mb-2 mx-auto" />
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{usersList.reduce((acc, u) => acc + u.points, 0) / 10}</div>
            <div className="text-secondary" style={{ fontSize: '13px' }}>Total Logs</div>
         </div>
      </div>

      <div className="glass-card mb-4">
         <h3 className="mb-3" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Bell size={18} className="text-accent"/> Global Announcement</h3>
         <form onSubmit={handleAnnounce} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input 
              className="input" 
              placeholder="Announcement Title" 
              value={announcement.title}
              onChange={e => setAnnouncement({...announcement, title: e.target.value})}
              required
            />
            <textarea 
              className="input" 
              placeholder="Message body..." 
              rows="2"
              value={announcement.body}
              onChange={e => setAnnouncement({...announcement, body: e.target.value})}
              required
            ></textarea>
            <button type="submit" className="btn btn-primary btn-sm">Broadcast Push Notification</button>
         </form>
      </div>

      <div className="glass-card mb-4" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
        <Search size={18} className="text-secondary" />
        <input 
          type="text" 
          placeholder="Search by name or email..." 
          style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '16px', outline: 'none', width: '100%' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="glass-card section-settings" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          <span>User Info</span>
          <span>Role</span>
          <span>Points</span>
          <span>Actions</span>
        </div>
        
        {filtered.map(u => (
          <div key={u.id} onClick={() => openUserDetails(u)} style={{ cursor: 'pointer', padding: '16px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
              <img src={u.avatar} alt="avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: '500', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{u.name} {u.id === currentUser.id ? '(You)' : ''}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{u.email}</div>
              </div>
            </div>
            
            <div>
              <span style={{ 
                padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
                background: u.role === 'admin' ? 'rgba(0, 255, 170, 0.1)' : 'rgba(255,255,255,0.05)',
                color: u.role === 'admin' ? '#00ffaa' : 'var(--text-secondary)'
              }}>
                {u.role}
              </span>
            </div>

            <div style={{ fontSize: '14px' }}>{u.points}</div>

            <div>
              {u.id !== currentUser.id && (
                <button 
                  onClick={(e) => handleDelete(u.id, e)}
                  style={{ background: 'rgba(255, 77, 79, 0.1)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={16} color="#ff4d4f" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
           <div className="glass-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '24px' }}>
              <button 
                onClick={() => setSelectedUser(null)} 
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                 <img src={selectedUser.avatar} alt="User" style={{ width: '64px', height: '64px', borderRadius: '50%' }} />
                 <div>
                    <h2 style={{ margin: 0 }}>{selectedUser.name}</h2>
                    <p className="text-secondary" style={{ margin: 0 }}>{selectedUser.email}</p>
                 </div>
              </div>

              {userDetails ? (
                <>
                  <div className="mb-4">
                     <h3 className="mb-2">Recent Logs</h3>
                     <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ background: 'rgba(0,255,170,0.1)', color: '#00ffaa', padding: '4px 12px', borderRadius: '16px', fontSize: '13px' }}>
                           {userDetails.workouts.length} Workouts
                        </span>
                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '16px', fontSize: '13px' }}>
                           {userDetails.nutrition.length} Meals
                        </span>
                     </div>
                  </div>

                  <div className="mb-4" style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
                     <h3 className="mb-3" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={18} className="text-accent" /> Assign Coach Plan</h3>
                     <form onSubmit={handleAssignPlan} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <select 
                          className="input" 
                          value={planForm.type}
                          onChange={e => setPlanForm({...planForm, type: e.target.value})}
                        >
                           <option value="workout">Workout Plan</option>
                           <option value="meal">Meal Plan</option>
                        </select>
                        <input 
                          className="input" 
                          placeholder="Plan Title (e.g. 5x5 Stronglifts)" 
                          value={planForm.title}
                          onChange={e => setPlanForm({...planForm, title: e.target.value})}
                          required
                        />
                        <textarea 
                          className="input" 
                          placeholder="Plan instructions..." 
                          rows="3"
                          value={planForm.details}
                          onChange={e => setPlanForm({...planForm, details: e.target.value})}
                          required
                        ></textarea>
                        <button type="submit" className="btn btn-primary btn-sm">Assign to User</button>
                     </form>
                  </div>

                  {userDetails.plans?.length > 0 && (
                     <div>
                        <h3 className="mb-2">Assigned Plans</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                           {userDetails.plans.map(p => (
                             <div key={p._id} style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                                <div style={{ fontWeight: 'bold' }}>{p.title} <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>{p.type}</span></div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{p.details}</div>
                             </div>
                           ))}
                        </div>
                     </div>
                  )}
                </>
              ) : (
                <p>Loading user details...</p>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Admin;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Users, Trash2, Search, ShieldAlert, LogOut, Bell, X, Activity, Plus, Shield, ArrowRight } from 'lucide-react';

const Admin = () => {
  const { token, user: currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'members'
  
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

  const handleRoleToggle = async (id, currentRole, e) => {
    e.stopPropagation();
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const msg = newRole === 'admin' 
      ? "Promote this user to Admin/Trainer?" 
      : "Revoke Admin privileges for this user?";
      
    if (!window.confirm(msg)) return;
    
    try {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (res.ok) {
        setUsersList(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update role');
      }
    } catch (err) { console.error(err); }
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

  const filteredUsers = usersList.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));
  const adminCount = usersList.filter(u => u.role === 'admin').length;

  return (
    <div className="page" style={{ paddingBottom: '100px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div className="flex-between mb-4">
        <div>
          <h1 className="page-title mb-2" style={{ margin: 0 }}><ShieldAlert className="inline-icon text-accent" /> Control Center</h1>
          <p className="text-secondary" style={{ margin: 0 }}>V9 Coaching & Network Administration</p>
        </div>
        <button onClick={logout} className="btn btn-secondary btn-sm" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
           <LogOut size={16} color="#ff4d4f" /> Logout
        </button>
      </div>

      {/* Modern Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
        <button 
          onClick={() => setActiveTab('overview')}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'overview' ? '#00ffaa' : 'var(--text-secondary)',
            fontSize: '16px',
            fontWeight: activeTab === 'overview' ? 'bold' : 'normal',
            cursor: 'pointer',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: activeTab === 'overview' ? 'rgba(0,255,170,0.1)' : 'transparent',
            transition: 'all 0.2s'
          }}
        >
          Activity Overview
        </button>
        <button 
          onClick={() => setActiveTab('members')}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'members' ? '#00ffaa' : 'var(--text-secondary)',
            fontSize: '16px',
            fontWeight: activeTab === 'members' ? 'bold' : 'normal',
            cursor: 'pointer',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: activeTab === 'members' ? 'rgba(0,255,170,0.1)' : 'transparent',
            transition: 'all 0.2s'
          }}
        >
          Member Relations
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
             <div className="glass-card text-center" style={{ padding: '24px' }}>
                <Users size={28} className="text-accent mb-3 mx-auto" />
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{usersList.length}</div>
                <div className="text-secondary" style={{ fontSize: '14px' }}>Registered Athletes</div>
             </div>
             <div className="glass-card text-center" style={{ padding: '24px' }}>
                <Activity size={28} className="text-accent mb-3 mx-auto" />
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{usersList.reduce((acc, u) => acc + u.points, 0) / 10}</div>
                <div className="text-secondary" style={{ fontSize: '14px' }}>Platform Logs</div>
             </div>
             <div className="glass-card text-center" style={{ padding: '24px' }}>
                <Shield size={28} className="text-accent mb-3 mx-auto" />
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{adminCount}</div>
                <div className="text-secondary" style={{ fontSize: '14px' }}>Active Staff/Trainers</div>
             </div>
          </div>

          <div className="glass-card">
             <h3 className="mb-3" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Bell size={18} className="text-accent"/> Global Push Announcement</h3>
             <p className="text-secondary mb-4" style={{ fontSize: '14px' }}>Send an instant notification to all user devices.</p>
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
                  rows="3"
                  value={announcement.body}
                  onChange={e => setAnnouncement({...announcement, body: e.target.value})}
                  required
                ></textarea>
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Broadcast Announcement</button>
             </form>
          </div>
        </div>
      )}

      {/* MEMBERS TAB */}
      {activeTab === 'members' && (
        <div className="animate-fade-in">
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
              <span>User Base</span>
              <span>Authorization</span>
              <span>Engagement</span>
              <span>CRM Actions</span>
            </div>
            
            {filteredUsers.map(u => (
              <div key={u.id} className="admin-list-item" onClick={() => openUserDetails(u)} style={{ cursor: 'pointer', padding: '16px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                  <img src={u.avatar} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
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

                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{u.points} pts</div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {u.id !== currentUser.id && (
                    <button 
                      onClick={(e) => handleRoleToggle(u.id, u.role, e)}
                      title={u.role === 'admin' ? "Demote to User" : "Promote to Admin"}
                      style={{ background: 'rgba(0, 163, 255, 0.1)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                      <Shield size={16} color="#00a3ff" />
                    </button>
                  )}
                  {u.id !== currentUser.id && (
                    <button 
                      onClick={(e) => handleDelete(u.id, e)}
                      title="Permanently Delete User"
                      style={{ background: 'rgba(255, 77, 79, 0.1)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                      <Trash2 size={16} color="#ff4d4f" />
                    </button>
                  )}
                  <button 
                    style={{ background: 'rgba(255, 255, 255, 0.05)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowRight size={16} color="var(--text-secondary)" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: COACHING & DETAILS */}
      {selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', backdropFilter: 'blur(5px)' }}>
           <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '32px' }}>
              <button 
                onClick={() => setSelectedUser(null)} 
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '50%', padding: '8px', display: 'flex' }}
              >
                <X size={20} />
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
                 <img src={selectedUser.avatar} alt="User" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)' }} />
                 <div>
                    <h2 style={{ margin: 0, fontSize: '24px' }}>{selectedUser.name}</h2>
                    <p className="text-secondary" style={{ margin: '4px 0 0 0' }}>{selectedUser.email}</p>
                    <span style={{ display: 'inline-block', marginTop: '8px', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', background: selectedUser.role === 'admin' ? 'rgba(0, 255, 170, 0.1)' : 'rgba(255,255,255,0.05)', color: selectedUser.role === 'admin' ? '#00ffaa' : 'var(--text-secondary)' }}>
                      {selectedUser.role} Account
                    </span>
                 </div>
              </div>

              {userDetails ? (
                <>
                  <div className="mb-4">
                     <h3 className="mb-3" style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>Athlete Engagement</h3>
                     <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ background: 'linear-gradient(135deg, rgba(0,255,170,0.1), rgba(0,0,0,0.2))', border: '1px solid rgba(0,255,170,0.2)', padding: '12px 20px', borderRadius: '12px', flex: 1, textAlign: 'center' }}>
                           <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00ffaa' }}>{userDetails.workouts.length}</div>
                           <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Workouts</div>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(0,0,0,0.2))', border: '1px solid rgba(255,255,255,0.05)', padding: '12px 20px', borderRadius: '12px', flex: 1, textAlign: 'center' }}>
                           <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{userDetails.nutrition.length}</div>
                           <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>Meals</div>
                        </div>
                     </div>
                  </div>

                  <div className="mb-4" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '24px', borderRadius: '16px' }}>
                     <h3 className="mb-3" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}><Plus size={20} className="text-accent" /> Assign Trainer Plan</h3>
                     <form onSubmit={handleAssignPlan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <select 
                          className="input" 
                          value={planForm.type}
                          onChange={e => setPlanForm({...planForm, type: e.target.value})}
                          style={{ padding: '14px' }}
                        >
                           <option value="workout">Workout Routine</option>
                           <option value="meal">Nutritional Plan</option>
                        </select>
                        <input 
                          className="input" 
                          placeholder="Plan Title (e.g. Hypertrophy Phase 1)" 
                          value={planForm.title}
                          onChange={e => setPlanForm({...planForm, title: e.target.value})}
                          style={{ padding: '14px' }}
                          required
                        />
                        <textarea 
                          className="input" 
                          placeholder="Provide detailed instructions, sets, reps, or macros..." 
                          rows="4"
                          value={planForm.details}
                          onChange={e => setPlanForm({...planForm, details: e.target.value})}
                          style={{ padding: '14px' }}
                          required
                        ></textarea>
                        <button type="submit" className="btn btn-primary btn-full mt-2">Issue Plan to {selectedUser.name.split(' ')[0]}</button>
                     </form>
                  </div>

                  {userDetails.plans?.length > 0 && (
                     <div>
                        <h3 className="mb-3" style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>Active Coaching Plans</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                           {userDetails.plans.map(p => (
                             <div key={p._id} style={{ background: 'rgba(0,255,170,0.05)', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${p.type === 'workout' ? '#ff4d4f' : '#00ffaa'}` }}>
                                <div className="flex-between mb-2">
                                  <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{p.title}</span>
                                  <span style={{ fontSize: '11px', color: p.type === 'workout' ? '#ff4d4f' : '#00ffaa', textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '12px' }}>{p.type}</span>
                                </div>
                                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{p.details}</div>
                             </div>
                           ))}
                        </div>
                     </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                  <div className="spinner mb-3" style={{ margin: '0 auto', width: '24px', height: '24px', border: '3px solid rgba(0,255,170,0.3)', borderTop: '3px solid #00ffaa', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  <p>Loading telemetry...</p>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Admin;

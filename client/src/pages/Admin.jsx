import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Users, Trash2, Search, ShieldAlert } from 'lucide-react';

const Admin = () => {
  const { token, user } = useAuth();
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) return;
    
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

  if (loading) return <div className="page"><p>Loading Admin Dashboard...</p></div>;
  if (user?.role !== 'admin') {
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
          <p className="text-secondary" style={{ margin: 0 }}>Manage users and platform activity</p>
        </div>
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
          <div key={u.id} style={{ padding: '16px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
              <img src={u.avatar} alt="avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: '500', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{u.name} {u.id === user.id ? '(You)' : ''}</div>
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
              {u.id !== user.id && (
                <button 
                  onClick={() => handleDelete(u.id)}
                  style={{ background: 'rgba(255, 77, 79, 0.1)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={16} color="#ff4d4f" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Admin;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { 
  Users, Trash2, Search, ShieldAlert, LogOut, Bell, X, Activity, 
  Plus, Shield, ArrowRight, ShoppingBag, Package
} from 'lucide-react';

const Admin = () => {
  const { token, user: currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const SafeAvatar = ({ src, name, size = '36px' }) => {
    // Safety check for massive data strings
    const isValid = src && src.length < 50000;
    const displaySrc = isValid ? src : `https://i.pravatar.cc/150?u=${name}`;
    return <img src={displaySrc} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  };
  
  const [usersList, setUsersList] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [announcement, setAnnouncement] = useState({ title: '', body: '' });
  
  // Simplified Product Form
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Supplements',
    image: ''
  });

  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [planForm, setPlanForm] = useState({ type: 'workout', title: '', details: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, pRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (uRes.ok) {
        const data = await uRes.json();
        const rawUsers = data.users || data;
        // Critical safety truncation
        const safeData = rawUsers.map(u => ({
          ...u,
          avatar: (u.avatar && u.avatar.length > 100000) ? `https://i.pravatar.cc/150?u=${u.email}` : u.avatar
        }));
        setUsersList(safeData);
      }
      if (pRes.ok) setProducts(await pRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this user?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setUsersList(prev => prev.filter(u => u.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleRoleToggle = async (id, currentRole, e) => {
    e.stopPropagation();
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change user to ${newRole}?`)) return;
    
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
      }
    } catch (err) { console.error(err); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(productForm)
      });
      if (res.ok) {
        const newProd = await res.json();
        setProducts([newProd, ...products]);
        setProductForm({ name: '', description: '', price: '', category: 'Supplements', image: '' });
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Delete product?")) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setProducts(prev => prev.filter(p => p.id !== id));
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
        alert('Sent!');
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
      if (res.ok) setUserDetails(await res.json());
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

  if (loading) return <div className="page"><p>Loading...</p></div>;
  if (currentUser?.role !== 'admin') return <div className="page">Unauthorized</div>;

  const filteredUsers = usersList.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="page" style={{ paddingBottom: '100px' }}>
      <div className="flex-between mb-4">
        <h2>Admin Dashboard</h2>
        <button onClick={logout} className="btn btn-secondary btn-sm">Logout</button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {['overview', 'members', 'inventory'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
            style={{ textTransform: 'capitalize' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <div className="glass-card text-center" style={{ padding: '20px' }}>
              <Users size={24} className="text-accent mb-2 mx-auto" />
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{usersList.length}</div>
              <div className="text-secondary" style={{ fontSize: '12px' }}>Users</div>
            </div>
            <div className="glass-card text-center" style={{ padding: '20px' }}>
              <ShoppingBag size={24} className="text-accent mb-2 mx-auto" />
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{products.length}</div>
              <div className="text-secondary" style={{ fontSize: '12px' }}>Products</div>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="mb-3">Global Announcement</h3>
            <form onSubmit={handleAnnounce} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input className="input" placeholder="Title" value={announcement.title} onChange={e => setAnnouncement({...announcement, title: e.target.value})} required />
              <textarea className="input" placeholder="Message..." rows="2" value={announcement.body} onChange={e => setAnnouncement({...announcement, body: e.target.value})} required></textarea>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Send</button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="animate-fade-in">
          <input 
            className="input mb-3" placeholder="Search members..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="glass-card" style={{ padding: 0 }}>
            {filteredUsers.map(u => (
              <div key={u.id} className="admin-list-item" onClick={() => openUserDetails(u)} style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <SafeAvatar src={u.avatar} name={u.name} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>{u.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.email}</div>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {u.id !== currentUser.id && (
                    <button onClick={(e) => handleRoleToggle(u.id, u.role, e)} className="btn btn-secondary btn-sm" style={{ padding: '5px' }}>
                      {u.role === 'admin' ? <ShieldAlert size={14} /> : <Shield size={14} />}
                    </button>
                  )}
                  <button onClick={(e) => handleDeleteUser(u.id, e)} className="btn btn-secondary btn-sm" style={{ padding: '5px' }}>
                    <Trash2 size={14} color="#ff4d4f" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="animate-fade-in">
          <div className="glass-card mb-4" style={{ padding: '20px' }}>
            <h3 className="mb-3">Add Product</h3>
            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input className="input" placeholder="Name" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required />
                <input type="number" className="input" placeholder="Price" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} required />
              </div>
              <input className="input" placeholder="Image URL" value={productForm.image} onChange={e => setProductForm({...productForm, image: e.target.value})} required />
              <select className="input" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})}>
                <option>Supplements</option>
                <option>Gym Wear</option>
                <option>Accessories</option>
                <option>Equipments</option>
              </select>
              <textarea className="input" placeholder="Description" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} required></textarea>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Add Product</button>
            </form>
          </div>

          <div className="glass-card" style={{ padding: 0 }}>
            {products.map(p => (
              <div key={p.id} className="admin-list-item" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <img src={p.images?.[0] || p.image} alt="p" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--accent-color)' }}>${p.price}</div>
                </div>
                <button onClick={() => handleDeleteProduct(p.id)} className="btn btn-secondary btn-sm" style={{ padding: '5px' }}>
                  <Trash2 size={14} color="#ff4d4f" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setSelectedUser(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <SafeAvatar src={selectedUser.avatar} name={selectedUser.name} size="60px" />
              <div>
                <h3 style={{ margin: 0 }}>{selectedUser.name}</h3>
                <p className="text-secondary" style={{ margin: 0 }}>{selectedUser.email}</p>
              </div>
            </div>

            {userDetails && (
              <>
                <div className="mb-4">
                  <h4 className="mb-2">Assign Plan</h4>
                  <form onSubmit={handleAssignPlan} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <select className="input" value={planForm.type} onChange={e => setPlanForm({...planForm, type: e.target.value})}>
                      <option value="workout">Workout</option>
                      <option value="meal">Meal</option>
                    </select>
                    <input className="input" placeholder="Title" value={planForm.title} onChange={e => setPlanForm({...planForm, title: e.target.value})} required />
                    <textarea className="input" placeholder="Details" rows="3" value={planForm.details} onChange={e => setPlanForm({...planForm, details: e.target.value})} required></textarea>
                    <button type="submit" className="btn btn-primary">Assign</button>
                  </form>
                </div>
                {userDetails.plans?.length > 0 && (
                  <div>
                    <h4 className="mb-2">Active Plans</h4>
                    {userDetails.plans.map(p => (
                      <div key={p._id} style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 'bold' }}>{p.title} ({p.type})</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.details}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;

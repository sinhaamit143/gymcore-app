import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { 
  Users, Trash2, Search, ShieldAlert, LogOut, Bell, X, Activity, 
  Plus, Shield, ArrowRight, ShoppingBag, Tag, DollarSign, Package 
} from 'lucide-react';

const Admin = () => {
  const { token, user: currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'members' | 'inventory'
  
  const [usersList, setUsersList] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [announcement, setAnnouncement] = useState({ title: '', body: '' });
  
  // Product Form State
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Supplements',
    images: []
  });
  const [dragActive, setDragActive] = useState(false);

  // Modal state
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
      if (uRes.ok) setUsersList(await uRes.json());
      if (pRes.ok) setProducts(await pRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (files) => {
    const newImages = [...productForm.images];
    
    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) return alert('File too large (max 5MB)');
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductForm(prev => ({
          ...prev,
          images: [...prev.images, reader.result].slice(0, 5) // Max 5 images
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setProductForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  const handleDeleteUser = async (id, e) => {
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
    } catch (err) { console.error(err); }
  };

  const handleRoleToggle = async (id, currentRole, e) => {
    e.stopPropagation();
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const msg = newRole === 'admin' 
      ? "Promote this user to Admin/Trainer?" 
      : "Revoke Admin privileges and demote to regular User?";
      
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
        const newProduct = await res.json();
        setProducts([newProduct, ...products]);
        setProductForm({ name: '', description: '', price: '', category: 'Supplements', images: [] });
        alert('Product added to shop!');
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Delete this product from shop?")) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id));
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

  return (
    <div className="page" style={{ paddingBottom: '100px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div className="flex-between mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--accent-color)', padding: '10px', borderRadius: '12px', color: '#000' }}>
            <Dumbbell size={24} />
          </div>
          <div>
            <h1 className="page-title mb-0" style={{ margin: 0, fontSize: '1.8rem' }}>GYMCORE <span style={{ color: 'var(--accent-color)' }}>ELITE</span></h1>
            <p className="text-secondary" style={{ margin: 0, fontSize: '0.9rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Command Center</p>
          </div>
        </div>
        <button onClick={logout} className="btn btn-secondary btn-sm" style={{ display: 'flex', gap: '8px', alignItems: 'center', border: '1px solid rgba(255, 77, 79, 0.2)' }}>
           <LogOut size={16} color="#ff4d4f" /> Logout
        </button>
      </div>

      {/* Modern Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', overflowX: 'auto' }}>
        {['overview', 'members', 'inventory'].map(tab => (
           <button 
             key={tab}
             onClick={() => setActiveTab(tab)}
             style={{ 
               background: 'none', border: 'none', 
               color: activeTab === tab ? '#00ffaa' : 'var(--text-secondary)',
               fontSize: '14px', fontWeight: activeTab === tab ? 'bold' : 'normal',
               cursor: 'pointer', padding: '8px 16px', borderRadius: '8px',
               backgroundColor: activeTab === tab ? 'rgba(0,255,170,0.1)' : 'transparent',
               transition: 'all 0.2s', whiteSpace: 'nowrap', textTransform: 'capitalize'
             }}
           >
             {tab === 'inventory' ? 'Shop Inventory' : (tab === 'members' ? 'Member Relations' : 'Overview')}
           </button>
        ))}
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
                <Package size={28} className="text-accent mb-3 mx-auto" />
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{products.length}</div>
                <div className="text-secondary" style={{ fontSize: '14px' }}>Shop Products</div>
             </div>
             <div className="glass-card text-center" style={{ padding: '24px' }}>
                <Shield size={28} className="text-accent mb-3 mx-auto" />
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{usersList.filter(u => u.role === 'admin').length}</div>
                <div className="text-secondary" style={{ fontSize: '14px' }}>Active Staff</div>
             </div>
          </div>

          <div className="glass-card">
             <h3 className="mb-3" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Bell size={18} className="text-accent"/> Global Push Announcement</h3>
             <p className="text-secondary mb-4" style={{ fontSize: '14px' }}>Send an instant notification to all user devices.</p>
             <form onSubmit={handleAnnounce} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input className="input" placeholder="Announcement Title" value={announcement.title} onChange={e => setAnnouncement({...announcement, title: e.target.value})} required />
                <textarea className="input" placeholder="Message body..." rows="3" value={announcement.body} onChange={e => setAnnouncement({...announcement, body: e.target.value})} required></textarea>
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
              type="text" placeholder="Search athletes..." 
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '16px', outline: 'none', width: '100%' }}
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="glass-card section-settings" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr auto', gap: '10px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              <span>User Base</span>
              <span>Subscription</span>
              <span>Authorization</span>
              <span>Actions</span>
            </div>
            
            {filteredUsers.map(u => (
              <div key={u.id} className="admin-list-item" onClick={() => openUserDetails(u)} style={{ cursor: 'pointer', padding: u.id === currentUser.id ? '16px' : '12px 16px', display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr auto', gap: '10px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                  <img src={u.avatar} alt="avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: '500', color: '#fff', fontSize: '14px' }}>{u.name} {u.id === currentUser.id ? '(You)' : ''}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{u.email}</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex' }}>
                   <span style={{ 
                     padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase',
                     background: u.subscriptionPlan === 'elite' ? 'rgba(0, 255, 170, 0.1)' : (u.subscriptionPlan === 'pro' ? 'rgba(0, 163, 255, 0.1)' : 'rgba(255,255,255,0.05)'),
                     color: u.subscriptionPlan === 'elite' ? '#00ffaa' : (u.subscriptionPlan === 'pro' ? '#00a3ff' : 'var(--text-secondary)')
                   }}>
                     {u.subscriptionPlan || 'Free'}
                   </span>
                </div>

                <div>
                   <span style={{ fontSize: '12px', color: u.role === 'admin' ? '#00ffaa' : 'var(--text-secondary)' }}>{u.role}</span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {u.id !== currentUser.id && (
                    <>
                      <button 
                        onClick={(e) => handleRoleToggle(u.id, u.role, e)}
                        title={u.role === 'admin' ? "Demote to User" : "Promote to Admin"}
                        style={{ background: 'rgba(255, 255, 255, 0.05)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                        {u.role === 'admin' ? <ShieldAlert size={14} color="#ff4d4f" /> : <Shield size={14} color="#00ffaa" />}
                      </button>
                      <button 
                        onClick={(e) => handleDeleteUser(u.id, e)}
                        style={{ background: 'rgba(255, 77, 79, 0.05)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                        <Trash2 size={14} color="#ff4d4f" />
                      </button>
                    </>
                  )}
                  <button style={{ background: 'rgba(255, 255, 255, 0.05)', border: 'none', padding: '6px', borderRadius: '6px' }}>
                    <ArrowRight size={14} color="var(--text-secondary)" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <div className="animate-fade-in">
           <div className="glass-card mb-6" style={{ padding: '24px' }}>
              <h3 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Package size={20} className="text-accent"/> Professional Inventory Manager</h3>
              <form onSubmit={handleAddProduct} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                 <div className="input-group">
                    <label className="input-label">Product Name</label>
                    <input className="input" placeholder="e.g. Whey Gold Standard" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required />
                 </div>
                 <div className="input-group">
                    <label className="input-label">Price ($)</label>
                    <input type="number" className="input" placeholder="49.99" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} required />
                 </div>
                 <div className="input-group">
                    <label className="input-label">Category</label>
                    <select className="input" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})}>
                       <option>Supplements</option>
                       <option>Gym Wear</option>
                       <option>Accessories</option>
                       <option>Equipments</option>
                    </select>
                 </div>
                 <div className="input-group">
                    <label className="input-label">Multi-Image Upload (Max 5)</label>
                    <div 
                      onDragEnter={handleDrag} 
                      onDragLeave={handleDrag} 
                      onDragOver={handleDrag} 
                      onDrop={handleDrop}
                      style={{ 
                        border: `2px dashed ${dragActive ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '12px',
                        padding: '20px',
                        textAlign: 'center',
                        background: dragActive ? 'rgba(0,255,170,0.05)' : 'rgba(0,0,0,0.2)',
                        transition: 'all 0.3s',
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                      onClick={() => document.getElementById('file-upload').click()}
                    >
                      <Plus size={24} className="mb-2 mx-auto" />
                      <p style={{ fontSize: '12px', margin: 0 }}>Drag or Click to upload images</p>
                      <input id="file-upload" type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e.target.files)} />
                    </div>
                 </div>

                 {/* Image Previews */}
                 {productForm.images.length > 0 && (
                   <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.1)', padding: '12px', borderRadius: '12px' }}>
                      {productForm.images.map((img, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '80px', height: '80px' }}>
                          <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                            style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ff4d4f', border: 'none', borderRadius: '50%', color: '#fff', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer' }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                   </div>
                 )}

                 <div className="input-group" style={{ gridColumn: 'span 2' }}>
                    <label className="input-label">Full Description</label>
                    <textarea className="input" rows="3" placeholder="Explain the benefits, materials, or nutrition info..." value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} required></textarea>
                 </div>
                 <button type="submit" className="btn btn-primary" style={{ gridColumn: 'span 2', padding: '15px' }}>Publish to Shop Catalog</button>
              </form>
           </div>

           <div className="glass-card" style={{ padding: 0 }}>
             <h3 style={{ padding: '24px 24px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={20} className="text-accent" /> Active Inventory
                <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)', padding: '2px 10px', borderRadius: '20px', marginLeft: 'auto', fontWeight: 'normal' }}>{products.length} Products</span>
             </h3>
             <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: 'rgba(0,0,0,0.2)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    <tr>
                      <th style={{ padding: '12px 24px' }}>Product</th>
                      <th style={{ padding: '12px 24px' }}>Category</th>
                      <th style={{ padding: '12px 24px' }}>Price</th>
                      <th style={{ padding: '12px 24px' }}>Media</th>
                      <th style={{ padding: '12px 24px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} className="admin-list-item">
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ fontWeight: '500' }}>{p.name}</div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.category}</span>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--accent-color)' }}>${p.price.toFixed(2)}</div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <img src={p.images?.[0] || p.image} alt="main" style={{ width: '30px', height: '30px', borderRadius: '4px', objectFit: 'cover' }} />
                            {p.images?.length > 1 && <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>+{p.images.length - 1}</span>}
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <button onClick={() => handleDeleteProduct(p.id)} style={{ background: 'rgba(255,77,79,0.1)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                             <Trash2 size={16} color="#ff4d4f" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
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
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                        {selectedUser.role} Account
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', background: 'rgba(0,255,170,0.1)', color: '#00ffaa' }}>
                        {selectedUser.subscriptionPlan || 'Free'} Plan
                      </span>
                    </div>
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
                        <select className="input" value={planForm.type} onChange={e => setPlanForm({...planForm, type: e.target.value})} style={{ padding: '14px' }}>
                           <option value="workout">Workout Routine</option>
                           <option value="meal">Nutritional Plan</option>
                        </select>
                        <input className="input" placeholder="Title (e.g. Hypertrophy Phase 1)" value={planForm.title} onChange={e => setPlanForm({...planForm, title: e.target.value})} required style={{ padding: '14px' }} />
                        <textarea className="input" placeholder="Instructions, sets, reps, or macros..." rows="4" value={planForm.details} onChange={e => setPlanForm({...planForm, details: e.target.value})} required style={{ padding: '14px' }}></textarea>
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


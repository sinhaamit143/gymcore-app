import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { 
  Users, Trash2, Search, Bell, X, Activity, 
  Plus, Shield, ShoppingBag, Package, 
  Image as ImageIcon, Edit3, ClipboardList, TrendingUp, DollarSign, Clock, ShieldAlert,
  ArrowRight, CheckCircle, AlertCircle, Filter, MoreVertical, LayoutDashboard
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

const Admin = () => {
  const { token, user: currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [gymDetails, setGymDetails] = useState({ name: 'Gym Admin', logo: null });
  const BACKEND_URL = 'http://localhost:5000';

  const getImageUrl = (path) => {
    if (!path) return 'https://placehold.co/600x400/161b22/444/?text=IMAGE+PENDING';
    if (path.startsWith('http')) return path;
    return `${BACKEND_URL}${path}`;
  };

  const SafeAvatar = ({ src, name, size = '40px' }) => {
    const isValid = src && src.length < 50000 && !src.includes('base64');
    const displaySrc = isValid ? src : `https://i.pravatar.cc/150?u=${encodeURIComponent(name || 'user')}`;
    return (
      <div style={{ width: size, height: size, minWidth: size, borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#1a1a1a' }}>
        <img src={displaySrc} alt={name || 'user'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  };
  
  const [usersList, setUsersList] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [announcementsList, setAnnouncementsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [announcement, setAnnouncement] = useState({ title: '', body: '' });
  
  // Product Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '', description: '', price: '', category: 'Supplements', imageFile: null
  });

  const [orderFilter, setOrderFilter] = useState('ALL');
  const [orderSearch, setOrderSearch] = useState('');

  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [planForm, setPlanForm] = useState({ type: 'workout', title: '', details: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, pRes, oRes, aRes, gRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/orders', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/announcements', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/gym/details', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (uRes.ok) {
        const data = await uRes.json();
        const safeData = (Array.isArray(data) ? data : data.users || []).map(u => ({
          ...u,
          name: u.name || 'Anonymous',
          role: u.role || 'GYM_MEMBER',
          email: u.email || `user_${u.id}`,
        }));
        setUsersList(safeData);
      }
      if (pRes.ok) setProducts(await pRes.json());
      if (oRes.ok) setOrders(await oRes.json());
      if (aRes.ok) setAnnouncementsList(await aRes.json());
      if (gRes.ok) {
        const gymData = await gRes.json();
        setGymDetails({ name: gymData.name || 'Admin', logo: gymData.logoUrl });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate Revenue
  const totalOrderRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const totalSubRevenue = usersList.reduce((sum, u) => sum + (u.totalPaid || 0), 0);
  const totalRevenue = totalOrderRevenue + totalSubRevenue;

  // Helper to determine status and time left
  const getSubDetails = (user) => {
    if (!user.subscriptionPlan || user.subscriptionPlan.toLowerCase() === 'free') {
      return { status: 'Free Tier', color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)', timeLeft: 'N/A' };
    }
    if (!user.subscriptionExpiry) {
      return { status: 'Active', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', timeLeft: 'Ongoing' };
    }
    
    const now = new Date();
    const expiry = new Date(user.subscriptionExpiry);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { status: 'Expired', color: '#ff4444', bg: 'rgba(255,68,68,0.1)', timeLeft: `Expired ${Math.abs(diffDays)}d ago` };
    } else if (diffDays <= 7) {
      return { status: 'Expiring Soon', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', timeLeft: `${diffDays} days left` };
    }
    return { status: 'Active', color: '#10b981', bg: 'rgba(16,185,129,0.1)', timeLeft: `${diffDays} days left` };
  };

  const handleDeleteUser = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this member?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setUsersList(prev => prev.filter(u => u.id !== id));
    } catch (err) { console.error(err); }
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: '', description: '', price: '', category: 'Supplements', imageFile: null });
    setIsProductModalOpen(true);
  };

  const openEditProduct = (p) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      description: p.description,
      price: p.price,
      category: p.category,
      imageFile: null
    });
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', productForm.name);
    formData.append('description', productForm.description);
    formData.append('price', productForm.price);
    formData.append('category', productForm.category);
    
    if (productForm.imageFile) {
      formData.append('image', productForm.imageFile);
    }

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const updated = await res.json();
        if (editingProduct) {
          setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
        } else {
          setProducts([updated, ...products]);
        }
        closeProductModal();
      } else {
        const errorData = await res.json();
        alert(`Failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Permanently delete this product?")) return;
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
    if (!announcement.title || !announcement.body) return;
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
        const newAnn = await res.json();
        setAnnouncementsList([newAnn, ...announcementsList]);
        setAnnouncement({ title: '', body: '' });
      }
    } catch (err) { console.error(err); }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
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
        setUserDetails(prev => ({ ...prev, plans: [newPlan, ...(prev?.plans || [])] }));
        setPlanForm({ type: 'workout', title: '', details: '' });
      }
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="page" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0d1117'}}>
      <div style={{ textAlign: 'center' }}>
        <div className="loader" style={{ marginBottom: '20px' }}></div>
        <p style={{ color: 'var(--accent-color)', fontWeight: 'bold', letterSpacing: '2px' }}>INITIALIZING TERMINAL...</p>
      </div>
    </div>
  );

  if (!['GYM_OWNER', 'SUPER_ADMIN'].includes(currentUser?.role)) {
    return (
      <div className="page" style={{ background: '#0d1117', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '400px', textAlign: 'center', padding: '40px' }}>
          <ShieldAlert size={64} style={{ color: '#ff4444', marginBottom: '20px' }} />
          <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>Access Revoked</h2>
          <p style={{ color: 'var(--text-secondary)' }}>You do not have the required administrative clearance to access this sector.</p>
          <button onClick={logout} className="btn btn-primary" style={{ marginTop: '20px', width: '100%' }}>Logout</button>
        </div>
      </div>
    );
  }

  const filteredUsers = usersList.filter(u => {
    const search = searchTerm.toLowerCase();
    return (u.name && u.name.toLowerCase().includes(search)) || 
           (u.email && u.email.toLowerCase().includes(search));
  });

  const styles = `
    .admin-container {
      min-height: 100vh;
      background: #0d1117;
      color: #fff;
      padding: 40px;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      overflow-x: hidden; /* Lock horizontal scroll */
      width: 100%;
      box-sizing: border-box;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .stats-card {
      background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 24px;
      padding: 24px;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    .stats-card:hover {
      border-color: rgba(0, 255, 170, 0.3);
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .stats-card::after {
      content: '';
      position: absolute;
      top: 0; right: 0;
      width: 100px; height: 100px;
      background: radial-gradient(circle at top right, rgba(0, 255, 170, 0.1), transparent 70%);
      pointer-events: none;
    }
    .nav-tab {
      padding: 12px 24px;
      border-radius: 16px;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      border: 1px solid transparent;
      white-space: nowrap;
    }
    .nav-tab.active {
      background: var(--accent-color);
      color: #000;
      box-shadow: 0 4px 15px rgba(0, 255, 170, 0.4);
    }
    .nav-tab:not(.active) {
      color: var(--text-secondary);
      background: rgba(255,255,255,0.03);
      border-color: rgba(255,255,255,0.05);
    }
    .nav-tab:not(.active):hover {
      background: rgba(255,255,255,0.08);
      color: #fff;
    }
    .data-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0 8px;
    }
    .data-table th {
      padding: 16px 20px;
      color: var(--text-secondary);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
    }
    .data-table tr:not(.header-row) {
      background: rgba(255,255,255,0.02);
      transition: all 0.2s ease;
    }
    .data-table tr:not(.header-row):hover {
      background: rgba(255,255,255,0.05);
    }
    .data-table td {
      padding: 16px 20px;
      color: #fff;
    }
    .data-table td:first-child { border-radius: 16px 0 0 16px; }
    .data-table td:last-child { border-radius: 0 16px 16px 0; }
    
    .status-pill {
      padding: 6px 12px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .input-field {
      width: 100%;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      padding: 14px 18px;
      color: #ffffff !important;
      font-size: 15px;
      outline: none;
      transition: all 0.2s ease;
    }
    .input-field:focus {
      border-color: var(--accent-color);
      background: rgba(0,0,0,0.5);
      box-shadow: 0 0 0 4px rgba(0, 255, 170, 0.05);
    }
    .input-field::placeholder {
      color: rgba(255,255,255,0.3);
    }
    
    input, select, textarea {
      color: #ffffff !important;
    }

    .product-card {
      background: rgba(255,255,255,0.03);
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.05);
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .product-card:hover {
      border-color: var(--accent-color);
      transform: translateY(-8px);
    }
    .product-image-container {
      position: relative;
      height: 220px;
      background: #000;
      overflow: hidden;
    }
    .product-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s ease;
    }
    .product-card:hover .product-image {
      transform: scale(1.1);
    }
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(12px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-content {
      background: #161b22;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 32px;
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
      animation: modalScale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes modalScale {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    
    @media (max-width: 768px) {
      .admin-container { padding: 15px 10px; }
      header { 
        flex-direction: column; 
        gap: 20px; 
        align-items: center !important; 
        padding: 24px 20px !important; 
        text-align: center;
        border-radius: 20px;
      }
      header div:first-child { flex-direction: column; }
      header h1 { fontSize: 22px; }
      
      nav { 
        width: 100% !important; 
        max-width: 100vw;
        overflow-x: auto !important; 
        padding: 8px !important; 
        border-radius: 16px;
        white-space: nowrap;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch; /* Momentum scroll */
        display: flex !important;
      }
      nav::-webkit-scrollbar { display: none; } /* Chrome/Safari */
      
      .nav-tab { 
        padding: 10px 18px; 
        font-size: 13px; 
        flex-shrink: 0;
      }
      
      .stats-grid { 
        grid-template-columns: 1fr !important; 
        gap: 16px !important;
      }
      
      .stats-card { padding: 20px !important; }
      .stats-card div:last-child { font-size: 28px !important; }
      
      .glass-card { padding: 20px !important; border-radius: 24px !important; }
      
      /* Table Responsiveness */
      .data-table-wrapper {
        overflow-x: auto;
        margin: 0 -10px;
        padding: 0 10px;
        -webkit-overflow-scrolling: touch;
      }
      .data-table { min-width: 600px; }
      
      .modal-content { 
        width: 95%; 
        padding: 10px; 
        border-radius: 24px;
        max-height: 85vh;
      }
      
      /* Adjust chart height for mobile */
      .recharts-responsive-container {
        height: 250px !important;
      }
      
      h2 { font-size: 22px !important; }
    }
    
    .data-table-wrapper {
      width: 100%;
      overflow-x: auto;
    }
    
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--accent-color); }


  `;

  return (
    <div className="admin-container">
      <style>{styles}</style>
      
      {/* PREMIUM HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', background: 'rgba(255,255,255,0.03)', padding: '24px 32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            {gymDetails.logo ? (
              <img src={gymDetails.logo} alt="Logo" style={{ height: '56px', width: '56px', objectFit: 'contain', borderRadius: '16px', background: '#000', border: '1px solid rgba(255,255,255,0.1)' }} />
            ) : (
              <div style={{ height: '56px', width: '56px', background: 'var(--accent-color)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                <Shield size={28} />
              </div>
            )}
            <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '16px', height: '16px', background: '#10b981', borderRadius: '50%', border: '3px solid #0d1117' }}></div>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '900', letterSpacing: '-0.5px' }}>{gymDetails.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <div style={{ fontSize: '12px', background: 'rgba(var(--accent-color-rgb), 0.1)', color: 'var(--accent-color)', padding: '2px 8px', borderRadius: '6px', fontWeight: '800', textTransform: 'uppercase' }}>Commander</div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>System Version 2.0.4</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
           <button className="stats-card" style={{ padding: '10px', borderRadius: '14px', border: 'none', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer' }}><Bell size={20}/></button>
           <button onClick={logout} className="btn" style={{ background: 'rgba(255,68,68,0.1)', color: '#ff4444', border: '1px solid rgba(255,68,68,0.2)', padding: '12px 24px', borderRadius: '16px', fontWeight: '700' }}>Logout</button>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <nav style={{ display: 'flex', gap: '12px', marginBottom: '40px', padding: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '100%' }}>
        {[
          { id: 'overview', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
          { id: 'members', icon: <Users size={18} />, label: 'Members' },
          { id: 'inventory', icon: <ShoppingBag size={18} />, label: 'Inventory' },
          { id: 'orders', icon: <ClipboardList size={18} />, label: 'Fulfillment' },
          { id: 'broadcast', icon: <Bell size={18} />, label: 'Broadcast' }
        ].map(tab => (
          <div 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.icon} {tab.label}
          </div>
        ))}
      </nav>

      {/* BROADCAST CONTENT */}
      {activeTab === 'broadcast' && (
        <div className="animate-fade-in">
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '28px', margin: 0, fontWeight: '900' }}>System Broadcast</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '6px' }}>Dispatch real-time push notifications to all gym members.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }} className="stats-grid">
            <div className="glass-card" style={{ padding: '32px' }}>
              <h3 style={{ margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Bell size={20} className="text-accent" /> New Announcement
              </h3>
              <form onSubmit={handleAnnounce} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="input-group">
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', fontWeight: '900' }}>Broadcast Headline</label>
                  <input 
                    type="text" placeholder="e.g., Holiday Schedule Update" className="input-field" 
                    value={announcement.title} onChange={e => setAnnouncement({...announcement, title: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', fontWeight: '900' }}>Message Body</label>
                  <textarea 
                    placeholder="Draft your message for all members..." className="input-field" 
                    value={announcement.body} onChange={e => setAnnouncement({...announcement, body: e.target.value})}
                    style={{ minHeight: '160px' }}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '16px', fontWeight: '800', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  Commence Broadcast <ArrowRight size={18} />
                </button>
              </form>
            </div>

            <div className="glass-card" style={{ padding: '32px' }}>
              <h3 style={{ margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Clock size={20} className="text-accent" /> Transmission History
              </h3>
              <div style={{ overflowY: 'auto', maxHeight: '500px', paddingRight: '10px' }}>
                {announcementsList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                    <AlertCircle size={32} style={{ opacity: 0.3, marginBottom: '10px', margin: '0 auto' }} />
                    <p>No prior broadcasts detected.</p>
                  </div>
                ) : announcementsList.map(a => (
                  <div key={a.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
                    <div style={{ fontWeight: '700', marginBottom: '4px', color: '#fff' }}>{a.title}</div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '8px 0', lineHeight: 1.5 }}>{a.body}</p>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={12}/> {new Date(a.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OVERVIEW CONTENT */}
      {activeTab === 'overview' && (
        <div className="animate-fade-in">
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            <div className="stats-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '14px', color: '#3b82f6' }}><DollarSign size={24} /></div>
                 <div style={{ fontSize: '12px', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingUp size={14}/> +12.5%</div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>Monthly Revenue</div>
              <div style={{ fontSize: '36px', fontWeight: '900' }}>₹{totalRevenue.toLocaleString()}</div>
            </div>

            <div className="stats-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <div style={{ padding: '12px', background: 'rgba(var(--accent-color-rgb), 0.1)', borderRadius: '14px', color: 'var(--accent-color)' }}><Users size={24} /></div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>Total Members</div>
              <div style={{ fontSize: '36px', fontWeight: '900' }}>{usersList.length}</div>
            </div>

            <div className="stats-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '14px', color: '#10b981' }}><Package size={24} /></div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>Active Inventory</div>
              <div style={{ fontSize: '36px', fontWeight: '900' }}>{products.length}</div>
            </div>
            
            <div className="stats-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '14px', color: '#f59e0b' }}><ClipboardList size={24} /></div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>Open Orders</div>
              <div style={{ fontSize: '36px', fontWeight: '900' }}>{orders.filter(o => o.status === 'PENDING').length}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }} className="stats-grid">
            <div className="glass-card" style={{ height: '400px', padding: '32px' }}>
              <div className="flex-between" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Performance Analytics</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                     <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)' }}></div> Members
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                     <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div> Revenue
                   </div>
                </div>
              </div>
              <div style={{ width: '100%', height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Mon', members: usersList.length * 0.4, sales: totalRevenue * 0.3 },
                    { name: 'Tue', members: usersList.length * 0.5, sales: totalRevenue * 0.4 },
                    { name: 'Wed', members: usersList.length * 0.6, sales: totalRevenue * 0.5 },
                    { name: 'Thu', members: usersList.length * 0.7, sales: totalRevenue * 0.6 },
                    { name: 'Fri', members: usersList.length * 0.8, sales: totalRevenue * 0.8 },
                    { name: 'Sat', members: usersList.length * 0.9, sales: totalRevenue * 0.9 },
                    { name: 'Sun', members: usersList.length, sales: totalRevenue },
                  ]}>
                    <defs>
                      <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8b949e', fontSize: 12}} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="members" stroke="var(--accent-color)" fillOpacity={1} fill="url(#colorMem)" strokeWidth={3} />
                    <Area type="monotone" dataKey="sales" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '32px' }}>
               <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '24px', margin: 0 }}>Recent Activity</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
                 {orders.slice(0, 5).map(order => (
                   <div key={order.id} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                     <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <ShoppingBag size={20} style={{ color: 'var(--text-secondary)' }} />
                     </div>
                     <div style={{ flex: 1 }}>
                       <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{order.user?.name || 'Guest'} bought {order.product?.name}</div>
                       <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>₹{order.totalPrice} • {new Date(order.createdAt).toLocaleDateString()}</div>
                     </div>
                   </div>
                 ))}
                 {orders.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No recent activity detected.</p>}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MEMBERS CONTENT */}
      {activeTab === 'members' && (
        <div className="animate-fade-in glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px' }}>Member Directory</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>Managing {usersList.length} active athlete profiles</p>
            </div>
            <div style={{ position: 'relative', width: '400px' }}>
              <Search size={18} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Search by identity or contact..." 
                className="input-field" 
                style={{ paddingLeft: '50px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr className="header-row">
                  <th>Athlete Details</th>
                  <th>Subscription</th>
                  <th>Status & Time Left</th>
                  <th>Revenue Generated</th>
                  <th style={{ textAlign: 'right' }}>Controls</th>
                </tr>
              </thead>
              <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>No personnel matched the query.</td></tr>
              ) : filteredUsers.map(u => {
                const sub = getSubDetails(u);
                return (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <SafeAvatar src={u.avatar} name={u.name} />
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '15px' }}>{u.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className="status-pill" style={{ 
                        background: 'rgba(var(--accent-color-rgb), 0.15)',
                        color: 'var(--accent-color)',
                        width: 'fit-content'
                      }}>
                        {u.subscriptionPlan || 'Free Tier'}
                      </span>
                      {u.subscriptionDuration && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {u.subscriptionDuration}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className="status-pill" style={{ background: sub.bg, color: sub.color, width: 'fit-content', padding: '4px 10px', fontSize: '11px' }}>
                        {sub.status}
                      </span>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                        {sub.timeLeft}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '900', color: '#fff' }}>₹{u.totalPaid?.toLocaleString() || 0}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button onClick={() => openUserDetails(u)} style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>Manage</button>
                      <button onClick={(e) => handleDeleteUser(u.id, e)} style={{ padding: '10px', background: 'rgba(255,68,68,0.1)', color: '#ff4444', border: 'none', borderRadius: '12px', cursor: 'pointer' }}><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              )})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INVENTORY CONTENT */}
      {activeTab === 'inventory' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
            <div>
              <h2 style={{ fontSize: '28px', margin: 0, fontWeight: '900' }}>Shop Repository</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '6px' }}>Catalog and stock management for the e-commerce sector.</p>
            </div>
            <button onClick={openAddProduct} className="btn btn-primary" style={{ padding: '14px 28px', borderRadius: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Plus size={20} /> Register Item
            </button>
          </div>

          {products.length === 0 ? (
            <div className="glass-card" style={{ padding: '100px 20px', textAlign: 'center' }}>
              <Package size={80} style={{ color: 'var(--text-secondary)', marginBottom: '24px', opacity: 0.1, margin: '0 auto' }} />
              <h3 style={{ fontSize: '22px' }}>Inventory Depleted</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '10px auto 30px' }}>Your store catalog is currently empty. Initiate your first product registration to begin sales.</p>
              <button onClick={openAddProduct} className="btn btn-primary">Add First Item</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }} className="stats-grid">
              {products.map(p => (
                <div key={p.id} className="product-card">
                  <div className="product-image-container">
                    <img 
                      src={getImageUrl(p.images && p.images[0])} 
                      alt={p.name} 
                      className="product-image"
                      onError={(e) => {
                        e.target.src = 'https://placehold.co/600x400/161b22/444/?text=IMAGE+UNAVAILABLE';
                      }}
                    />
                    <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px' }}>
                      <button onClick={() => openEditProduct(p)} style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '14px', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
                        <Edit3 size={18} />
                      </button>
                      <button onClick={() => handleDeleteProduct(p.id)} style={{ background: 'rgba(255,68,68,0.2)', color: '#ff4444', border: '1px solid rgba(255,68,68,0.2)', padding: '10px', borderRadius: '14px', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div style={{ position: 'absolute', bottom: '16px', left: '16px' }}>
                      <span className="status-pill" style={{ background: 'var(--accent-color)', color: '#000', backdropFilter: 'none' }}>{p.category}</span>
                    </div>
                  </div>
                  <div style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>{p.name}</h3>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--accent-color)' }}>₹{p.price}</div>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, margin: 0, height: '4.8em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {p.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FULFILLMENT CONTENT */}
      {activeTab === 'orders' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }} className="stats-grid">
            <div>
              <h2 style={{ fontSize: '28px', margin: 0, fontWeight: '900' }}>Order Fulfillment</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '6px' }}>Manage logistics and delivery status for gym inventory sales.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="Search orders..." 
                  className="input-field"
                  style={{ paddingLeft: '44px', width: '240px' }}
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                />
              </div>
              <select 
                className="input-field" 
                style={{ width: '160px' }}
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr className="header-row">
                  <th>ID / Timestamp</th>
                  <th>Athlete</th>
                  <th>Provision</th>
                  <th>Valuation</th>
                  <th style={{ textAlign: 'right' }}>Deployment Status</th>
                </tr>
              </thead>
              <tbody>
                {orders
                  .filter(o => orderFilter === 'ALL' || o.status === orderFilter)
                  .filter(o => 
                    o.product?.name?.toLowerCase().includes(orderSearch.toLowerCase()) || 
                    o.user?.name?.toLowerCase().includes(orderSearch.toLowerCase())
                  )
                  .length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>
                    <Activity size={48} style={{ opacity: 0.1, marginBottom: '20px', margin: '0 auto' }} />
                    <p>No matching orders in logs.</p>
                  </td></tr>
                ) : orders
                  .filter(o => orderFilter === 'ALL' || o.status === orderFilter)
                  .filter(o => 
                    o.product?.name?.toLowerCase().includes(orderSearch.toLowerCase()) || 
                    o.user?.name?.toLowerCase().includes(orderSearch.toLowerCase())
                  )
                  .map(o => (
                  <tr key={o.id}>
                    <td>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-color)' }}>#{o.id.substring(0, 8).toUpperCase()}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{new Date(o.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                         <SafeAvatar name={o.user?.name} size="32px" />
                         <span style={{ fontWeight: '600' }}>{o.user?.name || 'Guest'}</span>
                       </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '700' }}>{o.product?.name || 'Archived Item'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Quantity: {o.quantity || 1}</div>
                    </td>
                    <td style={{ fontWeight: '900', color: '#fff' }}>₹{o.totalPrice}</td>
                    <td style={{ textAlign: 'right' }}>
                      <select 
                        value={o.status}
                        onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                        className="input-field"
                        style={{ 
                          width: '150px',
                          color: o.status === 'DELIVERED' ? '#10b981' : (o.status === 'PENDING' ? '#f59e0b' : '#3b82f6'),
                          fontWeight: '800',
                          fontSize: '11px'
                        }}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="SHIPPED">Shipped</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>
         </div>
      )}

      {/* --- ADD/EDIT PRODUCT MODAL --- */}
      {isProductModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ padding: '32px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900' }}>{editingProduct ? 'Update Parameters' : 'Catalog New Entry'}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>Configure item specification for store deployment.</p>
              </div>
              <button onClick={closeProductModal} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', padding: '10px', borderRadius: '14px' }}><X size={24} /></button>
            </div>
            
            <div style={{ padding: '32px' }}>
              <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="input-group">
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', fontWeight: '900', letterSpacing: '1px' }}>Product Designation</label>
                  <input 
                    type="text" required className="input-field" 
                    value={productForm.name} 
                    onChange={e => setProductForm({...productForm, name: e.target.value})}
                    style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '16px' }}
                    placeholder="Identify the item..."
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="input-group">
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', fontWeight: '900', letterSpacing: '1px' }}>Valuation (INR)</label>
                    <input 
                      type="number" required className="input-field" 
                      value={productForm.price} 
                      onChange={e => setProductForm({...productForm, price: e.target.value})}
                      style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '16px' }}
                      placeholder="Amount"
                    />
                  </div>
                  <div className="input-group">
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', fontWeight: '900', letterSpacing: '1px' }}>Sector Category</label>
                    <select 
                      className="input-field"
                      value={productForm.category}
                      onChange={e => setProductForm({...productForm, category: e.target.value})}
                      style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '16px' }}
                    >
                      <option>Supplements</option>
                      <option>Equipments</option>
                      <option>Apparel</option>
                      <option>Accessories</option>
                      <option>Nutrition</option>
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', fontWeight: '900', letterSpacing: '1px' }}>Visual Assets</label>
                  <div 
                    onClick={() => document.getElementById('productImage').click()}
                    style={{ 
                      border: '2px dashed rgba(255,255,255,0.1)', 
                      borderRadius: '20px', padding: '40px', textAlign: 'center', 
                      cursor: 'pointer', background: 'rgba(0,0,0,0.2)', transition: 'all 0.3s ease' 
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                  >
                    <div style={{ width: '56px', height: '56px', background: 'rgba(var(--accent-color-rgb), 0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)', margin: '0 auto 15px' }}>
                      <ImageIcon size={28} />
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: productForm.imageFile ? 'var(--accent-color)' : '#fff' }}>
                      {productForm.imageFile ? productForm.imageFile.name : 'Selection Core: Browse Files'}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>Optimal resolution: 800x600px. PNG/JPG accepted.</p>
                    <input id="productImage" type="file" hidden accept="image/*" onChange={e => setProductForm({...productForm, imageFile: e.target.files[0]})} />
                  </div>
                </div>

                <div className="input-group">
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', fontWeight: '900', letterSpacing: '1px' }}>Technical Description</label>
                  <textarea 
                    className="input-field" required
                    value={productForm.description}
                    onChange={e => setProductForm({...productForm, description: e.target.value})}
                    style={{ background: 'rgba(0,0,0,0.3)', minHeight: '120px', padding: '16px', borderRadius: '16px', resize: 'none' }}
                    placeholder="Enter comprehensive product data..."
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                  <button type="button" onClick={closeProductModal} className="btn" style={{ flex: 1, padding: '16px', borderRadius: '16px', fontWeight: '700', background: 'rgba(255,255,255,0.05)' }}>Abort</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: '16px', borderRadius: '16px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <CheckCircle size={20} /> {editingProduct ? 'Commit Changes' : 'Deploy to Catalog'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- USER DETAILS & TASK MODAL --- */}
      {selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div style={{ padding: '32px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <SafeAvatar src={selectedUser.avatar} name={selectedUser.name} size="64px" />
                <div>
                  <h2 style={{ fontSize: '24px', margin: 0, fontWeight: '900' }}>{selectedUser.name}</h2>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedUser.email} <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-secondary)' }}></span> ID: {selectedUser.id.substring(0,8)}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', padding: '10px', borderRadius: '14px' }}><X size={24} /></button>
            </div>
            
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="stats-card" style={{ padding: '20px', borderRadius: '20px' }}>
                   <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '8px' }}>Authorization</div>
                   <div style={{ fontWeight: '900', fontSize: '18px', color: selectedUser.role === 'GYM_OWNER' ? 'var(--accent-color)' : '#fff' }}>{selectedUser.role}</div>
                </div>
                <div className="stats-card" style={{ padding: '20px', borderRadius: '20px' }}>
                   <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '8px' }}>Active Plan</div>
                   <div style={{ fontWeight: '900', fontSize: '18px', color: '#10b981' }}>{selectedUser.subscriptionPlan || 'Free Tier'}</div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--accent-color)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Plus size={16}/> Command Assignment
                </h3>
                <form onSubmit={handleAssignPlan} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '15px' }}>
                    <select 
                      className="input-field"
                      value={planForm.type}
                      onChange={e => setPlanForm({...planForm, type: e.target.value})}
                      style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '14px' }}
                    >
                      <option value="workout">Combat Routine</option>
                      <option value="nutrition">Tactical Nutrition</option>
                      <option value="goal">Objective Marker</option>
                    </select>
                    <input 
                      type="text" className="input-field" placeholder="Directive Headline" required
                      value={planForm.title}
                      onChange={e => setPlanForm({...planForm, title: e.target.value})}
                      style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '14px' }}
                    />
                  </div>
                  <textarea 
                    className="input-field" placeholder="Specify full tactical parameters for the athlete..." required
                    value={planForm.details}
                    onChange={e => setPlanForm({...planForm, details: e.target.value})}
                    style={{ background: 'rgba(0,0,0,0.3)', minHeight: '120px', padding: '16px', borderRadius: '14px', resize: 'none' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '16px', fontWeight: '900', borderRadius: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                    Deploy Directive <ArrowRight size={20} />
                  </button>
                </form>
              </div>

              <div>
                <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Operational History</h3>
                {!userDetails?.plans?.length ? (
                  <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(0,0,0,0.2)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.05)' }}>
                    <AlertCircle size={32} style={{ opacity: 0.2, marginBottom: '10px', margin: '0 auto' }} />
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No previous deployments recorded for this athlete.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {userDetails.plans.map(plan => (
                      <div key={plan.id} style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <span className="status-pill" style={{ 
                            background: plan.type === 'workout' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                            color: plan.type === 'workout' ? '#3b82f6' : '#10b981'
                          }}>
                            {plan.type}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={12} /> {new Date(plan.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '800' }}>{plan.title}</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{plan.details}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;

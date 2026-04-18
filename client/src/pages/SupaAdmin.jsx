import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ScrollText,
  Plus, Edit, Trash2, Power, Activity, Menu,
  Instagram, Facebook, Twitter, Globe, Key, Eye, Image as ImageIcon, Search, ShieldCheck, Mail, Phone,
  IndianRupee, PieChart, TrendingUp, Info, Zap, Crown
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import './SupaAdmin.css';

const MOCK_REVENUE_DATA = [
  { name: 'Jan', revenue: 4000 },
  { name: 'Feb', revenue: 5500 },
  { name: 'Mar', revenue: 4800 },
  { name: 'Apr', revenue: 7000 },
  { name: 'May', revenue: 9500 },
  { name: 'Jun', revenue: 14000 },
];

const SupaAdmin = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [revenueData, setRevenueData] = useState(null);
  const [planPrices, setPlanPrices] = useState([]);
  const [showGst, setShowGst] = useState(false);
  const [costs, setCosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Password Modal State
  const [showPassModal, setShowPassModal] = useState(false);
  const [targetId, setTargetId] = useState(null);
  const [newPass, setNewPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  // Edit Client Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '', name: '', email: '', phone: '', businessName: '', gymLocation: '',
    subscriptionPlan: '', subscriptionStatus: '',
    instagram: '', facebook: '', twitter: '', blogger: '',
    logoFile: null, logoUrl: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    clientName: '', businessName: '', email: '', password: '', phone: '',
    location: '', subscriptionPlan: 'Premium',
    instagram: '', facebook: '', twitter: '', blogger: '',
    logoFile: null
  });
  const [showLogoModal, setShowLogoModal] = useState(null); // url to show in preview

  // --- Logs state ---
  const [logs, setLogs] = useState([]);
  const [logStats, setLogStats] = useState({ totalToday: 0, errorsToday: 0, warningsToday: 0, activeGymsToday: 0 });
  const [logFilters, setLogFilters] = useState({ level: 'ALL', gymId: '', search: '', page: 1 });
  const [totalPages, setTotalPages] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchLogStats = useCallback(async () => {
    try {
      const res = await fetch('/api/supaadmin/log-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setLogStats(await res.json());
    } catch (err) { console.error(err); }
  }, [token]);

  const fetchLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const params = new URLSearchParams({
        level: logFilters.level,
        gymId: logFilters.gymId,
        search: logFilters.search,
        page: logFilters.page
      });
      const res = await fetch(`/api/supaadmin/logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotalPages(data.totalPages);
      }
    } catch (err) { console.error(err); } finally { setLogsLoading(false); }
  }, [token, logFilters]);

  const fetchRevenue = useCallback(async () => {
    try {
      const res = await fetch('/api/supaadmin/revenue', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setRevenueData(await res.json());
    } catch (err) { console.error(err); }
  }, [token]);

  const fetchPricing = useCallback(async () => {
    try {
      const res = await fetch('/api/supaadmin/pricing', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setPlanPrices(await res.json());
    } catch (err) { console.error(err); }
  }, [token]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/supaadmin/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setClients(data);
    } catch (err) { console.error(err); } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchClients();
    fetchRevenue();
    fetchPricing();
  }, [fetchClients, fetchRevenue, fetchPricing]);

  useEffect(() => {
    let interval;
    if (isLive && activeTab === 'logs') {
      interval = setInterval(() => {
        fetchLogs();
        fetchLogStats();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isLive, activeTab, fetchLogs, fetchLogStats]);

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab, fetchLogs]);







  const runCleanup = async () => {
    if (!window.confirm('Delete all logs older than 90 days?')) return;
    try {
      const res = await fetch('/api/supaadmin/logs/cleanup', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Cleanup complete!');
        fetchLogs();
        fetchLogStats();
      }
    } catch (err) { console.error(err); }
  };



  const exportLogs = () => {
    const headers = ['Time', 'Level', 'Gym', 'Action', 'Message'];
    const rows = logs.map(l => [
      new Date(l.createdAt).toLocaleString(),
      l.level,
      l.gymId || '-',
      l.action,
      l.message
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `system_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const updatePrice = async (plan, price) => {
    try {
      const res = await fetch(`/api/supaadmin/pricing/${plan}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ priceINR: price })
      });
      if (res.ok) {
        fetchPricing();
        fetchRevenue();
      }
    } catch (err) { console.error(err); }
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('clientName', form.clientName);
      formData.append('email', form.email);
      formData.append('password', form.password);
      formData.append('location', form.location);
      formData.append('phone', form.phone);
      formData.append('businessName', form.businessName);
      formData.append('subscriptionPlan', form.subscriptionPlan);

      const socialTokens = {
        instagram: form.instagram,
        facebook: form.facebook,
        twitter: form.twitter,
        blogger: form.blogger
      };
      formData.append('socialTokens', JSON.stringify(socialTokens));

      if (form.logoFile) {
        formData.append('logo', form.logoFile);
      }

      const res = await fetch('/api/supaadmin/clients', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ clientName: '', businessName: '', email: '', password: '', phone: '', location: '', subscriptionPlan: 'Premium', instagram: '', facebook: '', twitter: '', blogger: '', logoFile: null });
        fetchClients();
      }
    } catch (err) { console.error(err); }
  };

  const handleSocialToggle = async (userId, platform, enabled) => {
    // Optimistic UI update — instant visual feedback, no waiting for server
    setClients(prev => prev.map(c => {
      if (c.id !== userId) return c;
      const social = { ...(c.socialTokens || {}) };
      social[platform] = { ...(social[platform] || {}), enabled };
      return { ...c, socialTokens: social };
    }));

    try {
      await fetch(`/api/supaadmin/clients/${userId}/social-toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ platform, enabled })
      });
      // No full re-fetch needed — state is already updated
    } catch (err) {
      console.error(err);
      fetchClients(); // Revert on error
    }
  };

  const handleDeleteClient = async (clientId, clientName) => {
    if (!window.confirm(`Are you sure you want to delete client "${clientName}"? This action is irreversible.`)) return;
    try {
      const res = await fetch(`/api/supaadmin/clients/${clientId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setClients(prev => prev.filter(c => c.id !== clientId));
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete client');
      }
    } catch (err) { console.error(err); }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPass.length < 6) return alert('Password too short');
    setPassLoading(true);
    try {
      const res = await fetch(`/api/supaadmin/clients/${targetId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ password: newPass })
      });
      if (res.ok) {
        alert('Password updated successfully');
        setShowPassModal(false);
        setNewPass('');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update password');
      }
    } catch (err) { console.error(err); } finally { setPassLoading(false); }
  };

  const openEditModal = (client) => {
    const social = client.socialTokens || {};
    setEditForm({
      id: client.id,
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      businessName: client.gym?.name || '',
      gymLocation: client.gym?.location || '',
      subscriptionPlan: client.subscriptionPlan || 'Premium',
      subscriptionStatus: client.subscriptionStatus || 'Active',
      instagram: social.instagram?.token || '',
      facebook: social.facebook?.token || '',
      twitter: social.twitter?.token || '',
      blogger: social.blogger?.token || '',
      logoFile: null,
      logoUrl: client.gym?.logoUrl || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('email', editForm.email);
      formData.append('phone', editForm.phone);
      formData.append('businessName', editForm.businessName);
      formData.append('gymLocation', editForm.gymLocation);
      formData.append('subscriptionPlan', editForm.subscriptionPlan);
      formData.append('subscriptionStatus', editForm.subscriptionStatus);

      const socialTokens = {
        instagram: editForm.instagram,
        facebook: editForm.facebook,
        twitter: editForm.twitter,
        blogger: editForm.blogger
      };
      formData.append('socialTokens', JSON.stringify(socialTokens));

      if (editForm.logoFile) {
        formData.append('logo', editForm.logoFile);
      }

      const res = await fetch(`/api/supaadmin/clients/${editForm.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchClients();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update client');
      }
    } catch (err) { console.error(err); } finally { setEditLoading(false); }
  };

  const Sidebar = () => (
    <div className={`supa-sidebar glass ${isSidebarOpen ? '' : 'closed'}`}>
      <div className="supa-brand" style={{ justifyContent: 'center' }}>
        <img src="/supa-logo.png" alt="SupaAdmin" style={{ height: '100px', objectFit: 'contain' }} />
      </div>
      <div className="supa-nav">
        {[
          { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
          { id: 'clients', icon: <Users size={20} />, label: 'Clients' },
          { id: 'pricing', icon: <IndianRupee size={20} />, label: 'Pricing & Revenue' },
          { id: 'logs', icon: <ScrollText size={20} />, label: 'Logs' }
        ].map(item => (
          <button
            key={item.id}
            className={`supa-nav-btn ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.icon} {item.label}
            {item.id === 'logs' && logStats.errorsToday > 0 && <div className="error-dot-pulse" />}
          </button>
        ))}
      </div>
      <div className="supa-sidebar-footer">
        <button className="supa-logout" onClick={() => { logout(); navigate('/login'); }}>
          <Power size={20} /> Logout
        </button>
      </div>
    </div>
  );

  const TopBar = () => (
    <div className="supa-topbar glass">
      <div className="topbar-search">
        <button className="icon-action text-secondary" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          <Menu size={24} />
        </button>
      </div>
      <div className="topbar-profile">
        <div className="profile-text">
          <span className="name">{user?.name}</span>
          <span className="role text-accent">Super Admin</span>
        </div>
        <img src={user?.avatar} alt="Admin" className="avatar" />
      </div>
    </div>
  );

  const formatCurrency = (val) => {
    const amount = showGst ? val * 1.18 : val;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPlanIcon = (plan) => {
    if (plan === 'Enterprise') return <Crown size={20} color="#a855f7" />;
    if (plan === 'Premium') return <Zap size={20} color="#f5a623" />;
    return <Info size={20} color="#6c757d" />;
  };

  const formatTime = (date, full = false) => {
    const d = new Date(date);
    if (full) return d.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'medium' });
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const renderLogs = () => {
    return (
      <div className="supa-content animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>System Audit Logs</h2>
            <p className="text-secondary">Monitor platform activity and troubleshoot issues</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={runCleanup}><Trash2 size={16} /> Cleanup &gt;90d</button>
            <button className="btn btn-primary" onClick={exportLogs}><ScrollText size={16} /> Export CSV</button>
          </div>
        </div>

        <div className="stats-strip">
          <div className="glass-card" style={{ padding: '15px' }}>
            <div className="stat-label" style={{ fontSize: '11px', opacity: 0.6 }}>LOGS TODAY</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>{logStats.totalToday}</div>
          </div>
          <div className="glass-card" style={{ padding: '15px', borderLeft: '3px solid #ff4d4f' }}>
            <div className="stat-label" style={{ fontSize: '11px', opacity: 0.6 }}>ERRORS TODAY</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: logStats.errorsToday > 0 ? '#ff4d4f' : 'inherit' }}>{logStats.errorsToday}</div>
          </div>
          <div className="glass-card" style={{ padding: '15px', borderLeft: '3px solid #f5a623' }}>
            <div className="stat-label" style={{ fontSize: '11px', opacity: 0.6 }}>WARNINGS TODAY</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: logStats.warningsToday > 0 ? '#f5a623' : 'inherit' }}>{logStats.warningsToday}</div>
          </div>
          <div className="glass-card" style={{ padding: '15px' }}>
            <div className="stat-label" style={{ fontSize: '11px', opacity: 0.6 }}>ACTIVE GYMS</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>{logStats.activeGymsToday}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '12px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Search Gym ID / Action / Message..." 
              style={{ paddingLeft: '36px', height: '40px' }}
              value={logFilters.gymId || logFilters.search}
              onChange={(e) => setLogFilters({ ...logFilters, gymId: e.target.value, search: e.target.value, page: 1 })}
            />
          </div>
          
          <select 
            className="input" 
            style={{ width: '140px', height: '40px' }}
            value={logFilters.level}
            onChange={(e) => setLogFilters({ ...logFilters, level: e.target.value, page: 1 })}
          >
            <option value="ALL">All Levels</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
          </select>

          <button 
            className={`btn ${isLive ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ height: '40px', gap: '8px' }}
            onClick={() => setIsLive(!isLive)}
          >
            {isLive && <span className="live-dot" />}
            {isLive ? 'LIVE' : 'AUTO FETCH'}
          </button>
        </div>

        <div className="table-container glass-card" style={{ padding: 0 }}>
          <table className="supa-table">
            <thead>
              <tr className="log-row-compact">
                <th style={{ width: '120px' }}>TIME</th>
                <th style={{ width: '100px' }}>LEVEL</th>
                <th style={{ width: '180px' }}>GYM ID</th>
                <th style={{ width: '180px' }}>ACTION</th>
                <th>MESSAGE</th>
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                    {logsLoading ? 'Loading logs...' : 'No logs found matching filters.'}
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <React.Fragment key={log.id}>
                    <tr className="log-row-compact h-hover" style={{ cursor: 'pointer' }} onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}>
                      <td className="log-monospace" title={formatTime(log.createdAt, true)}>
                        {formatTime(log.createdAt)}
                      </td>
                      <td>
                        <span className={`log-badge ${log.level.toLowerCase()}`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="log-monospace" style={{ fontSize: '11px', opacity: 0.7 }}>{log.gymId || '-'}</td>
                      <td>
                        <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '11px', color: 'var(--accent-color)' }}>
                          {log.action}
                        </span>
                      </td>
                      <td className="text-secondary" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.message}
                      </td>
                      <td>
                        {expandedLogId === log.id ? <Plus size={16} style={{ transform: 'rotate(45deg)', transition: '0.3s' }} /> : <Plus size={16} style={{ transition: '0.3s' }} />}
                      </td>
                    </tr>
                    {expandedLogId === log.id && (
                      <tr className="log-expand-panel">
                        <td colSpan="6">
                          <div className="animate-fade-in" style={{ padding: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <span style={{ fontSize: '12px', fontWeight: '600' }}>{formatTime(log.createdAt, true)}</span>
                              <span className="text-secondary">Log ID: {log.id}</span>
                            </div>
                            <pre className="log-monospace" style={{ fontSize: '12px', background: 'rgba(0,0,0,0.5)', padding: '15px', borderRadius: '8px' }}>
                              {JSON.stringify(log.metadata || {}, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
          <div className="text-secondary" style={{ fontSize: '14px' }}>
            Page {logFilters.page} of {totalPages}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-secondary" 
              disabled={logFilters.page === 1}
              onClick={() => setLogFilters({ ...logFilters, page: logFilters.page - 1 })}
            >
              Previous
            </button>
            <button 
              className="btn btn-secondary" 
              disabled={logFilters.page === totalPages}
              onClick={() => setLogFilters({ ...logFilters, page: logFilters.page + 1 })}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="supa-content animate-fade-in">
      <h2>Platform Overview</h2>
      <div className="stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ background: 'rgba(0, 255, 170, 0.1)', color: 'var(--accent-color)' }}>
              <TrendingUp size={20} />
            </div>
            <span className="stat-label">Monthly Revenue (MRR)</span>
          </div>
          <div className="stat-value">{formatCurrency(revenueData?.mrr || 0)}</div>
          <div className="stat-footer text-accent">
            <span style={{ fontSize: '11px' }}>{showGst ? 'Incl. 18% GST' : 'Excl. GST'}</span>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
              <Users size={20} />
            </div>
            <span className="stat-label">Active Franchises</span>
          </div>
          <div className="stat-value">{revenueData?.activeClients || 0}</div>
          <div className="stat-footer text-secondary">Paying clients</div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ background: 'rgba(245, 166, 35, 0.1)', color: '#f5a623' }}>
              <PieChart size={20} />
            </div>
            <span className="stat-label">Avg Revenue / Client</span>
          </div>
          <div className="stat-value">{formatCurrency(revenueData?.avgRevenuePerClient || 0)}</div>
          <div className="stat-footer text-secondary">Per month</div>
        </div>
      </div>

      <div className="chart-container glass-card mt-4" style={{ height: '400px', padding: '20px' }}>
        <h3 className="mb-4">Revenue Trajectory (Last 6 Months)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={revenueData?.trajectory || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="name" stroke="var(--text-secondary)" />
            <YAxis stroke="var(--text-secondary)" tickFormatter={val => `₹${val/1000}k`} />
            <RechartsTooltip 
              contentStyle={{ backgroundColor: 'var(--bg-dark)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'MRR']}
            />
            <Line type="monotone" dataKey="revenue" stroke="var(--accent-color)" strokeWidth={4} dot={{ stroke: 'var(--accent-color)', strokeWidth: 2, r: 4, fill: '#1a1a1a' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderPricing = () => {
    const netProfit = (revenueData?.mrr || 0) - costs;
    const grossMargin = (revenueData?.mrr || 0) > 0 ? (netProfit / (revenueData?.mrr || 0)) * 100 : 0;

    return (
      <div className="supa-content animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>Pricing Command Center</h2>
            <p className="text-secondary">Configure subscription tiers and analyze margins</p>
          </div>
          <div className="glass-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Show GST (18%)</span>
            <button 
              className={`toggle ${showGst ? 'active' : ''}`}
              onClick={() => setShowGst(!showGst)}
              style={{ width: '40px', height: '20px', borderRadius: '10px', background: showGst ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'all 0.3s' }}
            >
              <div style={{ position: 'absolute', top: '2px', left: showGst ? '22px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'all 0.3s' }} />
            </button>
          </div>
        </div>

        <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
          {['Basic', 'Premium', 'Enterprise'].map(plan => {
            const config = planPrices.find(p => p.plan === plan) || { priceINR: 0 };
            const breakdown = revenueData?.planBreakdown?.[plan] || { count: 0, revenue: 0 };
            return (
              <div key={plan} className="glass-card pricing-card h-hover" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ marginBottom: '15px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-color)' }}>{plan} TIER</span>
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '28px', fontWeight: '800' }}>₹</span>
                    <input 
                      type="number" 
                      className="price-input" 
                      style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '28px', fontWeight: '800', width: '120px', outline: 'none' }}
                      value={config.priceINR}
                      onBlur={(e) => updatePrice(plan, e.target.value)}
                      onChange={(e) => {
                        const newPrices = planPrices.map(p => p.plan === plan ? { ...p, priceINR: e.target.value } : p);
                        setPlanPrices(newPrices);
                      }}
                    />
                    <span className="text-secondary">/mo</span>
                  </div>
                </div>
                <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '20px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  <span className="text-secondary">{breakdown.count} Clients</span>
                  <span className="text-accent">{formatCurrency(breakdown.revenue)}</span>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <li style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>{getPlanIcon(plan)} {plan === 'Basic' ? '50' : plan === 'Premium' ? '200' : 'Unlimited'} Members</li>
                  <li style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><ShieldCheck size={14} className="text-accent" /> {plan === 'Basic' ? 'Core Features' : 'All Core Features'}</li>
                  <li style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', opacity: plan === 'Basic' ? 0.4 : 1 }}>{plan === 'Basic' ? <Info size={14} /> : <ShieldCheck size={14} className="text-accent" />} Social Integrations</li>
                  <li style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', opacity: plan === 'Enterprise' ? 1 : 0.4 }}>{plan === 'Enterprise' ? <Crown size={14} className="text-accent" /> : <Info size={14} />} White-labeling</li>
                </ul>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 className="card-title" style={{ marginBottom: '20px' }}>Margin Calculator</h3>
            <div className="input-group">
                <label className="input-label" style={{ fontSize: '11px', opacity: 0.6 }}>Estimated Monthly Operating Cost (Server, Salaries, Ad Spend)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>₹</span>
                  <input 
                    type="number" 
                    className="input" 
                    style={{ paddingLeft: '30px' }}
                    value={costs}
                    onChange={e => setCosts(parseFloat(e.target.value) || 0)}
                  />
                </div>
            </div>
            
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span className="text-secondary">Gross Revenue (MRR)</span>
                  <span>{formatCurrency(revenueData?.mrr || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span className="text-secondary">Operating Costs</span>
                  <span style={{ color: '#ff4d4f' }}>- {formatCurrency(costs)}</span>
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600' }}>Estimated Net Profit</span>
                  <span style={{ fontSize: '20px', fontWeight: '800', color: netProfit >= 0 ? 'var(--accent-color)' : '#ff4d4f' }}>
                    {formatCurrency(netProfit)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span className="text-secondary">Gross Margin</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                       <div style={{ width: `${Math.max(0, Math.min(100, grossMargin))}%`, height: '100%', background: 'var(--accent-color)' }} />
                    </div>
                    <span className="text-accent" style={{ fontWeight: '600' }}>{grossMargin.toFixed(1)}%</span>
                  </div>
                </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 className="card-title" style={{ marginBottom: '20px' }}>Plan Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {['Enterprise', 'Premium', 'Basic'].map(plan => {
                const data = revenueData?.planBreakdown[plan] || { count: 0, revenue: 0 };
                const total = revenueData?.activeClients || 1;
                const percentage = (data.count / total) * 100;
                return (
                  <div key={plan}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getPlanIcon(plan)}
                        <span style={{ fontWeight: '500' }}>{plan}</span>
                      </div>
                      <span className="text-secondary">{percentage.toFixed(0)}% ({data.count})</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${percentage}%`, 
                          height: '100%', 
                          background: plan === 'Enterprise' ? '#a855f7' : plan === 'Premium' ? '#f5a623' : '#6c757d',
                          boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '30px', padding: '15px', background: 'rgba(0,255,170,0.05)', borderRadius: '12px', border: '1px solid rgba(0,255,170,0.1)' }}>
               <div style={{ fontSize: '12px', color: 'var(--accent-color)', fontWeight: '600', marginBottom: '4px' }}>💡 REVENUE INSIGHT</div>
              {revenueData?.topPlan && revenueData?.planBreakdown ? (
                <p style={{ fontSize: '12px', margin: 0, opacity: 0.8 }}>
                  {revenueData?.topPlan} is currently your most successful tier, contributing 
                  {((revenueData.planBreakdown?.[revenueData.topPlan]?.revenue / (revenueData.mrr || 1)) * 100).toFixed(1)}% 
                  of total MRR.
                </p>
              ) : (
                <p style={{ fontSize: '12px', margin: 0, opacity: 0.8 }}>
                  No revenue insights available.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderClients = () => (
    <div className="supa-content animate-fade-in">
      <div className="clients-header mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Franchise Clients</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Add Client</button>
        </div>
      </div>

      <div className="table-container glass-card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="supa-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Client ID</th>
              <th>Client Name</th>
              <th>Business Name</th>
              <th>Email</th>
              <th>Joined Date</th>
              <th>Mobile Number</th>
              <th>Subscribed Plan</th>
              <th>Plan Status</th>
              <th>Social Media</th>
              <th>Token</th>
              <th>Social Action</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c, idx) => {
              const platforms = [
                { id: 'instagram', label: 'Instagram', icon: <Instagram size={14} /> },
                { id: 'facebook', label: 'Facebook', icon: <Facebook size={14} /> },
                { id: 'twitter', label: 'Twitter/X', icon: <Twitter size={14} /> },
                { id: 'blogger', label: 'Blogger/Web', icon: <Globe size={14} /> }
              ];
              const social = c.socialTokens || {};

              return platforms.map((p, pIdx) => (
                <tr key={`${c.id}-${p.id}`} className={social[p.id]?.token && !social[p.id]?.enabled ? 'social-row-disabled' : ''}>
                  {pIdx === 0 && (
                    <>
                      <td rowSpan={4}>{idx + 1}</td>
                      <td rowSpan={4} style={{ fontSize: '11px', color: 'var(--accent-color)', fontFamily: 'monospace', cursor: 'pointer' }} title="Click to copy Gym ID" onClick={() => { navigator.clipboard.writeText(c.gymId); alert('Gym ID copied!'); }}>
                        {c.gymId}
                      </td>
                      <td rowSpan={4}>{c.name}</td>
                      <td rowSpan={4} className="text-accent" style={{ fontWeight: '500' }}>{c.gym?.name || 'N/A'}</td>
                      <td rowSpan={4} style={{ fontSize: '13px' }}>{c.email}</td>
                      <td rowSpan={4}>{new Date(c.createdAt).toISOString().split('T')[0]}</td>
                      <td rowSpan={4}>{c.phone || '+1 (555) 000-0000'}</td>
                      <td rowSpan={4}>{c.subscriptionPlan || 'Premium'}</td>
                      <td rowSpan={4}>
                        <span className={`status-badge ${c.subscriptionStatus === 'Inactive' ? 'danger' : 'success'}`}>
                          {c.subscriptionStatus || 'Active'}
                        </span>
                      </td>
                    </>
                  )}
                  <td className="social-platform-label">
                    {p.icon} {p.label}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {social[p.id]?.token ? (
                      <span className={!social[p.id].enabled ? 'text-secondary' : ''}>{social[p.id].token}</span>
                    ) : (
                      <span className="text-italic">Not Connected</span>
                    )}
                  </td>
                  <td>
                    {social[p.id]?.token && (
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={social[p.id]?.enabled}
                          onChange={(e) => handleSocialToggle(c.id, p.id, e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                    )}
                  </td>
                  {pIdx === 0 && (
                    <td rowSpan={4}>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button className="icon-action text-accent" title="Edit Client" onClick={() => openEditModal(c)}><Edit size={16} /></button>
                        <button className="icon-action" style={{ color: '#00ffaa' }} title="Preview Logo" onClick={() => setShowLogoModal(c.gym?.logoUrl)} disabled={!c.gym?.logoUrl}><Eye size={16} /></button>
                        <button className="icon-action" style={{ color: '#faad14' }} title="Change Password" onClick={() => { setTargetId(c.id); setShowPassModal(true); }}><Key size={16} /></button>
                        <button className="icon-action text-danger" title="Delete Client" onClick={() => handleDeleteClient(c.id, c.name)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ));
            })}
            {clients.length === 0 && (
              <tr><td colSpan="13" style={{ textAlign: 'center', padding: '20px' }}>No clients found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );



  if (loading) return (
    <div className="loading-overlay" style={{ background: 'var(--bg-dark)', zIndex: 9999, height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader" />
      <p style={{ marginTop: '20px', color: 'var(--accent-color)', fontWeight: '600' }}>Initializing SupaAdmin...</p>
    </div>
  );

  return (
    <div className="supa-layout">
      <Sidebar />
      <div className="supa-main">
        <TopBar />
        <div className="supa-scroll-area">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'clients' && renderClients()}
          {activeTab === 'pricing' && renderPricing()}
          {activeTab === 'logs' && renderLogs()}
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card animate-fade-in" style={{ maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '4px' }}>➕ Add New Client</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Fill in the details to onboard a new franchise owner.</p>

            <form onSubmit={handleAddClient} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

              <div className="section-divider" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', fontWeight: '600', color: 'var(--accent-color)', fontSize: '14px' }}>👤 Personal Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input type="text" className="input" placeholder="Owner Full Name *" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} required />
                <input type="email" className="input" placeholder="Owner Email *" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                <input type="tel" className="input" placeholder="Mobile Number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                <input type="password" className="input" placeholder="Login Password *" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
              </div>

              <div className="section-divider" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', marginTop: '10px', fontWeight: '600', color: 'var(--accent-color)', fontSize: '14px' }}>🖼️ Business Branding</div>
              <div className="input-group">
                <label className="input-label" style={{ fontSize: '11px' }}>Gym Logo (Brand Logo - Rectangular preferred)</label>
                <div
                  style={{
                    border: '2px dashed rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: form.logoFile ? 'rgba(0,255,170,0.05)' : 'transparent'
                  }}
                  onClick={() => document.getElementById('logo-upload').click()}
                >
                  <input
                    id="logo-upload"
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => setForm({ ...form, logoFile: e.target.files[0] })}
                  />
                  {form.logoFile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <ImageIcon size={24} className="text-accent" />
                      <span style={{ fontSize: '12px' }}>{form.logoFile.name} (Ready)</span>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setForm({ ...form, logoFile: null }); }}>Remove</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: 0.6 }}>
                      <Plus size={24} />
                      <span style={{ fontSize: '12px' }}>Click to upload logo</span>
                    </div>
                  )}
                </div>
                {form.logoFile && (
                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <img src={URL.createObjectURL(form.logoFile)} alt="Preview" style={{ maxWidth: '100%', maxHeight: '80px', borderRadius: '4px', objectFit: 'contain' }} />
                  </div>
                )}
              </div>

              <div className="section-divider" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', marginTop: '10px', fontWeight: '600', color: 'var(--accent-color)', fontSize: '14px' }}>🌐 Social Media Tokens</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="inner-input-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}><Instagram size={14} /> <span style={{ fontSize: '11px' }}>Instagram</span></div>
                  <input type="text" className="input" style={{ padding: '8px' }} placeholder="Token" value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} />
                </div>
                <div className="inner-input-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}><Facebook size={14} /> <span style={{ fontSize: '11px' }}>Facebook</span></div>
                  <input type="text" className="input" style={{ padding: '8px' }} placeholder="Token" value={form.facebook} onChange={e => setForm({ ...form, facebook: e.target.value })} />
                </div>
                <div className="inner-input-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}><Twitter size={14} /> <span style={{ fontSize: '11px' }}>Twitter/X</span></div>
                  <input type="text" className="input" style={{ padding: '8px' }} placeholder="Token" value={form.twitter} onChange={e => setForm({ ...form, twitter: e.target.value })} />
                </div>
                <div className="inner-input-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}><Globe size={14} /> <span style={{ fontSize: '11px' }}>Blogger/Web</span></div>
                  <input type="text" className="input" style={{ padding: '8px' }} placeholder="Token" value={form.blogger} onChange={e => setForm({ ...form, blogger: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">Add Client</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLogoModal && (
        <div className="modal-overlay" onClick={() => setShowLogoModal(null)}>
          <div className="modal-content glass-card animate-scale-up" style={{ textAlign: 'center', maxWidth: '600px', padding: '10px' }}>
            <img src={showLogoModal} alt="Gym Logo" style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '4px' }} />
            <div style={{ marginTop: '15px' }}>
              <button className="btn btn-secondary" onClick={() => setShowLogoModal(null)}>Close Preview</button>
            </div>
          </div>
        </div>
      )}

      {showPassModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card animate-fade-in" style={{ maxWidth: '400px' }}>
            <h3>Change Client Password</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>Enter a new secure password for this client.</p>
            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input
                type="password"
                className="input"
                placeholder="New Password"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                required
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowPassModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-1" disabled={passLoading}>
                  {passLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card animate-fade-in" style={{ maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '4px' }}>✏️ Edit Client</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Changes to Business Name and Social Tokens take effect immediately.</p>
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Client Name</label>
                  <input type="text" className="input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Business Name</label>
                  <input type="text" className="input" value={editForm.businessName} onChange={e => setEditForm({ ...editForm, businessName: e.target.value })} />
                </div>
                <div className="input-group" style={{ marginBottom: 20 }}>
                  <label className="input-label">Gym Logo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                    {editForm.logoFile ? (
                      <img src={URL.createObjectURL(editForm.logoFile)} alt="New" style={{ height: '40px', width: '80px', objectFit: 'contain' }} />
                    ) : (
                      editForm.logoUrl ? (
                        <img src={editForm.logoUrl} alt="Current" style={{ height: '40px', width: '80px', objectFit: 'contain' }} />
                      ) : (
                        <div style={{ height: '40px', width: '80px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={20} opacity={0.5} /></div>
                      )
                    )}
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => document.getElementById('edit-logo-upload').click()}>
                      {editForm.logoFile || editForm.logoUrl ? 'Change Logo' : 'Upload Logo'}
                    </button>
                    <input
                      id="edit-logo-upload"
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => setEditForm({ ...editForm, logoFile: e.target.files[0] })}
                    />
                  </div>
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Gym Location</label>
                  <input type="text" className="input" value={editForm.gymLocation} onChange={e => setEditForm({ ...editForm, gymLocation: e.target.value })} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Email</label>
                  <input type="email" className="input" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} required />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Phone</label>
                  <input type="tel" className="input" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Subscription Plan</label>
                  <select className="input" value={editForm.subscriptionPlan} onChange={e => setEditForm({ ...editForm, subscriptionPlan: e.target.value })}>
                    <option value="Basic">Basic</option>
                    <option value="Premium">Premium</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Plan Status</label>
                  <select className="input" value={editForm.subscriptionStatus} onChange={e => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: 0, marginTop: '8px' }}>
                <label className="input-label" style={{ fontSize: '12px' }}>Social Media Tokens</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px', fontSize: '11px' }}><Instagram size={13} /> Instagram</div>
                    <input type="text" className="input" style={{ padding: '8px' }} placeholder="Token" value={editForm.instagram} onChange={e => setEditForm({ ...editForm, instagram: e.target.value })} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px', fontSize: '11px' }}><Facebook size={13} /> Facebook</div>
                    <input type="text" className="input" style={{ padding: '8px' }} placeholder="Token" value={editForm.facebook} onChange={e => setEditForm({ ...editForm, facebook: e.target.value })} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px', fontSize: '11px' }}><Twitter size={13} /> Twitter/X</div>
                    <input type="text" className="input" style={{ padding: '8px' }} placeholder="Token" value={editForm.twitter} onChange={e => setEditForm({ ...editForm, twitter: e.target.value })} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px', fontSize: '11px' }}><Globe size={13} /> Blogger/Web</div>
                    <input type="text" className="input" style={{ padding: '8px' }} placeholder="Token" value={editForm.blogger} onChange={e => setEditForm({ ...editForm, blogger: e.target.value })} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-1" disabled={editLoading}>
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SupaAdmin;

import React, { createContext, useContext, useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sun, Moon, QrCode, X, Bell } from 'lucide-react';
import QRCode from 'react-qr-code';
import { io } from 'socket.io-client';
import './index.css';

// Lazy load pages to break circular dependencies and improve performance
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Community = lazy(() => import('./pages/Community'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Shop = lazy(() => import('./pages/Shop'));
const Profile = lazy(() => import('./pages/Profile'));
const Admin = lazy(() => import('./pages/Admin'));
const SupaAdmin = lazy(() => import('./pages/SupaAdmin'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Header = lazy(() => import('./components/Header'));
const BottomNav = lazy(() => import('./components/BottomNav'));

// --- Context & Auth State ---
const AuthContext = createContext(null);
const ThemeContext = createContext(null);

export const useAuth = () => useContext(AuthContext);
export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch('/api/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
      })
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        logout();
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem('token', jwtToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Protected Route Helper ---
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="page"><p>Loading...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

// --- App Layout Wrapper ---
const AppLayout = ({ children }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [showGlobalQR, setShowGlobalQR] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const hideNav = location.pathname === '/login' || user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_OWNER';

  useEffect(() => {
    if (user && user.gymId && !hideNav) {
      // Fetch past announcements
      fetch('/api/announcements', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        .then(res => res.ok ? res.json() : [])
        .then(data => {
           setNotifications(data);
           // Simple unread logic based on local storage
           const lastSeen = localStorage.getItem('lastSeenNotifications') || 0;
           const unread = data.filter(n => new Date(n.createdAt).getTime() > lastSeen).length;
           setUnreadCount(unread);
        })
        .catch(console.error);

      const socket = io('/', { path: '/socket.io' });
      socket.emit('join_gym', user.gymId);
      
      socket.on('new_announcement', (ann) => {
        setNotifications(prev => [ann, ...prev]);
        setUnreadCount(prev => prev + 1);
        alert(`🚨 NEW GYM ANNOUNCEMENT 🚨\n\n${ann.title}\n${ann.body}`);
      });

      return () => socket.disconnect();
    }
  }, [user, hideNav]);

  const handleOpenNotifications = () => {
    setShowNotifications(true);
    setUnreadCount(0);
    localStorage.setItem('lastSeenNotifications', Date.now().toString());
  };

  return (
    <div className="app-container">
      {user && !hideNav && (
        <>
          <Header 
            setShowGlobalQR={setShowGlobalQR} 
            handleOpenNotifications={handleOpenNotifications} 
            unreadCount={unreadCount} 
            theme={theme}
            toggleTheme={toggleTheme}
          />

          {showGlobalQR && (
            <div className="modal-overlay animate-fade-in" onClick={() => setShowGlobalQR(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '350px' }}>
                <button className="modal-close" onClick={() => setShowGlobalQR(false)}><X size={24} /></button>
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

          {showNotifications && (
            <div className="modal-overlay animate-fade-in" onClick={() => setShowNotifications(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
                <button className="modal-close" onClick={() => setShowNotifications(false)}><X size={24} /></button>
                <h2 className="modal-title" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Bell size={24} className="text-accent" /> Notifications
                </h2>
                {notifications.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0' }}>You're all caught up!</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {notifications.map(n => (
                      <div key={n.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ margin: '0 0 5px 0', fontSize: '15px' }}>{n.title}</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.body}</p>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>
                          {new Date(n.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
      <Suspense fallback={<div className="page"><p>Loading...</p></div>}>
        {children}
      </Suspense>
      {user && !hideNav && <BottomNav />}
    </div>
  );
};

// --- Main App Component ---
function App() {
  useEffect(() => {
    // Force unregister all service workers to resolve persistent 'Failed to fetch' issues
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/login" element={<Auth />} />
            
            <Route path="/" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            
            <Route path="/community" element={
              <ProtectedRoute><Community /></ProtectedRoute>
            } />
            
            <Route path="/leaderboard" element={
               <ProtectedRoute><Leaderboard /></ProtectedRoute>
            } />
            
            <Route path="/shop" element={
              <ProtectedRoute><Shop /></ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute><Profile /></ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['GYM_OWNER', 'SUPER_ADMIN']}>
                <Admin />
              </ProtectedRoute>
            } />

            <Route path="/supaadmin" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SupaAdmin />
              </ProtectedRoute>
            } />
            
            <Route path="/pricing" element={
              <ProtectedRoute><Pricing /></ProtectedRoute>
            } />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

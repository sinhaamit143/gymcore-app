import React, { createContext, useContext, useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sun, Moon, QrCode, X } from 'lucide-react';
import QRCode from 'react-qr-code';
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
  const hideNav = location.pathname === '/login' || user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_OWNER';

  return (
    <div className="app-container">
      {user && !hideNav && (
        <>
          <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 9999, display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setShowGlobalQR(true)} 
              style={{ 
                background: 'var(--glass-bg)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid var(--glass-border)', 
                color: 'var(--text-primary)', 
                cursor: 'pointer', 
                padding: '10px',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              <QrCode size={20} />
            </button>
            <button 
              onClick={toggleTheme} 
              style={{ 
                background: 'var(--glass-bg)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid var(--glass-border)', 
                color: 'var(--text-primary)', 
                cursor: 'pointer', 
                padding: '10px',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
          <Header />

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

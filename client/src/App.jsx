import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Community from './pages/Community';
import Leaderboard from './pages/Leaderboard';
import Services from './pages/Services';
import Profile from './pages/Profile';
import BottomNav from './components/BottomNav';
import './index.css';

// --- Context & Auth State ---
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
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
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="page"><p>Loading...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// --- App Layout Wrapper ---
const AppLayout = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const hideNav = location.pathname === '/login';

  return (
    <div className="app-container">
      {children}
      {user && !hideNav && <BottomNav />}
    </div>
  );
};

// --- Main App Component ---
function App() {
  return (
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
            
            <Route path="/services" element={
               <ProtectedRoute><Services /></ProtectedRoute>
            } />
            
            <Route path="/profile" element={
               <ProtectedRoute><Profile /></ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

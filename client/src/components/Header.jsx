import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dumbbell, Bell, QrCode, Sun, Moon } from 'lucide-react';
import { useAuth } from '../App';
import './Header.css';

const Header = ({ setShowGlobalQR, handleOpenNotifications, unreadCount, theme, toggleTheme }) => {
  const { user } = useAuth();
  const location = useLocation();
  
  if (location.pathname === '/auth') return null;

  return (
    <header className="app-header glass">
      <Link to="/" className="header-logo">
        {user?.gym?.logoUrl ? (
          <img src={user.gym.logoUrl} alt="Gym Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
        ) : (
          <>
            <div className="logo-icon">
              <Dumbbell size={20} />
            </div>
            <div className="logo-text">
              GYMCORE <span>ELITE</span>
            </div>
          </>
        )}
      </Link>

      <div className="header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <button 
            onClick={handleOpenNotifications} 
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid var(--glass-border)', 
              color: 'var(--text-primary)', 
              cursor: 'pointer', 
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Bell size={18} />
          </button>
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ff4d4f', color: '#fff', fontSize: '9px', fontWeight: 'bold', padding: '2px 5px', borderRadius: '10px', pointerEvents: 'none' }}>
              {unreadCount}
            </span>
          )}
        </div>
        <button 
          onClick={() => setShowGlobalQR(true)} 
          style={{ 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid var(--glass-border)', 
            color: 'var(--text-primary)', 
            cursor: 'pointer', 
            padding: '8px',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <QrCode size={18} />
        </button>
        <button 
          onClick={toggleTheme} 
          style={{ 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid var(--glass-border)', 
            color: 'var(--text-primary)', 
            cursor: 'pointer', 
            padding: '8px',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};

export default Header;

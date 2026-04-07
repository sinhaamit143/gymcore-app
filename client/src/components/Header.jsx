import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Activity, Dumbbell } from 'lucide-react';
import { useAuth } from '../App';
import './Header.css';

const Header = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Don't show header on login/register page if needed, 
  // but user said "all pages" so we'll show it everywhere or just main app.
  if (location.pathname === '/auth') return null;

  return (
    <header className="app-header glass">
      <Link to="/" className="header-logo">
        <div className="logo-icon">
          <Dumbbell size={20} />
        </div>
        <div className="logo-text">
          GYMCORE <span>ELITE</span>
        </div>
      </Link>

      <div className="header-actions">
        {user?.subscriptionPlan === 'elite' && (
          <div className="status-indicator">
            <Shield size={12} fill="var(--accent-color)" color="#000" /> Elite Access
          </div>
        )}
        <div className="status-indicator" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="pulse"></div> System Live
        </div>
      </div>
    </header>
  );
};

export default Header;

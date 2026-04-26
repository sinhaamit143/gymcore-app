import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Activity, Dumbbell } from 'lucide-react';
import { useAuth, useTheme } from '../App';
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

    </header>
  );
};

export default Header;

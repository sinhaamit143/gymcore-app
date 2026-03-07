import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Trophy, Store, User } from 'lucide-react';
import './BottomNav.css';

const BottomNav = () => {
  const tabs = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={24} /> },
    { name: 'Community', path: '/community', icon: <Users size={24} /> },
    { name: 'Ranks', path: '/leaderboard', icon: <Trophy size={24} /> },
    { name: 'Premium', path: '/services', icon: <Store size={24} /> },
    { name: 'Profile', path: '/profile', icon: <User size={24} /> },
  ];

  return (
    <nav className="bottom-nav glass">
      <ul className="nav-list">
        {tabs.map((tab) => (
          <li key={tab.name} className="nav-item">
            <NavLink 
              to={tab.path} 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {tab.icon}
              <span className="nav-label">{tab.name}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default BottomNav;

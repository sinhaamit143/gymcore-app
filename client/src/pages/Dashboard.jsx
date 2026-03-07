import React, { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { Flame, Dumbbell, Apple, Plus, Calendar } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const { user, token } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [nutrition, setNutrition] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [workRes, nutrRes] = await Promise.all([
          fetch('/api/workouts', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/nutrition', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        const workData = await workRes.json();
        const nutrData = await nutrRes.json();
        
        setWorkouts(workData);
        setNutrition(nutrData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [token]);

  if (loading) return <div className="page"><p>Loading dashboard...</p></div>;

  const todayWorkouts = workouts.filter(w => w.date === new Date().toISOString().split('T')[0]);
  const caloriesBurned = todayWorkouts.reduce((sum, w) => sum + w.calories, 0);

  const todayNutrition = nutrition.filter(n => n.date === new Date().toISOString().split('T')[0]);
  const caloriesEaten = todayNutrition.reduce((sum, n) => sum + n.calories, 0);

  return (
    <div className="page dashboard-page">
      <div className="flex-between mb-4">
        <div>
          <h1 className="page-title mb-2">Hello, {user?.name.split(' ')[0]} 👋</h1>
          <p className="text-secondary">Ready to crush your goals today?</p>
        </div>
        <img src={user?.avatar} alt="Profile" className="avatar-small" />
      </div>

      <div className="stats-grid mb-4">
        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper pulse-bg" style={{ '--color': '#ff4d4f' }}>
            <Flame size={24} color="#ff4d4f" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{caloriesBurned}</span>
            <span className="stat-label">Kcal Burned</span>
          </div>
        </div>
        
        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper pulse-bg" style={{ '--color': '#00ffaa' }}>
            <Apple size={24} color="#00ffaa" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{caloriesEaten}</span>
            <span className="stat-label">Kcal Eaten</span>
          </div>
        </div>
      </div>

      <div className="section mb-4">
        <div className="flex-between section-header mb-4">
          <h2 className="section-title"><Dumbbell size={20} /> Recent Workouts</h2>
          <button className="btn btn-primary btn-sm"><Plus size={16} /> Log</button>
        </div>
        
        <div className="log-list">
          {workouts.length === 0 ? (
             <p className="empty-state">No workouts logged yet.</p>
          ) : workouts.slice(0, 3).map(w => (
            <div key={w.id} className="glass-card log-item">
              <div className="log-icon"><Dumbbell size={20} /></div>
              <div className="log-details">
                <h4 className="log-title">{w.type}</h4>
                <p className="log-meta"><Calendar size={12} /> {w.date} • {w.duration} min</p>
              </div>
              <div className="log-calories text-accent">+{w.calories} kcal</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="flex-between section-header mb-4">
          <h2 className="section-title"><Apple size={20} /> Meals</h2>
          <button className="btn btn-primary btn-sm"><Plus size={16} /> Log</button>
        </div>
        
        <div className="log-list">
          {nutrition.length === 0 ? (
             <p className="empty-state">No meals logged yet.</p>
          ) : nutrition.slice(0, 3).map(n => (
            <div key={n.id} className="glass-card log-item">
              <div className="log-icon"><Apple size={20} /></div>
              <div className="log-details">
                <h4 className="log-title">{n.meal}</h4>
                <p className="log-meta"><Calendar size={12} /> {n.date}</p>
              </div>
              <div className="log-calories text-accent">{n.calories} kcal</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

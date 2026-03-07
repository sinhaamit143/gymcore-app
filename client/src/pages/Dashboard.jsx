import React, { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { Flame, Dumbbell, Apple, Plus, Calendar, X } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const { user, token } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [nutrition, setNutrition] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [workoutForm, setWorkoutForm] = useState({ type: '', duration: '', calories: '' });
  const [nutritionForm, setNutritionForm] = useState({ meal: '', calories: '', protein: '', carbs: '', fat: '' });

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

  const handleWorkoutSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...workoutForm, duration: parseInt(workoutForm.duration), calories: parseInt(workoutForm.calories) })
      });
      if (res.ok) {
        setShowWorkoutModal(false);
        setWorkoutForm({ type: '', duration: '', calories: '' });
        window.location.reload();
      }
    } catch (err) { console.error(err); }
  };

  const handleNutritionSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...nutritionForm, calories: parseInt(nutritionForm.calories), protein: parseInt(nutritionForm.protein), carbs: parseInt(nutritionForm.carbs), fat: parseInt(nutritionForm.fat) })
      });
      if (res.ok) {
        setShowNutritionModal(false);
        setNutritionForm({ meal: '', calories: '', protein: '', carbs: '', fat: '' });
        window.location.reload();
      }
    } catch (err) { console.error(err); }
  };

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
          <button className="btn btn-primary btn-sm" onClick={() => setShowWorkoutModal(true)}><Plus size={16} /> Log</button>
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
          <button className="btn btn-primary btn-sm" onClick={() => setShowNutritionModal(true)}><Plus size={16} /> Log</button>
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

      {showWorkoutModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <button className="modal-close" onClick={() => setShowWorkoutModal(false)}><X size={24} /></button>
            <h2 className="mb-4">Log Workout</h2>
            <form onSubmit={handleWorkoutSubmit}>
              <div className="input-group">
                <label className="input-label">Workout Type</label>
                <input type="text" className="input" required value={workoutForm.type} onChange={e => setWorkoutForm({...workoutForm, type: e.target.value})} placeholder="e.g. HIIT Cardio" />
              </div>
              <div className="input-group">
                <label className="input-label">Duration (minutes)</label>
                <input type="number" className="input" required value={workoutForm.duration} onChange={e => setWorkoutForm({...workoutForm, duration: e.target.value})} />
              </div>
              <div className="input-group mb-4">
                <label className="input-label">Calories Burned</label>
                <input type="number" className="input" required value={workoutForm.calories} onChange={e => setWorkoutForm({...workoutForm, calories: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary btn-full">Save Workout</button>
            </form>
          </div>
        </div>
      )}

      {showNutritionModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <button className="modal-close" onClick={() => setShowNutritionModal(false)}><X size={24} /></button>
            <h2 className="mb-4">Log Meal</h2>
            <form onSubmit={handleNutritionSubmit}>
              <div className="input-group">
                <label className="input-label">Meal Description</label>
                <input type="text" className="input" required value={nutritionForm.meal} onChange={e => setNutritionForm({...nutritionForm, meal: e.target.value})} placeholder="e.g. Chicken Salad" />
              </div>
              <div className="flex-between" style={{gap: '10px'}}>
                <div className="input-group flex-1">
                  <label className="input-label">Calories</label>
                  <input type="number" className="input" required value={nutritionForm.calories} onChange={e => setNutritionForm({...nutritionForm, calories: e.target.value})} />
                </div>
                <div className="input-group flex-1">
                  <label className="input-label">Protein (g)</label>
                  <input type="number" className="input" required value={nutritionForm.protein} onChange={e => setNutritionForm({...nutritionForm, protein: e.target.value})} />
                </div>
              </div>
              <div className="flex-between" style={{gap: '10px'}}>
                <div className="input-group flex-1">
                  <label className="input-label">Carbs (g)</label>
                  <input type="number" className="input" required value={nutritionForm.carbs} onChange={e => setNutritionForm({...nutritionForm, carbs: e.target.value})} />
                </div>
                <div className="input-group flex-1 mb-4">
                  <label className="input-label">Fat (g)</label>
                  <input type="number" className="input" required value={nutritionForm.fat} onChange={e => setNutritionForm({...nutritionForm, fat: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-full mt-2">Save Meal</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

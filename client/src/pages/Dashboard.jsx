import React, { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { Flame, Dumbbell, Apple, Plus, Calendar, X, Target, Edit2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const { user, token } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [nutrition, setNutrition] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [workoutForm, setWorkoutForm] = useState({ type: '', duration: '', calories: '' });
  const [nutritionForm, setNutritionForm] = useState({ meal: '', calories: '', protein: '', carbs: '', fat: '' });
  const [weightForm, setWeightForm] = useState({ current: '' });

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

  const handleWeightSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ currentWeight: parseInt(weightForm.current) })
      });
      if (res.ok) {
        setShowWeightModal(false);
        window.location.reload();
      }
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="page"><p>Loading dashboard...</p></div>;

  const todayWorkouts = workouts.filter(w => w.date === new Date().toISOString().split('T')[0]);
  const caloriesBurned = todayWorkouts.reduce((sum, w) => sum + w.calories, 0);

  const todayNutrition = nutrition.filter(n => n.date === new Date().toISOString().split('T')[0]);
  const caloriesEaten = todayNutrition.reduce((sum, n) => sum + n.calories, 0);

  // Generate Chart Data
  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    
    return {
      name: d.toLocaleDateString('en-US', { weekday: 'short' }),
      Burned: workouts.filter(w => w.date === dateStr).reduce((sum, w) => sum + w.calories, 0),
      Eaten: nutrition.filter(n => n.date === dateStr).reduce((sum, n) => sum + n.calories, 0)
    };
  });

  // Calculate Goal Progress
  const startWeight = user?.currentWeight > user?.targetWeight ? user.currentWeight + 20 : user?.currentWeight - 20; // Mock start
  const totalToLose = Math.abs(startWeight - user?.targetWeight);
  const currentLost = Math.abs(startWeight - user?.currentWeight);
  const progressPercent = Math.min(100, Math.max(0, (currentLost / totalToLose) * 100));

  return (
    <div className="page dashboard-page">
      <div className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <img src={user?.avatar} alt="Profile" className="avatar-small" />
        <div>
          <h1 className="page-title" style={{ margin: 0, marginBottom: '4px' }}>Hello, {user?.name.split(' ')[0]} 👋</h1>
          <p className="text-secondary" style={{ margin: 0 }}>Ready to crush your goals today?</p>
        </div>
      </div>

      <div className="stats-grid mb-4">
        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper pulse-bg" style={{ '--color': '#ff4d4f' }}>
            <Flame size={24} color="#ff4d4f" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{caloriesBurned}</span>
            <span className="stat-label">Kcal Burned Today</span>
          </div>
        </div>
        
        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper pulse-bg" style={{ '--color': '#00ffaa' }}>
            <Apple size={24} color="#00ffaa" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{caloriesEaten}</span>
            <span className="stat-label">Kcal Eaten Today</span>
          </div>
        </div>
      </div>

      {user?.targetWeight && (
        <div className="glass-card mb-4">
          <div className="flex-between mb-2">
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Target size={18} className="text-accent" /> Weight Goal</h3>
              <p className="text-secondary" style={{ fontSize: '14px' }}>{user.currentWeight} lbs → {user.targetWeight} lbs</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowWeightModal(true)}>
              <Edit2 size={14} /> Update
            </button>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginTop: '12px' }}>
             <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--accent-color)', transition: 'width 1s ease-in-out' }}></div>
          </div>
        </div>
      )}

      <div className="glass-card mb-4" style={{ height: '250px', padding: '16px 16px 0 0' }}>
        <h3 className="mb-4" style={{ paddingLeft: '20px' }}>Activity Overview</h3>
        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={last7Days}>
            <XAxis dataKey="name" stroke="#8b949e" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              cursor={{fill: 'rgba(255,255,255,0.05)'}}
              contentStyle={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} 
            />
            <Bar dataKey="Burned" fill="#ff4d4f" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Eaten" fill="#00ffaa" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
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

      {showWeightModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <button className="modal-close" onClick={() => setShowWeightModal(false)}><X size={24} /></button>
            <h2 className="mb-4">Log Current Weight</h2>
            <form onSubmit={handleWeightSubmit}>
              <div className="input-group mb-4">
                <label className="input-label">Weight (lbs)</label>
                <input type="number" className="input" required value={weightForm.current} onChange={e => setWeightForm({ current: e.target.value })} placeholder={user?.currentWeight} />
              </div>
              <button type="submit" className="btn btn-primary btn-full mt-2">Update Weight</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

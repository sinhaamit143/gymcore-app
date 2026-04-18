import React, { useState } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import './Auth.css';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', gymId: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [gymBranding, setGymBranding] = useState(null);
  const [gymError, setGymError] = useState(null);

  // Debounced fetch for Gym ID
  React.useEffect(() => {
    if (!formData.gymId || formData.gymId.length < 10) {
      setGymBranding(null);
      setGymError(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/gyms/public/${formData.gymId}`);
        if (res.ok) {
          const data = await res.json();
          setGymBranding(data);
          setGymError(null);
        } else {
          setGymBranding(null);
          setGymError('Gym not found');
        }
      } catch (err) {
        setGymBranding(null);
        setGymError('Error fetching gym');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.gymId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const url = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      login(data.user, data.token);
      if (data.user.role === 'SUPER_ADMIN') {
        navigate('/supaadmin');
      } else if (data.user.role === 'GYM_OWNER') {
        navigate('/admin');
      } else if (!isLogin) {
        navigate('/pricing');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-branding glass">
        {gymBranding?.logoUrl ? (
          <img src={gymBranding.logoUrl} alt="Gym Logo" style={{ width: '120px', height: 'auto', marginBottom: '15px', objectFit: 'contain' }} className="animate-fade-in" />
        ) : (
          <Activity size={48} className="text-accent" />
        )}
        <h2>{gymBranding?.name || 'GymCore'}</h2>
        <p className="text-secondary">{gymBranding ? 'Welcome to our exclusive studio' : 'Your Ultimate Mobile Fitness Companion'}</p>
      </div>

      <div className="auth-card glass-card">
        <h3>{isLogin ? 'Welcome Back' : 'Join the Club'}</h3>
        <p className="subtitle">{isLogin ? 'Login to track your progress' : 'Create an account to get started'}</p>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input 
                type="text" 
                className="input" 
                placeholder="John Doe" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required={!isLogin} 
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Gym ID <span style={{fontSize: '10px', opacity: 0.6}}>(Optional for SuperAdmin only)</span></label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. 550e8400-e29b..."
              style={{ borderColor: gymError ? '#ff4d4f' : 'rgba(255,255,255,0.1)' }}
              value={formData.gymId} 
              onChange={(e) => setFormData({...formData, gymId: e.target.value})}
              required={!isLogin} 
            />
            {gymError && <span style={{ color: '#ff4d4f', fontSize: '11px', marginTop: '4px', display: 'block' }}>{gymError}</span>}
          </div>
          
          <div className="input-group">
            <label className="input-label">Email</label>
            <input 
              type="email" 
              className="input" 
              placeholder="you@example.com"
              value={formData.email} 
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required 
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input 
              type="password" 
              className="input" 
              placeholder="••••••••"
              value={formData.password} 
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required 
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full mt-4" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <p className="switch-text text-secondary mt-4">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span className="text-accent switch-btn" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Sign up' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Auth;

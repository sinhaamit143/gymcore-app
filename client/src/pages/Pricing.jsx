import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Check, ShieldAlert, ArrowRight } from 'lucide-react';
import './Pricing.css';

const Pricing = () => {
  const { user, token, setUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (plan) => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/subscribe', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan })
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        // Refresh user data with updated plan
        const userRes = await fetch('/api/user', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (userRes.ok) {
          const newUser = await userRes.json();
          setUser(newUser);
          navigate('/'); // Redirect to dashboard after successful subscription
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Subscription failed');
      }
    } catch (err) {
      console.error('Subscription error:', err);
      alert('An error occurred during subscription process.');
    } finally {
      setLoading(false);
    }
  };

  const tiers = [
    {
      id: 'free',
      name: 'Free',
      price: '0',
      features: ['Basic Workout Logging', 'Limited Nutrition Tracking', 'Community Access (Read-only)', 'Standard Support'],
      highlighted: false,
      cta: 'Continue with Free'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '29',
      features: ['Unlimited Workout Logs', 'Advanced Nutrition Tracking', 'Full Community Access', 'Priority Analytics', 'Direct Coach Chat'],
      highlighted: true,
      cta: 'Go Pro Now'
    },
    {
      id: 'elite',
      name: 'Elite',
      price: '89',
      features: ['Everything in Pro', 'Custom 1-on-1 Workout Plans', 'Personalized Meal Plans', 'VIP Event Access', 'Elite Member Badge'],
      highlighted: false,
      cta: 'Unlock Elite Access'
    }
  ];

  return (
    <div className="page pricing-page animate-fade-in">
      <header className="pricing-header">
        <h1>Transform Your Journey</h1>
        <p className="text-secondary text-lg">Choose the perfect plan to fuel your fitness goals.</p>
      </header>

      <div className="tier-container">
        {tiers.map((tier) => (
          <div key={tier.id} className={`glass-card tier-card ${tier.highlighted ? 'featured' : ''}`}>
            {tier.highlighted && <div className="featured-badge">MOST POPULAR</div>}
            
            <div className="tier-header">
              <div className="tier-name">{tier.name}</div>
              <div className="tier-price">₹{tier.price}<span>/mo</span></div>
            </div>

            <div className="tier-features">
              <ul>
                {tier.features.map((feature, idx) => (
                  <li key={idx}>
                    <Check size={18} className="icon" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="tier-footer">
              <button 
                className={`btn ${tier.highlighted ? 'btn-primary' : 'btn-secondary'} btn-tier`}
                onClick={() => handleSubscribe(tier.id)}
                disabled={loading}
              >
                {loading ? 'Processing...' : tier.cta}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-secondary text-sm">All plans include our core fitness tracking capabilities. Cancel anytime.</p>
      </div>
    </div>
  );
};

export default Pricing;

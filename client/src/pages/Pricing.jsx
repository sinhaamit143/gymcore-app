import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Check, ShieldAlert, ArrowRight } from 'lucide-react';
import './Pricing.css';

const Pricing = () => {
  const { user, token, setUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Step Management
  const [step, setStep] = useState(1);
  const [selectedTier, setSelectedTier] = useState(null);

  const handleSubscribe = async (duration) => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/subscribe', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: selectedTier.id, duration })
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
      id: 'Basic',
      name: 'Basic',
      price: 500,
      features: ['Basic Workout Logging', 'Limited Nutrition Tracking', 'Community Access (Read-only)', 'Standard Support'],
      highlighted: false,
      cta: 'Select Basic'
    },
    {
      id: 'Pro',
      name: 'Pro',
      price: 1000,
      features: ['Unlimited Workout Logs', 'Advanced Nutrition Tracking', 'Full Community Access', 'Priority Analytics', 'Direct Coach Chat'],
      highlighted: true,
      cta: 'Select Pro'
    },
    {
      id: 'Elite',
      name: 'Elite',
      price: 1500,
      features: ['Everything in Pro', 'Custom 1-on-1 Workout Plans', 'Personalized Meal Plans', 'VIP Event Access', 'Elite Member Badge'],
      highlighted: false,
      cta: 'Select Elite'
    }
  ];

  const durations = [
    { id: '1 Month', name: 'Monthly', months: 1, discount: 0 },
    { id: '3 Months', name: 'Quarterly', months: 3, discount: 0.05 },
    { id: '6 Months', name: 'Half-Yearly', months: 6, discount: 0.10 },
    { id: '1 Year', name: 'Yearly', months: 12, discount: 0.20 }
  ];

  return (
    <div className="page pricing-page animate-fade-in">
      <header className="pricing-header">
        <h1>Transform Your Journey</h1>
        <p className="text-secondary text-lg">
          {step === 1 ? 'Step 1: Choose the perfect plan to fuel your fitness goals.' : `Step 2: Choose your commitment for ${selectedTier?.name}.`}
        </p>
      </header>

      {step === 1 && (
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
                  onClick={() => { setSelectedTier(tier); setStep(2); }}
                >
                  {tier.cta} <ArrowRight size={16} style={{ marginLeft: '8px' }}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 2 && selectedTier && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
             <button onClick={() => setStep(1)} className="btn btn-secondary" style={{ marginBottom: '20px' }}>&larr; Back to Plans</button>
          </div>
          <div className="tier-container">
            {durations.map((d) => {
              const rawTotal = selectedTier.price * d.months;
              const finalTotal = rawTotal - (rawTotal * d.discount);
              const savings = rawTotal - finalTotal;

              return (
                <div key={d.id} className="glass-card tier-card" style={{ padding: '30px', textAlign: 'center' }}>
                  <div className="tier-name" style={{ fontSize: '24px', marginBottom: '10px' }}>{d.name}</div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{d.id} Access</div>
                  
                  <div className="tier-price" style={{ fontSize: '36px', marginBottom: '10px' }}>₹{finalTotal.toLocaleString()}</div>
                  
                  {d.discount > 0 ? (
                     <div style={{ color: '#10b981', fontSize: '14px', fontWeight: 'bold', marginBottom: '20px', minHeight: '20px' }}>
                       Save {d.discount * 100}% (₹{savings.toLocaleString()})
                     </div>
                  ) : (
                     <div style={{ minHeight: '20px', marginBottom: '20px' }}></div>
                  )}

                  <div className="tier-footer">
                    <button 
                      className="btn btn-primary btn-tier"
                      onClick={() => handleSubscribe(d.id)}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Confirm Subscription'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <p className="text-secondary text-sm">All plans include our core fitness tracking capabilities. Secure checkout powered by GymCore.</p>
      </div>
    </div>
  );
};

export default Pricing;

import React, { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { Star, CheckCircle, X, CreditCard } from 'lucide-react';
import './Services.css';

const Services = () => {
  const { token } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      try {
         const res = await fetch('/api/services', {
           headers: { 'Authorization': `Bearer ${token}` }
         });
         const data = await res.json();
         setServices(data);
      } catch (err) {
         console.error(err);
      } finally {
         setLoading(false);
      }
    };
    fetchServices();
  }, [token]);

  const handleCheckout = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setSelectedService(null);
      }, 3000);
    }, 1500);
  };

  if (loading) return <div className="page"><p>Loading services...</p></div>;

  return (
    <div className="page services-page">
      <div className="services-hero mb-4">
        <h1 className="page-title text-center"><Star size={28} className="text-accent inline-icon" /> Premium</h1>
        <p className="text-secondary text-center">Unlock your full potential with exclusive gym offerings</p>
      </div>

      <div className="services-list">
         {services.map(svc => (
            <div key={svc.id} className="glass-card service-card">
               <img src={svc.image} alt={svc.title} className="service-img" />
               <div className="service-content">
                  <h3 className="service-title">{svc.title}</h3>
                  <p className="service-desc text-secondary">{svc.description}</p>
                  
                  <ul className="service-perks">
                     <li><CheckCircle size={14} className="text-accent"/> Expert Guidance</li>
                     <li><CheckCircle size={14} className="text-accent"/> Guaranteed Results</li>
                  </ul>

                  <div className="flex-between mt-4">
                     <span className="service-price">${svc.price}</span>
                     <button className="btn btn-primary btn-sm" onClick={() => setSelectedService(svc)}>Get Now</button>
                  </div>
               </div>
            </div>
         ))}
      </div>

      {selectedService && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            {!isSuccess && <button className="modal-close" onClick={() => !isProcessing && setSelectedService(null)}><X size={24} /></button>}
            
            {isSuccess ? (
              <div className="text-center" style={{ padding: '20px 0', textAlign: 'center' }}>
                <CheckCircle size={48} color="#00ffaa" style={{ margin: '0 auto 16px' }} />
                <h3>Payment Successful!</h3>
                <p className="text-secondary mt-2">You now have access to {selectedService.title}.</p>
              </div>
            ) : (
              <>
                <h2 className="mb-4">Complete Purchase</h2>
                <div className="mb-4" style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
                  <h4 style={{ color: '#fff' }}>{selectedService.title}</h4>
                  <p className="text-accent" style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '8px' }}>${selectedService.price}</p>
                </div>
                
                <div className="input-group">
                  <label className="input-label">Card Number (Mock)</label>
                  <input type="text" className="input" placeholder="4242 4242 4242 4242" />
                </div>
                
                <button 
                  className="btn btn-primary btn-full mt-4" 
                  onClick={handleCheckout} 
                  disabled={isProcessing}
                >
                  <CreditCard size={18} /> {isProcessing ? 'Processing...' : 'Pay Now'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;

import React, { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { Star, CheckCircle } from 'lucide-react';
import './Services.css';

const Services = () => {
  const { token } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

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
                     <button className="btn btn-primary btn-sm">Get Now</button>
                  </div>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
};

export default Services;

import React, { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { Medal, Trophy, Activity } from 'lucide-react';
import './Leaderboard.css';

const Leaderboard = () => {
  const { user, token } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const res = await fetch('/api/leaderboard', {
           headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setLeaders(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaders();
  }, [token]);

  if (loading) return <div className="page"><p>Loading ranks...</p></div>;

  return (
    <div className="page leaderboard-page">
      <h1 className="page-title text-center"><Trophy size={28} className="text-accent inline-icon" /> Gym Ranks</h1>
      <p className="text-secondary text-center mb-4">Top members this month</p>
      
      <div className="podium mb-4">
         {/* Second Place */}
         {leaders[1] && (
           <div className="podium-item podium-silver">
             <div className="rank-badge silver">2</div>
             <img src={leaders[1].avatar} alt={leaders[1].name} />
             <div className="podium-name">{leaders[1].name.split(' ')[0]}</div>
             <div className="podium-points">{leaders[1].points} pts</div>
           </div>
         )}
         
         {/* First Place */}
         {leaders[0] && (
           <div className="podium-item podium-gold">
             <div className="rank-badge gold"><Medal size={16} /></div>
             <img src={leaders[0].avatar} alt={leaders[0].name} className="gold-avatar" />
             <div className="podium-name">{leaders[0].name.split(' ')[0]}</div>
             <div className="podium-points text-accent">{leaders[0].points} pts</div>
           </div>
         )}
         
         {/* Third Place */}
         {leaders[2] && (
           <div className="podium-item podium-bronze">
             <div className="rank-badge bronze">3</div>
             <img src={leaders[2].avatar} alt={leaders[2].name} />
             <div className="podium-name">{leaders[2].name.split(' ')[0]}</div>
             <div className="podium-points">{leaders[2].points} pts</div>
           </div>
         )}
      </div>

      <div className="leader-list">
        {leaders.slice(3).map((item, index) => (
          <div key={item.id} className={`glass-card run-card ${item.id === user?.id ? 'is-me' : ''}`}>
            <div className="run-rank text-secondary">#{index + 4}</div>
            <img src={item.avatar} alt={item.name} className="run-avatar" />
            <div className="run-details">
               <h4 className="run-name">{item.name} {item.id === user?.id && '(You)'}</h4>
            </div>
            <div className="run-score"><Activity size={14} /> {item.points}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;

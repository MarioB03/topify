import React, { useState, useEffect } from 'react';
import { useTopify } from '../context/TopifyContext';
import { useResponsive } from '../hooks/useResponsive';

const StatsSection: React.FC = () => {
  const { state } = useTopify();
  const { isMobile } = useResponsive();
  const [countdown, setCountdown] = useState('Calculando...');

  useEffect(() => {
    const deadline = new Date('2025-08-23T23:59:59').getTime();
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const timeLeft = deadline - now;
      
      if (timeLeft < 0) {
        setCountdown('¡Votaciones cerradas!');
        return;
      }
      
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <section className={`glass-card rounded-3xl ${isMobile ? 'p-4' : 'p-6'} flex-shrink-0`}>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div 
          className="stat-card text-white p-4 rounded-2xl text-center relative overflow-hidden" 
          style={{'--from-color': '#f5d66c', '--to-color': '#d39921'} as React.CSSProperties}
        >
          <div className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-1`}>
            {state.stats.totalSongs}
          </div>
          <div className="text-xs font-medium text-yellow-100">Canciones</div>
        </div>
        
        <div 
          className="stat-card text-white p-4 rounded-2xl text-center relative overflow-hidden" 
          style={{'--from-color': '#8fa183', '--to-color': '#768968'} as React.CSSProperties}
        >
          <div className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-1`}>
            {state.stats.totalVotes}
          </div>
          <div className="text-xs font-medium text-green-100">Votos totales</div>
        </div>
      </div>
      
      <div 
        className="stat-card text-white p-4 rounded-2xl text-center relative overflow-hidden" 
        style={{'--from-color': '#ffdab9', '--to-color': '#e2965b'} as React.CSSProperties}
      >
        <div className="text-sm font-medium opacity-90 mb-2">⏰ Votaciones cierran en:</div>
        <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold`}>
          {countdown}
        </div>
        <div className="text-xs opacity-75 mt-1">23 de Agosto, 2025</div>
      </div>
    </section>
  );
};

export default StatsSection;
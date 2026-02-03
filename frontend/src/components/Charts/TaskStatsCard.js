import React, { memo } from 'react';
import './Charts.css';

const TaskStatsCard = memo(({ stats }) => {
  const cards = [
    {
      label: 'Total Tasks',
      value: stats.total,
      iconClass: 'stat-icon-blue',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      )
    },
    {
      label: 'Pending',
      value: stats.pending,
      iconClass: 'stat-icon-orange',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      )
    },
    {
      label: 'In Progress',
      value: stats.in_progress,
      iconClass: 'stat-icon-purple',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
      )
    },
    {
      label: 'Overdue',
      value: stats.overdue,
      iconClass: 'stat-icon-red',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      )
    }
  ];

  return (
    <div className="stats-grid">
      {cards.map((card, index) => (
        <div 
          key={index} 
          className="stat-card"
          style={{
            background: 'var(--dash-bg-card)',
            borderRadius: '14px',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid var(--dash-border-primary)'
          }}
        >
          <div 
            className={`stat-icon ${card.iconClass}`}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              flexShrink: 0,
              transition: 'all 0.3s',
              position: 'relative'
            }}
          >
            {card.icon}
          </div>
          <div className="stat-content" style={{ flex: 1 }}>
            <div 
              className="stat-value"
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: 'var(--dash-text-primary)',
                lineHeight: 1,
                marginBottom: '6px'
              }}
            >
              {card.value}
            </div>
            <div 
              className="stat-label"
              style={{
                fontSize: '14px',
                color: 'var(--dash-text-tertiary)',
                fontWeight: 500,
                letterSpacing: '0.2px'
              }}
            >
              {card.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

export default TaskStatsCard;

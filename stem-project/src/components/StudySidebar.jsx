import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function StudySidebar() {
  const location = useLocation();
  const items = [
    { to: '/quizzes', label: 'Quizzes' },
    { to: '/resources', label: 'Resources' },
    { to: '/history', label: 'History' },
    { to: '/quizzes?mode=study', label: 'Study Mode' },
  ];

  return (
    <aside className="study-sidebar filled-sidebar">
      <div className="sidebar-inner">
        <div className="sidebar-header" style={{marginBottom:12}}>
          <h3 className="sidebar-title">Study</h3>
        </div>
        <nav>
          <ul>
            {items.map(it => {
              const base = it.to.split('?')[0];
              const isActive = location.pathname === base || location.pathname.startsWith(base);
              return (
                <li key={it.to} className={isActive ? 'active' : ''}>
                  <Link to={it.to}>{it.label}</Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}

export default StudySidebar;

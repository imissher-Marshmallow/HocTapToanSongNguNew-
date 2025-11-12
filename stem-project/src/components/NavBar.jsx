import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, BookOpen, Trophy, User } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from './LanguageSelector';
import { useAuth } from '../contexts/AuthContext';
import { navTranslations } from '../translations/navTranslations';
import '../styles/NavBar.css';

function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);

  const { language } = useLanguage();
  const t = navTranslations[language];
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  const navItems = [
    { to: '/', label: t.home, icon: <BookOpen className="w-4 h-4" /> },
    { to: '/quizzes', label: t.quizzes, icon: <Trophy className="w-4 h-4" /> },
  ];

  return (
    <nav className="navbar opaque">
      <div className="navbar-container">
        <div className="navbar-flex">
          {/* Logo */}
          <Link to="/" className="navbar-logo">
          <div className="navbar-logo-icon">
              <img
                  src="https://i.postimg.cc/rpFHPgsP/Logo-FPT-ma-u.png"
                  alt="Học tập"
                  style={{ width: '120px', height: '120px' }} // Inline style
              />
          </div>
              <span className="navbar-logo-text dark">
                  {t.logoText}
              </span>
          </Link>

          {/* Language Selector */}
          <LanguageSelector />

          {/* Desktop Menu */}
          <div className="navbar-desktop-menu">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`navbar-link ${
                  location.pathname === item.to
                    ? 'active'
                    : 'inactive-other'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
            {isAuthenticated ? (
              <div className="navbar-user">
                <User className="w-4 h-4" />
                <span className="navbar-username">{user?.username || user?.name || t.account}</span>
                <button onClick={handleLogout} className="navbar-logout-btn">{t.logout || 'Logout'}</button>
              </div>
            ) : (
              <div className="navbar-auth-links">
                <Link to="/signin" className="navbar-login-btn">
                  <User className="w-4 h-4" />
                  <span>{t.login}</span>
                </Link>
                <Link to="/signup" className="navbar-signup-btn">
                  <span>{t.signup || 'Sign Up'}</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="navbar-mobile-btn dark"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`navbar-mobile-menu ${isOpen ? 'open' : 'closed'}`}>
          <div className="navbar-mobile-links">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={`navbar-mobile-link ${location.pathname === item.to ? 'active' : 'inactive'}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
            {isAuthenticated ? (
              <div className="navbar-mobile-user">
                <User className="w-4 h-4" />
                <span className="navbar-username">{user?.username || user?.name || t.account}</span>
                <button onClick={() => { setIsOpen(false); handleLogout(); }} className="navbar-mobile-logout-btn">{t.logout || 'Logout'}</button>
              </div>
            ) : (
              <div className="navbar-mobile-auth">
                <Link to="/signin" onClick={() => setIsOpen(false)} className="navbar-mobile-login-btn">
                  <User className="w-4 h-4" />
                  <span>{t.login}</span>
                </Link>
                <Link to="/signup" onClick={() => setIsOpen(false)} className="navbar-mobile-signup-btn">{t.signup || 'Sign Up'}</Link>
              </div>
            )}
            <div className="navbar-mobile-language">
              <LanguageSelector />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;

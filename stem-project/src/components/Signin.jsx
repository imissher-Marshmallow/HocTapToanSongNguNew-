import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { authTranslations } from '../translations/authTranslations';
import '../styles/Auth.css';

export default function Signin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { signin, isLoading } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = authTranslations[language];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg(t.allFieldsRequired || 'Email and password are required');
      return;
    }

    try {
      await signin(email, password);
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{t.signIn}</h2>
        {errorMsg && <div className="auth-error">{errorMsg}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={isLoading} className="auth-primary-btn">
            {isLoading ? t.signingIn || 'Signing...' : t.signIn}
          </button>
        </form>
        <p>{t.dontHaveAccount} <a href="/signup">{t.signUp}</a></p>
      </div>
    </div>
  );
}

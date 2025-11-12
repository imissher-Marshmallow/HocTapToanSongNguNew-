import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { authTranslations } from '../translations/authTranslations';
import '../styles/Auth.css';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = authTranslations[language];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation
    if (!email || !username || !password || !confirmPassword) {
      setErrorMsg(t.allFieldsRequired);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg(t.passwordsNotMatch);
      return;
    }

    try {
      await signup(email, username, password, confirmPassword);
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{t.createAccount}</h2>
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
            type="text"
            placeholder={t.username}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t.confirmPassword}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={isLoading} className="auth-primary-btn">
            {isLoading ? t.signingUp || 'Creating...' : t.signUp}
          </button>
        </form>
        <p>{t.haveAccount} <a href="/signin">{t.signIn}</a></p>
      </div>
    </div>
  );
}

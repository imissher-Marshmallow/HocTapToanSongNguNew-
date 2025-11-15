
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/History.css';

export default function History() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        setLoading(true);
        const userId = user?.id || localStorage.getItem('userId');
        if (!userId) {
          setAttempts([]);
          setLoading(false);
          return;
        }
        const response = await fetch(`/api/history?userId=${userId}`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          }
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setAttempts(data.data);
        } else {
          setAttempts([]);
        }
      } catch (error) {
        setError(error.message);
        setAttempts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAttempts();
  }, [user]);

  const formatDate = (date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  };

  const getScoreColor = (score) => {
    if (score >= 8) return '#10b981'; // green
    if (score >= 5) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  if (loading) {
    return (
      <div className="history-container">
        <div className="loading-spinner">{language === 'vi' ? 'Đang tải...' : 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <h1>{language === 'vi' ? 'Lịch Sử Bài Kiểm Tra' : 'Quiz History'}</h1>
        <p>{language === 'vi' ? 'Xem lại các bài kiểm tra đã làm của bạn' : 'Review your quiz attempts'}</p>
      </div>
      {attempts.length === 0 ? (
        <div className="empty-state">
          <p>{language === 'vi' ? 'Bạn chưa làm bài kiểm tra nào. Hãy bắt đầu từ phần Bài Kiểm Tra!' : 'No quiz attempts yet. Start from the Quiz section!'}</p>
        </div>
      ) : (
        <div className="history-timeline">
          {attempts.map((attempt, index) => (
            <motion.div
              key={attempt.id}
              className="history-item"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="timeline-dot" />
              <div className="history-card">
                <div className="card-header">
                  <h3>{attempt.quizName}</h3>
                  <span className="date-badge">{formatDate(attempt.date)}</span>
                </div>
                <div className="card-content">
                  <div className="score-section">
                    <div
                      className="score-display"
                      style={{ borderColor: getScoreColor(attempt.score) }}
                    >
                      <span
                        className="score-value"
                        style={{ color: getScoreColor(attempt.score) }}
                      >
                        {attempt.score?.toFixed(1)}/10
                      </span>
                    </div>
                    <div className="score-info">
                      <p className="score-text">
                        {language === 'vi' ? 'Điểm:' : 'Score:'} <strong>{attempt.score?.toFixed(1)}/10</strong>
                      </p>
                      <p className="time-text">
                        {language === 'vi' ? 'Thời gian:' : 'Time:'} <strong>{attempt.timeTaken ? Math.round(attempt.timeTaken / 60) : '-'} {language === 'vi' ? 'phút' : 'min'}</strong>
                      </p>
                      {attempt.accuracy && (
                        <p className="accuracy-text">
                          {language === 'vi' ? 'Độ chính xác:' : 'Accuracy:'} <strong>{attempt.accuracy}%</strong>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(attempt.score / 10) * 100}%`,
                        backgroundColor: getScoreColor(attempt.score),
                      }}
                    />
                  </div>
                </div>
                <div className="card-footer">
                  <button className="btn-retry">{language === 'vi' ? 'Làm lại' : 'Retry'}</button>
                  <button className="btn-details">{language === 'vi' ? 'Xem chi tiết' : 'Details'}</button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Brain, Target, TrendingUp } from 'lucide-react';
import { useAuth, getApiBase } from '../contexts/AuthContext';
import '../styles/QuizRecommendation.css';

/**
 * QuizRecommendation Component
 * Shows personalized quiz recommendations based on user's performance history
 * Helps students choose the right difficulty level and focus areas
 */
export default function QuizRecommendation({ onSelectQuiz }) {
  const { user } = useAuth();
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchRecommendation(user.id);
    }
  }, [user?.id]);

  const fetchRecommendation = async (userId) => {
    try {
      setLoading(true);
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/api/adaptive/next-quiz-recommendation/${userId}`);
      
      if (!response.ok) {
        console.error('Failed to fetch recommendation');
        return;
      }
      
      const data = await response.json();
      setRecommendation(data);
    } catch (error) {
      console.error('Error fetching recommendation:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="quiz-recommendation">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Đang tạo khuyến nghị của bạn...</p>
        </div>
      </div>
    );
  }

  if (!recommendation) {
    return null;
  }

  const difficultyIcons = {
    BASIC: <Brain size={24} />,
    INTERMEDIATE: <TrendingUp size={24} />,
    ADVANCED: <Zap size={24} />,
    ADVANCED_CHALLENGE: <Target size={24} />,
    CUSTOM: <Target size={24} />
  };

  const difficultyColors = {
    BASIC: '#10b981',
    INTERMEDIATE: '#3b82f6',
    ADVANCED: '#f59e0b',
    ADVANCED_CHALLENGE: '#ef4444',
    CUSTOM: '#8b5cf6'
  };

  return (
    <div className="quiz-recommendation">
      <div className="recommendation-header">
        <h2>📊 Khuyến nghị bài kiểm tra cá nhân hóa</h2>
        <p className="recommendation-message">{recommendation.message}</p>
      </div>

      {/* Current Status */}
      <motion.div
        className="current-status"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="status-card">
          <h3>Mức độ hiện tại: <span style={{ color: difficultyColors[recommendation.difficulty] }}>
            {recommendation.difficulty === 'BASIC' && 'Cơ bản'}
            {recommendation.difficulty === 'INTERMEDIATE' && 'Trung bình'}
            {recommendation.difficulty === 'ADVANCED' && 'Nâng cao'}
            {recommendation.difficulty === 'ADVANCED_CHALLENGE' && 'Thách thức'}
          </span></h3>
          <p>{recommendation.reason}</p>
          <div className="stats">
            <div className="stat-item">
              <span className="stat-label">Đã làm:</span>
              <span className="stat-value">{recommendation.quizzesTaken} bài</span>
            </div>
            {recommendation.avgScore && (
              <div className="stat-item">
                <span className="stat-label">Điểm trung bình:</span>
                <span className="stat-value">{recommendation.avgScore.toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Suggested Quizzes */}
      <div className="suggested-quizzes">
        <h3>Chọn bài kiểm tra</h3>
        <div className="quiz-options">
          {recommendation.suggestedQuizzes.map((quiz, idx) => (
            <motion.div
              key={idx}
              className={`quiz-card ${selectedType === quiz.type ? 'selected' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelectedType(quiz.type)}
            >
              <div className="quiz-icon" style={{ color: difficultyColors[quiz.difficulty] }}>
                {difficultyIcons[quiz.difficulty]}
              </div>
              <h4>{quiz.title}</h4>
              <p className="quiz-description">{quiz.description}</p>
              <div className="quiz-meta">
                <span className="quiz-duration">⏱️ {quiz.estimatedTime}</span>
                <span className="quiz-questions">📝 {quiz.questions} câu</span>
              </div>
              {quiz.focus && (
                <div className="quiz-focus">
                  <strong>Tập trung:</strong> {quiz.focus}
                </div>
              )}
              <button
                className="btn-start-quiz"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectQuiz({
                    type: quiz.type,
                    focusTopic: quiz.focusTopic || null
                  });
                }}
              >
                Bắt đầu
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Weak and Strong Topics */}
      {(recommendation.weakTopics.length > 0 || recommendation.strongTopics.length > 0) && (
        <motion.div
          className="topics-overview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {recommendation.weakTopics.length > 0 && (
            <div className="topics-section weak">
              <h4>⚠️ Cần cải thiện</h4>
              <div className="topics-list">
                {recommendation.weakTopics.map((topic, idx) => (
                  <span key={idx} className="topic-badge weak-badge">{topic}</span>
                ))}
              </div>
            </div>
          )}
          {recommendation.strongTopics.length > 0 && (
            <div className="topics-section strong">
              <h4>✅ Điểm mạnh</h4>
              <div className="topics-list">
                {recommendation.strongTopics.map((topic, idx) => (
                  <span key={idx} className="topic-badge strong-badge">{topic}</span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

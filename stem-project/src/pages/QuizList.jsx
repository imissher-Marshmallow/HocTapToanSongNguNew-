import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { quizListTranslations } from '../translations/quizListTranslations';
import '../styles/QuizList.css';

export default function QuizList() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = quizListTranslations[language];
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  // Show only 1 quiz with 20 questions
  const quizzes = [
    {
      id: 1,
      title: language === 'vi' ? 'Kiểm Tra Toán' : 'Math Quiz',
      description: language === 'vi' ? 'Bài kiểm tra toàn diện về kiến thức toán học' : 'Comprehensive math knowledge assessment',
      time: '30 phút / 30 min',
      attempts: 0,
      totalAttempts: 0,
      difficulty: language === 'vi' ? 'Trung bình' : 'Medium',
      questionsCount: 20,
      passRate: 0
    }
  ];

  const getDifficultyColor = (difficulty) => {
    if (difficulty === 'Dễ' || difficulty === 'Easy') return '#10b981';
    if (difficulty === 'Trung bình' || difficulty === 'Medium') return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="quiz-list-container">
      <div className="quiz-list-header">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {t.title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Chọn một bài kiểm tra để bắt đầu học tập
        </motion.p>
      </div>

      <div className="quiz-grid">
        {quizzes.map((quiz, index) => (
          <motion.div
            key={quiz.id}
            className="quiz-card-modern"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            onClick={() => setSelectedQuiz(quiz)}
            whileHover={{ translateY: -8 }}
          >
            {/* Card Header with Gradient */}
            <div className="quiz-card-header">
              <div className="quiz-badge">{quiz.title}</div>
              <div className="quiz-difficulty" style={{ backgroundColor: getDifficultyColor(quiz.difficulty) }}>
                {quiz.difficulty}
              </div>
            </div>

            {/* Card Content */}
            <div className="quiz-card-content">
              <p className="quiz-description">{quiz.description}</p>

              {/* Stats Grid */}
              <div className="quiz-stats-grid">
                <div className="stat-item">
                  <span className="stat-icon">📋</span>
                  <div>
                    <span className="stat-label">{language === 'vi' ? 'Câu hỏi' : 'Questions'}</span>
                    <span className="stat-value">{quiz.questionsCount}</span>
                  </div>
                </div>

                <div className="stat-item">
                  <span className="stat-icon">⏱️</span>
                  <div>
                    <span className="stat-label">{t.time}</span>
                    <span className="stat-value">{quiz.time}</span>
                  </div>
                </div>

                <div className="stat-item">
                  <span className="stat-icon">✅</span>
                  <div>
                    <span className="stat-label">{language === 'vi' ? 'Đã làm' : 'Attempts'}</span>
                    <span className="stat-value">{quiz.attempts}</span>
                  </div>
                </div>

                <div className="stat-item">
                  <span className="stat-icon">📊</span>
                  <div>
                    <span className="stat-label">{language === 'vi' ? 'Tổng' : 'Total'}</span>
                    <span className="stat-value">{quiz.totalAttempts}</span>
                  </div>
                </div>
              </div>

              {/* Pass Rate Bar */}
              <div className="pass-rate-container">
                <div className="pass-rate-label">
                  <span>{language === 'vi' ? 'Tỉ lệ vượt qua' : 'Pass Rate'}</span>
                  <span className="pass-rate-value">{quiz.passRate}%</span>
                </div>
                <div className="pass-rate-bar">
                  <motion.div
                    className="pass-rate-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${quiz.passRate}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                  />
                </div>
              </div>

              {/* Content Preview */}
              <div className="content-preview">
                <p className="preview-label">{language === 'vi' ? 'Nội dung bài kiểm tra:' : 'Test Content:'}</p>
                <p className="preview-text">Kiểm tra kiến thức về {quiz.title.toLowerCase()} với các dạng bài tập đa dạng</p>
              </div>
            </div>

            {/* Card Footer */}
            <div className="quiz-card-footer">
              <button
                className="btn-details-card"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/quiz/${quiz.id}`);
                }}
              >
                {t.details}
              </button>
              <button
                className={`btn-start-card ${quiz.disabledStart ? 'disabled' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  !quiz.disabledStart && navigate(`/quiz/${quiz.id}`);
                }}
                disabled={quiz.disabledStart}
              >
                {t.start}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal for Quiz Details */}
      {selectedQuiz && (
        <QuizDetailModal quiz={selectedQuiz} onClose={() => setSelectedQuiz(null)} language={language} t={t} />
      )}
    </div>
  );
}

function QuizDetailModal({ quiz, onClose, language, t }) {
  const navigate = useNavigate();

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>✕</button>

        <h2>{quiz.title}</h2>
        <p>{quiz.description}</p>

        <div className="modal-details">
          <div className="detail-row">
            <span className="detail-label">{language === 'vi' ? 'Câu hỏi' : 'Questions'}:</span>
            <span>{quiz.questionsCount}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t.time}:</span>
            <span>{quiz.time}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{language === 'vi' ? 'Độ khó' : 'Difficulty'}:</span>
            <span>{quiz.difficulty}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{language === 'vi' ? 'Đã làm' : 'Attempts'}:</span>
            <span>{quiz.attempts}/{quiz.totalAttempts}</span>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-modal-cancel" onClick={onClose}>
            {language === 'vi' ? 'Đóng' : 'Close'}
          </button>
          <button
            className="btn-modal-start"
            onClick={() => {
              navigate(`/quiz/${quiz.id}`);
              onClose();
            }}
          >
            {t.start}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

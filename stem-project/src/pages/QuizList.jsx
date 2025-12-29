import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth, getApiBase } from '../contexts/AuthContext';
import { quizListTranslations } from '../translations/quizListTranslations';
import '../styles/QuizList.css';

export default function QuizList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const { token, getUserId } = useAuth();
  const t = quizListTranslations[language];
  
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showHardModePopup, setShowHardModePopup] = useState(false);
  const [hardModeQuiz, setHardModeQuiz] = useState(null);
  const [topicScores, setTopicScores] = useState({});

  // Check for hard mode popup in location state
  useEffect(() => {
    if (location.state?.showHardModePopup) {
      setShowHardModePopup(true);
      setHardModeQuiz(location.state.quiz);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Fetch user's previous scores
  useEffect(() => {
    const fetchScores = async () => {
      try {
        const apiBase = getApiBase();
        const userId = getUserId();
        if (userId && token) {
          const response = await fetch(`${apiBase}/api/user-quiz-scores/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.scores) {
              setTopicScores(data.scores);
            }
          }
        }
      } catch (error) {
        console.debug('Could not fetch user scores:', error);
      }
    };
    fetchScores();
  }, [token, getUserId]);

  // Quiz data for all chapters
  const allTopics = [
    {
      chapterId: 1,
      id: 'chapter1',
      title: language === 'vi' ? 'Đa thức nhiều biến' : 'Polynomials of Multiple Variables',
      description: language === 'vi' ? 'Kiểm tra kiến thức về đa thức nhiều biến' : 'Test knowledge about polynomials of multiple variables'
    },
    {
      chapterId: 2,
      id: 'chapter2',
      title: language === 'vi' ? 'Phân thức đại số' : 'Algebraic Fractions',
      description: language === 'vi' ? 'Kiểm tra kiến thức về phân thức đại số' : 'Test knowledge about algebraic fractions'
    },
    {
      chapterId: 3,
      id: 'chapter3',
      title: language === 'vi' ? 'Hàm số và đồ thị' : 'Functions and Graphs',
      description: language === 'vi' ? 'Kiểm tra kiến thức về hàm số và đồ thị' : 'Test knowledge about functions and graphs'
    },
    {
      chapterId: 4,
      id: 'chapter4',
      title: language === 'vi' ? 'Hình học trực quan' : 'Visual Geometry',
      description: language === 'vi' ? 'Kiểm tra kiến thức về hình học trực quan' : 'Test knowledge about visual geometry'
    },
    {
      chapterId: 5,
      id: 'chapter5',
      title: language === 'vi' ? 'Tam giác, tứ giác' : 'Triangles and Quadrilaterals',
      description: language === 'vi' ? 'Kiểm tra kiến thức về tam giác và tứ giác' : 'Test knowledge about triangles and quadrilaterals'
    }
  ];

  // Page configurations
  const pages = [
    {
      pageNum: 1,
      title: language === 'vi' ? 'Bình thường' : 'Normal Mode',
      subtitle: language === 'vi' ? 'Bộ câu hỏi chuẩn từ Contest 1-3' : 'Standard questions from Contest 1-3',
      type: 'normal',
      contests: [1, 2, 3],
      quizzes: allTopics.map(topic => ({
        ...topic,
        type: 'chapter',
        difficulty: language === 'vi' ? 'Cơ bản' : 'Basic',
        time: '60 phút / 60 min',
        questionsCount: 22
      }))
    },
    {
      pageNum: 2,
      title: language === 'vi' ? 'Khó' : 'Hard Mode',
      subtitle: language === 'vi' ? 'Bộ câu hỏi nâng cao từ Contest 4-5' : 'Advanced questions from Contest 4-5',
      type: 'hard',
      contests: [4, 5],
      quizzes: allTopics.map(topic => ({
        ...topic,
        type: 'chapter',
        difficulty: language === 'vi' ? 'Khó' : 'Hard',
        time: '60 phút / 60 min',
        questionsCount: 22
      }))
    },
    {
      pageNum: 3,
      title: language === 'vi' ? 'Tự động sinh' : 'Auto-Generate',
      subtitle: language === 'vi' ? 'Hệ thống AI tự động sinh bài kiểm tra' : 'AI system auto-generates quiz',
      type: 'auto',
      quizzes: [
        {
          id: 'adaptive',
          title: language === 'vi' ? 'Bài Kiểm Tra Thích Hợp' : 'Adaptive Quiz',
          description: language === 'vi' ? 'Bài kiểm tra thích ứng - câu hỏi tự động điều chỉnh theo khả năng của bạn' : 'Adaptive quiz - questions adjust to your level',
          type: 'adaptive',
          difficulty: language === 'vi' ? 'Tự động' : 'Adaptive',
          time: '60 phút / 60 min',
          questionsCount: '~20',
          badge: 'AI'
        }
      ]
    }
  ];

  const currentPageData = pages[currentPage - 1];

  const getDifficultyColor = (difficulty) => {
    if (difficulty === 'Cơ bản' || difficulty === 'Basic') return '#10b981';
    if (difficulty === 'Khó' || difficulty === 'Hard') return '#ef4444';
    if (difficulty === 'Tự động' || difficulty === 'Adaptive') return '#3b82f6';
    return '#f59e0b';
  };

  const handleStartQuiz = (quiz) => {
    if (quiz.type === 'adaptive') {
      navigate('/adaptive-quiz-select');
    } else if (quiz.type === 'chapter' && quiz.chapterId) {
      const contestNum = currentPageData.contests[Math.floor(Math.random() * currentPageData.contests.length)];
      const quizPath = `${quiz.chapterId}-${contestNum}`;
      navigate(`/quiz/${quizPath}`);
    }
  };

  return (
    <div className="quiz-list-container">
      {/* Header */}
      <div className="quiz-list-header">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {language === 'vi' ? 'Bộ Sưu Tập Bài Kiểm Tra' : 'Quiz Collection'}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {currentPageData.subtitle}
        </motion.p>
      </div>

      {/* Mode Indicator */}
      <div className="mode-indicator">
        <motion.div
          className="mode-badge"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          key={currentPage}
        >
          <span className="mode-icon">
            {currentPageData.type === 'normal' && '📚'}
            {currentPageData.type === 'hard' && '⚡'}
            {currentPageData.type === 'auto' && '🤖'}
          </span>
          <span className="mode-title">{currentPageData.title}</span>
        </motion.div>
      </div>

      {/* Quiz Grid */}
      <div className="quiz-grid">
        <AnimatePresence mode="wait">
          {currentPageData.quizzes.map((quiz, index) => (
            <motion.div
              key={quiz.id}
              className="quiz-card-modern"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              onClick={() => setSelectedQuiz(quiz)}
              whileHover={{ translateY: -8 }}
            >
              {/* Card Header */}
              <div className="quiz-card-header">
                <div className="quiz-badge">
                  {quiz.badge && <span className="ai-badge">{quiz.badge}</span>}
                  {quiz.title}
                </div>
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
                    <span className="stat-icon">📝</span>
                    <div>
                      <span className="stat-label">{language === 'vi' ? 'Câu hỏi' : 'Questions'}</span>
                      <span className="stat-value">{quiz.questionsCount}</span>
                    </div>
                  </div>

                  <div className="stat-item">
                    <span className="stat-icon">⏱️</span>
                    <div>
                      <span className="stat-label">{language === 'vi' ? 'Thời gian' : 'Time'}</span>
                      <span className="stat-value">60 phút</span>
                    </div>
                  </div>
                </div>

                {/* Content Preview */}
                <div className="content-preview">
                  <p className="preview-text">{language === 'vi' ? 'Kiểm tra kiến thức về' : 'Test knowledge about'} {quiz.title.toLowerCase()}</p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="quiz-card-footer">
                <button
                  className="btn-start-card"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartQuiz(quiz);
                  }}
                >
                  {language === 'vi' ? 'Bắt đầu' : 'Start'} →
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      <div className="pagination-container">
        <div className="pagination-controls">
          {pages.map((page) => (
            <motion.button
              key={page.pageNum}
              className={`pagination-button ${currentPage === page.pageNum ? 'active' : ''}`}
              onClick={() => setCurrentPage(page.pageNum)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="page-num">{page.pageNum}</span>
              <span className="page-title">{page.title}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Quiz Details Modal */}
      {selectedQuiz && (
        <QuizDetailModal
          quiz={selectedQuiz}
          onClose={() => setSelectedQuiz(null)}
          language={language}
          t={t}
          onStart={() => {
            handleStartQuiz(selectedQuiz);
            setSelectedQuiz(null);
          }}
        />
      )}

      {/* Hard Mode Challenge Popup */}
      {showHardModePopup && hardModeQuiz && (
        <HardModePopup
          quiz={hardModeQuiz}
          language={language}
          onYes={() => {
            setShowHardModePopup(false);
            if (hardModeQuiz.type === 'adaptive') {
              // For adaptive quiz, go to adaptive quiz select page for hard mode
              navigate('/adaptive-quiz-select', { state: { hardMode: true } });
            } else if (hardModeQuiz.chapterId) {
              // For regular quizzes, navigate to hard mode quiz
              const quizPath = `${hardModeQuiz.chapterId}-${[4, 5][Math.floor(Math.random() * 2)]}`;
              navigate(`/quiz/${quizPath}`);
            }
          }}
          onNo={() => setShowHardModePopup(false)}
        />
      )}
    </div>
  );
}

function QuizDetailModal({ quiz, onClose, language, t, onStart }) {
  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content-quiz"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header-section">
          <h2>{quiz.title}</h2>
          <p>{quiz.description}</p>
        </div>

        <div className="modal-details">
          <div className="detail-row">
            <span className="detail-label">{language === 'vi' ? '📝 Câu hỏi' : '📝 Questions'}:</span>
            <span className="detail-value">{quiz.questionsCount}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{language === 'vi' ? '⏱️ Thời gian' : '⏱️ Time'}:</span>
            <span className="detail-value">60 {language === 'vi' ? 'phút' : 'min'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{language === 'vi' ? '⭐ Độ khó' : '⭐ Difficulty'}:</span>
            <span className="detail-value">{quiz.difficulty}</span>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-modal-cancel" onClick={onClose}>
            {language === 'vi' ? 'Đóng' : 'Close'}
          </button>
          <button className="btn-modal-start" onClick={onStart}>
            {language === 'vi' ? 'Bắt đầu ngay' : 'Start Now'} →
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function HardModePopup({ quiz, language, onYes, onNo }) {
  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onNo}
    >
      <motion.div
        className="hard-mode-popup"
        initial={{ scale: 0.5, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.5, opacity: 0, y: 50 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="popup-icon">🎯</div>
        
        <h2>
          {language === 'vi' ? 'Chúc mừng! 🎉' : 'Congratulations! 🎉'}
        </h2>
        
        <p className="popup-message">
          {language === 'vi' 
            ? `Bạn đã đạt điểm ≥ 8.5 trong bài "${quiz.title}". Bạn có muốn thử thách bản thân với chế độ khó không?`
            : `You scored ≥ 8.5 in "${quiz.title}". Would you like to challenge yourself with Hard Mode?`
          }
        </p>

        <div className="difficulty-comparison">
          <div className="diff-item normal">
            <span className="diff-label">{language === 'vi' ? 'Bình thường' : 'Normal'}</span>
            <span className="diff-icon">📚</span>
          </div>
          <div className="arrow">→</div>
          <div className="diff-item hard">
            <span className="diff-label">{language === 'vi' ? 'Khó' : 'Hard'}</span>
            <span className="diff-icon">⚡</span>
          </div>
        </div>

        <div className="popup-actions">
          <motion.button
            className="btn-popup-no"
            onClick={onNo}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {language === 'vi' ? 'Không, tạm dừng' : 'Not Now'}
          </motion.button>
          <motion.button
            className="btn-popup-yes"
            onClick={onYes}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {language === 'vi' ? 'Có, bắt đầu nào!' : 'Yes, Let\'s Go!'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

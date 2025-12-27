import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth, getApiBase } from '../contexts/AuthContext';
import { quizListTranslations } from '../translations/quizListTranslations';
import '../styles/QuizList.css';

export default function QuizList() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { token, getUserId } = useAuth();
  const t = quizListTranslations[language];
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [topicScores, setTopicScores] = useState({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  });

  // Fetch user's previous scores for each chapter
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
          // Silently ignore 404 or other errors - scores are optional
        }
      } catch (error) {
        // Silently ignore fetch errors - default scores will be used
        console.debug('Could not fetch user scores:', error);
      }
    };
    
    fetchScores();
  }, [token, getUserId]);

  // Show quiz options by chapters
  const quizzes = [
    {
      chapterId: 1,
      id: 'chapter1',
      title: language === 'vi' ? 'Đa thức nhiều biến' : 'Polynomials of Multiple Variables',
      description: language === 'vi' ? 'Kiểm tra kiến thức về đa thức nhiều biến' : 'Test knowledge about polynomials of multiple variables',
      time: '30 phút / 30 min',
      difficulty: language === 'vi' ? 'Cơ bản' : 'Basic',
      questionsCount: 22,
      type: 'chapter'
    },
    {
      chapterId: 2,
      id: 'chapter2',
      title: language === 'vi' ? 'Phân thức đại số' : 'Algebraic Fractions',
      description: language === 'vi' ? 'Kiểm tra kiến thức về phân thức đại số' : 'Test knowledge about algebraic fractions',
      time: '30 phút / 30 min',
      difficulty: language === 'vi' ? 'Cơ bản' : 'Basic',
      questionsCount: 22,
      type: 'chapter'
    },
    {
      chapterId: 3,
      id: 'chapter3',
      title: language === 'vi' ? 'Hàm số và đồ thị' : 'Functions and Graphs',
      description: language === 'vi' ? 'Kiểm tra kiến thức về hàm số và đồ thị' : 'Test knowledge about functions and graphs',
      time: '30 phút / 30 min',
      difficulty: language === 'vi' ? 'Cơ bản' : 'Basic',
      questionsCount: 22,
      type: 'chapter'
    },
    {
      chapterId: 4,
      id: 'chapter4',
      title: language === 'vi' ? 'Hình học trực quan' : 'Visual Geometry',
      description: language === 'vi' ? 'Kiểm tra kiến thức về hình học trực quan' : 'Test knowledge about visual geometry',
      time: '30 phút / 30 min',
      difficulty: language === 'vi' ? 'Cơ bản' : 'Basic',
      questionsCount: 22,
      type: 'chapter'
    },
    {
      chapterId: 5,
      id: 'chapter5',
      title: language === 'vi' ? 'Tam giác, tứ giác' : 'Triangles and Quadrilaterals',
      description: language === 'vi' ? 'Kiểm tra kiến thức về tam giác và tứ giác' : 'Test knowledge about triangles and quadrilaterals',
      time: '30 phút / 30 min',
      difficulty: language === 'vi' ? 'Cơ bản' : 'Basic',
      questionsCount: 22,
      type: 'chapter'
    },
    {
      id: 'adaptive',
      title: language === 'vi' ? 'Bài Kiểm Tra Thích Hợp' : 'Adaptive Quiz',
      description: language === 'vi' ? 'Bài kiểm tra thích ứng - câu hỏi tự động điều chỉnh theo khả năng của bạn' : 'Adaptive quiz - questions adjust to your level',
      time: '20-40 phút / 20-40 min',
      difficulty: language === 'vi' ? 'Tự động' : 'Adaptive',
      questionsCount: '~20',
      type: 'adaptive',
      badge: language === 'vi' ? 'AI' : 'AI'
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
                  <span className="stat-icon"></span>
                  <div>
                    <span className="stat-label">{language === 'vi' ? 'Câu hỏi' : 'Questions'}</span>
                    <span className="stat-value">{quiz.questionsCount}</span>
                  </div>
                </div>

                <div className="stat-item">
                  <span className="stat-icon"></span>
                  <div>
                    <span className="stat-label">{t.time}</span>
                    <span className="stat-value">{quiz.time}</span>
                  </div>
                </div>

                {quiz.type === 'adaptive' && (
                  <>
                    <div className="stat-item">
                      <span className="stat-icon"></span>
                      <div>
                        <span className="stat-label">{language === 'vi' ? 'Đã làm' : 'Attempts'}</span>
                        <span className="stat-value">0</span>
                      </div>
                    </div>

                    <div className="stat-item">
                      <span className="stat-icon"></span>
                      <div>
                        <span className="stat-label">{language === 'vi' ? 'Tổng' : 'Total'}</span>
                        <span className="stat-value">0</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Pass Rate Bar */}
              {quiz.type === 'adaptive' && (
                <div className="pass-rate-container">
                  <div className="pass-rate-label">
                    <span>{language === 'vi' ? 'Tỉ lệ vượt qua' : 'Pass Rate'}</span>
                    <span className="pass-rate-value">0%</span>
                  </div>
                  <div className="pass-rate-bar">
                    <motion.div
                      className="pass-rate-fill"
                      initial={{ width: 0 }}
                      animate={{ width: '0%' }}
                      transition={{ duration: 1, delay: 0.2 }}
                    />
                  </div>
                </div>
              )}

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
                  // Just close the modal - the card click opens it
                  if (selectedQuiz && selectedQuiz.id === quiz.id) {
                    setSelectedQuiz(null);
                  } else {
                    setSelectedQuiz(quiz);
                  }
                }}
              >
                {t.details}
              </button>
              <button
                className="btn-start-card"
                onClick={(e) => {
                  e.stopPropagation();
                  if (quiz.type === 'adaptive') {
                    navigate('/adaptive-quiz-select');
                  } else if (quiz.type === 'chapter' && quiz.chapterId) {
                    // Determine which difficulty level contests to select from
                    const previousScore = topicScores[quiz.chapterId] || 0;
                    
                    // Contests 1-3: Normal difficulty
                    // Contests 4-5: Hard difficulty
                    // Only unlock hard contests if previous score >= 8.5
                    const allowHardQuiz = previousScore >= 8.5;
                    const availableContests = allowHardQuiz 
                      ? [1, 2, 3, 4, 5]           // Allow all difficulties
                      : [1, 2, 3];                 // Only normal difficulty
                    
                    const selectedContest = availableContests[Math.floor(Math.random() * availableContests.length)];
                    const quizPath = `${quiz.chapterId}-${selectedContest}`;
                    
                    console.log(`[QuizList] Starting ${quiz.title} (Chapter ${quiz.chapterId})`);
                    console.log(`  Previous Score: ${previousScore.toFixed(1)}/10`);
                    console.log(`  Available Contests: ${availableContests.join(',')} (difficulty: ${allowHardQuiz ? 'normal+hard' : 'normal only'})`);
                    console.log(`  Selected: Contest ${selectedContest}, Navigating to /quiz/${quizPath}`);
                    
                    navigate(`/quiz/${quizPath}`);
                  } else {
                    console.error('[QuizList] Invalid quiz:', quiz);
                  }
                }}
              >
                {t.start}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal for Quiz Details */}
      {selectedQuiz && (
        <QuizDetailModal 
          quiz={selectedQuiz} 
          onClose={() => setSelectedQuiz(null)} 
          language={language} 
          t={t}
          topicScores={topicScores}
        />
      )}
    </div>
  );
}

function QuizDetailModal({ quiz, onClose, language, t, topicScores = {} }) {
  const navigate = useNavigate();

  const handleStartQuiz = () => {
    if (quiz.type === 'adaptive') {
      navigate('/adaptive-quiz-select');
    } else if (quiz.type === 'chapter' && quiz.chapterId) {
      // Same logic as the main Start button
      const previousScore = topicScores[quiz.chapterId] || 0;
      const allowHardQuiz = previousScore >= 8.5;
      const availableContests = allowHardQuiz ? [1, 2, 3, 4, 5] : [1, 2, 3];
      const selectedContest = availableContests[Math.floor(Math.random() * availableContests.length)];
      const quizPath = `${quiz.chapterId}-${selectedContest}`;
      navigate(`/quiz/${quizPath}`);
    }
    onClose();
  };

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
            onClick={handleStartQuiz}
          >
            {t.start}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

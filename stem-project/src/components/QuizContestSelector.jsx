import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth, getApiBase } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/QuizContestSelector.css';

/**
 * QuizContestSelector Component
 * 
 * Flow:
 * 1. User sees 5 chapters
 * 2. User clicks a chapter
 * 3. System fetches user's last score for that chapter
 * 4. System recommends easy contest (1-3) or hard contest (4-5) based on score
 * 5. User is navigated to the quiz with recommended difficulty
 */
export default function QuizContestSelector() {
  const navigate = useNavigate();
  const { user, getUserId } = useAuth();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState(null);

  const CHAPTERS = [
    {
      id: 1,
      name: language === 'vi' ? 'Đa thức nhiều biến' : 'Polynomials of Multiple Variables',
      description: language === 'vi' ? 'Kiểm tra kiến thức về đa thức nhiều biến' : 'Test knowledge about polynomials of multiple variables',
      emoji: '🔢'
    },
    {
      id: 2,
      name: language === 'vi' ? 'Phân thức đại số' : 'Algebraic Fractions',
      description: language === 'vi' ? 'Kiểm tra kiến thức về phân thức đại số' : 'Test knowledge about algebraic fractions',
      emoji: '➗'
    },
    {
      id: 3,
      name: language === 'vi' ? 'Hàm số và đồ thị' : 'Functions and Graphs',
      description: language === 'vi' ? 'Kiểm tra kiến thức về hàm số và đồ thị' : 'Test knowledge about functions and graphs',
      emoji: '📈'
    },
    {
      id: 4,
      name: language === 'vi' ? 'Hình học trực quan' : 'Visual Geometry',
      description: language === 'vi' ? 'Kiểm tra kiến thức về hình học trực quan' : 'Test knowledge about visual geometry',
      emoji: '🔲'
    },
    {
      id: 5,
      name: language === 'vi' ? 'Tam giác, tứ giác' : 'Triangles and Quadrilaterals',
      description: language === 'vi' ? 'Kiểm tra kiến thức về tam giác và tứ giác' : 'Test knowledge about triangles and quadrilaterals',
      emoji: '△'
    }
  ];

  const handleChapterSelect = async (chapterId) => {
    setSelectedChapter(chapterId);
    setLoading(true);

    try {
      const apiBase = getApiBase();
      const userId = getUserId();

      if (!userId) {
        throw new Error('User ID is required');
      }

      // Fetch recommended contest for this chapter based on user's past performance
      const response = await fetch(
        `${apiBase}/api/adaptive/recommended-contest/${userId}/${chapterId}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get recommendation: ${response.status}`);
      }

      const recommendation = await response.json();
      const { recommendedContestNum, difficulty } = recommendation;

      // Navigate to quiz with recommended contest
      const quizId = `chapter${chapterId}-contest${recommendedContestNum}`;
      
      console.log('[QuizContestSelector] Navigating to quiz:', {
        chapterId,
        quizId,
        recommendedContestNum,
        difficulty
      });

      navigate(`/quiz/${quizId}`, {
        state: {
          chapterId,
          contestNum: recommendedContestNum,
          difficulty,
          recommendation
        }
      });
    } catch (error) {
      console.error('[QuizContestSelector] Error:', error);
      alert(language === 'vi'
        ? 'Lỗi khi tạo bài kiểm tra. Vui lòng thử lại.'
        : 'Error creating quiz. Please try again.');
      setSelectedChapter(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quiz-contest-selector">
      <motion.div
        className="selector-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>
          {language === 'vi'
            ? '📚 Chọn chương để kiểm tra'
            : '📚 Choose Chapter for Quiz'}
        </h1>
        <p>
          {language === 'vi'
            ? 'Hệ thống sẽ gợi ý mức độ khó phù hợp dựa trên kết quả trước của bạn'
            : 'The system will recommend difficulty based on your previous results'}
        </p>
      </motion.div>

      <div className="chapters-grid">
        {CHAPTERS.map((chapter, idx) => (
          <motion.div
            key={chapter.id}
            className={`chapter-card ${selectedChapter === chapter.id ? 'selected' : ''}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            onClick={() => !loading && handleChapterSelect(chapter.id)}
            whileHover={{ translateY: -5 }}
          >
            <div className="chapter-emoji">{chapter.emoji}</div>
            <h3>{chapter.name}</h3>
            <p>{chapter.description}</p>
            {loading && selectedChapter === chapter.id && (
              <div className="loading-spinner">
                <div className="spinner"></div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {loading && (
        <motion.div
          className="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="loading-content">
            <div className="spinner"></div>
            <p>
              {language === 'vi'
                ? 'Đang tạo bài kiểm tra...'
                : 'Creating your quiz...'}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

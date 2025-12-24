import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth, getApiBase } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import QuizRecommendation from '../components/QuizRecommendation';
import '../styles/AdaptiveQuizSelect.css';

export default function AdaptiveQuizSelect() {
  const navigate = useNavigate();
  const { user, token, getUserId } = useAuth();
  const { language } = useLanguage();
  const [selectedQuizType, setSelectedQuizType] = useState(null);
  const [loading, setLoading] = useState(false);
  const userId = getUserId();

  const handleSelectQuiz = async (quizType) => {
    setSelectedQuizType(quizType);
    setLoading(true);

    try {
      const apiBase = getApiBase();

      // Fetch adaptive quiz based on selection
      const response = await fetch(`${apiBase}/api/adaptive/quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          userId,
          quizType: quizType.type, // 'personalized', 'targeted', 'reinforcement'
          focusTopic: quizType.focusTopic || null
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate quiz: ${response.status}`);
      }

      const quizData = await response.json();

      // Navigate to AdaptiveQuiz with quiz data
      navigate('/adaptive-quiz', {
        state: {
          quiz: quizData.quiz,
          recommendation: quizData.recommendation,
          quizType: quizType.type
        }
      });
    } catch (error) {
      console.error('[AdaptiveQuizSelect] Error:', error);
      alert(language === 'vi' 
        ? 'Lỗi khi tạo bài kiểm tra. Vui lòng thử lại.' 
        : 'Error creating quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adaptive-quiz-select">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>{language === 'vi' ? 'Chọn Bài Kiểm Tra Thích Hợp' : 'Select Your Quiz'}</h1>
        <p>{language === 'vi' 
          ? 'Hệ thống sẽ gợi ý bài kiểm tra dựa trên hiệu suất của bạn' 
          : 'Get personalized quiz recommendations based on your performance'}</p>
      </motion.div>

      <div className="quiz-select-container">
        <QuizRecommendation 
          onSelectQuiz={handleSelectQuiz}
          isLoading={loading}
        />
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
            <p>{language === 'vi' ? 'Đang tạo bài kiểm tra...' : 'Creating your quiz...'}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

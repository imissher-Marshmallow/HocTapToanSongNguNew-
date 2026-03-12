import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth, getApiBase } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/TopicSelector.css';

export default function TopicSelector() {
  const navigate = useNavigate();
  const { user, token, getUserId } = useAuth();
  const { language } = useLanguage();
  const userId = getUserId();

  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

  // Fetch topics with user progress
  const fetchTopics = async () => {
    try {
      const apiBase = getApiBase();
      const response = await fetch(
        `${apiBase}/api/adaptive/topics?userId=${userId}`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch topics');
      const data = await response.json();
      console.log('[TopicSelector] Topics fetched:', data.length, 'topics');
      
      // Log topic status for verification
      data.forEach(topic => {
        if (topic.userProgress) {
          console.log(`  📊 ${topic.name}: Score ${topic.userProgress.lastScore}%, Attempts ${topic.userProgress.attempts}, Status ${topic.userProgress.status}`);
        } else {
          console.log(`  📋 ${topic.name}: Not attempted`);
        }
      });
      
      setTopics(data);
      setLoading(false);
    } catch (error) {
      console.error('[TopicSelector] Error fetching topics:', error);
      setLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    if (userId) {
      fetchTopics();
    }
  }, [userId, token]);

  // Listen for profile refresh signal from AdaptiveQuiz
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionStorage.getItem('profileRefreshNeeded') === 'true') {
        console.log('[TopicSelector] Detected profile refresh signal, refetching topics...');
        sessionStorage.removeItem('profileRefreshNeeded');
        fetchTopics();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [userId, token]);

  // Get smart difficulty for selected topic
  const handleSelectTopic = async (topic) => {
    setSelectedTopic(topic);
    setGeneratingQuiz(true);

    try {
      const apiBase = getApiBase();

      // Get smart difficulty recommendation
      const diffResponse = await fetch(
        `${apiBase}/api/adaptive/quiz/smart-difficulty/${userId}/${encodeURIComponent(topic.name)}`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        }
      );

      if (!diffResponse.ok) throw new Error('Failed to get difficulty recommendation');
      const diffData = await diffResponse.json();
      setRecommendation(diffData);
      console.log('[TopicSelector] Difficulty analysis:', diffData);

      // Generate quiz for this topic with recommended exam IDs
      const quizResponse = await fetch(`${apiBase}/api/adaptive/quiz/by-topic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          userId,
          topicName: topic.name,
          examIds: diffData.examIds,  // Use smart difficulty exam IDs
          numQuestions: 10
        })
      });

      if (!quizResponse.ok) throw new Error('Failed to generate quiz');
      const quizData = await quizResponse.json();
      console.log('[TopicSelector] Quiz generated:', {
        topicName: quizData.topicName,
        totalQuestions: quizData.totalQuestions,
        questionsLength: quizData.questions?.length,
        firstQuestion: quizData.questions?.length > 0 ? {
          id: quizData.questions[0].id,
          hasQuestion: !!quizData.questions[0].question,
          hasOptions: Array.isArray(quizData.questions[0].options),
          hasType: !!quizData.questions[0].type,
          hasCognitiveLevel: quizData.questions[0].cognitiveLevel !== undefined
        } : null
      });

      // Validate quiz data before navigation
      if (!quizData.questions || quizData.questions.length === 0) {
        throw new Error('No questions returned from backend');
      }

      // Navigate to quiz with topic data
      navigate('/adaptive-quiz', {
        state: {
          quiz: quizData.questions,
          topic: topic.name,
          difficulty: diffData.difficulty,
          recommendation: {
            topic: topic.name,
            reason: diffData.reasoning,
            difficulty: diffData.difficulty
          },
          quizType: 'topic-based'
        }
      });
      console.log('[TopicSelector] Navigation to /adaptive-quiz with', quizData.questions.length, 'questions');
    } catch (error) {
      console.error('[TopicSelector] Error:', error);
      alert(language === 'vi' ? 'Lỗi tạo bài kiểm tra' : 'Error creating quiz');
      setGeneratingQuiz(false);
    }
  };

  // Get status badge
  const getStatusBadge = (topic) => {
    const userProgress = topic.userProgress;
    if (!userProgress || !userProgress.lastScore) {
      return { label: ' Mới', icon: '', color: 'new' };
    }
    
    const score = userProgress.lastScore;
    if (score >= 80) {
      return { label: ' Thành thạo', icon: '', color: 'mastered' };
    } else if (score >= 60) {
      return { label: ' Đang học', icon: '', color: 'developing' };
    } else {
      return { label: ' Cần luyện', icon: '', color: 'weak' };
    }
  };

  if (loading) {
    return (
      <div className="topic-selector-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>{language === 'vi' ? 'Đang tải các chủ đề...' : 'Loading topics...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="topic-selector-container">
      {/* Header */}
      <motion.div
        className="topic-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="header-content">
          <h1>{language === 'vi' ? ' Chọn Chủ Đề' : ' Choose a Topic'}</h1>
          <p>
            {language === 'vi'
              ? 'Hệ thống sẽ tự động lựa chọn mức độ phù hợp dựa trên hiệu suất của bạn'
              : 'System automatically selects difficulty based on your performance'}
          </p>
        </div>
      </motion.div>

      {/* Recommendation Section */}
      {recommendation && selectedTopic && (
        <motion.div
          className="recommendation-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="recommendation-content">
            <div className="recommendation-icon">⚡</div>
            <div>
              <h3>System Recommendation</h3>
              <p>{recommendation.reason}</p>
              <p className="difficulty">
                {language === 'vi' ? 'Mức độ:' : 'Difficulty:'}{' '}
                <span className={`difficulty-${recommendation.difficulty}`}>
                  {recommendation.difficulty === 'easy' && (language === 'vi' ? 'Dễ' : 'Easy')}
                  {recommendation.difficulty === 'normal' && (language === 'vi' ? 'Trung bình' : 'Normal')}
                  {recommendation.difficulty === 'hard' && (language === 'vi' ? 'Khó' : 'Hard')}
                </span>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Topics Grid */}
      <div className="topics-grid">
        {topics.map((topic, index) => {
          const status = getStatusBadge(topic);
          const isSelected = selectedTopic?.name === topic.name;

          return (
            <motion.div
              key={topic.name}
              className={`topic-card ${isSelected ? 'selected' : ''} ${status.color}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              onClick={() => handleSelectTopic(topic)}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="card-header">
                <div className={`status-badge status-${status.color}`}>
                  {status.label}
                </div>
              </div>

              <div className="card-content">
                <h3>{topic.name}</h3>
                <div className="topic-stats">
                  {topic.userProgress && topic.userProgress.attempts > 0 && (
                    <>
                      <div className="stat">
                        <span className="label">{language === 'vi' ? 'Lần cố' : 'Attempts'}:</span>
                        <span className="value">{topic.userProgress.attempts}</span>
                      </div>
                      <div className="stat">
                        <span className="label">{language === 'vi' ? 'Điểm' : 'Score'}:</span>
                        <span className={`value score-${topic.userProgress.lastScore >= 80 ? 'high' : topic.userProgress.lastScore >= 60 ? 'mid' : 'low'}`}>
                          {topic.userProgress.lastScore}%
                        </span>
                      </div>
                      <div className="stat">
                        <span className="label">{language === 'vi' ? 'Trung bình' : 'Avg'}:</span>
                        <span className="value">{topic.userProgress.averageScore}%</span>
                      </div>
                    </>
                  )}
                  {!topic.userProgress && (
                    <div className="no-attempts">
                      <span>{language === 'vi' ? 'Chưa thử' : 'Not attempted'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="card-footer">
                {generatingQuiz && isSelected ? (
                  <div className="generating">
                    <div className="mini-spinner"></div>
                    {language === 'vi' ? 'Đang tạo...' : 'Creating...'}
                  </div>
                ) : (
                  <span>{language === 'vi' ? 'Bắt đầu bài kiểm tra' : 'Start Quiz'} →</span>
                )}
              </div>

              {isSelected && (
                <motion.div
                  className="selected-indicator"
                  layoutId="selectedCard"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {topics.length === 0 && !loading && (
        <div className="empty-state">
          <p>{language === 'vi' ? 'Không có chủ đề nào' : 'No topics available'}</p>
        </div>
      )}
    </div>
  );
}

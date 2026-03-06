import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../styles/TopicSelector.css';

/**
 * TopicSelector Component
 * 
 * User selects a TOPIC only (no difficulty buttons)
 * System automatically determines difficulty based on their past performance:
 * - Never attempted: Easy (exam_id 1-3)
 * - Score < 60%: Easy (exam_id 1-3)
 * - Score 60-75%: Normal (exam_id 2-3)
 * - Score >= 75%: Hard (exam_id 4-5)
 */
const TopicSelector = () => {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const userId = localStorage.getItem('userId');

  // Fetch all topics on mount
  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const params = userId ? `?userId=${userId}` : '';
      const response = await fetch(`/api/adaptive/topics${params}`);
      
      if (!response.ok) throw new Error('Failed to fetch topics');
      
      const data = await response.json();
      setTopics(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching topics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTopic = async (topic) => {
    try {
      setGeneratingQuiz(true);
      setSelectedTopic(topic.name);

      // Get smart difficulty based on user's past performance
      const difficultyResponse = await fetch(
        `/api/adaptive/quiz/smart-difficulty/${userId}/${encodeURIComponent(topic.name)}`
      );

      if (!difficultyResponse.ok) {
        throw new Error('Failed to determine difficulty');
      }

      const difficultyData = await difficultyResponse.json();

      // Generate quiz with smart difficulty
      const quizResponse = await fetch('/api/adaptive/quiz/by-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(userId),
          topicName: topic.name,
          examIds: difficultyData.examIds,
          numQuestions: 10
        })
      });

      if (!quizResponse.ok) {
        throw new Error('Failed to generate quiz');
      }

      const quizData = await quizResponse.json();

      // Navigate to quiz with all data
      navigate('/adaptive-quiz', {
        state: {
          quizId: quizData.quizId,
          topicName: topic.name,
          questions: quizData.questions,
          totalQuestions: quizData.totalQuestions,
          difficulty: difficultyData.difficulty,
          difficultyReasoning: difficultyData.reasoning,
          userId: parseInt(userId)
        }
      });
    } catch (err) {
      setError(`Error starting quiz: ${err.message}`);
      console.error('Error selecting topic:', err);
      setGeneratingQuiz(false);
    }
  };

  // Get progress color based on status
  const getStatusColor = (status) => {
    switch (status) {
      case 'mastered': return '#4CAF50'; // Green
      case 'developing': return '#2196F3'; // Blue
      case 'needs_practice': return '#FF9800'; // Orange
      default: return '#9E9E9E'; // Gray
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'mastered': return '✅ Mastered';
      case 'developing': return '📚 Developing';
      case 'needs_practice': return '💪 Needs Practice';
      default: return '📝 New Topic';
    }
  };

  if (loading) {
    return (
      <div className="topic-selector-container">
        <div className="loading">Loading topics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="topic-selector-container">
        <div className="error-message">Error: {error}</div>
        <button onClick={fetchTopics} className="btn-retry">Retry</button>
      </div>
    );
  }

  return (
    <motion.div 
      className="topic-selector-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="topic-selector-header">
        <h1>📚 Select a Topic</h1>
        <p>Choose a topic to practice. Difficulty will be chosen based on your performance.</p>
      </div>

      <div className="topics-grid">
        {topics.map((topic, idx) => (
          <motion.div
            key={topic.chapterId}
            className={`topic-card ${selectedTopic === topic.name ? 'active' : ''}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => {
              if (!generatingQuiz) {
                handleSelectTopic(topic);
              }
            }}
          >
            <div className="topic-card-content">
              <h3 className="topic-name">{topic.name}</h3>
              
              {topic.userProgress ? (
                <div className="progress-info">
                  <div className="attempt-status">
                    {topic.userProgress.attempts === 1 && (
                      <span className="status-badge attempted">✅ Attempted Once</span>
                    )}
                    {topic.userProgress.attempts > 1 && (
                      <span className="status-badge attempted-multiple">✅ Attempted {topic.userProgress.attempts}x</span>
                    )}
                  </div>

                  <div 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(topic.userProgress.status) }}
                  >
                    {getStatusLabel(topic.userProgress.status)}
                  </div>
                  
                  <div className="progress-stats">
                    <p>📊 Avg Score: <strong>{topic.userProgress.averageScore}%</strong></p>
                    <p>🎯 Last Score: <strong>{topic.userProgress.lastScore}%</strong></p>
                    <p>🔄 Attempts: <strong>{topic.userProgress.attempts}</strong></p>
                  </div>
                </div>
              ) : (
                <div className="progress-info">
                  <div className="status-badge" style={{ backgroundColor: '#9E9E9E' }}>
                    📝 New Topic
                  </div>
                  <p className="new-topic-text">Start your first attempt!</p>
                </div>
              )}

              <div className="topic-card-footer">
                <span className="question-count">
                  {topic.totalQuestions} questions
                </span>
                {selectedTopic === topic.name && generatingQuiz && (
                  <div className="loading-spinner">Preparing quiz...</div>
                )}
                {selectedTopic !== topic.name && (
                  <button className="btn-select">
                    Practice →
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="difficulty-info">
        <h4>🎯 How Difficulty is Selected:</h4>
        <ul>
          <li><strong>First attempt:</strong> Easy questions to build confidence</li>
          <li><strong>Score &lt; 60%:</strong> Easy questions for mastery</li>
          <li><strong>Score 60-75%:</strong> Normal questions to improve</li>
          <li><strong>Score ≥ 75%:</strong> Hard questions to challenge yourself</li>
        </ul>
      </div>
    </motion.div>
  );
};

export default TopicSelector;

/**
 * AI Coach Panel Component
 * Displays personalized AI coaching recommendations after quiz completion
 * Shows: Summary, recommended difficulty, study plan, weak/strong areas
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AICoachPanel.css';

const AICoachPanel = ({ quizId = null, topic = null }) => {
  const { userId } = useAuth();
  const [feedback, setFeedback] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const fetchAIFeedback = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query string with optional quizId
        let url = `/api/adaptive/ai-feedback/${userId}`;
        if (quizId) {
          url += `/${quizId}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch AI feedback: ${response.statusText}`);
        }

        const data = await response.json();
        setFeedback(data.feedback);
        setInsights(data.insights);
      } catch (err) {
        console.error('[AICoachPanel] Error fetching feedback:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAIFeedback();
  }, [userId, quizId]);

  if (loading) {
    return (
      <motion.div
        className="ai-coach-container loading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>🤖 AI Coach is analyzing your performance...</p>
        </div>
      </motion.div>
    );
  }

  if (error || !feedback) {
    return (
      <motion.div
        className="ai-coach-container no-feedback"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="no-feedback-message">
          <p>📚 Complete a quiz to receive personalized AI coaching</p>
          {error && <p className="error-text">({error})</p>}
        </div>
      </motion.div>
    );
  }

  const difficultyEmoji = {
    easy: '📉',
    normal: '➡️',
    hard: '📈'
  };

  return (
    <motion.div
      className="ai-coach-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* AI Coach Header */}
      <div className="ai-coach-header">
        <h2>🤖 AI Study Coach</h2>
        <p className="topic-label">
          {feedback.topic ? `Topic: ${feedback.topic}` : 'General Assessment'}
        </p>
      </div>

      {/* AI Summary Section */}
      <motion.div
        className="coach-section summary-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h3>📋 Your Performance Summary</h3>
        <p className="summary-text">{feedback.summary}</p>
      </motion.div>

      {/* Recommended Difficulty */}
      {feedback.recommendedLevel && (
        <motion.div
          className="coach-section difficulty-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h3>🎯 Recommended Next Step</h3>
          <div className="difficulty-recommendation">
            <span className="difficulty-emoji">
              {difficultyEmoji[feedback.recommendedLevel] || '➡️'}
            </span>
            <div className="difficulty-text">
              <p className="difficulty-label">
                Difficulty: <strong>{feedback.recommendedLevel.toUpperCase()}</strong>
              </p>
              {feedback.recommendedLevel === 'hard' && (
                <p className="difficulty-hint">You're ready for more challenging problems!</p>
              )}
              {feedback.recommendedLevel === 'normal' && (
                <p className="difficulty-hint">Keep practicing at this level to build expertise.</p>
              )}
              {feedback.recommendedLevel === 'easy' && (
                <p className="difficulty-hint">Master the basics before advancing further.</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Weak and Strong Areas */}
      {(feedback.suggestedTopics?.length > 0 || insights?.weakAreas?.length > 0 || insights?.strongAreas?.length > 0) && (
        <motion.div
          className="coach-section areas-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3>💡 What to Focus On</h3>
          
          {insights?.strongAreas && insights.strongAreas.length > 0 && (
            <div className="strong-areas">
              <p className="area-title">✅ Strong Areas:</p>
              <div className="tags">
                {insights.strongAreas.map((area, idx) => (
                  <span key={idx} className="tag strong-tag">{area}</span>
                ))}
              </div>
            </div>
          )}

          {insights?.weakAreas && insights.weakAreas.length > 0 && (
            <div className="weak-areas">
              <p className="area-title">🔧 Areas for Improvement:</p>
              <div className="tags">
                {insights.weakAreas.map((area, idx) => (
                  <span key={idx} className="tag weak-tag">{area}</span>
                ))}
              </div>
            </div>
          )}

          {feedback.suggestedTopics && feedback.suggestedTopics.length > 0 && (
            <div className="suggested-topics">
              <p className="area-title">📌 Topics to Practice Next:</p>
              <div className="tags">
                {feedback.suggestedTopics.map((topic, idx) => (
                  <span key={idx} className="tag suggested-tag">{topic}</span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Study Plan */}
      {feedback.studyPlan && feedback.studyPlan.length > 0 && (
        <motion.div
          className="coach-section study-plan-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h3>📅 Your Daily Study Plan</h3>
          <div className="study-plan">
            {feedback.studyPlan.map((plan, idx) => (
              <div key={idx} className="study-day">
                <div className="day-number">Day {plan.day}</div>
                <div className="day-task">{plan.task}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Explainability - Why This Recommendation */}
      {feedback.explainability && feedback.explainability.reasons && feedback.explainability.reasons.length > 0 && (
        <motion.div
          className="coach-section explainability-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h3>🔍 Why This Recommendation?</h3>
          <ul className="reasons-list">
            {feedback.explainability.reasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Learning Insights */}
      {insights && (
        <motion.div
          className="coach-section insights-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <h3>📊 Learning Insights</h3>
          <div className="insights-grid">
            {insights.confidenceScore !== undefined && (
              <div className="insight-card">
                <p className="label">Confidence Score</p>
                <p className="value">{(insights.confidenceScore * 100).toFixed(0)}%</p>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${insights.confidenceScore * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {insights.aiSummary && (
              <div className="insight-card full-width">
                <p className="label">Session Summary</p>
                <p className="summary">{insights.aiSummary}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Footer */}
      <div className="ai-coach-footer">
        <p>💪 Keep practicing! Your consistent effort will lead to mastery.</p>
      </div>
    </motion.div>
  );
};

export default AICoachPanel;

/**
 * Learning Profile Dashboard Component
 * Displays cognitive level performance and personalized insights
 * 
 * Shows:
 * - Cognitive level scores (4 levels: Knowledge, Comprehension, Application, Analysis)
 * - Proficiency status (Mastered, Developing, Needs Work, Not Ready)
 * - Weak and strong areas
 * - Personalized recommendations
 * - Learning path visualization
 * - Progress trends
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, AlertCircle, Trophy, Target, Book } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/LearningProfile.css';

export default function LearningProfile({ userId }) {
  const { user: authUser } = useAuth();
  const finalUserId = userId || authUser?.id;
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (finalUserId) {
      fetchLearningProfile();
    }
  }, [finalUserId]);

  const fetchLearningProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/adaptive/profile/${finalUserId}`);
      
      if (!response.ok) throw new Error('Failed to fetch profile');
      
      const data = await response.json();
      setProfile(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="learning-profile loading">
        <div className="spinner"></div>
        <p>Loading your learning profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="learning-profile error">
        <AlertCircle size={48} />
        <p>{error || 'Failed to load profile'}</p>
      </div>
    );
  }

  return (
    <div className="learning-profile">
      <header className="profile-header">
        <h1>Your Learning Profile</h1>
        <p>Your personalized adaptive learning journey</p>
      </header>

      {/* ==========================================
          COGNITIVE LEVELS OVERVIEW
          ========================================== */}
      <section className="cognitive-levels-section">
        <h2>Cognitive Level Performance</h2>
        <div className="cognitive-grid">
          {renderCognitiveLevel(
            'Level 1',
            'Knowledge (Recognition)',
            profile.scores.level1,
            profile.proficiency.level1,
            '📚'
          )}
          {renderCognitiveLevel(
            'Level 2',
            'Comprehension (Understanding)',
            profile.scores.level2,
            profile.proficiency.level2,
            '💡'
          )}
          {renderCognitiveLevel(
            'Level 3',
            'Application (Low-level)',
            profile.scores.level3,
            profile.proficiency.level3,
            '🔧'
          )}
          {renderCognitiveLevel(
            'Level 4',
            'Analysis (High-level)',
            profile.scores.level4,
            profile.proficiency.level4,
            '🧠'
          )}
        </div>
      </section>

      {/* ==========================================
          WEAK AREAS - PRIORITY FOCUS
          ========================================== */}
      {profile.weakAreas && profile.weakAreas.length > 0 && (
        <section className="weak-areas-section">
          <h2>
            <AlertCircle size={20} />
            Areas to Improve
          </h2>
          <div className="weak-areas-list">
            {profile.weakAreas.map((area, index) => (
              <motion.div
                key={index}
                className="weak-area-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="weak-area-header">
                  <h3>{area.levelName}</h3>
                  <span className="priority-badge">Priority {area.priority}</span>
                </div>
                
                <div className="weak-area-score">
                  <p className="current-score">{area.score}%</p>
                  <div className="score-bar">
                    <div 
                      className="score-fill"
                      style={{ width: `${area.score}%` }}
                    ></div>
                  </div>
                </div>

                <p className="recommendation">{area.recommendation}</p>

                {area.topWeakTopic && (
                  <p className="weak-topic">
                    <strong>Weak Topic:</strong> {area.topWeakTopic}
                  </p>
                )}

                <button className="action-button">
                  Take Focused Quiz
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ==========================================
          STRONG AREAS - MAINTAIN & CHALLENGE
          ========================================== */}
      {profile.strongAreas && profile.strongAreas.length > 0 && (
        <section className="strong-areas-section">
          <h2>
            <Trophy size={20} />
            Your Strengths
          </h2>
          <div className="strong-areas-list">
            {profile.strongAreas.map((area, index) => (
              <motion.div
                key={index}
                className="strong-area-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="mastery-badge">✓ MASTERED</div>
                <h3>{area.levelName}</h3>
                <p className="strong-score">{area.score}%</p>
                <p className="strong-message">
                  Excellent work! You've mastered this level.
                </p>
                <button className="challenge-button">
                  Try Harder Challenges
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ==========================================
          PERSONALIZED RECOMMENDATIONS
          ========================================== */}
      {profile.recommendations && profile.recommendations.length > 0 && (
        <section className="recommendations-section">
          <h2>
            <Target size={20} />
            Your Learning Roadmap
          </h2>
          <div className="recommendations-list">
            {profile.recommendations.map((rec, index) => (
              <motion.div
                key={index}
                className={`recommendation-card priority-${rec.priority}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="rec-priority">
                  <span className="priority-number">{rec.priority}</span>
                </div>
                
                <div className="rec-content">
                  <h3>{rec.title}</h3>
                  <p className="rec-description">{rec.description}</p>
                  <p className="rec-action">
                    <strong>Next Step:</strong> {rec.action}
                  </p>
                  <p className="rec-benefit">
                    <strong>Expected Benefit:</strong> {rec.expectedBenefit}
                  </p>
                </div>

                <button className="rec-button">
                  Learn More →
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ==========================================
          4-WEEK LEARNING PATH
          ========================================== */}
      {profile.learningPath && (
        <section className="learning-path-section">
          <h2>
            <Book size={20} />
            4-Week Learning Path
          </h2>
          <p className="path-description">
            Your personalized roadmap to mastery
          </p>
          
          <div className="learning-path">
            {profile.learningPath.weeks.map((week, index) => (
              <motion.div
                key={index}
                className="week-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
              >
                <div className="week-number">Week {week.week}</div>
                
                <h4>{week.focus}</h4>
                
                <div className="week-details">
                  <p><strong>Goal:</strong> {week.goal}</p>
                  <p><strong>Quizzes:</strong> {week.quizzes}</p>
                  <p><strong>Topics:</strong> {week.topics.join(', ')}</p>
                </div>

                {index === 0 && (
                  <div className="week-current">
                    <span>🎯 START HERE</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ==========================================
          STATISTICS
          ========================================== */}
      <section className="statistics-section">
        <h2>Your Journey</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{profile.quizzesTaken}</div>
            <div className="stat-label">Quizzes Taken</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {Math.round(
                (profile.scores.level1 + 
                 profile.scores.level2 + 
                 profile.scores.level3 + 
                 profile.scores.level4) / 4
              )}%
            </div>
            <div className="stat-label">Average Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {Object.values(profile.proficiency).filter(p => p === 'MASTERED').length}
            </div>
            <div className="stat-label">Levels Mastered</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              <TrendingUp size={20} />
            </div>
            <div className="stat-label">On Track</div>
          </div>
        </div>
      </section>

      {/* ==========================================
          ACTION BUTTONS
          ========================================== */}
      <section className="action-section">
        <button className="btn-primary">
          Start Personalized Quiz
        </button>
        <button className="btn-secondary">
          View Detailed Progress
        </button>
      </section>
    </div>
  );
}

/**
 * Helper component to render cognitive level card
 */
function renderCognitiveLevel(level, name, score, status, icon) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'MASTERED':
        return '#10b981';
      case 'DEVELOPING':
        return '#f59e0b';
      case 'NEEDS_WORK':
        return '#ef4444';
      case 'NOT_READY':
        return '#9ca3af';
      default:
        return '#3b82f6';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'MASTERED':
        return '✓ Mastered';
      case 'DEVELOPING':
        return '⚠ Developing';
      case 'NEEDS_WORK':
        return '❌ Needs Work';
      case 'NOT_READY':
        return '⏸ Not Ready';
      default:
        return 'Unknown';
    }
  };

  return (
    <motion.div
      key={level}
      className="cognitive-level-card"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        borderTopColor: getStatusColor(status)
      }}
    >
      <div className="level-icon">{icon}</div>
      
      <h3>{level}</h3>
      <p className="level-name">{name}</p>
      
      <div className="level-score">
        <span className="score-number">{score}%</span>
      </div>

      <div className="score-bar">
        <div
          className="score-fill"
          style={{ 
            width: `${score}%`,
            backgroundColor: getStatusColor(status)
          }}
        ></div>
      </div>

      <p className="status-label" style={{ color: getStatusColor(status) }}>
        {getStatusLabel(status)}
      </p>
    </motion.div>
  );
}

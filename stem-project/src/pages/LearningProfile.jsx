/**
 * Learning Profile Dashboard Component
 * Displays cognitive level performance and personalized insights (VIETNAMESE)
 * 
 * Shows:
 * - Cognitive level scores (4 levels: Knowledge, Comprehension, Application, Analysis)
 * - Proficiency status (Mastered, Developing, Needs Work, Not Ready)
 * - Weak and strong areas with topic names
 * - Personalized recommendations
 * - AI-generated learning path visualization
 * - Progress trends
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, AlertCircle, Trophy, Target, Book } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/LearningProfile.css';

// Vietnamese translations for all labels and messages
const translations = {
  vi: {
    // Headers and main titles
    yourLearningProfile: 'Hồ Sơ Học Tập Của Bạn',
    personalized: 'Hành trình học tập thích ứng của bạn',
    
    // Cognitive Levels
    cognitiveTitle: 'Mức Độ Nhận Thức',
    level1: 'Cấp 1: Nhận Biết',
    level2: 'Cấp 2: Hiểu Biết',
    level3: 'Cấp 3: Ứng Dụng (Mức Thấp)',
    level4: 'Cấp 4: Phân Tích (Mức Cao)',
    
    // Status labels
    mastered: '✓ Đã Thành Thạo',
    developing: '⚠️ Đang Phát Triển',
    needsWork: '❌ Cần Cải Thiện',
    notReady: '⏸ Chưa Sẵn Sàng',
    
    // Weak Areas section
    areasToImprove: 'Các Chủ Đề Cần Cải Thiện',
    priority: 'Ưu Tiên',
    currentScore: 'Điểm Hiện Tại',
    weakTopics: 'Chủ Đề Yếu',
    takeFocusedQuiz: 'Bắt Đầu Bài Kiểm Tra',
    
    // Strong Areas section
    yourStrengths: 'Các Điểm Mạnh',
    excellent: 'Tuyệt vời! Bạn đã thành thạo mức này.',
    tryHarderChallenges: 'Thử Thách Khó Hơn',
    
    // Recommendations section
    yourLearningRoadmap: 'Lộ Trình Học Tập Của Bạn',
    nextStep: 'Bước Tiếp Theo',
    expectedBenefit: 'Lợi Ích Dự Kiến',
    learnMore: 'Tìm Hiểu Thêm',
    
    // 4-Week Learning Path
    fourWeekPath: 'Lộ Trình 4 Tuần',
    roadmapToMastery: 'Lộ trình cá nhân hóa để thành thạo',
    week: 'Tuần',
    goal: 'Mục Tiêu',
    quizzes: 'Bài Kiểm Tra',
    topics: 'Chủ Đề',
    startHere: '🎯 BẮT ĐẦU ĐÂY',
    
    // Stats
    quizzesTaken: 'Bài Kiểm Tra Đã Tham Gia',
    averageScore: 'Điểm Trung Bình',
    levelsMastered: 'Cấp Độ Đã Thành Thạo',
    onTrack: 'Đang Tiến Hành',
    yourJourney: 'Hành Trình Học Tập',
    startQuiz: 'Bắt Đầu Bài Kiểm Tra',
    viewProgress: 'Xem Chi Tiết Tiến Độ',
    
    // Loading and errors
    loading: 'Đang tải hồ sơ học tập...',
    errorLoadingProfile: 'Không thể tải hồ sơ',
    noQuizzesTaken: 'Hãy hoàn thành bài kiểm tra đầu tiên để xem đề xuất cá nhân hóa',
    
    // Duration labels
    duration: 'Thời Gian',
    action: 'Hành Động',
    day: 'ngày',
    week: 'tuần'
  }
};

export default function LearningProfile({ userId }) {
  const { user: authUser } = useAuth();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const finalUserId = userId || authUser?.id;
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (finalUserId) {
      fetchLearningProfile();
    }
  }, [finalUserId]);

  // Auto-refresh when quiz is completed
  useEffect(() => {
    const checkForRefresh = () => {
      const refreshNeeded = sessionStorage.getItem('profileRefreshNeeded');
      if (refreshNeeded === 'true') {
        console.log('[LearningProfile] Refreshing profile after quiz completion');
        sessionStorage.removeItem('profileRefreshNeeded');
        fetchLearningProfile();
      }
    };

    // Check on mount and when window regains focus
    checkForRefresh();
    window.addEventListener('focus', checkForRefresh);
    
    return () => window.removeEventListener('focus', checkForRefresh);
  }, [finalUserId]);

  const fetchLearningProfile = async () => {
    try {
      setLoading(true);
      // Fetch unified dashboard data that includes profile, quizzes, and recommendations
      const response = await fetch(`/api/adaptive/dashboard/${finalUserId}`);
      
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      
      const data = await response.json();
      // Dashboard returns { profile, quizzes, quizCount, status, message }
      // Set the profile object (contains scores, proficiency, weakAreas, etc.)
      setProfile(data.profile || data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="learning-profile loading">
        <div className="spinner"></div>
        <p>{t.loading}</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="learning-profile error">
        <AlertCircle size={48} />
        <p>{error || t.errorLoadingProfile}</p>
      </div>
    );
  }

  return (
    <div className="learning-profile">
      <header className="profile-header">
        <h1>{t.yourLearningProfile}</h1>
        <p>{t.personalized}</p>
      </header>

      {/* ==========================================
          COGNITIVE LEVELS OVERVIEW
          ========================================== */}
      <section className="cognitive-levels-section">
        <h2>{t.cognitiveTitle}</h2>
        <div className="cognitive-grid">
          {renderCognitiveLevel(
            t.level1,
            profile.scores.level1,
            profile.proficiency.level1,
            '📚',
            t
          )}
          {renderCognitiveLevel(
            t.level2,
            profile.scores.level2,
            profile.proficiency.level2,
            '💡',
            t
          )}
          {renderCognitiveLevel(
            t.level3,
            profile.scores.level3,
            profile.proficiency.level3,
            '🔧',
            t
          )}
          {renderCognitiveLevel(
            t.level4,
            profile.scores.level4,
            profile.proficiency.level4,
            '🧠',
            t
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
            {t.areasToImprove}
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
                  <h3>{area.topic || area.levelName || `Chủ Đề ${index + 1}`}</h3>
                  <span className="priority-badge">{t.priority} {area.priority || index + 1}</span>
                </div>
                
                <div className="weak-area-score">
                  <p className="current-score">{area.score || area.percentage || 0}%</p>
                  <div className="score-bar">
                    <div 
                      className="score-fill"
                      style={{ width: `${area.score || area.percentage || 0}%` }}
                    ></div>
                  </div>
                </div>

                <p className="recommendation">{area.recommendation || `Hãy tập trung vào chủ đề này`}</p>

                <button className="action-button">
                  {t.takeFocusedQuiz}
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
            {t.yourStrengths}
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
                <div className="mastery-badge">✓ ĐÃ THÀNH THẠO</div>
                <h3>{area.levelName}</h3>
                <p className="strong-score">{area.score}%</p>
                <p className="strong-message">
                  {t.excellent}
                </p>
                <button className="challenge-button">
                  {t.tryHarderChallenges}
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
            {t.yourLearningRoadmap}
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
                    <strong>{t.nextStep}:</strong> {rec.action}
                  </p>
                  <p className="rec-benefit">
                    <strong>{t.expectedBenefit}:</strong> {rec.expectedBenefit}
                  </p>
                </div>

                <button className="rec-button">
                  {t.learnMore} →
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ==========================================
          4-WEEK LEARNING PATH (AI-GENERATED)
          ========================================== */}
      {profile.learningPath && (
        <section className="learning-path-section">
          <h2>
            <Book size={20} />
            {t.fourWeekPath}
          </h2>
          <p className="path-description">
            {t.roadmapToMastery}
          </p>
          
          <div className="learning-path">
            {Array.isArray(profile.learningPath) ? (
              profile.learningPath.map((week, index) => (
                <motion.div
                  key={index}
                  className="week-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15 }}
                >
                  <div className="week-number">Tuần {week.week || index + 1}</div>
                  
                  <h4>{week.focus || `Tuần ${index + 1}`}</h4>
                  
                  <div className="week-details">
                    <p><strong>{t.goal}:</strong> {week.goal || 'Hoàn thành các bài tập'}</p>
                    <p><strong>{t.duration}:</strong> {week.duration || '30 phút/ngày'}</p>
                    <p><strong>{t.action}:</strong> {week.action || 'Luyện tập và ôn tập'}</p>
                  </div>

                  {index === 0 && (
                    <div className="week-current">
                      <span>{t.startHere}</span>
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <div className="empty-state">{t.noQuizzesTaken}</div>
            )}
          </div>
        </section>
      )}

      {/* ==========================================
          STATISTICS
          ========================================== */}
      <section className="statistics-section">
        <h2>{t.yourJourney || 'Hành Trình Học Tập'}</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{profile.quizzesTaken}</div>
            <div className="stat-label">{t.quizzesTaken}</div>
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
            <div className="stat-label">{t.averageScore}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {Object.values(profile.proficiency).filter(p => p === 'MASTERED').length}
            </div>
            <div className="stat-label">{t.levelsMastered}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              <TrendingUp size={20} />
            </div>
            <div className="stat-label">{t.onTrack}</div>
          </div>
        </div>
      </section>

      {/* ==========================================
          ACTION BUTTONS
          ========================================== */}
      <section className="action-section">
        <button className="btn-primary">
          {t.startQuiz || 'Bắt Đầu Bài Kiểm Tra'}
        </button>
        <button className="btn-secondary">
          {t.viewProgress || 'Xem Chi Tiết Tiến Độ'}
        </button>
      </section>
    </div>
  );
}

/**
 * Helper component to render cognitive level card (Vietnamese)
 */
function renderCognitiveLevel(name, score, status, icon, t) {
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

  const getStatusLabel = (status, t) => {
    switch (status) {
      case 'MASTERED':
        return t.mastered || '✓ Đã Thành Thạo';
      case 'DEVELOPING':
        return t.developing || '⚠️ Đang Phát Triển';
      case 'NEEDS_WORK':
        return t.needsWork || '❌ Cần Cải Thiện';
      case 'NOT_READY':
        return t.notReady || '⏸ Chưa Sẵn Sàng';
      default:
        return 'Không xác định';
    }
  };

  return (
    <motion.div
      className="cognitive-level-card"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        borderTopColor: getStatusColor(status)
      }}
    >
      <div className="level-icon">{icon}</div>
      
      <h3>{name}</h3>
      
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
        {getStatusLabel(status, t)}
      </p>
    </motion.div>
  );
}

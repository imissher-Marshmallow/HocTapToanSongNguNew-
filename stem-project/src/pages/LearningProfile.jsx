/**
 * AI-Guided Learning Profile
 * 
 * Refactored to focus on:
 * - Personal AI insights (not raw metrics)
 * - One clear "next best action"
 * - Human-like guidance and encouragement
 * - Mastery-focused progression
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Target, TrendingUp, Lock, CheckCircle } from 'lucide-react';
import { useAuth, getApiBase } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Spinner from '../components/Spinner';
import '../styles/LearningProfile.css';

const translations = {
  vi: {
    // Main headers
    learningInsight: 'Lộ Trình AI Của Bạn',
    personalizedGuidance: 'Hướng dẫn học tập cá nhân hóa',
    
    // AI Insight section
    aiInsightSummary: 'Insight Từ AI',
    whatYouCanDo: 'Những gì bạn làm tốt',
    learningBottleneck: 'Điểm yếu hiện tại',
    
    // Primary priority section
    primaryFocus: 'Bước Tiếp Theo',
    completionTime: '3-5 ngày thường',
    masteryNotSpeed: '⏱️ Chúng tôi tập trung vào sự thành thạo, không tốc độ.',
    startPrimaryAction: 'Bắt Đầu Luyện Tập Ứng Dụng',
    
    // Roadmap section
    fourWeekRoadmap: 'Lộ Trình 4 Tuần',
    suggestedPath: 'Đây là lộ trình được đề xuất để đạt được sự thành thạo',
    
    // Locked sections
    unlockedAfter: 'Mở khóa sau khi hoàn thành',
    comeBackSoon: 'Quay lại sớm!',
    
    // Week labels
    week: 'Tuần',
    week1Goal: 'Tăng cường hiểu biết + luyện tập ứng dụng cơ bản',
    week2Goal: 'Sự thành thạo ứng dụng mức thấp',
    week3Goal: 'Luyện tập ứng dụng mức cao với AI',
    week4Goal: 'Luyện tập hỗn hợp + xem xét lỗi cá nhân',
    
    // CTA buttons
    beginPractice: 'Bắt đầu Luyện tập',
    exploreResources: 'Khám phá Tài Nguyên',
    takeDiagnostic: 'Bài Đánh Giá Chẩn Đoán',
    
    // Loading and errors
    loading: 'Đang tải lộ trình học tập...',
    noData: 'Không có dữ liệu. Hãy hoàn thành một bài kiểm tra trước.',
    error: 'Không thể tải hồ sơ.',
    
    // Encouragement
    keepGoing: 'Tiếp tục đó!',
    youreDoingGreat: 'Bạn đang làm rất tốt!',
    nextLevel: 'Sẵn sàng cho cấp độ tiếp theo?'
  },
  en: {
    learningInsight: 'Your AI Learning Path',
    personalizedGuidance: 'Personalized learning guidance',
    
    aiInsightSummary: 'AI Insight',
    whatYouCanDo: 'What you do well',
    learningBottleneck: 'Current learning gap',
    
    primaryFocus: 'Your Next Step',
    completionTime: '3-5 days typical',
    masteryNotSpeed: '⏱️ We focus on mastery, not speed.',
    startPrimaryAction: 'Start Low Application Practice',
    
    fourWeekRoadmap: '4-Week Roadmap',
    suggestedPath: 'Suggested path to mastery',
    
    unlockedAfter: 'Unlocked after completing',
    comeBackSoon: 'Come back soon!',
    
    week: 'Week',
    week1Goal: 'Strengthen comprehension + low application basics',
    week2Goal: 'Low application mastery',
    week3Goal: 'High application practice with AI',
    week4Goal: 'Mixed practice + personalized error review',
    
    beginPractice: 'Begin Practice',
    exploreResources: 'Explore Resources',
    takeDiagnostic: 'Take Diagnostic Quiz',
    
    loading: 'Loading your learning path...',
    noData: 'No data yet. Complete a quiz first.',
    error: 'Could not load profile.',
    
    keepGoing: 'Keep going!',
    youreDoingGreat: 'You\'re doing great!',
    nextLevel: 'Ready for the next level?'
  }
};

export default function LearningProfile({ userId }) {
  const { user: authUser, token } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = translations[language] || translations.vi;
  const finalUserId = userId || authUser?.id;
  
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roadmapStatus, setRoadmapStatus] = useState(null); // 'pending', 'generated', or null
  const [quizzesTaken, setQuizzesTaken] = useState(0);
  const [lastScore, setLastScore] = useState(0);

  useEffect(() => {
    if (finalUserId) {
      fetchAIInsight();
    }
  }, [finalUserId]);

  // Auto-refresh when adaptive quiz is completed
  useEffect(() => {
    const checkForRefresh = () => {
      const refreshNeeded = sessionStorage.getItem('profileRefreshNeeded');
      if (refreshNeeded === 'true') {
        console.log('[LearningProfile] Refreshing after adaptive quiz');
        sessionStorage.removeItem('profileRefreshNeeded');
        fetchAIInsight();
      }
    };

    checkForRefresh();
    window.addEventListener('focus', checkForRefresh);
    return () => window.removeEventListener('focus', checkForRefresh);
  }, [finalUserId]);

  const fetchAIInsight = async () => {
    try {
      setLoading(true);
      
      // First try to fetch from adaptive dashboard
      let profile = {};
      try {
        const response = await fetch(`/api/adaptive/dashboard/${finalUserId}`);
        if (response.ok) {
          const data = await response.json();
          profile = data.profile || data;
        }
      } catch (dashErr) {
        console.log('[LearningProfile] Dashboard fetch failed, will use Supabase fallback:', dashErr);
      }
      
      // IMPORTANT: Also fetch latest Bloom levels directly from Supabase via new endpoint
      // This ensures we get the most recent cognitive_levels updated by quiz submissions
      try {
        const bloomResponse = await fetch(`/api/adaptive/profile/${finalUserId}`);
        if (bloomResponse.ok) {
          const bloomData = await bloomResponse.json();
          console.log('[LearningProfile] Fetched Bloom levels from Supabase:', bloomData);
          
          // Merge Bloom data into profile
          if (bloomData.scores) {
            profile.bloom_levels = bloomData.scores;
            profile.proficiency_status = bloomData.proficiency;
          }
        }
      } catch (bloomErr) {
        console.log('[LearningProfile] Bloom level fetch failed:', bloomErr);
      }
      
      // Extract roadmap status and quiz data
      setRoadmapStatus(profile.roadmapStatus || profile.roadmap_status);
      setQuizzesTaken(profile.quizzesTaken || profile.quizzes_taken || 0);
      setLastScore(profile.lastScore || profile.last_score || 0);
      
      console.log('[LearningProfile] Final profile with Bloom levels:', profile);
      
      // Generate AI insight from dashboard profile - now with real OpenAI call
      const aiInsight = await generateAIInsight(profile, finalUserId);
      console.log('[LearningProfile] Generated AI Insight with bloom_levels:', aiInsight.bloom_levels);
      setInsight(aiInsight);
    } catch (err) {
      setError(err.message);
      console.error('[LearningProfile] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAdaptiveQuiz = async () => {
    try {
      const apiBase = getApiBase();
      
      const response = await fetch(`${apiBase}/api/adaptive/quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          userId: finalUserId,
          quizType: 'personalized'
        })
      });

      if (response.ok) {
        const quizData = await response.json();
        navigate('/adaptive-quiz', {
          state: {
            quiz: quizData.quiz,
            recommendation: quizData.recommendation,
            quizType: 'personalized'
          }
        });
      } else {
        console.error('Failed to generate quiz:', response.status);
      }
    } catch (error) {
      console.error('Error generating adaptive quiz:', error);
    }
  };

  // Calculate score for each Bloom's level from Supabase cognitive_levels
  const calculateLevelScore = (bloomLevels, level) => {
    // bloomLevels is like: {level1: 3, level2: 3, level3: 3, level4: 3}
    if (!bloomLevels) return 0;
    
    const key = `level${level}`;
    const score = bloomLevels[key];
    
    if (score === undefined || score === null) return 0;
    return Math.min(Math.max(score, 0), 100); // Ensure 0-100 range
  };

  // Get proficiency badge text based on score
  const getProficiencyBadge = (score) => {
    if (score === 0) return 'NOT_STARTED';
    if (score < 40) return 'STRUGGLING';
    if (score < 60) return 'DEVELOPING';
    if (score < 80) return 'PROFICIENT';
    return 'MASTERED';
  };

  if (loading) {
    return (
      <div className="learning-profile-ai">
        <Spinner />
        <p>{t.loading}</p>
      </div>
    );
  }

  if (error || !insight) {
    return (
      <div className="learning-profile-ai error">
        <p>{t.error}</p>
      </div>
    );
  }

  // Extract Bloom levels and topic performance from insight
  const bloomLevels = insight?.bloom_levels || insight?.cognitive_levels || { level1: 0, level2: 0, level3: 0, level4: 0 };
  const topicPerformance = insight?.topicPerformance || {};

  return (
    <div className="learning-profile-ai">
      {/* Header */}
      <header className="ai-header">
        <h1>
          <Sparkles size={32} />
          {t.learningInsight}
        </h1>
        <p>{t.personalizedGuidance}</p>
      </header>

      {/* ========== AI INSIGHT SUMMARY ========== */}
      <section className="ai-insight-section">
        <h2>
          <Sparkles size={24} />
          {t.aiInsightSummary}
        </h2>
        
        <motion.div
          className="insight-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="insight-content">
            <h3>{t.whatYouCanDo}</h3>
            <p className="insight-text">{insight.strengths}</p>
            
            <hr />
            
            <h3>{t.learningBottleneck}</h3>
            <p className="insight-text">{insight.bottleneck}</p>
          </div>
        </motion.div>
      </section>

      {/* ========== TOPIC PERFORMANCE PANEL ========== */}
      {insight?.topicPerformance && Object.keys(insight.topicPerformance).length > 0 && (
        <section className="topic-performance-section">
          <h2>
            <TrendingUp size={24} />
            📊 {language === 'vi' ? 'Hiệu Suất Theo Chủ Đề' : 'Topic Performance'}
          </h2>
          
          <div className="topics-grid">
            {Object.entries(insight.topicPerformance).slice(0, 5).map(([topicName, data], idx) => {
              const skillLevels = {
                1: { name: language === 'vi' ? 'Nhớ' : 'Remember', color: '#ef4444' },
                2: { name: language === 'vi' ? 'Hiểu' : 'Understand', color: '#f97316' },
                3: { name: language === 'vi' ? 'Áp Dụng' : 'Apply', color: '#eab308' },
                4: { name: language === 'vi' ? 'Phân Tích' : 'Analyze', color: '#22c55e' }
              };
              
              const level = data.skill_level || 1;
              const accuracy = data.accuracy || 0;
              const skillInfo = skillLevels[level];
              
              return (
                <motion.div
                  key={topicName}
                  className="topic-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  style={{
                    borderLeftColor: skillInfo.color,
                    borderLeftWidth: '4px'
                  }}
                >
                  <div className="topic-header">
                    <h4>{topicName}</h4>
                    <span 
                      className="skill-badge"
                      style={{ backgroundColor: skillInfo.color }}
                    >
                      {skillInfo.name}
                    </span>
                  </div>
                  
                  <div className="topic-stats">
                    <div className="stat-item">
                      <span className="stat-label">{language === 'vi' ? 'Chính xác' : 'Accuracy'}</span>
                      <span className="stat-value">{accuracy}%</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${accuracy}%`, backgroundColor: skillInfo.color }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="stat-item">
                      <span className="stat-label">{language === 'vi' ? 'Câu Hỏi' : 'Questions'}</span>
                      <span className="stat-value">{data.questions_correct}/{data.questions_total}</span>
                    </div>
                  </div>
                  
                  {data.last_updated && (
                    <div className="topic-footer">
                      <small>
                        {language === 'vi' ? 'Cập nhật lần cuối: ' : 'Last updated: '}
                        {new Date(data.last_updated).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                      </small>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
          
          <p className="topic-note">
            {language === 'vi' 
              ? '💡 Chỉ cập nhật từ bài kiểm tra thích ứng. Bài tập luyện không ảnh hưởng đến điểm kỹ năng chủ đề.'
              : '💡 Only updated from adaptive quizzes. Practice quizzes do not affect topic skill scores.'}
          </p>
        </section>
      )}

      {/* ========== LEARNING LEVELS PROGRESSION (Near Topic Skills) ========== */}
      <section className="learning-levels-section">
        <h2>
          <TrendingUp size={24} />
          {language === 'vi' ? '📚 Cấp Độ Học Tập - 4 Mức Bloom' : '📚 Learning Levels - Bloom\'s Taxonomy'}
        </h2>
        <p className="section-subtitle">
          {language === 'vi'
            ? 'Tiến độ của bạn trên 4 cấp độ nhận thức từ cơ bản đến nâng cao'
            : 'Your progress across 4 cognitive levels from basic to advanced'}
        </p>
        
        <div className="levels-grid">
          {/* Level 1: Remember */}
          <motion.div
            className="level-card level-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="level-header">
              <span className="level-number">1</span>
              <div>
                <h4>{language === 'vi' ? 'Nhận Biết' : 'Remember'}</h4>
              </div>
            </div>
            <div className="level-description">
              {language === 'vi' 
                ? 'Nhớ và nhận ra các khái niệm cơ bản từ các chủ đề'
                : 'Recall and recognize fundamental concepts'}
            </div>
            <div className="level-score">
              <div className="score-bar">
                <div 
                  className="score-fill"
                  style={{ width: `${calculateLevelScore(bloomLevels, 1)}%` }}
                ></div>
              </div>
              <span className="score-text">{calculateLevelScore(bloomLevels, 1)}/100</span>
            </div>
            <span className="status-badge">
              {getProficiencyBadge(calculateLevelScore(bloomLevels, 1))}
            </span>
          </motion.div>

          {/* Level 2: Understand */}
          <motion.div
            className="level-card level-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="level-header">
              <span className="level-number">2</span>
              <div>
                <h4>{language === 'vi' ? 'Thông Hiểu' : 'Understand'}</h4>
              </div>
            </div>
            <div className="level-description">
              {language === 'vi'
                ? 'Giải thích ý tưởng và mối quan hệ giữa chúng'
                : 'Explain ideas and relationships'}
            </div>
            <div className="level-score">
              <div className="score-bar">
                <div 
                  className="score-fill"
                  style={{ width: `${calculateLevelScore(bloomLevels, 2)}%` }}
                ></div>
              </div>
              <span className="score-text">{calculateLevelScore(bloomLevels, 2)}/100</span>
            </div>
            <span className="status-badge">
              {getProficiencyBadge(calculateLevelScore(bloomLevels, 2))}
            </span>
          </motion.div>

          {/* Level 3: Apply */}
          <motion.div
            className="level-card level-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="level-header">
              <span className="level-number">3</span>
              <div>
                <h4>{language === 'vi' ? 'Vận Dụng' : 'Apply'}</h4>
              </div>
            </div>
            <div className="level-description">
              {language === 'vi'
                ? 'Áp dụng kiến thức vào các tình huống mới'
                : 'Use knowledge in new situations'}
            </div>
            <div className="level-score">
              <div className="score-bar">
                <div 
                  className="score-fill"
                  style={{ width: `${calculateLevelScore(bloomLevels, 3)}%` }}
                ></div>
              </div>
              <span className="score-text">{calculateLevelScore(bloomLevels, 3)}/100</span>
            </div>
            <span className="status-badge">
              {getProficiencyBadge(calculateLevelScore(bloomLevels, 3))}
            </span>
          </motion.div>

          {/* Level 4: Analyze */}
          <motion.div
            className="level-card level-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="level-header">
              <span className="level-number">4</span>
              <div>
                <h4>{language === 'vi' ? 'Phân Tích' : 'Analyze'}</h4>
              </div>
            </div>
            <div className="level-description">
              {language === 'vi'
                ? 'Tách rã và tổng hợp các khái niệm phức tạp'
                : 'Break down and synthesize complex concepts'}
            </div>
            <div className="level-score">
              <div className="score-bar">
                <div 
                  className="score-fill"
                  style={{ width: `${calculateLevelScore(bloomLevels, 4)}%` }}
                ></div>
              </div>
              <span className="score-text">{calculateLevelScore(bloomLevels, 4)}/100</span>
            </div>
            <span className="status-badge">
              {getProficiencyBadge(calculateLevelScore(bloomLevels, 4))}
            </span>
          </motion.div>
        </div>

        <div className="levels-action">
          <button 
            className="btn-practice-all"
            onClick={handleStartAdaptiveQuiz}
          >
            {language === 'vi' ? '🎯 Luyện Tất Cả Cấp Độ' : '🎯 Practice All Levels'}
          </button>
        </div>
      </section>

      {/* ========== PRIMARY ACTION ========== */}
      <section className="primary-action-section">
        <h2>
          <Target size={24} />
          {t.primaryFocus}
        </h2>
        
        <motion.div
          className="primary-action-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="action-header">
            <h3>🎯 {insight.primaryAction}</h3>
            <p className="completion-hint">{t.completionTime}</p>
          </div>
          
          <p className="action-description">{insight.actionDescription}</p>
          
          <div className="mastery-note">
            {t.masteryNotSpeed}
          </div>
          
          <button
            className="btn-primary-large"
            onClick={handleStartAdaptiveQuiz}
          >
            {t.startPrimaryAction}
          </button>
        </motion.div>
      </section>

      {/* ========== UNLOCK PROGRESS (if roadmap locked) ========== */}
      {roadmapStatus === 'pending' && (
        <section className="unlock-progress-section">
          <motion.div
            className="unlock-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Lock size={48} className="unlock-icon" />
            <h3>🔓 {t.fourWeekRoadmap}</h3>
            <p className="unlock-message">
              Hoàn thành thêm {Math.max(0, 2 - quizzesTaken)} bài kiểm tra với điểm số ≥ 6.0/10 để mở khóa lộ trình AI của bạn.
            </p>
            
            <div className="progress-tracker">
              <div className="progress-item">
                <div className="progress-label">Quizzes Completed: {quizzesTaken}/2</div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${Math.min(100, (quizzesTaken / 2) * 100)}%` }}
                  ></div>
                </div>
              </div>
              
              {lastScore > 0 && (
                <div className="progress-item">
                  <div className="progress-label">Last Score: {lastScore}/10</div>
                  <div className="score-badge" style={{
                    backgroundColor: lastScore >= 6.0 ? '#4CAF50' : '#FF9800'
                  }}>
                    {lastScore >= 6.0 ? '✓ Meets Target' : '⚠️ Below 6.0'}
                  </div>
                </div>
              )}
            </div>
            
            <p className="unlock-hint">
              Luyện tập thêm để cải thiện kỹ năng và mở khóa lộ trình 4 tuần được tạo bởi AI.
            </p>
          </motion.div>
        </section>
      )}

      {/* ========== 4-WEEK ROADMAP (only if unlocked) ========== */}
      {roadmapStatus === 'generated' && (
        <section className="roadmap-section">
          <h2>
            <TrendingUp size={24} />
            {t.fourWeekRoadmap}
          </h2>
          <p className="roadmap-subtitle">{t.suggestedPath}</p>
          
          <div className="roadmap-container">
            {insight.roadmap.map((week, idx) => (
              <motion.div
                key={idx}
                className={`roadmap-week week-${idx + 1}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="week-badge">
                  {idx + 1 === insight.activeWeek ? (
                    <CheckCircle size={20} className="active-indicator" />
                  ) : idx + 1 < insight.activeWeek ? (
                    <CheckCircle size={20} className="completed-indicator" />
                  ) : (
                    <Lock size={20} className="locked-indicator" />
                  )}
                </div>
                
                <h4>{t.week} {idx + 1}</h4>
                
                <p className="week-focus">{week.focus}</p>
                <p className="week-detail">{week.detail}</p>
                
                {idx + 1 < insight.activeWeek && (
                  <span className="completed-label">✓ {t.keepGoing}</span>
                )}
                
                {idx + 1 === insight.activeWeek && (
                  <span className="current-label">→ {t.youreDoingGreat}</span>
                )}
                
                {idx + 1 > insight.activeWeek && (
                  <span className="locked-label">
                    {t.unlockedAfter} Week {idx}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ========== ACTION BUTTONS ========== */}
      <section className="action-buttons-section">
        <button
          className="btn-secondary"
          onClick={() => navigate('/resources')}
        >
          {t.exploreResources}
        </button>
      </section>
    </div>
  );
}

/**
 * Generate AI Insight from profile data using OpenAI
 * Replaces hardcoded templates with real AI analysis
 */
async function generateAIInsight(profile, userId) {
  try {
    // Call backend API that uses OpenAI to generate real insights
    const response = await fetch('/api/ai/generate-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        profile: {
          scores: profile.scores || {},
          weakAreas: profile.weakAreas || [],
          strongAreas: profile.strongAreas || [],
          quizzesTaken: profile.quizzesTaken || 0,
          lastScore: profile.lastScore || 0,
          roadmapUnlocked: profile.roadmapUnlocked || false,
          topicPerformance: profile.topic_performance || {}
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate AI insight');
    }

    const data = await response.json();
    
    // Validate response has required fields
    if (data && data.strengths && data.bottleneck && data.primaryAction) {
      return {
        strengths: data.strengths,
        bottleneck: data.bottleneck,
        primaryAction: data.primaryAction,
        actionDescription: data.actionDescription,
        activeWeek: data.activeWeek || 2,
        roadmap: data.roadmap || getDefaultRoadmap(),
        topicPerformance: profile.topic_performance || {},
        bloom_levels: profile.bloom_levels || profile.scores || {}  // ✅ ADD Bloom levels
      };
    } else {
      // Fallback if AI response is incomplete
      console.warn('[LearningProfile] Incomplete AI response, using fallback');
      return getDefaultAIInsight(profile);
    }
  } catch (error) {
    console.warn('[LearningProfile] AI generation failed, using fallback:', error.message);
    // Fall back to template-based insight
    return getDefaultAIInsight(profile);
  }
}

/**
 * Fallback function for hardcoded templates (used when AI fails)
 */
function getDefaultAIInsight(profile) {
  const level1 = profile.scores?.level1 || 0;
  const level2 = profile.scores?.level2 || 0;
  const level3 = profile.scores?.level3 || 0;
  const level4 = profile.scores?.level4 || 0;

  // Determine strengths
  let strengths = '';
  if (level1 > 70) {
    strengths = 'Bạn có nền tảng kiến thức vững chắc. Bạn nhớ và nhận ra các khái niệm chính một cách nhất quán.';
  } else if (level1 > 50) {
    strengths = 'Bạn đang xây dựng nền tảng kiến thức của mình. Tiếp tục luyện tập nhận biết để củng cố.';
  } else {
    strengths = 'Hãy bắt đầu bằng cách xây dựng nền tảng kiến thức cơ bản của bạn.';
  }

  // Determine bottleneck
  let bottleneck = '';
  if (level2 < 50) {
    bottleneck = 'Hiểu biết là khoảng trống chính của bạn. Bạn biết khái niệm nhưng chưa thể giải thích chúng rõ ràng hoặc áp dụng chúng.';
  } else if (level3 < 30) {
    bottleneck = 'Bạn hiểu các khái niệm nhưng vẫn chưa có thể áp dụng chúng. Đây là bước tiếp theo quan trọng.';
  } else {
    bottleneck = 'Bạn đang tiến bộ tốt. Bước tiếp theo là luyện tập các vấn đề phức tạp hơn.';
  }

  // Determine primary action
  let primaryAction = 'Low Application Practice';
  let actionDescription = 'Bắt đầu với các bài tập ứng dụng cơ bản để chuyển đổi hiểu biết của bạn thành khả năng giải quyết vấn đề thực tế.';
  let activeWeek = 2;

  if (level1 < 50) {
    primaryAction = 'Knowledge Foundation';
    actionDescription = 'Bắt đầu bằng cách xây dựng nền tảng kiến thức vững chắc trước khi chuyển sang ứng dụng.';
    activeWeek = 1;
  } else if (level3 > 60) {
    primaryAction = 'High Application Challenge';
    actionDescription = 'Bạn sẵn sàng cho những vấn đề phức tạp hơn. Luyện tập các tình huống thế giới thực.';
    activeWeek = 3;
  }

  return {
    strengths,
    bottleneck,
    primaryAction,
    actionDescription,
    activeWeek,
    roadmap: getDefaultRoadmap(),
    topicPerformance: profile.topic_performance || {},
    bloom_levels: profile.bloom_levels || profile.scores || {}  // ✅ ADD Bloom levels
  };
}

/**
 * Default roadmap structure
 */
function getDefaultRoadmap() {
  return [
    {
      focus: '🎯 Tuần 1: Tăng cường kiến thức + Luyện tập ứng dụng cơ bản',
      detail: 'Ôn tập các khái niệm chính; giải quyết vấn đề đơn giản từng bước.'
    },
    {
      focus: '🚀 Tuần 2: Sự thành thạo ứng dụng mức thấp',
      detail: 'Giải quyết các vấn đề tiêu chuẩn; xây dựng sự tự tin.'
    },
    {
      focus: '💡 Tuần 3: Luyện tập ứng dụng mức cao với AI',
      detail: 'Các tình huống thế giới thực; phân tích phức tạp với bộ định vị mở rộng.'
    },
    {
      focus: '🎓 Tuần 4: Luyện tập hỗn hợp + Xem xét lỗi cá nhân',
      detail: 'Ôn tập chéo; khám phá cách suy nghĩ cá nhân và mô hình lỗi.'
    }
  ];
}

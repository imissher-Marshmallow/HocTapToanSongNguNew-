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
      const response = await fetch(`/api/adaptive/dashboard/${finalUserId}`);
      
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      const profile = data.profile || data;
      
      // Extract roadmap status and quiz data
      setRoadmapStatus(profile.roadmapStatus || profile.roadmap_status);
      setQuizzesTaken(profile.quizzesTaken || profile.quizzes_taken || 0);
      setLastScore(profile.lastScore || profile.last_score || 0);
      
      // Generate AI insight from dashboard profile - now with real OpenAI call
      const aiInsight = await generateAIInsight(profile, finalUserId);
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

      {/* ========== OTHER LEARNING LEVELS ========== */}
      <section className="other-levels-section">
        <h2>Other Learning Levels</h2>
        
        <div className="levels-grid">
          {/* High Application Level */}
          <motion.div
            className={`level-card ${insight.activeWeek >= 2 ? 'unlocked' : 'locked'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={insight.activeWeek >= 2 ? { scale: 1.05 } : {}}
          >
            {insight.activeWeek >= 2 ? (
              <CheckCircle size={32} className="unlocked-icon" />
            ) : (
              <Lock size={32} className="locked-icon" />
            )}
            <h4>High Application</h4>
            <p>
              {insight.activeWeek >= 2 
                ? '✓ Unlocked - Ready to challenge yourself!' 
                : `${t.unlockedAfter} Low Application mastery`}
            </p>
            {insight.activeWeek >= 2 && (
              <button
                className="btn-level-unlock"
                onClick={handleStartAdaptiveQuiz}
              >
                Start High Application
              </button>
            )}
          </motion.div>
          
          {/* Analysis Level */}
          <motion.div
            className={`level-card ${insight.activeWeek >= 3 ? 'unlocked' : 'locked'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={insight.activeWeek >= 3 ? { scale: 1.05 } : {}}
          >
            {insight.activeWeek >= 3 ? (
              <CheckCircle size={32} className="unlocked-icon" />
            ) : (
              <Lock size={32} className="locked-icon" />
            )}
            <h4>Analysis Level</h4>
            <p>
              {insight.activeWeek >= 3 
                ? '✓ Unlocked - Master complex problem solving!' 
                : `${t.unlockedAfter} High Application completion`}
            </p>
            {insight.activeWeek >= 3 && (
              <button
                className="btn-level-unlock"
                onClick={handleStartAdaptiveQuiz}
              >
                Start Analysis Level
              </button>
            )}
          </motion.div>
        </div>
      </section>

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
          roadmapUnlocked: profile.roadmapUnlocked || false
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
        roadmap: data.roadmap || getDefaultRoadmap()
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
    roadmap: getDefaultRoadmap()
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

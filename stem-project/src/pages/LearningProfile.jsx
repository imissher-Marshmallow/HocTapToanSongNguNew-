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
import { useAuth } from '../contexts/AuthContext';
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
  const { user: authUser } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = translations[language] || translations.vi;
  const finalUserId = userId || authUser?.id;
  
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      
      // Generate AI insight from dashboard profile
      const aiInsight = generateAIInsight(data.profile || data);
      setInsight(aiInsight);
    } catch (err) {
      setError(err.message);
      console.error('[LearningProfile] Error:', err);
    } finally {
      setLoading(false);
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
            onClick={() => navigate('/adaptive-quiz-select')}
          >
            {t.startPrimaryAction}
          </button>
        </motion.div>
      </section>

      {/* ========== 4-WEEK ROADMAP ========== */}
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

      {/* ========== OTHER LEARNING LEVELS ========== */}
      <section className="other-levels-section">
        <h2>Other Learning Levels</h2>
        
        <div className="levels-grid">
          <motion.div
            className="level-card locked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Lock size={32} />
            <h4>High Application</h4>
            <p>
              {t.unlockedAfter} Low Application mastery
            </p>
          </motion.div>
          
          <motion.div
            className="level-card locked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Lock size={32} />
            <h4>Analysis Level</h4>
            <p>
              {t.unlockedAfter} High Application completion
            </p>
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
 * Generate AI Insight from profile data
 * This is where real AI analysis would be integrated
 */
function generateAIInsight(profile) {
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

  // Create 4-week roadmap
  const roadmap = [
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

  return {
    strengths,
    bottleneck,
    primaryAction,
    actionDescription,
    activeWeek,
    roadmap
  };
}

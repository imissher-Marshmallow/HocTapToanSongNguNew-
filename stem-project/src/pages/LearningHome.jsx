import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth, getApiBase } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import StudySidebar from '../components/StudySidebar';
import PerformanceCharts from '../components/PerformanceCharts';
import '../styles/LearningHome.css';
import '../styles/PerformanceCharts.css';

function LearningHome() {
  const navigate = useNavigate();
  const { user, token, getUserId } = useAuth();
  const { language } = useLanguage();
  const [weakAreasExpanded, setWeakAreasExpanded] = useState(false);

  const name = user?.username || user?.name || (language === 'vi' ? 'Học sinh' : 'Student');
  const userId = getUserId();

  // State for analytics
  const [summary, setSummary] = useState(null);
  const [weakAreas, setWeakAreas] = useState([]);
  const [strongAreas, setStrongAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!userId || userId === 'anonymous') {
        console.log('[LearningHome] No userId available');
        setLoading(false);
        setSummary(null);
        return;
      }
      try {
        setLoading(true);
        console.log('[LearningHome] Fetching data for userId:', userId);
        const apiBase = getApiBase();
        
        // Fetch weak and strong areas from Supabase via new endpoint
        const weakStrongResponse = await fetch(`${apiBase}/api/adaptive/weak-and-strong/${userId}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        
        console.log('[LearningHome] WeakStrong API status:', weakStrongResponse.status);
        
        if (weakStrongResponse.ok) {
          const weakStrongData = await weakStrongResponse.json();
          console.log('[LearningHome] WeakStrong data:', weakStrongData);
          setWeakAreas(weakStrongData.weakAreas || []);
          setStrongAreas(weakStrongData.strongAreas || []);
        }
        
        // Also fetch historical summary for streak and other stats
        const historyResponse = await fetch(`${apiBase}/api/history/summary?userId=${userId}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        
        console.log('[LearningHome] History API status:', historyResponse.status);
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          console.log('[LearningHome] History data:', historyData);
          if (historyData.success && historyData.data) {
            setSummary(historyData.data);
          } else {
            setSummary(null);
          }
        } else {
          setSummary(null);
        } //fix
      } catch (err) {
        console.error('[LearningHome] Error:', err.message);
        setError(err.message);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [userId, token]);

  // Fallbacks if no data
  const streak = summary?.streak || 0;
  const quizzesCompleted = summary?.attempts || 0;
  const masteryScore = summary?.averageScore || 0;
  const lastActivityTime = summary?.chart && summary.chart.length > 0 ?
    new Date(summary.chart[0].date).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US') :
    (language === 'vi' ? 'Chưa có hoạt động' : 'No activity yet');
  
  // Use weak and strong areas fetched from Supabase
  const weakAreasList = weakAreas.map((area, idx) => ({
    id: area.topic,
    name: area.topic,
    accuracy: area.percentage || 40,
    icon: area.icon || '⚠️',
    priority: area.priority || idx + 1
  }));
  
  const strengthAreasList = strongAreas.map((area, idx) => ({
    id: area.topic,
    name: area.topic,
    icon: area.icon || '💪'
  }));


  const getStreakMessage = () => {
    if (language === 'vi') {
      return streak > 0 ? `Bạn đang có ${streak} ngày liên tiếp! Tuyệt vời!` : 'Bạn chưa có streak nào.';
    }
    return streak > 0 ? `You have a ${streak}-day streak! Keep it up!` : 'No streak yet.';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (language === 'vi') {
      if (hour < 12) return 'Chào buổi sáng';
      if (hour < 18) return 'Chào buổi chiều';
      return 'Chào buổi tối';
    } else {
      if (hour < 12) return 'Good morning';
      if (hour < 18) return 'Good afternoon';
      return 'Good evening';
    }
  };

  if (loading) {
    return <div className="learning-home full-width-layout"><div className="loading-spinner">{language === 'vi' ? 'Đang tải...' : 'Loading...'}</div></div>;
  }

  return (
    <div className="learning-home full-width-layout">
      <div className="learning-grid">
        <StudySidebar />
        <div className="learning-main">
          {/* Hero Section with Avatar and Greeting */}
          <motion.div
            className="hero-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="hero-content">
              <div className="ai-avatar-container">
                <div className="ai-avatar">
                  <div className="avatar-emoji">🤖</div>
                  <div className="avatar-pulse"></div>
                </div>
              </div>

              <div className="hero-text">
                <h1>{getGreeting()}, <span className="user-name">{name}</span>!</h1>
                <p className="hero-subtitle">{getStreakMessage()}</p>
                <p className="last-activity">{language === 'vi' ? 'Hoạt động cuối:' : 'Last activity:'} {lastActivityTime}</p>

                <div className="hero-buttons">
                  <button
                    className="btn-hero btn-hero-primary"
                    onClick={() => navigate('/study-mode')}
                  >
                    {language === 'vi' ? '🎯 Vào Chế Độ Học Tập' : '🎯 Study Mode'}
                  </button>
                  <button
                    className="btn-hero btn-hero-secondary"
                    onClick={() => navigate('/quizzes')}
                  >
                    {language === 'vi' ? '📝 Làm Bài Kiểm Tra' : '📝 Take Quiz'}
                  </button>
                </div>
              </div>

              {/* Streak Widget */}
              <motion.div
                className="streak-widget"
                whileHover={{ scale: 1.05 }}
              >
                <div className="streak-value">🔥</div>
                <div className="streak-number">{streak}</div>
                <div className="streak-label">{language === 'vi' ? 'Ngày' : 'Days'}</div>
              </motion.div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            className="stats-cards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <StatCard
              icon="📚"
              label={language === 'vi' ? 'Hoàn thành' : 'Completed'}
              value={quizzesCompleted}
              unit={language === 'vi' ? 'bài' : 'quizzes'}
              color="#3b82f6"
            />
            <StatCard
              icon="⭐"
              label={language === 'vi' ? 'Thành thạo' : 'Mastery'}
              value={masteryScore}
              unit="/10"
              color="#10b981"
            />
            {strengthAreasList.length > 0 && (
              <StatCard
                icon="💪"
                label={language === 'vi' ? 'Thế mạnh' : 'Strengths'}
                value={strengthAreasList.map(a => a.name).join(', ')}
                unit=""
                color="#f59e0b"
              />
            )}
          </motion.div>

          {/* Weak Areas Section */}
          <motion.div
            className="weak-areas-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="section-header">
              <h2>{language === 'vi' ? '⚠️ Điểm Yếu' : '⚠️ Weak Areas'}</h2>
              <p>{language === 'vi' ? 'Những chủ đề bạn nên ôn tập' : 'Topics you should practice'}</p>
            </div>

            <div className="weak-areas-grid">
              {weakAreasList.length === 0 ? (
                <div className="empty-state">{language === 'vi' ? 'Không có điểm yếu nổi bật.' : 'No major weaknesses.'}</div>
              ) : (
                weakAreasList.map((area, index) => (
                  <motion.div
                    key={area.id}
                    className="weak-area-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    whileHover={{ y: -4 }}
                    onClick={() => navigate('/adaptive-quiz-select')}
                  >
                    <div className="area-icon">{area.icon}</div>
                    <h3>{area.name}</h3>
                    <div className="accuracy-bar">
                      <div
                        className="accuracy-fill"
                        style={{ width: `${area.accuracy}%` }}
                      ></div>
                    </div>
                    <div className="accuracy-text">{area.accuracy}% {language === 'vi' ? 'Chính xác' : 'Accuracy'}</div>
                    <button className="btn-practice">
                      {language === 'vi' ? 'Luyện Tập' : 'Practice'}
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Performance Charts Section */}
          <PerformanceCharts
            chartData={summary?.chart || []}
            weakAreas={weakAreasList.map(a => a.name) || []}
            strengthAreas={strengthAreasList.map(a => a.name) || []}
            masteryScore={Number(summary?.averageScore) || 0}
          />

          {/* Quick Actions */}
          <motion.div
            className="quick-actions-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div className="section-header">
              <h2>{language === 'vi' ? '⚡ Hành Động Nhanh' : '⚡ Quick Actions'}</h2>
            </div>

            <div className="quick-actions-grid">
              <QuickActionButton
                icon="📝"
                label={language === 'vi' ? 'Bài Kiểm Tra Thích Hợp' : 'Adaptive Quiz'}
                onClick={() => navigate('/adaptive-quiz-select')}
              />
              <QuickActionButton
                icon="📚"
                label={language === 'vi' ? 'Tài Nguyên' : 'Resources'}
                onClick={() => navigate('/resources')}
              />
              <QuickActionButton
                icon="⏱️"
                label={language === 'vi' ? 'Chế Độ Tập Trung' : 'Focus Mode'}
                onClick={() => navigate('/study-mode')}
              />
              <QuickActionButton
                icon="📊"
                label={language === 'vi' ? 'Lịch Sử' : 'History'}
                onClick={() => navigate('/history')}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, unit, color }) {
  return (
    <motion.div
      className="stat-card-item"
      whileHover={{ y: -4 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="stat-icon" style={{ color }}>
        {icon}
      </div>
      <div className="stat-content">
        <div className="stat-label">{label}</div>
        <div className="stat-value">
          {value} <span className="stat-unit">{unit}</span>
        </div>
      </div>
    </motion.div>
  );
}

function QuickActionButton({ icon, label, onClick }) {
  return (
    <motion.button
      className="quick-action-btn"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="action-icon">{icon}</span>
      <span className="action-label">{label}</span>
    </motion.button>
  );
}

export default LearningHome;

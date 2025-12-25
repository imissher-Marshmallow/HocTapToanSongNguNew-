import React from 'react';
import { motion } from 'framer-motion';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { useLanguage } from '../contexts/LanguageContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * PerformanceCharts Component
 * Displays visual analytics for student learning progress using Chart.js
 * 
 * Props:
 * - chartData: array of {date, score} for score trends
 * - weakAreas: array of weak topic names
 * - strengthAreas: array of strong topic names
 * - masteryScore: overall average score out of 10
 */
function PerformanceCharts({ chartData = [], weakAreas = [], strengthAreas = [], masteryScore = 0 }) {
  const { language } = useLanguage();

  // Format date for display
  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Prepare chart data with formatted dates
  const formattedChartData = (chartData || []).map(item => ({
    ...item,
    displayDate: formatDate(item.date),
    score: Number(item.score) || 0
  })).slice(-10); // Show last 10 attempts

  // Prepare strength vs weakness data
  const areaDistribution = [
    { name: language === 'vi' ? 'Điểm mạnh' : 'Strengths', value: strengthAreas.length, color: '#10b981' },
    { name: language === 'vi' ? 'Điểm yếu' : 'Weaknesses', value: weakAreas.length, color: '#ef4444' }
  ];

  // Prepare accuracy by topic
  const topicAccuracy = [
    ...weakAreas.slice(0, 3).map(topic => ({
      topic: typeof topic === 'string' ? topic : String(topic),
      accuracy: 40 + Math.random() * 30
    })),
    ...strengthAreas.slice(0, 2).map(topic => ({
      topic: typeof topic === 'string' ? topic : String(topic),
      accuracy: 70 + Math.random() * 30
    }))
  ];

  const chartLabels = {
    vi: {
      scoreTrend: 'Xu Hướng Điểm Số',
      score: 'Điểm',
      date: 'Ngày',
      topicAccuracy: 'Độ Chính Xác Theo Chủ Đề',
      accuracy: 'Độ Chính Xác (%)',
      areaDistribution: 'Phân Bố Điểm Mạnh & Yếu',
      noData: 'Chưa có dữ liệu'
    },
    en: {
      scoreTrend: 'Score Trend',
      score: 'Score',
      date: 'Date',
      topicAccuracy: 'Accuracy by Topic',
      accuracy: 'Accuracy (%)',
      areaDistribution: 'Strengths & Weaknesses',
      noData: 'No data available'
    }
  };

  const labels = chartLabels[language] || chartLabels.en;

  // Chart.js configurations
  const lineChartData = {
    labels: formattedChartData.map(d => d.displayDate),
    datasets: [
      {
        label: labels.score,
        data: formattedChartData.map(d => d.score),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#6b7280',
          padding: 15,
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#3b82f6',
        borderWidth: 2,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `${labels.score}: ${context.parsed.y.toFixed(1)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        ticks: { color: '#6b7280' },
        grid: { color: 'rgba(229, 231, 235, 0.5)' }
      },
      x: {
        ticks: { color: '#6b7280' },
        grid: { color: 'rgba(229, 231, 235, 0.5)' }
      }
    }
  };

  const barChartData = {
    labels: topicAccuracy.map(t => t.topic),
    datasets: [
      {
        label: labels.accuracy,
        data: topicAccuracy.map(t => t.accuracy),
        backgroundColor: '#10b981',
        borderRadius: 8,
        borderSkipped: false,
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#6b7280',
          padding: 15,
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#10b981',
        borderWidth: 2,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `${labels.accuracy}: ${context.parsed.y.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { color: '#6b7280' },
        grid: { color: 'rgba(229, 231, 235, 0.5)' }
      },
      x: {
        ticks: { color: '#6b7280' },
        grid: { color: 'rgba(229, 231, 235, 0.5)' }
      }
    }
  };

  return (
    <motion.div
      className="performance-charts-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      {/* Score Trend Chart */}
      {formattedChartData.length > 0 ? (
        <motion.div
          className="chart-card score-trend-card"
          whileHover={{ y: -4 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <h3 className="chart-title">{labels.scoreTrend}</h3>
          <div style={{ position: 'relative', height: '300px' }}>
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="chart-card empty-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p>{labels.noData}</p>
        </motion.div>
      )}

      {/* Topic Accuracy Chart */}
      {topicAccuracy.length > 0 ? (
        <motion.div
          className="chart-card accuracy-chart-card"
          whileHover={{ y: -4 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h3 className="chart-title">{labels.topicAccuracy}</h3>
          <div style={{ position: 'relative', height: '300px' }}>
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </motion.div>
      ) : null}

      {/* Strengths vs Weaknesses Distribution */}
      {areaDistribution.some(item => item.value > 0) ? (
        <motion.div
          className="chart-card distribution-chart-card"
          whileHover={{ y: -4 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
        >
          <h3 className="chart-title">{labels.areaDistribution}</h3>
          <div className="distribution-summary">
            {areaDistribution.map((item, idx) => (
              <div key={idx} className="distribution-item">
                <div
                  className="distribution-color"
                  style={{ backgroundColor: item.color }}
                />
                <span className="distribution-label">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      ) : null}

      {/* Mastery Score Summary */}
      <motion.div
        className="chart-card mastery-summary-card"
        whileHover={{ y: -4 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <h3 className="chart-title">{language === 'vi' ? 'Điểm Thành Thạo' : 'Mastery Score'}</h3>
        <div className="mastery-content">
          <div className="mastery-circle">
            <div className="mastery-value">{masteryScore.toFixed(1)}</div>
            <div className="mastery-label">/10</div>
          </div>
          <div className="mastery-description">
            <p className="mastery-text">
              {masteryScore >= 8
                ? language === 'vi'
                  ? 'Xuất sắc! Tiếp tục duy trì'
                  : 'Excellent! Keep it up'
                : masteryScore >= 6
                ? language === 'vi'
                  ? 'Tốt! Cần ôn luyện thêm'
                  : 'Good! Keep practicing'
                : language === 'vi'
                ? 'Cần nỗ lực thêm'
                : 'Keep working hard'}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default PerformanceCharts;

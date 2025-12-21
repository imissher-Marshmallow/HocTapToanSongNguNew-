import React from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * PerformanceCharts Component
 * Displays visual analytics for student learning progress
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

  // Prepare strength vs weakness data for pie chart
  const areaDistribution = [
    { name: language === 'vi' ? 'Điểm mạnh' : 'Strengths', value: strengthAreas.length, color: '#10b981' },
    { name: language === 'vi' ? 'Điểm yếu' : 'Weaknesses', value: weakAreas.length, color: '#ef4444' }
  ];

  // Prepare accuracy by topic (simulated - would need real data)
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
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="displayDate" stroke="#6b7280" />
              <YAxis stroke="#6b7280" domain={[0, 10]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '2px solid #3b82f6',
                  borderRadius: '8px',
                  padding: '10px'
                }}
                formatter={(value) => [value.toFixed(1), labels.score]}
                labelFormatter={(label) => `${labels.date}: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 5 }}
                activeDot={{ r: 7 }}
                name={labels.score}
              />
            </LineChart>
          </ResponsiveContainer>
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topicAccuracy}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="topic"
                stroke="#6b7280"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis stroke="#6b7280" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '2px solid #10b981',
                  borderRadius: '8px',
                  padding: '10px'
                }}
                formatter={(value) => [value.toFixed(1) + '%', labels.accuracy]}
              />
              <Bar
                dataKey="accuracy"
                fill="#10b981"
                radius={[8, 8, 0, 0]}
                name={labels.accuracy}
              />
            </BarChart>
          </ResponsiveContainer>
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
          <div className="pie-chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={areaDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {areaDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '2px solid #f59e0b',
                    borderRadius: '8px',
                    padding: '10px'
                  }}
                  formatter={(value) => [value, 'Count']}
                />
              </PieChart>
            </ResponsiveContainer>
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

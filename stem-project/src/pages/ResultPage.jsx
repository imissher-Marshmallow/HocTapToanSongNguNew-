import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useLanguage } from '../contexts/LanguageContext';
import AICoach from '../components/AICoach';
import '../styles/ResultPage.css';

const translations = {
  en: {
    title: "Quiz Results",
    aiAnalyzing: "AI analyzing results...",
    aiWait: "Please wait while AI generates summary and recommendations.",
    aiOverview: "AI OVERVIEW",
    strengths: "Strengths",
    needsImprovement: "Needs Improvement",
    plan: "Plan",
    yourScore: "Your Score",
    veryGood: "Excellent — keep up the good work!",
    improving: "Making progress — continue practicing.",
    needsWork: "Needs improvement. See recommendations below.",
    weaknessByTopic: "Weaknesses by Topic",
    severityOverview: "Severity Overview",
    high: "HIGH",
    medium: "MEDIUM",
    low: "LOW",
    detailedFeedback: "Detailed AI Feedback",
    noFeedback: "No detailed feedback (all answers correct).",
    question: "Question",
    issue: "Issue:",
    improve: "Need to improve:",
    learningTips: "Learning tips:",
    nextSteps: "Next steps:",
    recommendedResources: "Recommended resources:",
    nextExercises: "Recommended Next Exercises",
    noRecommendations: "No additional recommendations.",
    questionsToTry: "Questions to try:",
  },
  vi: {
    title: "Kết quả Bài kiểm tra",
    aiAnalyzing: "AI đang phân tích kết quả...",
    aiWait: "Vui lòng chờ một chút để AI tổng hợp kết quả và đề xuất.",
    aiOverview: "TỔNG QUAN TỪ AI",
    strengths: "Điểm mạnh",
    needsImprovement: "Cần cải thiện",
    plan: "Kế hoạch",
    yourScore: "Điểm của bạn",
    veryGood: "Rất tốt — tiếp tục phát huy!",
    improving: "Có tiến bộ — tiếp tục ôn luyện.",
    needsWork: "Cần cải thiện. Hãy xem đề xuất bên dưới.",
    weaknessByTopic: "Điểm yếu theo chủ đề",
    severityOverview: "Tổng quan mức độ",
    high: "CAO",
    medium: "TRUNG BÌNH",
    low: "THẤP",
    detailedFeedback: "Phản hồi chi tiết từ AI",
    noFeedback: "Không có phản hồi chi tiết (tất cả câu trả lời đúng).",
    question: "Câu",
    issue: "Vấn đề:",
    improve: "Cần cải thiện:",
    learningTips: "Gợi ý học:",
    nextSteps: "Hành động tiếp theo:",
    recommendedResources: "Tài nguyên đề xuất:",
    nextExercises: "Đề xuất bài tập tiếp theo",
    noRecommendations: "Không có đề xuất thêm.",
    questionsToTry: "Các câu hỏi để luyện:",
  }
};

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ResultPage() {
  const location = useLocation();
  const { language } = useLanguage();
  const t = translations[language];
  // Support both navigate('/result', { state: result }) and navigate('/result', { state: { result } })
  const result = (location && (location.state && (location.state.result || location.state))) || null;
  // compute summary and UI state hooks BEFORE any early return so hooks run every render
  const summary = result ? result.summary || null : null;
  const [showSummary, setShowSummary] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(!!summary);

  useEffect(() => {
    // If there's a summary, show a short AI replying animation then reveal summary
    if (summary) {
      setLoadingSummary(true);
      const t = setTimeout(() => {
        setLoadingSummary(false);
        setShowSummary(true);
      }, 1100);
      return () => clearTimeout(t);
    }
    // if no summary ensure states are reset
    setLoadingSummary(false);
    setShowSummary(false);
  }, [summary]);

  if (!result) {
    return <div className="container mx-auto px-6 py-12 text-center">No result data available.</div>;
  }

  const { score, weakAreas = [], feedback = [], recommendations = [] } = result;

  // Pie chart for weak areas severity
  const severityCounts = { high: 0, medium: 0, low: 0 };
  weakAreas.forEach(area => {
    severityCounts[area.severity] = (severityCounts[area.severity] || 0) + 1;
  });
  const chartData = {
    labels: ['High', 'Medium', 'Low'],
    datasets: [
      {
        data: [severityCounts.high, severityCounts.medium, severityCounts.low],
        backgroundColor: ['#FF6384', '#FFCE56', '#4BC0C0'],
        hoverBackgroundColor: ['#FF6384', '#FFCE56', '#4BC0C0'],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return context.label + ': ' + context.parsed;
          }
        }
      }
    }
  };

  return (
    <div className="result-page container mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-center mb-8">{t.title}</h1>

      {/* Summary */}
      {summary && (
        <div className="mb-8">
          {loadingSummary ? (
            <div className="ai-loading p-4 rounded flex items-center gap-3">
              <div className="ai-dot" />
              <div>
                <div className="font-semibold">{t.aiAnalyzing}</div>
                <div className="text-sm text-gray-500">{t.aiWait}</div>
              </div>
            </div>
          ) : showSummary ? (
            <div className="summary mb-8 p-5 bg-white border shadow-sm rounded summary-highlight">
              <h2 className="text-xl font-semibold mb-3">{t.aiOverview}</h2>
              {summary.overall && <p className="mb-3 summary-overall">{summary.overall}</p>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {summary.strengths && summary.strengths.length > 0 && (
                    <div className="p-3 border rounded ai-card-column">
                      <h4 className="font-semibold mb-2">{t.strengths}</h4>
                      <div className="ai-card-list">
                        {summary.strengths.map((s, i) => (
                          <div key={i} className="ai-card p-3 mb-2">
                            <div className="ai-card-text">{s}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                {summary.weaknesses && summary.weaknesses.length > 0 && (
                  <div className="p-3 border rounded ai-card-column">
                    <h4 className="font-semibold mb-2">{t.needsImprovement}</h4>
                    <div className="ai-card-list">
                      {summary.weaknesses.map((s, i) => (
                        <div key={i} className="ai-card p-3 mb-2 ai-weak">
                          <div className="ai-card-text">{s}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {summary.plan && summary.plan.length > 0 && (
                  <div className="p-3 border rounded ai-card-column">
                    <h4 className="font-semibold mb-2">{t.plan}</h4>
                    <div className="ai-card-list">
                      {summary.plan.map((p, i) => (
                        <div key={i} className="ai-card p-3 mb-2 ai-plan">
                          <div className="ai-card-text">{p}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Score Display */}
      <div className="score-display text-center mb-8">
        <h2 className="text-2xl mb-2">{t.yourScore}</h2>
        <div className="score-circle mx-auto w-28 h-28 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
          {score}/10
        </div>
        <p className="text-gray-600 mt-3">
          {score >= 8 ? t.veryGood : score >= 5 ? t.improving : t.needsWork}
        </p>
      </div>

      {/* Weak Areas & Pie Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div>
          <h2 className="text-2xl font-bold mb-4">{t.weaknessByTopic}</h2>
          <div className="weak-areas-list">
            <div className="grid grid-cols-1 gap-3">
              {weakAreas.map((area, idx) => {
                const sev = area.severity || 'low';
                const cls = sev === 'high' ? 'severity-high' : sev === 'medium' ? 'severity-medium' : 'severity-low';
                const severityText = sev === 'high' ? t.high : sev === 'medium' ? t.medium : t.low;
                return (
                  <div key={idx} className="p-3 border rounded flex items-center justify-between">
                    <div className="text-sm font-medium">{area.topic}</div>
                    <div className={`badge ${cls}`}>{severityText}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4">{t.severityOverview}</h2>
          <div className="chart-container mx-auto max-w-sm">
            <Pie data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Overall AI Summary (single concise block) */}
      {summary && (
        <div className="overall-feedback mb-12">
          <h2 className="text-2xl font-bold mb-4">{t.aiOverview}</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <p className="text-lg mb-4 summary-overall">{summary.overall}</p>
            {/* small visual grouping for plan items if present */}
            {summary.plan && summary.plan.length > 0 && (
              <div className="ai-plan-compact">
                <h3 className="font-semibold mb-2">{t.plan}</h3>
                <div className="ai-card-list">
                  {summary.plan.map((p, i) => (
                    <div key={i} className="ai-card p-3 mb-2 ai-plan">
                      <div className="ai-card-text">{p}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="recommendations mb-12">
        <h2 className="text-2xl font-bold mb-4">{t.nextExercises}</h2>
        {recommendations.length === 0 ? (
          <p>{t.noRecommendations}</p>
        ) : (
          recommendations.map((rec, idx) => (
            <div key={idx} className="mb-4 p-3 border rounded">
              <h3 className="text-xl font-semibold">{rec.topic}</h3>
              <p>{t.questionsToTry} {rec.nextQuestions.join(', ')}</p>
            </div>
          ))
        )}
      </div>

      {/* Answer Comparison */}
      {result.answerComparison && (
        <div className="answer-comparison mb-12">
          <h2 className="text-2xl font-bold mb-4">Đối chiếu đáp án</h2>
          <div className="answer-comparison-grid">
            {result.answerComparison.map((answer, idx) => (
              <div key={idx} className={`answer-card p-4 border rounded ${answer.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="answer-card-head">
                  <div className="font-semibold">Câu {answer.questionId}</div>
                  <div className={`status ${answer.isCorrect ? 'correct' : 'wrong'}`}>{answer.isCorrect ? 'Đúng' : 'Sai'}</div>
                </div>
                <div className="mt-2 font-medium">{answer.question}</div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Câu trả lời của bạn</div>
                    <div className={`p-2 rounded user-answer ${answer.isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                      <div className="answer-line">{answer.userAnswer}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Đáp án đúng</div>
                    <div className="p-2 rounded correct-answer bg-green-100">
                      <div className="answer-line">{answer.correctAnswer}</div>
                    </div>
                  </div>
                </div>
                {answer.explanation && (
                  <div className="mt-3">
                    <div className="text-sm text-gray-600 mb-1">Giải thích</div>
                    <div className="p-2 bg-gray-50 rounded">{answer.explanation}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Coach */}
      <AICoach feedback={feedback} />
    </div>
  );
}

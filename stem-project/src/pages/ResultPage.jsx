import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useLanguage } from '../contexts/LanguageContext';
import AICoach from '../components/AICoach';
import '../styles/ResultPage.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';

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

// KaTeX rendering helper for result page
const renderMath = (text) => {
  if (!text) return '';
  try {
    return { __html: text.replace(/\$([^\$]+)\$/g, (m, latex) => katex.renderToString(latex, { throwOnError: false })) };
  } catch (e) {
    return { __html: text };
  }
};
ChartJS.register(ArcElement, Tooltip, Legend);

export default function ResultPage() {
  const location = useLocation();
  const { language } = useLanguage();
  const t = translations[language];
  const result = (location && (location.state && (location.state.result || location.state))) || null;
  const summary = result ? result.summary || null : null;
  const [showSummary, setShowSummary] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(!!summary);

  useEffect(() => {
    if (summary) {
      setLoadingSummary(true);
      const timer = setTimeout(() => {
        setLoadingSummary(false);
        setShowSummary(true);
      }, 1100);
      return () => clearTimeout(timer);
    }
    setLoadingSummary(false);
    setShowSummary(false);
  }, [summary]);

  if (!result) {
    return <div className="result-page"><div className="result-container"><div className="no-data">No result data available.</div></div></div>;
  }

  const { score, weakAreas = [], feedback = [], recommendations = [] } = result;
  const motivationalFeedback = result.motivationalFeedback || {};
  const resourceLinks = result.resourceLinks || [];

  // Pie chart for weak areas severity
  const severityCounts = { high: 0, medium: 0, low: 0 };
  weakAreas.forEach(area => {
    severityCounts[area.severity] = (severityCounts[area.severity] || 0) + 1;
  });

  const chartData = {
    labels: [t.high, t.medium, t.low],
    datasets: [
      {
        data: [severityCounts.high, severityCounts.medium, severityCounts.low],
        backgroundColor: ['#ef4444', '#f59e0b', '#06b6d4'],
        hoverBackgroundColor: ['#ef4444', '#f59e0b', '#06b6d4'],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    }
  };

  return (
    <div className="result-page">
      <div className="result-container">
        <h1 className="result-title">{t.title}</h1>

        {/* Score Display - Hero Section */}
        <div className="score-hero-section">
          <div className="score-display-card">
            <h2 className="score-label">{t.yourScore}</h2>
            <div className="score-circle-wrapper">
              <div className="score-circle">
                <div className="score-number">{score}</div>
                <div className="score-divider">/</div>
                <div className="score-total">10</div>
              </div>
            </div>
            <p className="score-feedback">
              {score >= 8 ? t.veryGood : score >= 5 ? t.improving : t.needsWork}
            </p>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="summary-section">
            {loadingSummary ? (
              <div className="ai-loading">
                <div className="ai-loading-content">
                  <div className="ai-dot" />
                  <div className="ai-dot" />
                  <div className="ai-dot" />
                  <div className="ai-loading-text">
                    <h3>✨ {t.aiAnalyzing}</h3>
                    <p>{t.aiWait}</p>
                  </div>
                </div>
              </div>
            ) : showSummary ? (
              <div className="summary-card">
                <h2 className="summary-title">{t.aiOverview}</h2>
                {summary.overall && <p className="summary-overall">{summary.overall}</p>}
                
                {motivationalFeedback && (motivationalFeedback.opening || motivationalFeedback.body || motivationalFeedback.closing) && (
                  <div className="motivational-feedback">
                    {motivationalFeedback.opening && <p>{motivationalFeedback.opening}</p>}
                    {motivationalFeedback.body && <p>{motivationalFeedback.body}</p>}
                    {motivationalFeedback.closing && <p>{motivationalFeedback.closing}</p>}
                  </div>
                )}

                <div className="summary-grid">
                  {summary.strengths && summary.strengths.length > 0 && (
                    <div className="summary-column">
                      <h4 className="column-title">{t.strengths}</h4>
                      <div className="ai-card-list">
                        {summary.strengths.map((s, i) => (
                          <div key={i} className="ai-card">
                            <div className="ai-card-text">{s}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {summary.weaknesses && summary.weaknesses.length > 0 && (
                    <div className="summary-column">
                      <h4 className="column-title">{t.needsImprovement}</h4>
                      <div className="ai-card-list">
                        {summary.weaknesses.map((s, i) => (
                          <div key={i} className="ai-card ai-weak">
                            <div className="ai-card-text">{s}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {summary.plan && summary.plan.length > 0 && (
                    <div className="summary-column">
                      <h4 className="column-title">{t.plan}</h4>
                      <div className="ai-card-list">
                        {summary.plan.map((p, i) => (
                          <div key={i} className="ai-card ai-plan">
                            <div className="ai-card-text">
                              {typeof p === 'string' ? (
                                p
                              ) : p && p.step ? (
                                <div>
                                  <div className="step-title">{p.step}</div>
                                  {(p.duration || p.action) && (
                                    <div className="step-detail">{p.duration ? `${p.duration}` : ''}{p.duration && p.action ? ' · ' : ''}{p.action ? p.action : ''}</div>
                                  )}
                                  {p.resource_suggestion && p.resource_suggestion.name && (
                                    <div className="step-resource">Resource: {p.resource_suggestion.name} {p.resource_suggestion.type ? `(${p.resource_suggestion.type})` : ''}</div>
                                  )}
                                </div>
                              ) : (
                                JSON.stringify(p)
                              )}
                            </div>
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

        {/* Weak Areas & Pie Chart */}
        <div className="weak-chart-section">
          <div className="weak-areas-column">
            <h2 className="section-title">{t.weaknessByTopic}</h2>
            <div className="weak-areas-list">
              {weakAreas.length === 0 ? (
                <div className="empty-state">No weaknesses detected</div>
              ) : (
                weakAreas.map((area, idx) => {
                  const sev = area.severity || 'low';
                  const cls = sev === 'high' ? 'severity-high' : sev === 'medium' ? 'severity-medium' : 'severity-low';
                  const severityText = sev === 'high' ? t.high : sev === 'medium' ? t.medium : t.low;
                  // Get topic feedback/summary if available
                  const topicFeedback = area.feedback || area.summary || '';
                  return (
                    <div key={idx} className="weakness-item">
                      <div className="weakness-topic">{area.topic}</div>
                      <div className={`badge ${cls}`}>{severityText}</div>
                      {topicFeedback && (
                        <div className="weakness-feedback">
                          {topicFeedback}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="chart-column">
            <h2 className="section-title">{t.severityOverview}</h2>
            <div className="chart-container">
              <Pie data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Learning Resources Section */}
        {resourceLinks && resourceLinks.length > 0 && (
          <div className="learning-resources">
            <h2 className="section-title">📚 {language === 'vi' ? 'Tài nguyên học tập đề xuất' : 'Recommended Learning Resources'}</h2>
            <div className="resources-grid">
              {resourceLinks.map((resource, idx) => (
                <div key={idx} className="resource-card">
                  <div className="resource-header">
                    <h3 className="resource-title">{resource.title}</h3>
                    <span className="resource-badge">{resource.source}</span>
                  </div>
                  <p className="resource-type">Type: {resource.type || 'lesson'}</p>
                  <a 
                    href={resource.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="resource-link"
                  >
                    {language === 'vi' ? 'Học ngay' : 'Learn Now'} →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overall AI Summary */}
        {summary && (
          <div className="overall-feedback">
            <h2 className="section-title">{t.aiOverview}</h2>
            <div className="feedback-box">
              <p className="summary-overall">{summary.overall}</p>
              {summary.plan && summary.plan.length > 0 && (
                <div className="ai-plan-compact">
                  <h3 className="plan-subtitle">{t.plan}</h3>
                  <div className="ai-card-list">
                    {summary.plan.map((p, i) => (
                      <div key={i} className="ai-card ai-plan">
                        <div className="ai-card-text">
                          {typeof p === 'string' ? (
                            p
                          ) : p && p.step ? (
                            <div>
                              <div className="step-title">{p.step}</div>
                              {(p.duration || p.action) && (
                                <div className="step-detail">{p.duration ? `${p.duration}` : ''}{p.duration && p.action ? ' · ' : ''}{p.action ? p.action : ''}</div>
                              )}
                            </div>
                          ) : (
                            JSON.stringify(p)
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="recommendations">
          <h2 className="section-title">{t.nextExercises}</h2>
          {recommendations.length === 0 ? (
            <p className="no-data">{t.noRecommendations}</p>
          ) : (
            <div className="recommendations-list">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="recommendation-item">
                  <h3 className="rec-topic">{rec.topic}</h3>
                  <p>{t.questionsToTry} {rec.nextQuestions.join(', ')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Answer Comparison */}
        {result.answerComparison && (
          <div className="answer-comparison">
            <h2 className="section-title">Đối chiếu đáp án</h2>
            <div className="answer-comparison-grid">
              {result.answerComparison.map((answer, idx) => (
                <div key={idx} className={`answer-card ${answer.isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="answer-card-head">
                    <div className="question-num">Câu {answer.questionId}</div>
                    <div className={`status ${answer.isCorrect ? 'correct' : 'wrong'}`}>
                      {answer.isCorrect ? '✓ Đúng' : '✗ Sai'}
                    </div>
                  </div>
                  <div className="question-text" dangerouslySetInnerHTML={renderMath(answer.question)} />
                  <div className="answer-compare">
                    <div className="user-answer-box">
                      <div className="answer-label">Câu trả lời của bạn</div>
                      <div className={`answer-content ${answer.isCorrect ? 'correct' : 'incorrect'}`} dangerouslySetInnerHTML={renderMath(answer.userAnswer)} />
                    </div>
                    <div className="correct-answer-box">
                      <div className="answer-label">Đáp án đúng</div>
                      <div className="answer-content correct" dangerouslySetInnerHTML={renderMath(answer.correctAnswer)} />
                    </div>
                  </div>
                  {answer.explanation && (
                    <div className="explanation">
                      <div className="explanation-label">Giải thích</div>
                      <div className="explanation-text">{answer.explanation}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Coach */}
        <AICoach feedback={feedback} result={result} />
      </div>
    </div>
  );
}

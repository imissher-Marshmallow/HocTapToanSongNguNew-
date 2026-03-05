// Simple deterministic analytics helpers for student project
const simpleMean = arr => arr.reduce((s, v) => s + v, 0) / Math.max(arr.length, 1);

function computeTrendSlope(points) {
  // points: [{ts: epoch_ms, score: number}, ...] - simple slope = (last - first) / count
  if (!points || points.length < 2) return { slope: 0, points: points.length };
  const first = points[0];
  const last = points[points.length - 1];
  const days = Math.max(1, (last.ts - first.ts) / (1000 * 60 * 60 * 24));
  const slope = (last.score - first.score) / days;
  return { slope, days };
}

function computeDeterministicAnalytics(payload, history) {
  // payload: {score, topic, completion_time}
  // history: array of previous quiz_results [{score, topic, ts, completion_time, topic_performance}]
  const lastScores = (history || []).map(h => ({ ts: h.ts || Date.now(), score: Number(h.score || 0) }));
  lastScores.push({ ts: Date.now(), score: Number(payload.score || 0) });

  const score_list = lastScores.map(p => p.score);
  const average_score = simpleMean(score_list);
  const previous_score = lastScores.length >= 2 ? lastScores[lastScores.length - 2].score : null;
  const improvement = previous_score !== null ? (payload.score - previous_score) : null;

  // topic mastery: aggregate last N topic_performance if present
  const topic_mastery = {};
  (history || []).forEach(h => {
    if (h.topic && h.topic_performance) {
      topic_mastery[h.topic] = topic_mastery[h.topic] || { correct: 0, total: 0 };
      const tp = h.topic_performance[h.topic] || { correct: 0, total: 0 };
      topic_mastery[h.topic].correct += tp.correct || 0;
      topic_mastery[h.topic].total += tp.total || 0;
    }
  });
  // include current payload topic if provided
  if (payload.topic) {
    topic_mastery[payload.topic] = topic_mastery[payload.topic] || { correct: 0, total: 0 };
  }

  const weak_topics = [];
  const strong_topics = [];
  Object.keys(topic_mastery).forEach(t => {
    const s = topic_mastery[t].total ? Math.round((topic_mastery[t].correct / topic_mastery[t].total) * 100) : 0;
    if (s < 60) weak_topics.push({ topic: t, pct: s });
    else if (s >= 80) strong_topics.push({ topic: t, pct: s });
  });

  const trend = computeTrendSlope(lastScores);

  // simple time_on_task placeholder
  const time_on_task = { avg_seconds: payload.completion_time || null };

  // simple cognitive breakdown placeholder
  const cognitive_breakdown = { level1: 0, level2: 0, level3: 0, level4: 0 };

  return {
    average_score,
    previous_score,
    improvement,
    topic_mastery,
    weak_topics,
    strong_topics,
    trend_metrics: trend,
    time_on_task,
    cognitive_breakdown,
    percentage: payload.score
  };
}

module.exports = { computeDeterministicAnalytics };

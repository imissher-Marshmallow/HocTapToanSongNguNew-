require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { query } = require('./db');
const aiQueue = require('bull')('ai-insights', process.env.REDIS_URL);
const { computeDeterministicAnalytics } = require('./helpers/analytics');

const app = express();
app.use(bodyParser.json());

function validatePayload(body) {
  return body && body.submission_id && body.student_id && (typeof body.score !== 'undefined');
}

async function updateLearningProfile(student_id, cognitive_breakdown) {
  // simple upsert: fetch profile, update quizzes_taken and cognitive_levels
  const res = await query('SELECT id, cognitive_levels, quizzes_taken FROM user_learning_profiles WHERE student_id=$1', [student_id]);
  if (res.rows.length) {
    const row = res.rows[0];
    const newLevels = Object.assign({}, row.cognitive_levels || {}, cognitive_breakdown || {});
    const quizzes = (row.quizzes_taken || 0) + 1;
    await query('UPDATE user_learning_profiles SET cognitive_levels=$1, quizzes_taken=$2, last_updated=now() WHERE id=$3', [JSON.stringify(newLevels), quizzes, row.id]);
    return { cognitive_levels: newLevels };
  } else {
    const newLevels = cognitive_breakdown || {level1:0,level2:0,level3:0,level4:0};
    await query('INSERT INTO user_learning_profiles (student_id, cognitive_levels, quizzes_taken, last_updated) VALUES($1,$2,1,now())', [student_id, JSON.stringify(newLevels)]);
    return { cognitive_levels: newLevels };
  }
}

app.post('/api/results', async (req, res) => {
  const body = req.body;
  if (!validatePayload(body)) return res.status(400).json({ error: 'invalid payload' });

  try {
    // idempotency: check submission_id
    const existing = await query('SELECT id, ai_insight_ready FROM quiz_results WHERE submission_id=$1', [body.submission_id]);
    if (existing.rows.length) {
      return res.json({ resultId: existing.rows[0].id, ai_insight_pending: !existing.rows[0].ai_insight_ready });
    }

    // fetch history for deterministic analytics (last 10 attempts)
    const histRes = await query('SELECT score, topic, created_at as ts, deterministic_analytics as topic_performance FROM quiz_results WHERE student_id=$1 ORDER BY created_at DESC LIMIT 10', [body.student_id]);
    const history = histRes.rows.map(r => ({ score: Number(r.score), topic: r.topic, ts: new Date(r.ts).getTime(), topic_performance: r.topic_performance || {} }));

    const analytics = computeDeterministicAnalytics({ score: body.score, topic: body.topic, completion_time: body.completion_time }, history.reverse());

    await query('BEGIN');
    const insertRes = await query(
      `INSERT INTO quiz_results (submission_id, student_id, quiz_id, topic, score, max_score, percentage, completion_time_seconds, answers, deterministic_analytics, created_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now()) RETURNING id`,
      [body.submission_id, body.student_id, body.quiz_id || null, body.topic || null, body.score, body.max_score || null, analytics.percentage, body.completion_time || null, JSON.stringify(body.answers || {}), JSON.stringify(analytics)]
    );
    const resultId = insertRes.rows[0].id;

    const profile = await updateLearningProfile(body.student_id, analytics.cognitive_breakdown);

    // insert ml_performance_records
    await query(
      `INSERT INTO ml_performance_records (student_id, result_id, score, topic_mastery, bloom_snapshot, trend_metrics, time_on_task, created_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,now())`,
      [body.student_id, resultId, body.score, JSON.stringify(analytics.topic_mastery), JSON.stringify(profile.cognitive_levels), JSON.stringify(analytics.trend_metrics), JSON.stringify(analytics.time_on_task)]
    );

    await query('COMMIT');

    // enqueue AI job
    await aiQueue.add({ resultId, studentId: body.student_id }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 } });

    return res.json({ resultId, score: body.score, percentage: analytics.percentage, bloom_levels: profile.cognitive_levels, deterministic_analytics: analytics, ai_insight_pending: true });
  } catch (err) {
    await query('ROLLBACK');
    console.error('error processing /api/results', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log('Server example listening on', port));

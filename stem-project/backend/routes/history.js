const express = require('express');
const { dbHelpers } = require('../database');
const router = express.Router();

// GET /api/history?userId=xxx
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId' });
    }
    // Fetch latest 20 results for user
    const results = await dbHelpers.getUserResults(userId, 20);
    // Format for frontend
    const formatted = results.map(r => ({
      id: r.id,
      quizName: r.quiz_id || 'Quiz',
      score: typeof r.score === 'number' ? r.score : Number(r.score) || 0,
      totalScore: 10,
      timeTaken: r.ai_analysis && r.ai_analysis.timeTaken ? r.ai_analysis.timeTaken : null,
      date: r.created_at,
      status: r.score >= 5 ? 'passed' : 'failed',
      correctAnswers: r.ai_analysis && r.ai_analysis.correctAnswers ? r.ai_analysis.correctAnswers : null,
      totalQuestions: r.total_questions,
      accuracy: r.ai_analysis && r.ai_analysis.accuracy ? r.ai_analysis.accuracy : null,
      weakAreas: r.weak_areas || [],
      strengthAreas: r.ai_analysis && r.ai_analysis.strengthAreas ? r.ai_analysis.strengthAreas : [],
      recommendations: r.recommendations || [],
    }));
    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('Error fetching history:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/history/summary?userId=xxx
router.get('/summary', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId' });
    }
    const results = await dbHelpers.getUserResults(userId, 100);
    // Calculate chart data, weakness, strength
    let totalScore = 0, totalAttempts = 0, weakAreas = {}, strengthAreas = {};
    const chart = [];
    results.forEach(r => {
      const score = typeof r.score === 'number' ? r.score : Number(r.score) || 0;
      chart.push({ date: r.created_at, score });
      totalScore += score;
      totalAttempts++;
      // Weak/strength areas
      (r.weak_areas || []).forEach(w => { weakAreas[w] = (weakAreas[w] || 0) + 1; });
      if (r.ai_analysis && r.ai_analysis.strengthAreas) {
        r.ai_analysis.strengthAreas.forEach(s => { strengthAreas[s] = (strengthAreas[s] || 0) + 1; });
      }
    });
    // Sort and pick top 3
    const topWeak = Object.entries(weakAreas).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);
    const topStrength = Object.entries(strengthAreas).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);
    res.json({ success: true, data: {
      chart,
      averageScore: totalAttempts ? (totalScore/totalAttempts).toFixed(2) : 0,
      attempts: totalAttempts,
      topWeak,
      topStrength
    }});
  } catch (err) {
    console.error('Error fetching summary:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

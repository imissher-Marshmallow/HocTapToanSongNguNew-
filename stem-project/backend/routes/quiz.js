const express = require('express');
const { analyzeQuiz, loadQuestionsForQuiz, loadGroupedQuestionsForQuiz } = require('../ai/analyzer');
const jwt = require('jsonwebtoken');
const { dbHelpers } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const router = express.Router();

// Lightweight rate limiter for analyze endpoint (avoid rapid duplicate analysis)
const lastAnalyzeAt = new Map();
const ANALYZE_WINDOW_MS = 1000;

// GET /api/questions/:quizId
router.get('/questions/:quizId', (req, res) => {
  try {
    const { quizId } = req.params;
    const result = loadQuestionsForQuiz(quizId);
    // result may be { questions, contestKey } or an array for backward compatibility
    if (result && result.questions) res.json(result);
    else res.json({ questions: result, contestKey: quizId });
  } catch (error) {
    console.error('Error loading questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/questions/random -> pick one random contest (1..N) and return shuffled questions
router.get('/questions/random', (req, res) => {
  try {
    // Prevent caching of randomized responses
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    const result = loadQuestionsForQuiz('random');
    console.log('[QuizRoute] /questions/random selected', { contestKey: result.contestKey, contestIndex: result.contestIndex, contestName: result.contestName });
    if (result && result.questions) res.json(result);
    else res.json({ questions: result, contestKey: 'random' });
  } catch (error) {
    console.error('Error loading random questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/questions/:quizId/grouped -> return questions grouped by topic buckets
router.get('/questions/:quizId/grouped', (req, res) => {
  try {
    const { quizId } = req.params;
    const grouped = loadGroupedQuestionsForQuiz(quizId);
    res.json(grouped);
  } catch (error) {
    console.error('Error loading grouped questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/analyze-quiz
router.post('/analyze-quiz', async (req, res) => {
  try {
    const payload = req.body;
    console.log('Received quiz analysis request:', payload);

    // Basic rate-limit to avoid duplicate analysis from rapid retries
    try {
      const key = String(payload.userId || 'anon');
      const now = Date.now();
      const last = lastAnalyzeAt.get(key) || 0;
      if (now - last < ANALYZE_WINDOW_MS) {
        console.warn('[AnalyzeQuiz] Rate limit triggered for', key);
        // continue but avoid saving; still run analyzer for freshness
      }
      lastAnalyzeAt.set(key, now);
    } catch (e) {}

    const result = await analyzeQuiz(payload);

    console.log('Analysis result:', result);
    // If a userId is present in the payload or Authorization header, save the result to DB
    try {
      // If client requested to skip saving from analyze-quiz (frontend will POST to /api/results), obey that.
      if (payload && payload.skipSave) {
        console.log('[AnalyzeQuiz] skipSave flag detected — not persisting to DB from analyze-quiz');
      } else {
      // Determine userId: prefer payload.userId, else JWT token
      let finalUserId = payload.userId;
      if (!finalUserId) {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
          try {
            const decoded = jwt.verify(token, JWT_SECRET);
            finalUserId = decoded?.userId;
          } catch (e) {
            // ignore token decode errors
            console.warn('[AnalyzeQuiz] JWT verify failed:', e && e.message);
          }
        }
      }

      const numericUserId = finalUserId && finalUserId !== 'anonymous' ? Number(finalUserId) : null;
      if (numericUserId && !Number.isNaN(numericUserId)) {
        // Save placeholder result and then AI analysis + score update
        const quizId = payload.quizId || payload.quiz || 'unknown-quiz';
        const answers = Array.isArray(payload.answers) ? payload.answers : [];
        const totalQuestions = answers.length || (payload.questions ? payload.questions.length : 0) || 0;

        console.log('[AnalyzeQuiz] Saving result for userId=', numericUserId, 'quizId=', quizId);

        // If client supplied a submissionId, check idempotency before inserting
        const submissionId = payload.submissionId || null;
        if (submissionId) {
          try {
            const existing = await dbHelpers.getResultBySubmissionId(submissionId);
            if (existing) {
              console.log('[AnalyzeQuiz] Existing result found for submissionId, skipping duplicate save id=', existing.id);
              // Save AI analysis in case it is missing
              try {
                const aiAnalysisToSave = result || {};
                await dbHelpers.saveAIAnalysis(existing.id, aiAnalysisToSave);
              } catch (e) {}
              // Update score as well
              try {
                await dbHelpers.updateResult(existing.id, {
                  score: Number(result.score) || 0,
                  weakAreas: result.weakAreas || [],
                  feedback: result.summary || {},
                  recommendations: result.recommendations || []
                });
              } catch (e) {}
              // Return the analysis result to caller
            }
          } catch (e) {
            console.warn('[AnalyzeQuiz] Idempotency check failed:', e && e.message ? e.message : e);
          }
        }

        const placeholderId = await dbHelpers.saveResult(
          numericUserId,
          quizId,
          0,
          totalQuestions,
          answers,
          [],
          {},
          {},
          submissionId
        );
        console.log(`[AnalyzeQuiz] Saved placeholder result ${placeholderId}`);

        // Save full ai_analysis
        const aiAnalysisToSave = result || {};
        try {
          await dbHelpers.saveAIAnalysis(placeholderId, aiAnalysisToSave);
          console.log(`[AnalyzeQuiz] Saved AI analysis for result ${placeholderId}`);
        } catch (e) {
          console.warn('[AnalyzeQuiz] Failed to save AI analysis:', e && e.message);
        }

        // Update final score and weak_areas if present
        const finalScore = Number(result.score) || 0;
        const weakAreas = result.weakAreas || [];
        try {
          await dbHelpers.updateResult(placeholderId, {
            score: finalScore,
            weakAreas,
            feedback: result.summary || {},
            recommendations: result.recommendations || []
          });
          console.log(`[AnalyzeQuiz] Updated result ${placeholderId} with score ${finalScore}`);
        } catch (e) {
          console.warn('[AnalyzeQuiz] Failed to update result score:', e && e.message);
        }
      } else {
        console.log('[AnalyzeQuiz] No authenticated userId available; skipping DB save');
      }
      }
    } catch (saveErr) {
      console.error('[AnalyzeQuiz] Error while saving analysis result:', saveErr && saveErr.message ? saveErr.message : saveErr);
    }

    res.json(result);
  } catch (error) {
    console.error('Error analyzing quiz:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

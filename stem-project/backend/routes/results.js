const express = require('express');
const jwt = require('jsonwebtoken');
const { dbHelpers, db } = require('../database');
const { analyzeQuiz } = require('../ai/analyzer');
const MLAnalyticsService = require('../ai/MLAnalyticsService');
const MLAnalyticsDB = require('../ai/MLAnalyticsDB');

const router = express.Router();

// Initialize Supabase client (optional - will be null if module not installed)
let supabase = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  supabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
    : null;
} catch (err) {
  console.warn('[Results] @supabase/supabase-js not available - Supabase save disabled:', err.message);
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to extract and verify JWT token
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    // For now, allow anonymous (use default userId)
    req.userId = 'anonymous';
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
  } catch (err) {
    req.userId = 'anonymous';
  }
  next();
};

// Lightweight per-user in-memory rate limiter for submissions (short window)
const lastSubmissionAt = new Map();
const SUBMIT_WINDOW_MS = 2000; // 2 seconds
const rateLimitSubmission = (req, res, next) => {
  const user = req.userId || req.body.userId || 'anonymous';
  try {
    const key = String(user);
    const now = Date.now();
    const last = lastSubmissionAt.get(key) || 0;
    if (now - last < SUBMIT_WINDOW_MS) {
      console.warn('[Results] Rate limit triggered for', key);
      return res.status(429).json({ error: 'Too many submissions, please wait a moment' });
    }
    lastSubmissionAt.set(key, now);
    next();
  } catch (e) {
    next();
  }
};

// POST /api/results - Store exam result and trigger AI analysis
router.post('/', authMiddleware, rateLimitSubmission, async (req, res) => {
  try {
    const { userId, quizId, quizName, answers, questions, ai_analysis, timeTaken, submissionId } = req.body;
    const finalUserId = userId || req.userId || 'anonymous';

    console.log('[Results] POST /api/results received:', {
      bodyUserId: userId,
      middlewareUserId: req.userId,
      finalUserId,
      quizId,
      answersLength: answers?.length,
      questionsLength: questions?.length
    });

    // Require a valid numeric user id to save results (prevent anonymous inserts)
    const numericUserId = finalUserId && finalUserId !== 'anonymous' ? Number(finalUserId) : null;
    if (!numericUserId || Number.isNaN(numericUserId)) {
      console.warn('[Results] Invalid or missing userId, rejecting save. finalUserId=', finalUserId);
      return res.status(400).json({ error: 'Invalid or missing userId (must be authenticated)' });
    }

    if (!quizId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Missing required fields: quizId, answers' });
    }

    // Initialize result save with placeholder score (will be updated with AI analysis)
    const totalQuestions = answers.length;
    let resultId = null;
    let placeholderScore = 0; // placeholder - will be updated after analyzer runs

    // Idempotency: if submissionId provided, check existing result first
    if (submissionId) {
      try {
        const existing = await dbHelpers.getResultBySubmissionId(submissionId);
        if (existing) {
          console.log('[Results] Existing result found for submissionId, returning existing result id=', existing.id);
          // Parse stored fields and return consistent shape
          const safeParse = (v, fallback) => {
            if (v === null || typeof v === 'undefined') return fallback;
            if (typeof v === 'string') {
              try { return JSON.parse(v); } catch (e) { return fallback; }
            }
            return v;
          };
          const storedAi = safeParse(existing.ai_analysis, {});
          const parsedAnswers = safeParse(existing.answers, []);
          const totalQ = existing.total_questions || (Array.isArray(parsedAnswers) ? parsedAnswers.length : 0);
          const actualScore = Number(existing.score) || 0;
          const fullResult = {
            resultId: existing.id,
            score: actualScore,
            totalQuestions: totalQ,
            percentage: totalQ > 0 ? Math.round((actualScore / totalQ) * 100) : 0,
            answers: parsedAnswers,
            ...storedAi
          };
          return res.json(fullResult);
        }
      } catch (e) {
        console.warn('[Results] Idempotency check failed:', e && e.message ? e.message : e);
        // continue and attempt insert
      }
    }

    try {
      resultId = await dbHelpers.saveResult(
        numericUserId,
        quizId,
        placeholderScore,
        totalQuestions,
        answers,
        [], // will be filled by AI
        {}, // will be filled by AI
        {}, // will be filled by AI
        submissionId || null
      );
      console.log(`[Results] Saved placeholder result ${resultId} for user ${numericUserId} submissionId=${submissionId}`);
    } catch (dbErr) {
      console.error('[Results] Failed to save initial result:', dbErr && dbErr.message ? dbErr.message : dbErr);
      // Return a 500 here — if we can't insert the placeholder, further updates will fail.
      return res.status(500).json({ error: 'Failed to create result record', details: dbErr && dbErr.message });
    }

    // If ai_analysis is provided by caller (frontend already analyzed), use it and skip double analysis
    let aiResult = null;
    let mlAnalysis = null;
    
    if (ai_analysis) {
      aiResult = ai_analysis;
      console.log('[Results] Using ai_analysis provided in request body (skipping analyzer)');
    } else {
      // Call AI analyzer (local Node.js - no external service)
      const analyzerPayload = {
        userId: finalUserId,
        quizId,
        answers,
        questions: questions || []
      };
      try {
        aiResult = await analyzeQuiz(analyzerPayload);
        console.log('[Results] Local analyzer completed successfully');
      } catch (err) {
        console.error('[Results] Local analyzer failed:', err && err.message ? err.message : err);
        aiResult = { score: 0, weakAreas: [], recommendations: [], summary: null };
      }
    }

    // Run ML Analytics on the quiz data (parallel to traditional analyzer)
    try {
      const mlService = new MLAnalyticsService(db);
      const mlPayload = {
        userId: numericUserId,
        quizId,
        answers,
        questions: questions || []
      };
      mlAnalysis = await mlService.analyzeAndStore(mlPayload.userId, mlPayload.quizId, mlPayload.questions, mlPayload.answers);
      console.log('[Results] ML Analytics completed successfully');
      
      // If ML analysis succeeded, store it to Supabase asynchronously (non-blocking)
      if (mlAnalysis && mlAnalysis.success) {
        mlService.storeAnalysis(mlPayload.userId, mlPayload.quizId, mlAnalysis.analysis).catch(err => {
          console.warn('[Results] ML Analytics storage failed (non-blocking):', err && err.message ? err.message : err);
        });
      }
    } catch (err) {
      console.warn('[Results] ML Analytics failed (continuing without it):', err && err.message ? err.message : err);
      mlAnalysis = { success: false };
    }

    // Extract actual score from AI analyzer (coerce to number)
    const actualScore = Number(aiResult.score) || 0;
    // Extract weakness topic names (handle both object and string formats)
    const weakAreas = (aiResult.weakAreas || []).map(w => {
      return (typeof w === 'object' && w !== null && w.topic) ? w.topic : (typeof w === 'string' ? w : String(w));
    });
    const summary = aiResult.summary || {};

    // Debug logging: show values we'll save
    console.log('[Results] debug values:', {
      finalUserId,
      quizId,
      answersLength: Array.isArray(answers) ? answers.length : 0,
      resultId,
      placeholderScore,
      aiScore: aiResult && typeof aiResult.score !== 'undefined' ? aiResult.score : null
    });

    // Update result with AI-generated score and analysis
    if (resultId && aiResult) {
      try {
        // Merge all important AI summary fields into ai_analysis
        const aiAnalysisToSave = {
          ...aiResult,
          strengths: summary?.strengths || [],
          weaknesses: summary?.weaknesses || [],
          plan: summary?.plan || [],
          motivationalFeedback: aiResult.motivationalFeedback || summary?.motivationalFeedback || null,
          resourceLinks: aiResult.resourceLinks || summary?.resourceLinks || [],
        };
        await dbHelpers.saveAIAnalysis(resultId, aiAnalysisToSave);
        console.log(`[Results] Saved AI analysis for result ${resultId}`);

        // Update score and weak_areas in results table using dbHelpers.updateResult
          try {
            await dbHelpers.updateResult(resultId, {
              score: actualScore,
              weakAreas,
              feedback: summary,
              recommendations: aiResult.recommendations || []
            });
            console.log(`[Results] Updated result ${resultId} with score ${actualScore}`);
          } catch (updErr) {
            console.warn('[Results] Failed to update score via dbHelpers.updateResult:', updErr && updErr.message ? updErr.message : updErr);
          }

        // If timeTaken was provided, save it into ai_analysis as well
        if (typeof timeTaken !== 'undefined' && timeTaken !== null) {
          aiAnalysisToSave.timeTaken = timeTaken;
        }

        // Generate and save learning plan from the AI summary
        if (summary && summary.plan && Array.isArray(summary.plan) && summary.plan.length > 0) {
          try {
            for (let dayNum = 1; dayNum <= Math.min(summary.plan.length, 5); dayNum++) {
              const planItem = summary.plan[dayNum - 1];
              const topics = (planItem && planItem.step) ? [planItem.step] : [];
              const exercises = (planItem && planItem.action) ? [planItem.action] : [];
              await dbHelpers.saveLearningPlan(resultId, finalUserId, dayNum, topics, exercises);
            }
            console.log(`[Results] Saved ${Math.min(summary.plan.length, 5)} learning plan days for result ${resultId}`);
          } catch (planErr) {
            console.warn('[Results] Failed to save learning plan:', planErr.message);
          }
        }

      } catch (updateErr) {
        console.error('[Results] Failed to update result with AI data:', updateErr.message);
      }
    }

    // Build answer comparison from questions
    const answerComparison = answers.map((answer) => {
      const question = questions?.find(q => q.id === answer.questionId);
      if (!question) return null;
      return {
        questionId: answer.questionId,
        question: question.content || question.question,
        userAnswer: answer.selectedOption,
        correctAnswer: question.options[question.answerIndex],
        isCorrect: question.options.indexOf(answer.selectedOption) === question.answerIndex,
        explanation: question.explanation || ''
      };
    }).filter(x => x !== null);

    // Return comprehensive result to frontend (including ML analysis if available)
    const fullResult = {
      resultId,
      score: actualScore,
      totalQuestions,
      percentage: totalQuestions > 0 ? Math.round((actualScore / totalQuestions) * 100) : 0,
      answerComparison,
      ...aiResult, // includes summary, feedback, recommendations, weakAreas
      // Include ML Analytics data if available
      ...(mlAnalysis && mlAnalysis.success && mlAnalysis.analysis ? {
        mlAnalysis: mlAnalysis.analysis,
        weaknesses: mlAnalysis.analysis.weaknesses || [],
        strengths: mlAnalysis.analysis.strengths || [],
        predictions: mlAnalysis.analysis.predictions || {},
        learningPath: mlAnalysis.analysis.learningPath || {}
      } : {})
    };

    // Save to Supabase for recommendations & profile updates (non-blocking)
    if (supabase && finalUserId && finalUserId !== 'anonymous') {
      (async () => {
        try {
          // Extract topic performance from aiResult if available, otherwise from answers
          const topicPerf = {};
          const cognitiveBreakdown = {};
          
          // First try to get from AI analysis
          if (aiResult && aiResult.weakAreas && Array.isArray(aiResult.weakAreas)) {
            aiResult.weakAreas.forEach(area => {
              if (area.topic) {
                topicPerf[area.topic] = { 
                  score: area.score || 0,
                  improvement_needed: area.recommendedLevel || 'intermediate'
                };
              }
            });
          }
          
          // If no topics from AI, calculate from answers
          if (Object.keys(topicPerf).length === 0) {
            // Group answers by topic from question data
            const topicStats = {};
            answers.forEach(answer => {
              const question = questions?.find(q => q.id === answer.questionId);
              if (question && question.topic) {
                if (!topicStats[question.topic]) {
                  topicStats[question.topic] = { correct: 0, total: 0 };
                }
                topicStats[question.topic].total += 1;
                if (question.options.indexOf(answer.selectedOption) === question.answerIndex) {
                  topicStats[question.topic].correct += 1;
                }
              }
            });
            
            // Convert to performance format
            Object.entries(topicStats).forEach(([topic, stats]) => {
              const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
              topicPerf[topic] = {
                score: percentage,
                correct: stats.correct,
                total: stats.total,
                level: percentage >= 80 ? 'advanced' : percentage >= 60 ? 'intermediate' : 'beginner'
              };
            });
          }
          
          // Save quiz result to Supabase for unified data system
          const { error } = await supabase.from('quiz_results').insert([{
            user_id: finalUserId,
            quiz_id: quizId || 'main-quiz',
            overall_score: actualScore,
            correct_answers: correct,
            total_questions: totalQuestions,
            time_spent_seconds: timeTaken || 0,
            topic_performance: topicPerf,
            cognitive_breakdown: cognitiveBreakdown,
            answer_details: answers,
            created_at: new Date().toISOString()
          }]);
          
          if (error) {
            console.warn('[Results] Supabase save (non-blocking):', error.message);
          } else {
            console.log('[Results] Saved to Supabase quiz_results for user', finalUserId);
            console.log('[Results] Topics saved:', Object.keys(topicPerf).join(', '));
            
            // Update user profile with new skills
            try {
              const userSkills = {};
              
              // Build skills from topic performance
              Object.entries(topicPerf).forEach(([topic, perf]) => {
                userSkills[topic] = {
                  level: perf.level || 'intermediate',
                  score: perf.score || 0,
                  lastUpdated: new Date().toISOString()
                };
              });
              
              // Update user profile in users table
              const { error: updateError } = await supabase
                .from('users')
                .update({
                  skills: userSkills,
                  last_quiz_score: actualScore,
                  last_quiz_date: new Date().toISOString()
                })
                .eq('id', finalUserId);
              
              if (updateError) {
                console.warn('[Results] Profile update failed:', updateError.message);
              } else {
                console.log('[Results] Updated user profile with skills for', finalUserId);
              }
            } catch (updateErr) {
              console.warn('[Results] Profile update exception:', updateErr.message);
            }
          }
        } catch (err) {
          console.warn('[Results] Supabase save exception (non-blocking):', err.message);
        }
      })();
    }

    res.json(fullResult);
  } catch (error) {
    console.error('Error saving result:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// GET /api/results/:resultId - Retrieve a specific result
router.get('/:resultId', authMiddleware, async (req, res) => {
  try {
    const { resultId } = req.params;
    const result = await dbHelpers.getResultById(resultId);
    
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    // Verify user owns this result (if userId check is implemented)
    // if (result.user_id !== req.userId) { return res.status(403).json({ error: 'Unauthorized' }); }

    // Parse JSON fields
    result.answers = JSON.parse(result.answers || '[]');
    result.weak_areas = JSON.parse(result.weak_areas || '[]');
    result.feedback = JSON.parse(result.feedback || '[]');
    result.recommendations = JSON.parse(result.recommendations || '[]');
    result.ai_analysis = JSON.parse(result.ai_analysis || '{}');

    res.json(result);
  } catch (error) {
    console.error('Error fetching result:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// GET /api/results - Get all results for a user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId || 'anonymous';
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    
    const results = await dbHelpers.getUserResults(userId, limit);
    
    // Parse JSON fields for each result
    const safeParse = (v, fallback) => {
      if (v === null || typeof v === 'undefined') return fallback;
      if (typeof v === 'string') {
        try { return JSON.parse(v); } catch (e) { return fallback; }
      }
      return v;
    };
    const parsedResults = results.map(r => ({
      ...r,
      answers: safeParse(r.answers, []),
      weak_areas: safeParse(r.weak_areas, []),
      feedback: safeParse(r.feedback, {}),
      recommendations: safeParse(r.recommendations, []),
      ai_analysis: safeParse(r.ai_analysis, {})
    }));

    res.json(parsedResults);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;

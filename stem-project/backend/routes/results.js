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
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[Results] ✓ Supabase client initialized successfully');
  } else {
    console.warn('[Results] ⚠ Supabase credentials missing - SUPABASE_URL or SUPABASE_ANON_KEY not set');
    console.warn('[Results]   SUPABASE_URL:', supabaseUrl ? '✓ set' : '✗ not set');
    console.warn('[Results]   SUPABASE_ANON_KEY:', supabaseKey ? '✓ set' : '✗ not set');
  }
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

    // Log first question to verify topic field exists
    if (questions && questions.length > 0) {
      console.log('[Results] First question structure:', {
        id: questions[0].id,
        topic: questions[0].topic,
        difficulty: questions[0].difficulty,
        hasQuestion: !!questions[0].question,
        hasOptions: !!questions[0].options,
        hasAnswerIndex: questions[0].answerIndex !== undefined,
        hasCorrectAnswer: questions[0].correctAnswer !== undefined
      });
      console.log('[Results] Sample topics from all questions:', questions.slice(0, 5).map(q => q.topic));
    }

    // Enrich questions with answer indices from master question database
    // Always try to enrich - answers won't match without these indices
    // This allows the backend to match submitted answers against correct answers
    if (questions && questions.length > 0) {
      const firstQ = questions[0];
      const needsEnrichment = !firstQ.answerIndex || firstQ.answerIndex === null || firstQ.answerIndex === undefined;
      
      if (needsEnrichment) {
        console.log('[Results] Questions missing answerIndex - enriching from master data...');
        try {
          const { getAllQuestions } = require('../ai/loadQuestions');
          const allQuestionsData = getAllQuestions();
          const questionMap = {};
          allQuestionsData.forEach(q => {
            questionMap[q.id] = q;
          });
          
          console.log('[Results] Master questions loaded:', allQuestionsData.length, 'total questions');
          console.log('[Results] Looking up questions by ID:', questions.slice(0, 3).map(q => q.id).join(', '));
          
          // Enrich each question with answer indices from master data
          let enrichedCount = 0;
          questions.forEach((q, idx) => {
            const masterQuestion = questionMap[q.id];
            if (masterQuestion) {
              q.answerIndex = masterQuestion.answerIndex;
              q.correctAnswer = masterQuestion.answerIndex;
              enrichedCount++;
              if (idx < 3) {
                console.log(`[Results] Q${idx}: id=${q.id} -> answerIndex=${q.answerIndex}`);
              }
            } else {
              console.warn(`[Results] Q${idx}: id=${q.id} not found in master questions!`);
            }
          });
          console.log(`[Results] ✓ Enriched ${enrichedCount}/${questions.length} questions with answer indices`);
        } catch (enrichErr) {
          console.error('[Results] ✗ Failed to enrich questions:', enrichErr);
          // Continue anyway - answers may still be analyzable
        }
      } else {
        console.log('[Results] Questions already have answerIndex - skipping enrichment');
      }
    }

    // Use guest user (id=1) for anonymous submissions, or parse numeric user_id for authenticated users
    let numericUserId;
    if (finalUserId && finalUserId !== 'anonymous' && !isNaN(Number(finalUserId))) {
      numericUserId = Number(finalUserId);
    } else {
      // Use guest user account (id=1) for unauthenticated submissions
      numericUserId = 1;
      console.log('[Results] Using guest user (id=1) for anonymous submission');
    }
    
    if (!numericUserId || Number.isNaN(numericUserId)) {
      console.error('[Results] Failed to determine user_id. finalUserId=', finalUserId);
      return res.status(400).json({ error: 'Unable to determine user ID' });
    }

    if (!quizId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Missing required fields: quizId, answers' });
    }

    // Initialize result save with placeholder score (will be updated with AI analysis)
    const totalQuestions = answers.length;
    let resultId = null;
    let placeholderScore = 0; // placeholder - will be updated after analyzer runs

    // Idempotency: if submissionId provided, check existing result first
    if (submissionId && dbHelpers && typeof dbHelpers.getResultBySubmissionId === 'function') {
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
      if (!dbHelpers || typeof dbHelpers.saveResult !== 'function') {
        throw new Error('dbHelpers.saveResult is not available');
      }
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
      // Only run ML Analytics if we have a valid database pool (PostgreSQL only, not SQLite)
      if (db && typeof db.query === 'function') {
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
      } else {
        console.log('[Results] Skipping ML Analytics (not available with current database)');
        mlAnalysis = { success: false };
      }
    } catch (err) {
      console.warn('[Results] ML Analytics failed (continuing without it):', err && err.message ? err.message : err);
      mlAnalysis = { success: false };
    }

    // Extract actual score from AI analyzer (coerce to number)
    // If score is decimal (0-1 range), convert to 0-10 scale
    // Support both 'score' and 'overallScore' property names
    let scoreFromAI = Number(aiResult.score || aiResult.overallScore || 0);
    const actualScore = scoreFromAI > 1 ? Math.round(scoreFromAI) : Math.round(scoreFromAI * 10);
    
    // FIX: Add detailed logging for score handling
    console.log('[Results] ✅ SCORE HANDLING DEBUG:');
    console.log('[Results]   - aiResult.score:', aiResult.score);
    console.log('[Results]   - aiResult.scoreOutOf10:', aiResult.scoreOutOf10);
    console.log('[Results]   - aiResult.overallScore:', aiResult.overallScore);
    console.log('[Results]   - scoreFromAI (parsed):', scoreFromAI);
    console.log('[Results]   - actualScore (converted):', actualScore);
    console.log('[Results]   - scoreFromAI > 1?', scoreFromAI > 1);
    
    // Calculate percentage properly
    const percentage = totalQuestions > 0 ? Math.round((actualScore / 10) * 100) : 0;
    console.log('[Results]   - totalQuestions:', totalQuestions);
    console.log('[Results]   - percentage:', percentage + '%');
    
    // Extract weakness topic names (handle both object and string formats)
    const weakAreas = (aiResult.weakAreas || []).map(w => {
      return (typeof w === 'object' && w !== null && w.topic) ? w.topic : (typeof w === 'string' ? w : String(w));
    });
    const summary = aiResult.summary || {};
    
    // Calculate Bloom's taxonomy levels (cognitive complexity)
    // Level 1 (NB/Knowledge): difficulty=1, Level 2 (TH/Comprehension): difficulty=2
    // Level 3 (VDT/Application): difficulty=3, Level 4 (VDC/Analysis): difficulty=4
    const bloomLevels = { level1: 0, level2: 0, level3: 0, level4: 0 };
    const bloomCounts = { level1: 0, level2: 0, level3: 0, level4: 0 };
    
    if (Array.isArray(answers) && Array.isArray(questions)) {
      answers.forEach((answer, index) => {
        const question = questions[index];
        if (!question) return;
        
        const difficulty = parseInt(question.difficulty) || 1;
        const levelKey = `level${difficulty}`;
        
        // Count this difficulty level
        if (bloomCounts[levelKey] !== undefined) {
          bloomCounts[levelKey]++;
        }
        
        // Add to score if correct
        // Handle both formats: answer as number or answer as object with .answer property
        let selectedIndex;
        if (typeof answer === 'number') {
          selectedIndex = answer;
        } else if (answer && typeof answer === 'object') {
          selectedIndex = answer.answer || answer.selectedIndex;
        }
        
        const correctIndex = question.correctAnswer || question.answerIndex || question.answer;
        if (selectedIndex === correctIndex && bloomLevels[levelKey] !== undefined) {
          bloomLevels[levelKey]++;
        }
      });
    }
    
    // Convert counts to percentages for each level
    const bloomPercentages = { level1: 0, level2: 0, level3: 0, level4: 0 };
    Object.keys(bloomCounts).forEach(level => {
      if (bloomCounts[level] > 0) {
        bloomPercentages[level] = Math.round((bloomLevels[level] / bloomCounts[level]) * 100);
      }
    });
    
    console.log('[Results] Bloom levels calculated:', { bloomLevels, bloomCounts, bloomPercentages });

    // Calculate correct answers count
    let correctCount = 0;
    if (Array.isArray(answers) && Array.isArray(questions)) {
      correctCount = answers.filter((answer, index) => {
        const question = questions[index];
        if (!question) return false;
        // Handle different answer formats - support both number and object with .answer property
        let selectedIndex;
        if (typeof answer === 'number') {
          selectedIndex = answer;
        } else if (answer && typeof answer === 'object') {
          selectedIndex = answer.answer || answer.selectedIndex;
        }
        const correctIndex = question.correctAnswer || question.answerIndex || question.answer;
        return selectedIndex === correctIndex;
      }).length;
    }

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

    // Build answer comparison from questions (supports all three question types)
    const answerComparison = answers.map((answer) => {
      const question = questions?.find(q => q.id === answer.questionId);
      if (!question) return null;
      
      let correctAnswer, isCorrect, userAnswer;
      
      // Handle multiple choice questions
      if (question.options && Array.isArray(question.options)) {
        correctAnswer = question.options[question.answerIndex];
        userAnswer = answer.selectedOption;
        isCorrect = question.options.indexOf(answer.selectedOption) === question.answerIndex;
      }
      // Handle true/false questions
      else if (question.statements && Array.isArray(question.statements)) {
        const correctStatements = question.statements.map(s => `${s.content_vn || s.content_en}: ${s.is_true ? 'Đúng' : 'Sai'}`).join(' | ');
        correctAnswer = correctStatements;
        if (Array.isArray(answer.selectedStatements)) {
          userAnswer = answer.selectedStatements.map(s => `${s.content_vn || s.content_en}: ${s.answer}`).join(' | ');
        } else if (typeof answer.selectedStatements === 'string') {
          userAnswer = answer.selectedStatements;
        } else {
          userAnswer = 'Không trả lời';
        }
        isCorrect = Boolean(answer.isCorrect);
      }
      // Handle short answer questions
      else if (question.numerical_answer !== undefined || question.text_answer) {
        correctAnswer = question.numerical_answer !== undefined ? question.numerical_answer : question.text_answer;
        userAnswer = answer.userAnswer || answer.selectedOption || 'Không trả lời';
        isCorrect = answer.isCorrect || false;
      }
      
      return {
        questionId: answer.questionId,
        question: question.content || question.question,
        userAnswer,
        correctAnswer,
        isCorrect,
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
    if (supabase && numericUserId) {
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
            answers.forEach((answer, answerIndex) => {
              // Find question either by ID or by index
              let question;
              if (answer.questionId) {
                question = questions?.find(q => q.id === answer.questionId);
              } else {
                question = questions?.[answerIndex];
              }
              
              if (question && question.topic) {
                if (!topicStats[question.topic]) {
                  topicStats[question.topic] = { correct: 0, total: 0 };
                }
                topicStats[question.topic].total += 1;
                
                // Get the selected answer - handle both formats
                let selectedAnswer;
                if (typeof answer === 'number') {
                  selectedAnswer = answer;
                } else if (answer && typeof answer === 'object') {
                  selectedAnswer = answer.answer || answer.selectedIndex;
                }
                
                const correctIndex = question.correctAnswer || question.answerIndex || question.answer;
                if (selectedAnswer === correctIndex) {
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
          
          // Check Supabase connectivity before attempting save
          console.log('[Results] Attempting Supabase save for user ' + numericUserId);
          
          // Save quiz result to Supabase for unified data system
          const { error } = await supabase.from('quiz_results').insert([{
            user_id: numericUserId,
            quiz_id: quizId || 'main-quiz',
            overall_score: actualScore,
            correct_answers: correctCount,
            total_questions: totalQuestions,
            time_spent_seconds: timeTaken || 0,
            topic_performance: topicPerf,
            cognitive_breakdown: cognitiveBreakdown,
            answer_details: answers,
            created_at: new Date().toISOString()
          }]);
          
          if (error) {
            console.warn('[Results] Supabase quiz_results save failed (non-blocking):', error.message);
            console.warn('[Results] Error details:', JSON.stringify(error));
          } else {
            console.log('[Results] Saved to Supabase quiz_results for user ' + numericUserId);
            console.log('[Results] Topics saved: ' + Object.keys(topicPerf).join(', '));
            
            // Update user_learning_profiles with weak and strong areas AND cognitive levels
            try {
              const weakAreas = [];
              const strongAreas = [];
              
              Object.entries(topicPerf).forEach(([topic, perf]) => {
                if (perf.score < 60) {
                  weakAreas.push({ topic, percentage: perf.score || 0 });
                } else if (perf.score >= 80) {
                  strongAreas.push({ topic, percentage: perf.score || 0 });
                }
              });
              
              // Calculate proficiency_status from Bloom levels
              const proficiencyStatus = {
                level1: bloomPercentages.level1 > 0 ? getProficiencyLevel(bloomPercentages.level1) : 'NOT_STARTED',
                level2: bloomPercentages.level2 > 0 ? getProficiencyLevel(bloomPercentages.level2) : 'NOT_STARTED',
                level3: bloomPercentages.level3 > 0 ? getProficiencyLevel(bloomPercentages.level3) : 'NOT_STARTED',
                level4: bloomPercentages.level4 > 0 ? getProficiencyLevel(bloomPercentages.level4) : 'NOT_STARTED'
              };
              
              // First try to fetch the profile to see if it exists
              const { data: existingProfile } = await supabase
                .from('user_learning_profiles')
                .select('user_id')
                .eq('user_id', numericUserId)
                .single();
              
              if (existingProfile) {
                // Profile exists - update it
                const updateObj = {
                  weak_areas: weakAreas,
                  strong_areas: strongAreas,
                  cognitive_levels: bloomPercentages,
                  proficiency_status: proficiencyStatus
                };
                
                const { error: profileError } = await supabase
                  .from('user_learning_profiles')
                  .update(updateObj)
                  .eq('user_id', numericUserId);
                
                if (profileError) {
                  console.warn('[Results] user_learning_profiles update failed:', profileError.message);
                } else {
                  console.log('[Results] ✅ Updated user_learning_profiles with ' + weakAreas.length + ' weak areas, ' + strongAreas.length + ' strong areas, Bloom levels:', bloomPercentages, 'and proficiency:', proficiencyStatus);
                }
              } else {
                // Profile doesn't exist - create it
                const insertObj = {
                  user_id: numericUserId,
                  weak_areas: weakAreas,
                  strong_areas: strongAreas,
                  cognitive_levels: bloomPercentages,
                  proficiency_status: proficiencyStatus,
                  recommendations: [],
                  learning_path: null,
                  quizzes_taken: 1
                };
                
                const { error: insertError } = await supabase
                  .from('user_learning_profiles')
                  .insert([insertObj]);
                
                if (insertError) {
                  console.warn('[Results] user_learning_profiles insert failed:', insertError.message);
                } else {
                  console.log('[Results] ✅ Created new user_learning_profiles with ' + weakAreas.length + ' weak areas, ' + strongAreas.length + ' strong areas, Bloom levels:', bloomPercentages, 'and proficiency:', proficiencyStatus);
                }
              }
            } catch (profileErr) {
              console.error('[Results] ❌ user_learning_profiles operation failed:', profileErr && profileErr.message ? profileErr.message : profileErr);
            }
            
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
                .eq('id', numericUserId);
              
              if (updateError) {
                console.warn('[Results] Profile update failed:', updateError.message);
              } else {
                console.log('[Results] Updated user profile with skills for ' + numericUserId);
              }
            } catch (updateErr) {
              console.warn('[Results] Profile update exception:', updateErr && updateErr.message ? updateErr.message : updateErr);
            }
          }
        } catch (err) {
          console.warn('[Results] Supabase save exception (non-blocking) - Error type: ' + (err && err.constructor && err.constructor.name ? err.constructor.name : 'Unknown'));
          console.warn('[Results] Error message:', err && err.message ? err.message : String(err));
          if (err && err.stack) {
            console.warn('[Results] Stack trace:', err.stack.split('\n').slice(0, 3).join(' | '));
          }
        }
      })();
    } else {
      console.log('[Results] Supabase not available or invalid userId - skipping Supabase save');
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

// GET /api/results/debug/supabase - Check Supabase connectivity
router.get('/debug/supabase', async (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    const status = {
      supabaseConfigured: !!(supabaseUrl && supabaseKey),
      supabaseUrlSet: !!supabaseUrl,
      supabaseKeySet: !!supabaseKey,
      clientInitialized: !!supabase,
      timestamp: new Date().toISOString()
    };
    
    // Try a simple health check if supabase is configured
    if (supabase) {
      try {
        const { data, error } = await Promise.race([
          supabase.from('quiz_results').select('*').limit(1),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase health check timeout')), 5000))
        ]);
        status.healthCheck = error ? 'Failed: ' + error.message : 'Success';
      } catch (checkErr) {
        status.healthCheck = 'Failed: ' + checkErr.message;
      }
    } else {
      status.healthCheck = 'Skipped - Supabase not initialized';
    }
    
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Supabase check failed', message: error.message });
  }
});

/**
 * Helper: Convert Bloom percentage to proficiency level
 */
function getProficiencyLevel(percentage) {
  if (percentage >= 80) return 'PROFICIENT';
  if (percentage >= 60) return 'DEVELOPING';
  if (percentage >= 40) return 'BEGINNING';
  if (percentage > 0) return 'STARTING';
  return 'NOT_STARTED';
}

module.exports = router;

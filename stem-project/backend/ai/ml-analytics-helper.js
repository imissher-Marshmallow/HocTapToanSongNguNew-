/**
 * ML Analytics Integration Helper
 * 
 * Provides function to trigger ML analysis pipeline after quiz submission
 * Called from POST /api/results after saving initial result
 */

const MLAnalyticsService = require('../ai/MLAnalyticsService');

/**
 * Trigger ML analysis pipeline asynchronously
 * Called after quiz result is saved
 * 
 * Does NOT block the response - runs in background
 */
async function triggerMLAnalysis(pool, userId, quizId, quizData, userAnswers) {
  try {
    if (!pool) {
      console.warn('[MLAnalytics] No database pool provided, skipping ML analysis');
      return null;
    }

    const mlService = new MLAnalyticsService(pool);
    
    // Run asynchronously (don't await in the request handler)
    // This prevents slow analysis from blocking the response
    setImmediate(async () => {
      try {
        console.log(`[MLAnalytics] Starting background analysis for user ${userId}, quiz ${quizId}`);
        
        const result = await mlService.analyzeAndStore(
          userId,
          quizId,
          quizData,
          userAnswers
        );
        
        console.log(`[MLAnalytics] ✅ Background analysis completed for user ${userId}`);
        return result;
      } catch (error) {
        console.error(`[MLAnalytics] ❌ Background analysis failed for user ${userId}:`, error.message);
        // Don't throw - this is async and shouldn't affect the quiz response
      }
    });

    return { queued: true };
  } catch (error) {
    console.error('[MLAnalytics] Error queuing analysis:', error.message);
    // Return gracefully - ML analysis failure shouldn't block quiz submission
    return { error: error.message };
  }
}

/**
 * Prepare quiz data for ML analysis
 * Transforms quiz questions into format expected by ML algorithms
 */
function prepareMLAnalysisData(questions, answers, userAnswers) {
  // Transform user answers from selectedOption format to index format
  const answerIndices = userAnswers.map((userAnswer, idx) => {
    const question = questions[idx];
    if (!question) return -1;
    
    if (Array.isArray(question.options)) {
      return question.options.indexOf(userAnswer);
    }
    return -1;
  });

  // Enrich questions with metadata needed by ML algorithms
  const enrichedQuestions = questions.map((q, idx) => ({
    id: q.id || idx,
    content: q.content || q.question,
    category: q.category || 'uncategorized',
    difficulty: q.difficulty || 'medium',
    correctAnswer: q.answerIndex !== undefined ? q.answerIndex : 
                   (q.correctAnswer !== undefined ? q.correctAnswer : 
                    (Array.isArray(q.options) ? q.options.indexOf(q.correctAnswer || q.correct) : 0)),
    options: q.options || [],
    explanation: q.explanation || '',
    timeLimitSeconds: q.timeLimit || null
  }));

  return {
    questions: enrichedQuestions,
    userAnswers: answerIndices,
    answersWithDetails: userAnswers.map((answer, idx) => ({
      questionId: questions[idx]?.id || idx,
      selectedOption: answer,
      selectedIndex: answerIndices[idx],
      correct: answerIndices[idx] === (questions[idx]?.answerIndex || 
               (Array.isArray(questions[idx]?.options) ? 
                questions[idx].options.indexOf(questions[idx]?.correctAnswer) : 0))
    }))
  };
}

/**
 * Extract quiz data from request for ML analysis
 */
function extractQuizDataForML(req) {
  const { questions, answers, userId } = req.body;
  
  if (!questions || !Array.isArray(questions)) {
    console.warn('[MLAnalytics] No questions provided in request');
    return null;
  }

  if (!answers || !Array.isArray(answers)) {
    console.warn('[MLAnalytics] No answers provided in request');
    return null;
  }

  // Extract user answers in order
  const userAnswers = answers.map(a => a.selectedOption || a.answer);

  return {
    questions,
    userAnswers,
    userId
  };
}

module.exports = {
  triggerMLAnalysis,
  prepareMLAnalysisData,
  extractQuizDataForML
};

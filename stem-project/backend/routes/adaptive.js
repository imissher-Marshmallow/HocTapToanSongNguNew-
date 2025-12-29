/**
 * Adaptive Quiz Routes
 * Handles personalized quiz generation and assessment
 */

const express = require('express')
const {
  AssessmentEngine,
  AdaptiveQuestionSelector,
  LearningProfileManager
} = require('../ai/adaptiveEngine')
const { analyzeQuiz } = require('../ai/analyzer')
const { generateAISummary, generateDetailedTopicFeedback, generateLearningRoadmap } = require('../utils/aiSummary')
const { saveQuizResult, getQuizRecommendation } = require('../services/quizResultsService')
const { supabase, supabaseError } = require('../database')
const { loadQuestionsData, getAllQuestions } = require('../ai/loadQuestions')

const router = express.Router()

// Validate quiz ID whitelist
const ALLOWED_QUIZ_IDS = ['contest1', 'contest2', 'contest3', 'contest4', 'contest5', 'random', 'personalized']

// Helper: Generate quick motivational feedback based on score
function generateMotivationalFeedback(score) {
  if (score >= 90) return "🌟 Outstanding performance! You've mastered this material!"
  if (score >= 80) return "👏 Excellent work! You're doing great. Keep it up!"
  if (score >= 70) return "👍 Good job! You're making solid progress. A bit more practice will help."
  if (score >= 60) return "💪 You're making progress! Focus on the weak areas to improve."
  if (score >= 50) return "📚 Keep practicing! Review the fundamentals and try again."
  return "🎯 Start with the basics. Review and practice regularly to improve."
}

// Helper: Generate detailed feedback for each topic
function generateTopicFeedback(topicAnalysis, cognitiveScores) {
  const feedback = {}
  
  topicAnalysis.forEach(topic => {
    const { topic: topicName, percentage, correct, total, performance } = topic
    
    // Generate Vietnamese emoji feedback
    let emojiFeedback = '';
    if (percentage >= 90) {
      emojiFeedback = `🌟 Xuất sắc ở ${topicName}! Đúng ${correct}/${total} câu. Tiếp tục phát huy!`;
    } else if (percentage >= 80) {
      emojiFeedback = `✅ Rất tốt ở ${topicName}! Đúng ${correct}/${total} câu. Thêm một chút luyện tập nữa!`;
    } else if (percentage >= 70) {
      emojiFeedback = `👍 Khá tốt ${topicName} (${correct}/${total}). Luyện tập thêm để hoàn thiện.`;
    } else if (percentage >= 60) {
      emojiFeedback = `📚 ${topicName}: Hiểu được ${correct}/${total}. Ôn tập thêm để vững kiến thức.`;
    } else if (percentage >= 40) {
      emojiFeedback = `⚠️ ${topicName}: Đúng ${correct}/${total}. Ôn tập lại từ cơ bản, làm thêm bài tập.`;
    } else {
      emojiFeedback = `❌ ${topicName}: Chỉ đúng ${correct}/${total}. Bắt đầu ôn từ những bài cơ bản.`;
    }
    
    // Generate detailed improvement suggestions
    let improvements = []
    if (percentage < 60) {
      improvements.push(`Ôn lại khái niệm cơ bản của ${topicName}`)
      improvements.push(`Làm bài tập từ dễ đến khó để xây dựng nền tảng`)
      improvements.push(`Giải từng bước một để hiểu rõ cách giải`)
    } else if (percentage < 80) {
      improvements.push(`Luyện tập thêm các bài toán khó về ${topicName}`)
      improvements.push(`Chú ý đến các trường hợp đặc biệt`)
      improvements.push(`Kiểm tra lại các câu sai để tìm lỗi sơ suất`)
    } else {
      improvements.push(`Duy trì mức hiểu hiện tại với luyện tập thường xuyên`)
      improvements.push(`Thử các bài toán nâng cao để mở rộng hiểu biết`)
    }
    
    // Generate resources for searching
    let resources = []
    if (percentage < 50) {
      resources.push(`${topicName} - Khái niệm cơ bản`)
      resources.push(`Hướng dẫn ${topicName} cho người mới bắt đầu`)
      resources.push(`Bài tập luyện ${topicName}`)
    } else if (percentage < 70) {
      resources.push(`${topicName} - Bài tập nâng cao`)
      resources.push(`Ví dụ chi tiết về ${topicName}`)
      resources.push(`Mẹo giải nhanh ${topicName}`)
    } else {
      resources.push(`${topicName} - Các bài toán khó`)
      resources.push(`${topicName} thi chuyên - Vào lớp 10`)
    }
    
    feedback[topicName] = {
      percentage,
      performance,
      correct,
      total,
      feedback: emojiFeedback,
      improvements,
      resources,
      summary: `${percentage}% chính xác (${correct}/${total} câu). ${
        percentage >= 80 ? 'Xuất sắc! Tiếp tục phát huy.' : 
        percentage >= 60 ? 'Tốt. Cần thêm luyện tập.' :
        'Cần ôn tập lại kỹ. Bắt đầu từ các bài cơ bản.'
      }`
    }
  })
  
  return feedback
}

// Validate input
function validateQuizId(quizId) {
  return typeof quizId === 'string' && ALLOWED_QUIZ_IDS.includes(quizId.toLowerCase())
}

function validateAnswers(answers) {
  if (!Array.isArray(answers)) return false
  if (answers.length === 0 || answers.length > 100) return false
  return answers.every(a => Number.isInteger(a) && a >= 0 && a <= 3)
}

/**
 * GET /api/adaptive/diagnostics
 * Check system health and Supabase connection
 */
router.get('/diagnostics', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    supabase: {
      available: supabase ? true : false,
      url: process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
      key: process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      error: supabaseError || null
    },
    database: {
      postgres_url: process.env.DATABASE_URL || process.env.POSTGRES_URL ? '✅ Set' : '❌ Missing'
    },
    openai: {
      api_key: process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'
    },
    status: {
      supabaseReady: supabase ? '✅ Ready' : '❌ Not Ready',
      postgresReady: process.env.DATABASE_URL || process.env.POSTGRES_URL ? '✅ Ready' : '❌ Not Ready',
      openaiReady: process.env.OPENAI_API_KEY ? '✅ Ready' : '❌ Not Ready'
    },
    message: supabase 
      ? 'System is ready for adaptive learning' 
      : `Supabase not available: ${supabaseError || 'Unknown error'}`
  })
})

/**
 * GET /api/adaptive/profile/:userId
 * Get student's learning profile from Supabase
 */
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    if (!userId || userId === 'undefined') {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // If Supabase is not available, return default profile
    if (!supabase) {
      const defaultProfile = {
        userId,
        scores: {
          level1: 0,
          level2: 0,
          level3: 0,
          level4: 0
        },
        proficiency: {
          level1: 'NOT_STARTED',
          level2: 'NOT_STARTED',
          level3: 'NOT_STARTED',
          level4: 'NOT_STARTED'
        },
        weakAreas: [],
        strongAreas: [],
        recommendations: ['Take your first quiz to see personalized recommendations'],
        learningPath: null,
        quizzesTaken: 0,
        message: 'Supabase not available. Using default profile. Adaptive features will be available after setup.'
      }
      return res.json(defaultProfile)
    }

    // Fetch user's learning profile from Supabase
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    
    const { data, error } = await supabase
      .from('user_learning_profiles')
      .select(`
        id, user_id, cognitive_levels, weak_areas, strong_areas, 
        proficiency_status, recommendations, learning_path, 
        quizzes_taken, last_updated, created_at
      `)
      .eq('user_id', numericUserId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Database error' })
    }

    // If no profile exists, create default one
    if (!data) {
      const defaultProfile = {
        userId,
        scores: {
          level1: 0,
          level2: 0,
          level3: 0,
          level4: 0
        },
        proficiency: {
          level1: 'NOT_STARTED',
          level2: 'NOT_STARTED',
          level3: 'NOT_STARTED',
          level4: 'NOT_STARTED'
        },
        weakAreas: [],
        strongAreas: [],
        recommendations: ['Take your first quiz to see personalized recommendations'],
        learningPath: null,
        quizzesTaken: 0,
        message: 'No profile found. Start with an assessment quiz.'
      }
      return res.json(defaultProfile)
    }

    // Transform Supabase data to response format
    const profile = {
      userId,
      scores: data.cognitive_levels || {},
      proficiency: data.proficiency_status || {},
      weakAreas: data.weak_areas || [],
      strongAreas: data.strong_areas || [],
      recommendations: data.recommendations || [],
      learningPath: data.learning_path,
      quizzesTaken: data.quizzes_taken || 0,
      lastUpdated: data.last_updated,
      createdAt: data.created_at
    }

    res.json(profile)
  } catch (error) {
    console.error('Error fetching profile:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

/**
 * GET /api/adaptive/weak-and-strong/:userId
 * Fetch user's weak and strong areas from Supabase
 * Used by LearningHome dashboard to display topics user should practice
 */
router.get('/weak-and-strong/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || userId === 'undefined') {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Fetch from Supabase
    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const { data, error } = await supabase
      .from('user_learning_profiles')
      .select('weak_areas, strong_areas, cognitive_levels, proficiency_status')
      .eq('user_id', numericUserId)
      .single();

    if (error) {
      console.log('[WeakStrong] Fetch error:', error.message);
      return res.json({
        weakAreas: [],
        strongAreas: [],
        message: 'No data available yet. Complete a quiz to see your weak and strong areas.'
      });
    }

    if (!data) {
      return res.json({
        weakAreas: [],
        strongAreas: [],
        message: 'No data available yet. Complete a quiz to see your weak and strong areas.'
      });
    }

    // Parse weak areas - convert to readable format
    const weakAreas = (data.weak_areas || []).map((area, idx) => {
      if (typeof area === 'object' && area.topic) {
        return {
          topic: area.topic,
          percentage: area.percentage || 0,
          priority: area.priority || idx + 1,
          icon: '⚠️'
        };
      }
      // Parse from string format (e.g., "Đại số: 45%")
      const match = String(area).match(/([^:]+):\s*([\d.]+)%/);
      if (match) {
        return {
          topic: match[1].trim(),
          percentage: parseFloat(match[2]),
          priority: idx + 1,
          icon: '⚠️'
        };
      }
      return {
        topic: String(area),
        percentage: 0,
        priority: idx + 1,
        icon: '⚠️'
      };
    });

    // Parse strong areas
    const strongAreas = (data.strong_areas || []).map((area, idx) => {
      if (typeof area === 'object' && area.topic) {
        return {
          topic: area.topic,
          percentage: area.percentage || 0,
          icon: '💪'
        };
      }
      return {
        topic: String(area),
        percentage: 0,
        icon: '💪'
      };
    });

    // Get cognitive level info
    const scores = data.cognitive_levels || { level1: 0, level2: 0, level3: 0, level4: 0 };
    const avgScore = Math.round(
      (scores.level1 + scores.level2 + scores.level3 + scores.level4) / 4
    );

    res.json({
      weakAreas,
      strongAreas,
      averageScore: avgScore,
      scores,
      message: 'Data loaded successfully'
    });
  } catch (error) {
    console.error('[WeakStrong] Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * GET /api/adaptive/dashboard/:userId
 * Unified endpoint: Get profile + learning data + quiz recommendations in one call
 * Returns everything needed for LearningProfile dashboard
 */
router.get('/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    if (!userId || userId === 'undefined') {
      return res.status(400).json({ error: 'User ID is required' })
    }

    console.log('[Dashboard] Fetching profile for userId:', userId);

    // Create default profile
    const getDefaultProfile = () => ({
      userId,
      scores: {
        level1: 0,
        level2: 0,
        level3: 0,
        level4: 0
      },
      proficiency: {
        level1: 'NOT_STARTED',
        level2: 'NOT_STARTED',
        level3: 'NOT_STARTED',
        level4: 'NOT_STARTED'
      },
      weakAreas: [],
      strongAreas: [],
      recommendations: ['Take your first quiz to see personalized recommendations'],
      learningPath: null,
      quizzesTaken: 0
    })

    let profile = getDefaultProfile()

    // Try to fetch from Supabase if available
    if (supabase) {
      try {
        // Convert userId to integer for proper type matching
        const numericUserId = parseInt(userId, 10);
        if (isNaN(numericUserId)) {
          console.warn('[Dashboard] Invalid userId format:', userId);
          return res.status(400).json({ error: 'Invalid user ID format' });
        }

        console.log('[Dashboard] Querying Supabase for user_id:', numericUserId);

        const { data, error } = await supabase
          .from('user_learning_profiles')
          .select(`
            id, user_id, cognitive_levels, weak_areas, strong_areas, 
            proficiency_status, recommendations, learning_path, 
            quizzes_taken, last_updated, created_at
          `)
          .eq('user_id', numericUserId)
          .single()

        if (error) {
          console.warn('[Dashboard] Supabase query error:', error.message);
        } else if (data) {
          console.log('[Dashboard] ✅ Found profile in Supabase for user:', numericUserId);
          console.log('[Dashboard] Profile data:', {
            quizzes_taken: data.quizzes_taken,
            weak_areas_count: data.weak_areas?.length || 0,
            last_updated: data.last_updated
          });
          // Parse weak_areas array properly - ensure they include topic names
          const weakAreasArray = data.weak_areas || [];
          const parsedWeakAreas = weakAreasArray.map((area, idx) => {
            // If it's already an object (from recent saves), use it
            if (typeof area === 'object' && area.topic) {
              return area;
            }
            // Otherwise, parse from string representation
            const topicMatch = area.toString().match(/([^:]+):\s*([\d.]+)%/);
            if (topicMatch) {
              return {
                topic: topicMatch[1].trim(),
                percentage: parseFloat(topicMatch[2]),
                score: parseFloat(topicMatch[2]),
                priority: idx + 1,
                recommendation: `Hãy tập trung vào chủ đề này để cải thiện`
              };
            }
            return {
              topic: area,
              percentage: 0,
              score: 0,
              priority: idx + 1,
              recommendation: `Hãy tập trung vào ${area}`
            };
          });

          profile = {
            userId,
            scores: data.cognitive_levels || getDefaultProfile().scores,
            proficiency: data.proficiency_status || getDefaultProfile().proficiency,
            weakAreas: parsedWeakAreas, // Enhanced weak areas with topic names
            strongAreas: data.strong_areas || [],
            recommendations: data.recommendations || getDefaultProfile().recommendations,
            learningPath: data.learning_path, // AI-generated roadmap from Supabase
            quizzesTaken: data.quizzes_taken || 0,
            lastUpdated: data.last_updated,
            createdAt: data.created_at
          }
        }
      } catch (err) {
        console.log('[Dashboard] Supabase fetch failed, using defaults:', err.message)
      }
    }

    // Load questions for quiz recommendations
    let quizzes = []
    try {
      const allQuestions = getAllQuestions()

      // Generate personalized quiz based on profile
      const personalizedQuiz = AdaptiveQuestionSelector.generatePersonalizedQuiz(
        profile,
        allQuestions,
        20
      )

      quizzes = personalizedQuiz.map(q => ({
        id: q.id,
        topic: q.topic,
        question: q.question,
        english_question: q.english_question,
        options: q.options,
        difficulty: q.difficulty,
        bloomLevel: q.bloomLevel
      }))
    } catch (err) {
      console.log('[Dashboard] Quiz generation failed:', err.message)
    }

    // Return unified dashboard data
    res.json({
      profile,
      quizzes,
      quizCount: quizzes.length,
      status: profile.quizzesTaken === 0 ? 'new_user' : 'returning_user',
      message: 'Dashboard data loaded successfully'
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})


/**
 * GET /api/adaptive/quiz/personalized
 * Generate personalized quiz based on student profile from Supabase
 * Query params: userId (required)
 */
router.get('/quiz/personalized', async (req, res) => {
  try {
    const { userId } = req.query
    
    if (!userId || userId === 'undefined') {
      return res.status(400).json({ error: 'userId query parameter is required' })
    }

    // Load all questions
    const allQuestions = getAllQuestions()

    // Get user's quiz recommendation based on history
    const quizRecommendation = await getQuizRecommendation(userId)

    // Fetch real profile from Supabase (if available)
    let userProfile
    
    if (supabase) {
      // Convert userId to integer for proper type matching
      const numericUserId = parseInt(userId, 10);
      if (isNaN(numericUserId)) {
        console.warn('[PersonalizedQuiz] Invalid userId format:', userId);
        return res.status(400).json({ error: 'Invalid user ID format' });
      }
      
      const { data: profileData, error: profileError } = await supabase
        .from('user_learning_profiles')
        .select('cognitive_levels, weak_areas, strong_areas')
        .eq('user_id', numericUserId)
        .single()

      // Use Supabase data if available, prioritize weak areas
      if (profileData) {
        userProfile = {
          userId,
          scores: profileData.cognitive_levels || {},
          weakAreas: quizRecommendation.weakTopics || profileData.weak_areas || [],
          strongAreas: quizRecommendation.strongTopics || profileData.strong_areas || [],
          recommendedLevel: quizRecommendation.recommendedLevel
        }
      } else {
        // First-time user - provide assessment quiz
        userProfile = {
          userId,
          scores: {
            level1: 50,
            level2: 50,
            level3: 50,
            level4: 50
          },
          weakAreas: [],
          strongAreas: [],
          isFirstTime: true
        }
      }
    } else {
      // Supabase not available - use default profile with recommendation
      userProfile = {
        userId,
        scores: {
          level1: 50,
          level2: 50,
          level3: 50,
          level4: 50
        },
        weakAreas: quizRecommendation.weakTopics || [],
        strongAreas: quizRecommendation.strongTopics || [],
        recommendedLevel: quizRecommendation.recommendedLevel,
        isFirstTime: true,
        message: 'Using default proficiency levels (Supabase not available)'
      }
    }

    // Generate personalized quiz based on user's cognitive levels AND weak areas
    const personalizedQuiz = AdaptiveQuestionSelector.generatePersonalizedQuiz(
      userProfile,
      allQuestions,
      20
    )
    
    console.log('[Quiz/Personalized] Generated personalized quiz:', {
      requestedCount: 20,
      actualCount: personalizedQuiz.length,
      userProfileIsFirstTime: userProfile.isFirstTime,
      allQuestionsTotal: allQuestions.length,
      firstThreeIds: personalizedQuiz.slice(0, 3).map(q => q.id)
    })

    // Remove answers from quiz before sending to client
    const quizForClient = personalizedQuiz.map(q => {
      // Detect question type based on structure
      let qType = 'multiple-choice';
      if (q.statements && Array.isArray(q.statements)) {
        qType = 'true-false';
      } else if (q.numerical_answer !== undefined || q.text_answer !== undefined) {
        qType = 'short-answer';
      }
      
      const questionData = {
        id: q.id,
        type: qType,  // Include type for frontend
        topic: q.topic,
        question: q.question,
        english_question: q.english_question,
        difficulty: q.difficulty,
        bloomLevel: q.bloomLevel
        // Don't send answerIndex!
      }
      
      // Include options for multiple choice
      if (q.options && Array.isArray(q.options)) {
        questionData.options = q.options
      }
      
      // Include statements for true/false questions
      if (q.statements && Array.isArray(q.statements)) {
        questionData.statements = q.statements
      }
      
      // Include short answer fields
      if (q.numerical_answer !== undefined) {
        questionData.numerical_answer = q.numerical_answer
      }
      if (q.text_answer !== undefined) {
        questionData.text_answer = q.text_answer
      }
      
      return questionData
    })

    res.json({
      quiz: quizForClient,
      questionCount: quizForClient.length,
      userId,
      recommendation: quizRecommendation,
      message: 'Bài kiểm tra được tạo theo khuyến nghị dựa trên kết quả trước'
    })
  } catch (error) {
    console.error('Error generating quiz:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Helper function to determine if an answer is correct
 * Handles multiple choice, true/false, and short answer questions
 */
function isAnswerCorrect(question, studentAnswer) {
  // Null/undefined answer is always wrong
  if (studentAnswer === null || studentAnswer === undefined) {
    return false;
  }
  
  // For multiple choice questions - compare by index
  if (question.answerIndex !== undefined) {
    const answerIndex = parseInt(studentAnswer, 10);
    return !isNaN(answerIndex) && question.answerIndex === answerIndex;
  }
  
  // For true/false questions with statements
  if (question.statements && Array.isArray(question.statements)) {
    if (typeof studentAnswer !== 'object' || studentAnswer === null) {
      return false; // Unanswered
    }
    // Check if all statements were answered correctly
    return question.statements.every((stmt, idx) => {
      return studentAnswer[idx] === stmt.is_true;
    });
  }
  
  // For short answer questions (text matching)
  if (question.text_answer !== undefined) {
    // Remove all spaces and convert to lowercase for comparison
    const studentText = String(studentAnswer).toLowerCase().replace(/\s+/g, '').trim();
    const correctText = String(question.text_answer).toLowerCase().replace(/\s+/g, '').trim();
    return studentText === correctText;
  }
  
  // For numerical answer questions
  if (question.numerical_answer !== undefined) {
    const tolerance = 0.01; // Allow small floating point differences
    const studentNum = parseFloat(studentAnswer);
    const correctNum = parseFloat(question.numerical_answer);
    return !isNaN(studentNum) && Math.abs(studentNum - correctNum) < tolerance;
  }
  
  return false;
}

/**
 * Calculate partial credit for an answer (especially for true/false with multiple statements)
 * Returns a number from 0 to 1 representing the fraction of the answer that is correct
 */
function calculatePartialCredit(question, studentAnswer) {
  // For true/false questions, calculate per-statement accuracy
  if (question.statements && Array.isArray(question.statements)) {
    if (studentAnswer === null || studentAnswer === undefined || typeof studentAnswer !== 'object') {
      return 0; // No answer
    }
    
    let correctStatements = 0;
    question.statements.forEach((stmt, idx) => {
      if (studentAnswer[idx] === stmt.is_true) {
        correctStatements++;
      }
    });
    
    return correctStatements / question.statements.length;
  }
  
  // For other question types, it's either 1 (correct) or 0 (incorrect)
  return isAnswerCorrect(question, studentAnswer) ? 1 : 0;
  
  return false;
}

/**
 * POST /api/adaptive/analyze
 * Analyze quiz and update learning profile
 * Body: { userId, quizId, answers: [{questionId, answer}], timeSpent }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { userId, quizId, answers, personalizedQuizData, timeSpent } = req.body

    console.log('[Analyze] Request received:', {
      userId,
      quizId,
      answersCount: answers?.length,
      hasPersonalizedData: !!personalizedQuizData,
      personalizedDataIsArray: Array.isArray(personalizedQuizData),
      personalizedDataLength: Array.isArray(personalizedQuizData) ? personalizedQuizData.length : 'N/A',
      personalizedDataType: typeof personalizedQuizData,
      timeSpent,
      personalizedDataFirstItem: Array.isArray(personalizedQuizData) && personalizedQuizData.length > 0 ? { id: personalizedQuizData[0].id, topic: personalizedQuizData[0].topic } : 'N/A'
    })

    // Validate input
    if (!userId || userId === 'undefined') {
      console.error('[Analyze] Missing userId')
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Ensure userId is numeric
    const numericUserId = typeof userId === 'number' ? userId : parseInt(userId, 10);
    if (isNaN(numericUserId)) {
      console.error('[Analyze] Invalid userId format:', userId);
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    if (!quizId) {
      console.error('[Analyze] Missing quizId')
      return res.status(400).json({ error: 'Quiz ID is required' })
    }

    if (!validateQuizId(quizId)) {
      console.error('[Analyze] Invalid quizId:', quizId)
      return res.status(400).json({ error: `Invalid quiz ID: ${quizId}. Must be one of: contest1-5, personalized, random` })
    }

    if (!Array.isArray(answers)) {
      console.error('[Analyze] Answers is not an array:', typeof answers)
      return res.status(400).json({ error: 'Answers must be an array' })
    }

    if (answers.length === 0) {
      console.error('[Analyze] No answers provided')
      return res.status(400).json({ error: 'At least one answer is required' })
    }

    // Validate answer format
    const invalidAnswers = answers.filter((a, idx) => !a.questionId || (a.answer === null && a.answer === undefined))
    if (invalidAnswers.length > 0 && invalidAnswers.length === answers.length) {
      console.error('[Analyze] Invalid answer format:', invalidAnswers)
      return res.status(400).json({ error: `Invalid answer format. Each answer must have questionId and answer. Found ${invalidAnswers.length} invalid answers.` })
    }
    
    // Log the first few answers to debug
    console.log('[Analyze] Sample answers received from frontend:', {
      firstThree: answers.slice(0, 3),
      totalAnswers: answers.length,
      answersWithContent: answers.filter(a => a.answer !== null && a.answer !== undefined).length
    })

    // Load questions - ALWAYS from file to ensure we have answerIndex
    // personalizedQuizData has answers stripped for security, so we rebuild from questionIds
    const questionData = loadQuestionsData()
    let questions = []

    console.log('[Analyze] Question data structure:', {
      hasChapters: !!questionData?.chapters,
      chaptersIsArray: Array.isArray(questionData?.chapters),
      hasContests: !!questionData?.contests,
      contestsIsArray: Array.isArray(questionData?.contests),
      contestsIsObject: typeof questionData?.contests === 'object' && !Array.isArray(questionData?.contests)
    })

    // DEBUG: Log the condition evaluation
    const shouldRebuild = personalizedQuizData && Array.isArray(personalizedQuizData) && quizId === 'personalized'
    console.log('[Analyze] CRITICAL CONDITION CHECK:', {
      personalizedQuizDataBoolean: !!personalizedQuizData,
      isArray: Array.isArray(personalizedQuizData),
      quizIdValue: quizId,
      quizIdMatch: quizId === 'personalized',
      WILL_USE_REBUILD: shouldRebuild,
      WILL_USE_FALLBACK: quizId === 'personalized' && !shouldRebuild
    })

    if (personalizedQuizData && Array.isArray(personalizedQuizData) && quizId === 'personalized') {
      // For personalized quiz: use personalizedQuizData to get question IDs,
      // then load full question data (with answerIndex) from file
      console.log('[Analyze] Using personalizedQuizData IDs to rebuild questions from file')
      
      // Create a map of all questions in file by ID
      const allQuestionsMap = {}
      if (questionData.contests) {
        if (typeof questionData.contests === 'object' && !Array.isArray(questionData.contests)) {
          Object.values(questionData.contests).forEach(contestQuestions => {
            if (Array.isArray(contestQuestions)) {
              contestQuestions.forEach(q => {
                allQuestionsMap[q.id] = q
              })
            }
          })
        }
      }
      
      // Rebuild questions array using IDs from personalizedQuizData + data from file
      personalizedQuizData.forEach(clientQ => {
        if (allQuestionsMap[clientQ.id]) {
          // Use the complete question with answerIndex from file
          questions.push(allQuestionsMap[clientQ.id])
        } else {
          // Fallback to client data if not found in file
          console.log('[Analyze] Question', clientQ.id, 'not found in file, using client data')
          questions.push(clientQ)
        }
      })
      
      console.log('[Analyze] Rebuilt questions from file using personalizedQuizData IDs, questions count:', questions.length)
    } else if (quizId === 'personalized') {
      // For personalized quiz without quiz data provided, load from contests and flatten all
      if (questionData.contests) {
        if (Array.isArray(questionData.contests)) {
          // If contests is an array (shouldn't be based on current data)
          questionData.contests.forEach(contest => {
            questions.push(...contest)
          })
        } else if (typeof questionData.contests === 'object') {
          // Contests is an object with keys like 'contest1', 'contest2', etc.
          Object.values(questionData.contests).forEach(contestQuestions => {
            if (Array.isArray(contestQuestions)) {
              questions.push(...contestQuestions)
            }
          })
        }
      }
      console.log('[Analyze] Loaded from file fallback, questions count:', questions.length)
    } else {
      // Use standard quiz from contests
      const quizIndex = parseInt(quizId.replace('contest', '')) - 1
      if (questionData.contests) {
        if (Array.isArray(questionData.contests) && quizIndex >= 0 && quizIndex < questionData.contests.length) {
          // If contests is an array
          questions = questionData.contests[quizIndex]
        } else if (typeof questionData.contests === 'object') {
          // If contests is an object, try to get by key
          const contestKey = `contest${quizIndex + 1}`
          if (questionData.contests[contestKey]) {
            questions = questionData.contests[contestKey]
          }
        }
      }
      console.log('[Analyze] Loaded standard quiz', quizId, ', questions count:', questions.length)
    }

    if (questions.length === 0) {
      console.error('[Analyze] No questions found for quiz:', quizId, 'personalizedQuizData:', !!personalizedQuizData, 'questions:', questions)
      return res.status(400).json({ error: 'No questions found for quiz' })
    }

    // Convert answers from {questionId, answer} format to array of raw answers
    // answer can be:
    // - For multiple choice: number index (0, 1, 2, 3)
    // - For true/false: object {0: true, 1: false, ...}
    // - For short answer: string text
    // - For unanswered: null/undefined
    const answerArray = answers.map((a, idx) => {
      // Return the answer as-is, let isAnswerCorrect handle the validation
      if (a.answer === null || a.answer === undefined) return null;
      return a.answer;
    })

    // ============================================
    // ADAPTIVE ASSESSMENT
    // ============================================

    // Calculate scores across cognitive levels
    const assessment = AssessmentEngine.assessPerformance(questions, answerArray)

    // ============================================
    // FAST TOPIC-BASED ANALYSIS (No OpenAI/Web Search)
    // ============================================

    // Analyze performance by topic
    const topicAnalysis = {}
    
    console.log('[Analyze] CRITICAL DEBUG - Before answer comparison:', {
      questionsCount: questions.length,
      answersCount: answerArray.length,
      answerArraySample: answerArray.slice(0, 5),
      firstQuestionId: questions.length > 0 ? questions[0].id : 'N/A',
      firstQuestionAnswerIndex: questions.length > 0 ? questions[0].answerIndex : 'N/A',
      firstQuestionTopic: questions.length > 0 ? questions[0].topic : 'N/A'
    })
    
    questions.forEach((question, idx) => {
      const topic = question.topic || 'General'
      if (!topicAnalysis[topic]) {
        topicAnalysis[topic] = {
          total: 0,
          correct: 0,
          percentage: 0,
          difficulty: question.difficulty || '1'
        }
      }
      topicAnalysis[topic].total += 1
      
      // Debug answer validation for each question
      const isCorrect = isAnswerCorrect(question, answerArray[idx])
      
      console.log(`[Analyze] Question ${idx + 1} validation:`, {
        questionId: question.id,
        questionType: question.statements ? 'true-false' : (question.text_answer !== undefined ? 'short-text' : (question.numerical_answer !== undefined ? 'short-numeric' : 'multiple-choice')),
        hasAnswerIndex: question.answerIndex !== undefined,
        hasStatements: question.statements ? question.statements.length : 0,
        hasTextAnswer: question.text_answer !== undefined,
        hasNumericalAnswer: question.numerical_answer !== undefined,
        studentAnswer: typeof answerArray[idx] === 'object' ? JSON.stringify(answerArray[idx]) : answerArray[idx],
        studentAnswerType: typeof answerArray[idx],
        isCorrect: isCorrect,
        topic: topic
      })
      // For true/false, add partial credit per statement
      if (question.statements && Array.isArray(question.statements)) {
        const partialCredit = calculatePartialCredit(question, answerArray[idx]);
        topicAnalysis[topic].correct += partialCredit;
      } else if (isCorrect) {
        topicAnalysis[topic].correct += 1;
      }
      topicAnalysis[topic].percentage = Math.round((topicAnalysis[topic].correct / topicAnalysis[topic].total) * 100)
    })

    // Convert to array and sort by performance
    const topicsArray = Object.entries(topicAnalysis).map(([topic, stats]) => ({
      topic,
      ...stats,
      performance: stats.percentage >= 80 ? 'EXCELLENT' : stats.percentage >= 60 ? 'GOOD' : stats.percentage >= 40 ? 'NEEDS_WORK' : 'WEAK',
      suggestedTopics: [] // Topics to search for
    }))

    // Identify weak topics that need search suggestions
    const weakTopics = topicsArray.filter(t => t.percentage < 70)
    const strongTopics = topicsArray.filter(t => t.percentage >= 80)

    // Generate detailed topic feedback for each topic
    const topicFeedback = generateTopicFeedback(topicsArray, assessment)

    // Generate quick feedback without OpenAI
    const aiAnalysis = {
      motivationalFeedback: generateMotivationalFeedback(assessment.overallScore),
      summary: {
        overall: `You scored ${Math.round(assessment.overallScore)}%. Review the weak areas below for improvement.`,
        start_here: weakTopics.length > 0 
          ? `Focus on: ${weakTopics.map(t => t.topic).join(', ')}`
          : 'Great work! Keep practicing to maintain your level.',
        plan: topicsArray.map((t, idx) => ({
          step: t.topic,
          duration: '15 mins',
          action: t.performance === 'WEAK' ? 'Study fundamentals' : t.performance === 'NEEDS_WORK' ? 'Practice problems' : 'Review and reinforce',
          performance: t.performance,
          searchSuggestion: t.topic // Student should search for this topic
        }))
      },
      topicAnalysis: topicsArray
    }

    console.log('[Analyze] Fast analysis completed - topics analyzed:', Object.keys(topicAnalysis).length)

    // ============================================
    // BALANCED 10-POINT SCORING SYSTEM
    // ============================================
    // True/False: 0.25 pts per statement (4 statements = 1 pt total per question)
    // Multiple Choice: 1 pt each
    // Short Answer: 1 pt each
    // Normalize to 10-point scale
    
    let totalPoints = 0;
    let maxPossiblePoints = 0;
    
    questions.forEach((q, i) => {
      const studentAnswer = answerArray[i]
      
      // For true/false questions with multiple statements, award points per statement
      if (q.statements && Array.isArray(q.statements)) {
        const statementCount = q.statements.length;
        const pointPerStatement = 1.0 / statementCount; // Each statement worth equal points
        
        maxPossiblePoints += 1.0; // Total 1 point per true/false question
        
        // Check each statement individually
        if (studentAnswer && typeof studentAnswer === 'object') {
          q.statements.forEach((stmt, idx) => {
            if (studentAnswer[idx] === stmt.is_true) {
              totalPoints += pointPerStatement;
            }
          });
        }
        // If no answer for this question, contribute 0 points
      } else {
        // Regular multiple choice or short answer
        const isCorrect = isAnswerCorrect(q, studentAnswer);
        maxPossiblePoints += 1.0;
        if (isCorrect) {
          totalPoints += 1.0;
        }
      }
    });
    
    const totalCorrect = Math.round((totalPoints / maxPossiblePoints) * 10 * 100) / 100;
    const maxScore = 10;
    const scoreOutOf10 = totalCorrect;
    
    console.log('[Analyze] 10-Point Scoring:', {
      rawPoints: totalPoints,
      maxPoints: maxPossiblePoints,
      scoreOutOf10: scoreOutOf10,
      percentage: Math.round((scoreOutOf10 / maxScore) * 100),
      questionsCount: questions.length,
      answersCount: answerArray.length
    })

    // ============================================
    // LEARNING PROFILE UPDATE & SAVE TO SUPABASE
    // ============================================

    // Fetch current profile from Supabase
    let currentProfile = null
    if (supabase) {
      try {
        const { data } = await supabase
          .from('user_learning_profiles')
          .select('*')
          .eq('user_id', numericUserId)
          .single()
        currentProfile = data
      } catch (err) {
        console.log('[Analyze] No existing profile for user:', userId)
      }
    }

    // Create/update learning profile
    const learningProfile = currentProfile
      ? LearningProfileManager.updateProfile(currentProfile, assessment)
      : LearningProfileManager.createProfile(userId, assessment)

    // ============================================
    // CONDITIONAL ROADMAP (Unlock after 2+ quizzes with good scores)
    // ============================================
    
    let learningRoadmap = null;
    let shouldGenerateRoadmap = false;
    const quizzesTaken = (currentProfile?.quizzes_taken || 0) + 1;
    
    if (quizzesTaken >= 2 && scoreOutOf10 >= 6.0) {
      shouldGenerateRoadmap = true;
      console.log('[Analyze] ✅ Roadmap unlock: Quiz', quizzesTaken, 'Score', scoreOutOf10);
      learningRoadmap = await generateLearningRoadmap(learningProfile, topicFeedback);
      learningProfile.learningPath = learningRoadmap;
    } else {
      console.log('[Analyze] ⏳ Roadmap locked: Need quizzes:', quizzesTaken, '<2 or score:', scoreOutOf10, '<6.0');
      learningProfile.learningPath = null;
    }
    
    // ============================================
    // AI FEEDBACK GENERATION (Vietnamese)
    // ============================================
    
    // Generate AI summary with OpenAI (fallback if fails)
    const aiSummaryResult = await generateAISummary({
      overallScore: scoreOutOf10,
      correctAnswers: totalPoints,
      totalQuestions: questions.length,
      topicFeedback,
      maxPossiblePoints: maxPossiblePoints
    })

    // ============================================
    // SAVE COMPLETE RESULTS TO SUPABASE
    // ============================================
    
    // Save quiz result for intelligent future quiz selection
    await saveQuizResult(userId, {
      quizId,
      overallScore: assessment.overallScore,
      correctAnswers: totalCorrect,
      totalQuestions: questions.length,
      cognitiveAnalysis: {
        levels: [
          {
            name: 'Knowledge (Recognition)',
            score: assessment.scores.level1,
            status: assessment.proficiency.level1,
            questionCount: assessment.levelData[1]?.total || 0,
            correct: assessment.levelData[1]?.correct || 0
          },
          {
            name: 'Comprehension (Understanding)',
            score: assessment.scores.level2,
            status: assessment.proficiency.level2,
            questionCount: assessment.levelData[2]?.total || 0,
            correct: assessment.levelData[2]?.correct || 0
          },
          {
            name: 'Application (Low-level)',
            score: assessment.scores.level3,
            status: assessment.proficiency.level3,
            questionCount: assessment.levelData[3]?.total || 0,
            correct: assessment.levelData[3]?.correct || 0
          },
          {
            name: 'Analysis (High-level)',
            score: assessment.scores.level4,
            status: assessment.proficiency.level4,
            questionCount: assessment.levelData[4]?.total || 0,
            correct: assessment.levelData[4]?.correct || 0
          }
        ]
      },
      topicFeedback,
      timeSpent: req.body.timeSpent || 0,
      answerDetails: questions.map((question, idx) => {
        // Detect question type based on structure
        let qType = 'multiple-choice';
        if (question.statements && Array.isArray(question.statements)) {
          qType = 'true-false';
        } else if (question.numerical_answer !== undefined || question.text_answer !== undefined) {
          qType = 'short-answer';
        }
        
        const answerDetail = {
          questionId: question.id,
          questionType: qType,
          questionText: question.question || question.text,
          topic: question.topic || 'Chung',
          difficulty: question.difficulty || '1',
          studentAnswer: answerArray[idx],
          isCorrect: isAnswerCorrect(question, answerArray[idx])
        };
        
        // Include options for multiple choice questions
        if (question.options && Array.isArray(question.options)) {
          answerDetail.options = question.options;
          answerDetail.correctAnswer = question.answerIndex;
        }
        // For true/false and short answer, store the correct answer differently
        else if (question.statements && Array.isArray(question.statements)) {
          answerDetail.statements = question.statements;
        }
        else if (question.text_answer !== undefined) {
          answerDetail.correctAnswer = question.text_answer;
        }
        else if (question.numerical_answer !== undefined) {
          answerDetail.correctAnswer = question.numerical_answer;
        }
        
        return answerDetail;
      })
    })

    // Get next quiz recommendation
    const nextQuizRecommendation = await getQuizRecommendation(userId)

    // Save to Supabase if available
    if (supabase && learningProfile) {
      try {
        // Prepare data for Supabase (convert complex objects to proper formats)
        const supabaseData = {
          user_id: numericUserId,
          cognitive_levels: learningProfile.scores, // JSONB - {level1: 0, level2: 0, ...}
          proficiency_status: learningProfile.proficiency, // JSONB - {level1: 'MASTERED', ...}
          weak_areas: learningProfile.weakAreas && Array.isArray(learningProfile.weakAreas)
            ? learningProfile.weakAreas.map(w => 
                typeof w === 'string' ? w : w.topWeakTopic || `Level ${w.level}: ${w.score}%`
              )
            : [], // TEXT[] - array of strings
          strong_areas: learningProfile.strongAreas && Array.isArray(learningProfile.strongAreas)
            ? learningProfile.strongAreas.map(s => 
                typeof s === 'string' ? s : `Level ${s.level}: ${s.score}%`
              )
            : [], // TEXT[] - array of strings
          recommendations: learningProfile.recommendations && Array.isArray(learningProfile.recommendations)
            ? learningProfile.recommendations
            : [], // TEXT[] - array of strings
          learning_path: learningProfile.learningPath || null, // JSONB - can be null
          quizzes_taken: quizzesTaken,
          roadmap_status: shouldGenerateRoadmap ? 'generated' : 'pending',
          last_updated: new Date().toISOString()
        };

        // Use UPSERT to handle both insert and update
        const { data, error } = await supabase
          .from('user_learning_profiles')
          .upsert(supabaseData, { onConflict: 'user_id' })
          .select()
        
        if (error) {
          console.error('[Analyze] ❌ Supabase upsert error:', error.message, error.details);
          console.error('[Analyze] Error code:', error.code);
        } else {
          console.log('[Analyze] ✅ Profile saved to Supabase for user:', userId);
          console.log('[Analyze] Updated profile data:', {
            user_id: data?.[0]?.user_id,
            quizzes_taken: data?.[0]?.quizzes_taken,
            cognitive_levels: data?.[0]?.cognitive_levels,
            weak_areas: data?.[0]?.weak_areas
          });
        }
        
        // Also save full quiz attempt details for review
        try {
          await supabase
            .from('quiz_attempts')
            .insert({
              user_id: userId,
              quiz_id: quizId,
              overall_score: assessment.overallScore,
              correct_answers: totalCorrect,
              total_questions: questions.length,
              time_spent_seconds: timeSpent,
              answers: questions.map((q, idx) => ({
                questionId: q.id,
                questionText: q.text,
                topic: q.topic || 'General',
                studentAnswer: answerArray[idx],
                correctAnswer: q.answerIndex,
                isCorrect: q.answerIndex === answerArray[idx]
              })),
              cognitive_analysis: assessment,
              topic_analysis: topicsArray,
              topic_feedback: topicFeedback,
              overall_feedback: aiAnalysis.motivationalFeedback,
              cognitive_levels: learningProfile.scores,
              proficiency_status: learningProfile.proficiency,
              weak_areas: learningProfile.weakAreas,
              strong_areas: learningProfile.strongAreas,
              recommendations: learningProfile.recommendations,
              created_at: new Date().toISOString()
            })
          console.log('[Analyze] Quiz attempt saved to Supabase for user:', userId)
        } catch (quizErr) {
          console.log('[Analyze] Note: quiz_attempts table may not exist yet. Create it using the provided SQL.')
          // This is not critical - continue without saving to quiz_attempts
        }
      } catch (err) {
        console.error('[Analyze] Error saving to Supabase:', err.message)
        // Continue even if Supabase save fails
      }
    }

    // ============================================
    // RESPONSE
    // ============================================

    res.json({
      // Basic results (10-point scale)
      overallScore: scoreOutOf10,
      scoreOutOf10: scoreOutOf10,
      maxScore: maxScore,
      totalQuestions: questions.length,
      correctAnswers: totalPoints,
      maxPossiblePoints: maxPossiblePoints,
      
      // Cognitive level breakdown
      cognitiveAnalysis: {
        levels: [
          {
            name: 'Knowledge (Recognition)',
            score: assessment.scores.level1,
            status: assessment.proficiency.level1,
            questionCount: assessment.levelData[1]?.total || 0,
            correct: assessment.levelData[1]?.correct || 0
          },
          {
            name: 'Comprehension (Understanding)',
            score: assessment.scores.level2,
            status: assessment.proficiency.level2,
            questionCount: assessment.levelData[2]?.total || 0,
            correct: assessment.levelData[2]?.correct || 0
          },
          {
            name: 'Application (Low-level)',
            score: assessment.scores.level3,
            status: assessment.proficiency.level3,
            questionCount: assessment.levelData[3]?.total || 0,
            correct: assessment.levelData[3]?.correct || 0
          },
          {
            name: 'Analysis (High-level)',
            score: assessment.scores.level4,
            status: assessment.proficiency.level4,
            questionCount: assessment.levelData[4]?.total || 0,
            correct: assessment.levelData[4]?.correct || 0
          }
        ]
      },
      
      // Updated learning profile
      learningProfile: {
        userId,
        scores: learningProfile.scores || {},
        proficiency: learningProfile.proficiency || {},
        weakAreas: learningProfile.weakAreas || [],
        strongAreas: learningProfile.strongAreas || [],
        recommendations: learningProfile.recommendations || [],
        learningPath: learningProfile.learningPath || null,
        quizzesTaken: quizzesTaken,
        roadmapUnlocked: shouldGenerateRoadmap
      },
      
      // AI feedback - extract topics from topicFeedback instead of old structures
      // Extract topic names with WEAK performance for areas to improve
      areasToImprove: Object.entries(topicFeedback || {})
        .filter(([_, data]) => data.performance === 'WEAK')
        .map(([topic]) => topic),
      // Extract topic names with STRONG performance for strengths
      strengths: Object.entries(topicFeedback || {})
        .filter(([_, data]) => data.performance === 'STRONG')
        .map(([topic]) => topic),
      
      // weakAreas with feedback for result page display
      weakAreas: Object.entries(topicFeedback || {})
        .filter(([_, data]) => data.performance === 'WEAK')
        .map(([topic, data]) => ({
          topic,
          score: data.score || 0,
          percentage: data.percentage || 0,
          severity: data.percentage >= 70 ? 'low' : (data.percentage >= 50 ? 'medium' : 'high'),
          feedback: data.feedback || `${topic}: ${data.percentage}% chính xác`,
          summary: data.feedback || `${topic}: ${data.percentage}% chính xác`
        })),
      
      // AI Coach Feedback (Vietnamese) - from OpenAI or fallback
      aiCoachFeedback: aiSummaryResult.aiCoachFeedback,
      aiSource: aiSummaryResult.source,
      
      // Detailed topic feedback
      topicFeedback: topicFeedback || {},
      
      // Learning Roadmap (Vietnamese)
      learningPath: learningRoadmap,
      
      // Next steps - create from AI summary or defaults
      nextSteps: aiAnalysis.summary?.start_here || `Tập trung vào: ${learningProfile.weakAreas?.[0] || 'cải thiện kỹ năng'}`,
      recommendations: learningProfile.recommendations || aiAnalysis.summary?.plan || [],
      
      // Topic-by-topic analysis
      topicAnalysis: aiAnalysis.topicAnalysis || [],
      
      // Answer details for review - includes all question types
      answerDetails: questions.map((question, idx) => {
        let qType = 'multiple-choice';
        if (question.statements && Array.isArray(question.statements)) {
          qType = 'true-false';
        } else if (question.numerical_answer !== undefined || question.text_answer !== undefined) {
          qType = 'short-answer';
        }
        
        const detail = {
          questionId: question.id,
          questionText: question.question || question.text,
          questionType: qType,
          topic: question.topic || 'Chung',
          difficulty: question.difficulty || '1',
          studentAnswer: answerArray[idx],
          isCorrect: isAnswerCorrect(question, answerArray[idx])
        };
        
        // Include appropriate answer fields based on question type
        if (question.options && Array.isArray(question.options)) {
          detail.options = question.options;
          detail.correctAnswer = question.answerIndex;
        } else if (question.statements && Array.isArray(question.statements)) {
          detail.statements = question.statements;
        } else if (question.text_answer !== undefined) {
          detail.correctAnswer = question.text_answer;
        } else if (question.numerical_answer !== undefined) {
          detail.correctAnswer = question.numerical_answer;
        }
        
        return detail;
      }),
      
      // Additional AI insights
      aiSummary: aiAnalysis.summary,
      resourceLinks: aiAnalysis.resourceLinks || [],
      
      // Next quiz recommendation (for intelligent quiz selection)
      nextQuizRecommendation: nextQuizRecommendation || {},
      
      // Success message
      message: 'Bài kiểm tra đã được phân tích thành công',
      savedToDatabase: !!supabase
    })
  } catch (error) {
    console.error('[Analyze] Error analyzing quiz:', error)
    console.error('[Analyze] Error stack:', error.stack)
    console.error('[Analyze] Error message:', error.message)
    
    // Return more detailed error for debugging
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

/**
 * GET /api/adaptive/next-quiz-recommendation/:userId
 * Get personalized next quiz recommendation based on history
 */
router.get('/next-quiz-recommendation/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    const recommendation = await getQuizRecommendation(userId)

    res.json({
      userId,
      ...recommendation,
      suggestedQuizzes: [
        {
          type: 'personalized',
          title: 'Bài kiểm tra cá nhân hóa',
          description: recommendation.difficulty === 'ADVANCED_CHALLENGE' 
            ? 'Bài kiểm tra khó giành cho những ai muốn thách thức bản thân'
            : recommendation.difficulty === 'ADVANCED'
            ? 'Bài kiểm tra nâng cao để cải thiện kỹ năng'
            : recommendation.difficulty === 'INTERMEDIATE'
            ? 'Bài kiểm tra trung bình để luyện tập'
            : 'Bài kiểm tra cơ bản để nắm vững kiến thức nền tảng',
          difficulty: recommendation.difficulty,
          focus: recommendation.weakTopics.length > 0 
            ? `Tập trung vào: ${recommendation.weakTopics.join(', ')}`
            : 'Ôn tập toàn bộ nội dung',
          estimatedTime: '15-20 phút',
          questions: recommendation.recommendedLevel === 1 ? 15 : 20
        },
        {
          type: 'targeted',
          title: 'Bài kiểm tra theo chủ đề',
          description: recommendation.weakTopics.length > 0
            ? `Luyện tập chuyên sâu về: ${recommendation.weakTopics[0]}`
            : 'Chọn một chủ đề để luyện tập',
          difficulty: 'CUSTOM',
          focusTopic: recommendation.weakTopics.length > 0 ? recommendation.weakTopics[0] : null,
          focus: recommendation.weakTopics.length > 0 ? recommendation.weakTopics[0] : 'Bất kỳ',
          estimatedTime: '10-15 phút',
          questions: 10
        },
        {
          type: 'reinforcement',
          title: 'Bài kiểm tra củng cố',
          description: recommendation.strongTopics.length > 0
            ? `Duy trì và cải thiện: ${recommendation.strongTopics.join(', ')}`
            : 'Ôn tập những điểm mạnh của bạn',
          difficulty: 'ADVANCED',
          focus: recommendation.strongTopics.length > 0 ? recommendation.strongTopics.join(', ') : 'Tất cả',
          estimatedTime: '12-18 phút',
          questions: 15
        }
      ]
    })
  } catch (error) {
    console.error('Error getting quiz recommendation:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/adaptive/recommendations/:userId
 * Get personalized learning recommendations
 */
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    // TODO: Fetch profile from database
    // For demo, return mock recommendations
    const mockRecommendations = {
      userId,
      primary: {
        title: 'Focus on Comprehension (Understanding)',
        description: 'You scored 68% on Level 2. Let\'s improve your understanding.',
        action: 'Take a comprehension-focused quiz',
        resources: [
          { title: 'Video: Understanding Algebra Concepts', url: '#' },
          { title: 'Article: Breaking Down Complex Ideas', url: '#' },
          { title: 'Practice Set: Comprehension Questions', url: '#' }
        ]
      },
      secondary: {
        title: 'Build Application Skills',
        description: 'After mastering Level 2, focus on applying concepts (Level 3).',
        action: 'Ready when Level 2 reaches 80%',
        resources: []
      },
      challenge: {
        title: 'Advanced Practice',
        description: 'You\'ve mastered Level 1. Keep it sharp with advanced variants.',
        action: 'Take challenging Level 1 questions',
        resources: [
          { title: 'Challenge Set: Advanced Recognition', url: '#' }
        ]
      },
      estimatedTimeline: '2-3 weeks to reach mastery level',
      studyStrategy: 'Practice 3-4 quizzes per week, focusing on weak areas'
    }

    res.json(mockRecommendations)
  } catch (error) {
    console.error('Error getting recommendations:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/adaptive/progress/:userId
 * Get learning progress and trends
 */
router.get('/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    // TODO: Fetch from database
    const mockProgress = {
      userId,
      totalQuizzesTaken: 3,
      joinDate: '2025-01-01',
      currentStreak: 5,
      
      cognitiveProgress: {
        level1: {
          current: 85,
          trend: 'STABLE',
          history: [80, 82, 85],
          status: 'MASTERED'
        },
        level2: {
          current: 68,
          trend: 'IMPROVING',
          history: [60, 65, 68],
          status: 'DEVELOPING'
        },
        level3: {
          current: 52,
          trend: 'IMPROVING',
          history: [45, 48, 52],
          status: 'NEEDS_WORK'
        },
        level4: {
          current: 35,
          trend: 'STABLE',
          history: [32, 33, 35],
          status: 'NOT_READY'
        }
      },
      
      estimatedMasteryDates: {
        level1: '✓ Already mastered',
        level2: 'In 2 weeks (estimated)',
        level3: 'In 4 weeks (estimated)',
        level4: 'In 8 weeks (estimated)'
      },
      
      totalTimeSpent: 180, // minutes
      averageTimePerQuiz: 45, // minutes
      
      milestones: [
        { date: '2025-01-05', achievement: 'First Quiz Completed', icon: '🎯' },
        { date: '2025-01-08', achievement: 'Mastered Level 1', icon: '🏆' },
        { date: '2025-01-10', achievement: 'Improving in Level 2', icon: '📈' }
      ]
    }

    res.json(mockProgress)
  } catch (error) {
    console.error('Error getting progress:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Old endpoints for backward compatibility
 */

// GET /api/questions/:quizId (EXISTING - KEEP WORKING)
router.get('/questions/:quizId', (req, res) => {
  try {
    const { quizId } = req.params

    if (!validateQuizId(quizId)) {
      return res.status(400).json({ error: 'Invalid quiz ID' })
    }

    const questionData = loadQuestionsData()
    if (!questionData) {
      return res.status(500).json({ error: 'Questions data unavailable' })
    }
    
    const questions = questionData.contests && questionData.contests[quizId] || []

    if (questions.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' })
    }

    // Remove answers before sending
    const safeQuestions = questions.map(q => ({
      id: q.id,
      topic: q.topic,
      question: q.question,
      english_question: q.english_question,
      options: q.options,
      difficulty: q.difficulty
    }))

    res.json(safeQuestions)
  } catch (error) {
    console.error('Error loading questions:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/analyze-quiz (EXISTING - UPGRADED)
router.post('/analyze-quiz', async (req, res) => {
  try {
    const { quizId, answers } = req.body

    if (!validateQuizId(quizId)) {
      return res.status(400).json({ error: 'Invalid quiz ID' })
    }

    if (!validateAnswers(answers)) {
      return res.status(400).json({ error: 'Invalid answers format' })
    }

    const questionData = loadQuestionsData()
    if (!questionData) {
      return res.status(500).json({ error: 'Questions data unavailable' })
    }
    
    const questions = questionData.contests && questionData.contests[quizId] || []

    if (questions.length === 0) {
      return res.status(400).json({ error: 'Quiz not found' })
    }

    // Use adaptive assessment
    const assessment = AssessmentEngine.assessPerformance(questions, answers)

    // Get AI feedback
    const aiAnalysis = await analyzeQuiz({ quizId, answers })

    res.json({
      score: assessment.overallScore,
      totalQuestions: questions.length,
      
      // Cognitive level breakdown
      cognitiveAnalysis: {
        level1: assessment.scores.level1,
        level2: assessment.scores.level2,
        level3: assessment.scores.level3,
        level4: assessment.scores.level4
      },
      
      // AI feedback
      feedback: aiAnalysis.feedback,
      improvementAreas: aiAnalysis.improvementAreas
    })
  } catch (error) {
    console.error('Error analyzing quiz:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/adaptive/recommended-contest/:userId/:chapterId
 * Get recommended contest difficulty for a chapter based on user's past performance
 * Response: { recommendedContestNum: 1-5, difficulty: 'easy'|'hard' }
 */
router.get('/recommended-contest/:userId/:chapterId', async (req, res) => {
  try {
    const { userId, chapterId } = req.params
    const numericChapterId = parseInt(chapterId, 10)
    const numericUserId = parseInt(userId, 10)

    if (isNaN(numericChapterId) || numericChapterId < 1 || numericChapterId > 5) {
      return res.status(400).json({ error: 'Invalid chapter ID' })
    }

    if (isNaN(numericUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' })
    }

    // Fetch user's recent quiz results for this chapter from Supabase
    let lastScore = null
    if (supabase) {
      try {
        const { data } = await supabase
          .from('quiz_results')
          .select('overall_score')
          .eq('user_id', numericUserId)
          .ilike('quiz_id', `chapter${numericChapterId}%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (data) {
          lastScore = data.overall_score || 0
        }
      } catch (err) {
        console.log('[RecommendedContest] Supabase fetch failed (expected if no history):', err.message)
      }
    }

    // Default to score 5 (easy) if no history
    lastScore = lastScore !== null ? lastScore : 5

    // Determine recommended contest based on score
    // score < 9: easy contests (1, 2, 3)
    // score >= 9: hard contests (4, 5)
    let recommendedContestNum, difficulty, reasoning

    if (lastScore < 3) {
      recommendedContestNum = 1
      difficulty = 'easy'
      reasoning = `Score ${lastScore} - Start with contest 1 (easiest level)`
    } else if (lastScore < 6) {
      recommendedContestNum = 2
      difficulty = 'easy'
      reasoning = `Score ${lastScore} - Try contest 2 (easy level)`
    } else if (lastScore < 9) {
      recommendedContestNum = 3
      difficulty = 'easy'
      reasoning = `Score ${lastScore} - Continue with contest 3 (normal level)`
    } else if (lastScore < 9.5) {
      recommendedContestNum = 4
      difficulty = 'hard'
      reasoning = `Score ${lastScore} - Try contest 4 (hard level)`
    } else {
      recommendedContestNum = 5
      difficulty = 'hard'
      reasoning = `Score ${lastScore} - Challenge yourself with contest 5 (hardest level)`
    }

    res.json({
      userId: numericUserId,
      chapterId: numericChapterId,
      lastScore,
      recommendedContestNum,
      difficulty,
      reasoning,
      quizId: `chapter${numericChapterId}-contest${recommendedContestNum}`
    })
  } catch (error) {
    console.error('Error getting recommended contest:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router

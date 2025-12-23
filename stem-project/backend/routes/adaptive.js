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
const { supabase } = require('../database')

const router = express.Router()

// Validate quiz ID whitelist
const ALLOWED_QUIZ_IDS = ['contest1', 'contest2', 'contest3', 'contest4', 'contest5', 'random', 'personalized']

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
    const { data, error } = await supabase
      .from('user_learning_profiles')
      .select(`
        id, user_id, cognitive_levels, weak_areas, strong_areas, 
        proficiency_status, recommendations, learning_path, 
        quizzes_taken, last_updated, created_at
      `)
      .eq('user_id', userId)
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
        const { data } = await supabase
          .from('user_learning_profiles')
          .select(`
            id, user_id, cognitive_levels, weak_areas, strong_areas, 
            proficiency_status, recommendations, learning_path, 
            quizzes_taken, last_updated, created_at
          `)
          .eq('user_id', userId)
          .single()

        if (data) {
          profile = {
            userId,
            scores: data.cognitive_levels || getDefaultProfile().scores,
            proficiency: data.proficiency_status || getDefaultProfile().proficiency,
            weakAreas: data.weak_areas || [],
            strongAreas: data.strong_areas || [],
            recommendations: data.recommendations || getDefaultProfile().recommendations,
            learningPath: data.learning_path,
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
      const questionData = require('../data/questions_updated.json')
      const allQuestions = []
      Object.values(questionData.contests).forEach(contest => {
        allQuestions.push(...contest)
      })

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
    const questionData = require('../data/questions_updated.json')
    const allQuestions = []
    
    // Flatten all questions from all contests
    Object.values(questionData.contests).forEach(contest => {
      allQuestions.push(...contest)
    })

    // Fetch real profile from Supabase (if available)
    let userProfile
    
    if (supabase) {
      const { data: profileData, error: profileError } = await supabase
        .from('user_learning_profiles')
        .select('cognitive_levels, weak_areas, strong_areas')
        .eq('user_id', userId)
        .single()

      // Use Supabase data if available
      if (profileData) {
        userProfile = {
          userId,
          scores: profileData.cognitive_levels || {},
          weakAreas: profileData.weak_areas || [],
          strongAreas: profileData.strong_areas || []
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
      // Supabase not available - use default profile
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
        isFirstTime: true,
        message: 'Using default proficiency levels (Supabase not available)'
      }
    }

    // Generate personalized quiz based on user's cognitive levels
    const personalizedQuiz = AdaptiveQuestionSelector.generatePersonalizedQuiz(
      userProfile,
      allQuestions,
      20
    )

    // Remove answers from quiz before sending to client
    const quizForClient = personalizedQuiz.map(q => ({
      id: q.id,
      topic: q.topic,
      question: q.question,
      english_question: q.english_question,
      options: q.options,
      difficulty: q.difficulty,
      bloomLevel: q.bloomLevel
      // Don't send answerIndex!
    }))

    res.json({
      quiz: quizForClient,
      questionCount: quizForClient.length,
      userId,
      message: 'Personalized quiz generated based on your learning profile'
    })
  } catch (error) {
    console.error('Error generating quiz:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

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
      timeSpent
    })

    // Validate input
    if (!userId || userId === 'undefined') {
      console.error('[Analyze] Missing userId')
      return res.status(400).json({ error: 'User ID is required' })
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
    const invalidAnswers = answers.filter((a, idx) => !a.questionId || a.answer === null || a.answer === undefined)
    if (invalidAnswers.length > 0) {
      console.error('[Analyze] Invalid answer format:', invalidAnswers)
      return res.status(400).json({ error: `Invalid answer format. Each answer must have questionId and answer. Found ${invalidAnswers.length} invalid answers.` })
    }

    // Load questions - try both standard quiz and personalized data
    const questionData = require('../data/questions_updated.json')
    let questions = []

    console.log('[Analyze] Question data structure:', {
      hasContests: !!questionData.contests,
      contestsIsArray: Array.isArray(questionData.contests),
      contestsIsObject: typeof questionData.contests === 'object' && !Array.isArray(questionData.contests),
      contestKeys: questionData.contests ? Object.keys(questionData.contests) : []
    })

    if (personalizedQuizData && Array.isArray(personalizedQuizData)) {
      // Use provided quiz data (personalized quiz)
      questions = personalizedQuizData
      console.log('[Analyze] Using personalizedQuizData, questions count:', questions.length)
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

    // Convert answers from object format {questionId, answer} to array format for assessment
    const answerArray = answers.map(a => {
      const question = questions.find(q => q.id === a.questionId)
      if (!question) return -1
      // Find the index of the selected answer
      const answerIndex = question.options.indexOf(a.answer)
      return answerIndex >= 0 ? answerIndex : -1
    })

    // ============================================
    // ADAPTIVE ASSESSMENT
    // ============================================

    // Calculate scores across cognitive levels
    const assessment = AssessmentEngine.assessPerformance(questions, answerArray)

    // ============================================
    // AI ANALYSIS & FEEDBACK
    // ============================================

    // Get AI-powered feedback - pass questions and answers directly for personalized quiz
    let aiAnalysis = {}
    try {
      aiAnalysis = await analyzeQuiz({ 
        userId, 
        quizId, 
        answers: answers.map((a, idx) => ({
          questionId: a.questionId,
          selectedOption: a.answer
        })),
        questions: questions,
        isAutoSubmitted: false
      })
      console.log('[Analyze] AI analysis completed successfully')
    } catch (err) {
      console.error('[Analyze] AI analysis error:', err.message)
      // Fallback response if AI analysis fails
      aiAnalysis = {
        motivationalFeedback: 'Great job completing the quiz! Keep practicing to improve.',
        summary: {
          overall: 'Quiz completed. Analysis temporarily unavailable.',
          start_here: 'Review your weak areas and practice similar problems.'
        }
      }
    }

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
          .eq('user_id', userId)
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

    // Save to Supabase if available
    if (supabase && learningProfile) {
      try {
        if (currentProfile) {
          // Update existing profile
          await supabase
            .from('user_learning_profiles')
            .update({
              cognitive_levels: learningProfile.scores,
              proficiency_status: learningProfile.proficiency,
              weak_areas: learningProfile.weakAreas,
              strong_areas: learningProfile.strongAreas,
              recommendations: learningProfile.recommendations,
              learning_path: learningProfile.learningPath,
              quizzes_taken: (currentProfile.quizzes_taken || 0) + 1,
              last_updated: new Date().toISOString()
            })
            .eq('user_id', userId)
        } else {
          // Create new profile
          await supabase
            .from('user_learning_profiles')
            .insert({
              user_id: userId,
              cognitive_levels: learningProfile.scores,
              proficiency_status: learningProfile.proficiency,
              weak_areas: learningProfile.weakAreas,
              strong_areas: learningProfile.strongAreas,
              recommendations: learningProfile.recommendations,
              learning_path: learningProfile.learningPath,
              quizzes_taken: 1,
              created_at: new Date().toISOString(),
              last_updated: new Date().toISOString()
            })
        }
        console.log('[Analyze] Profile saved to Supabase for user:', userId)
      } catch (err) {
        console.error('[Analyze] Error saving to Supabase:', err.message)
        // Continue even if Supabase save fails
      }
    }

    // ============================================
    // RESPONSE
    // ============================================
    
    // Calculate total correct answers
    const totalCorrect = questions.reduce((sum, q, i) => {
      return sum + (q.answerIndex === answerArray[i] ? 1 : 0)
    }, 0)

    res.json({
      // Basic results
      overallScore: assessment.overallScore,
      totalQuestions: questions.length,
      correctAnswers: totalCorrect,
      
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
        weakAreas: learningProfile.weakAreas || [],
        strongAreas: learningProfile.strongAreas || [],
        recommendations: learningProfile.recommendations || [],
        learningPath: learningProfile.learningPath,
        quizzesTaken: (currentProfile?.quizzes_taken || 0) + 1
      },
      
      // AI feedback - extract from analysis or use defaults
      strengths: learningProfile.strongAreas || [],
      areasToImprove: learningProfile.weakAreas || [],
      feedback: aiAnalysis.motivationalFeedback || aiAnalysis.summary?.overall || 'Great job! Keep practicing to improve further.',
      
      // Next steps - create from AI summary or defaults
      nextSteps: aiAnalysis.summary?.start_here || `Focus on improving ${learningProfile.weakAreas?.[0] || 'overall performance'}.`,
      recommendations: learningProfile.recommendations || aiAnalysis.summary?.plan || [],
      
      // Additional AI insights
      aiSummary: aiAnalysis.summary,
      resourceLinks: aiAnalysis.resourceLinks || [],
      
      // Success message
      message: 'Quiz analyzed and profile updated successfully',
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

    const questionData = require('../data/questions_updated.json')
    const questions = questionData.contests[quizId] || []

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

    const questionData = require('../data/questions_updated.json')
    const questions = questionData.contests[quizId] || []

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

module.exports = router

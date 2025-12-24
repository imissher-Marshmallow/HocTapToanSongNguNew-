/**
 * Quiz Results Service
 * Saves complete quiz results to Supabase for intelligent future quiz selection
 * Enables AI to recommend appropriate difficulty levels and topics
 */

const { supabase } = require('../database');

/**
 * Save complete quiz result to Supabase
 * Stores: scores, topics performance, difficulty trends, cognitive levels
 */
const saveQuizResult = async (userId, quizData) => {
  if (!supabase) {
    console.log('[QuizResults] Supabase not available, skipping save');
    return false;
  }

  try {
    const {
      quizId,
      overallScore,
      correctAnswers,
      totalQuestions,
      cognitiveAnalysis = {},
      topicFeedback = {},
      timeSpent = 0,
      answerDetails = []
    } = quizData;

    // Calculate topic performance summary
    const topicPerformance = {};
    Object.entries(topicFeedback).forEach(([topic, data]) => {
      topicPerformance[topic] = {
        percentage: data.percentage || 0,
        correct: data.correct || 0,
        total: data.total || 0,
        performance: data.performance || 'WEAK'
      };
    });

    // Calculate cognitive level breakdown
    const cognitiveBreakdown = {};
    if (cognitiveAnalysis.levels) {
      cognitiveAnalysis.levels.forEach(level => {
        cognitiveBreakdown[level.name] = {
          score: level.score || 0,
          status: level.status || 'NOT_READY',
          correct: level.correct || 0,
          total: level.questionCount || 0
        };
      });
    }

    const quizResult = {
      user_id: userId,
      quiz_id: quizId || 'personalized',
      overall_score: overallScore || 0,
      correct_answers: correctAnswers || 0,
      total_questions: totalQuestions || 0,
      time_spent_seconds: timeSpent || 0,
      
      // Topic performance
      topic_performance: topicPerformance,
      
      // Cognitive levels
      cognitive_breakdown: cognitiveBreakdown,
      
      // Answer details for detailed review
      answer_details: answerDetails.map(a => ({
        question_id: a.questionId,
        question_text: a.questionText,
        topic: a.topic,
        difficulty: a.difficulty,
        student_answer: a.studentAnswer,
        correct_answer: a.correctAnswer,
        is_correct: a.isCorrect
      })),
      
      // Metadata
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('quiz_results')
      .insert([quizResult]);

    if (error) {
      console.error('[QuizResults] Error saving:', error.message);
      return false;
    }

    console.log('[QuizResults] Successfully saved for user:', userId);
    return true;
  } catch (error) {
    console.error('[QuizResults] Unexpected error:', error.message);
    return false;
  }
};

/**
 * Get user's quiz history for intelligent quiz generation
 */
const getUserQuizHistory = async (userId) => {
  if (!supabase) {
    console.log('[QuizHistory] Supabase not available');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[QuizHistory] Error fetching:', error.message);
      return null;
    }

    return data || [];
  } catch (error) {
    console.error('[QuizHistory] Unexpected error:', error.message);
    return null;
  }
};

/**
 * Calculate optimal next quiz difficulty
 * Based on historical performance
 */
const calculateOptimalDifficulty = async (userId) => {
  const history = await getUserQuizHistory(userId);
  
  if (!history || history.length === 0) {
    // New user - start with basic level
    return {
      recommendedLevel: 1,
      difficulty: 'BASIC',
      reason: 'Người dùng mới - bắt đầu từ cơ bản'
    };
  }

  // Calculate average score from last 3 quizzes
  const recentQuizzes = history.slice(0, 3);
  const avgScore = recentQuizzes.reduce((sum, q) => sum + (q.overall_score || 0), 0) / recentQuizzes.length;

  let recommendedLevel, difficulty, reason;

  if (avgScore >= 90) {
    recommendedLevel = 4;
    difficulty = 'ADVANCED_CHALLENGE';
    reason = 'Bạn thành thạo rồi - thử thách nâng cao';
  } else if (avgScore >= 80) {
    recommendedLevel = 3;
    difficulty = 'ADVANCED';
    reason = 'Bạn làm tốt - sang câu hỏi khó hơn';
  } else if (avgScore >= 60) {
    recommendedLevel = 2;
    difficulty = 'INTERMEDIATE';
    reason = 'Bạn có tiến bộ - tiếp tục luyện tập ở mức trung bình';
  } else {
    recommendedLevel = 1;
    difficulty = 'BASIC';
    reason = 'Ôn tập cơ bản trước';
  }

  return { recommendedLevel, difficulty, reason, avgScore };
};

/**
 * Get weak topics for targeted quiz
 */
const getWeakTopics = async (userId) => {
  const history = await getUserQuizHistory(userId);
  
  if (!history || history.length === 0) {
    return [];
  }

  // Aggregate topic performance across all attempts
  const topicStats = {};
  history.forEach(quiz => {
    if (quiz.topic_performance) {
      Object.entries(quiz.topic_performance).forEach(([topic, stats]) => {
        if (!topicStats[topic]) {
          topicStats[topic] = { percentages: [], total: 0 };
        }
        topicStats[topic].percentages.push(stats.percentage || 0);
        topicStats[topic].total += stats.total || 0;
      });
    }
  });

  // Find weak topics (avg < 70%)
  const weakTopics = Object.entries(topicStats)
    .map(([topic, stats]) => ({
      topic,
      avgPercentage: stats.percentages.reduce((a, b) => a + b, 0) / stats.percentages.length,
      attempts: stats.percentages.length
    }))
    .filter(t => t.avgPercentage < 70)
    .sort((a, b) => a.avgPercentage - b.avgPercentage)
    .slice(0, 3)
    .map(t => t.topic);

  return weakTopics;
};

/**
 * Get strong topics for reinforcement
 */
const getStrongTopics = async (userId) => {
  const history = await getUserQuizHistory(userId);
  
  if (!history || history.length === 0) {
    return [];
  }

  const topicStats = {};
  history.forEach(quiz => {
    if (quiz.topic_performance) {
      Object.entries(quiz.topic_performance).forEach(([topic, stats]) => {
        if (!topicStats[topic]) {
          topicStats[topic] = { percentages: [] };
        }
        topicStats[topic].percentages.push(stats.percentage || 0);
      });
    }
  });

  const strongTopics = Object.entries(topicStats)
    .map(([topic, stats]) => ({
      topic,
      avgPercentage: stats.percentages.reduce((a, b) => a + b, 0) / stats.percentages.length
    }))
    .filter(t => t.avgPercentage >= 80)
    .sort((a, b) => b.avgPercentage - a.avgPercentage)
    .slice(0, 2)
    .map(t => t.topic);

  return strongTopics;
};

/**
 * Get quiz recommendation for user
 * Returns: difficulty, suggested topics, reason
 */
const getQuizRecommendation = async (userId) => {
  const difficulty = await calculateOptimalDifficulty(userId);
  const weakTopics = await getWeakTopics(userId);
  const strongTopics = await getStrongTopics(userId);

  return {
    ...difficulty,
    weakTopics,
    strongTopics,
    quizzesTaken: await getQuizzesTaken(userId),
    message: `Khuyến nghị: ${difficulty.reason}. Tập trung vào: ${weakTopics.join(', ') || 'tất cả chủ đề'}`
  };
};

/**
 * Get total quizzes taken
 */
const getQuizzesTaken = async (userId) => {
  const history = await getUserQuizHistory(userId);
  return history ? history.length : 0;
};

module.exports = {
  saveQuizResult,
  getUserQuizHistory,
  calculateOptimalDifficulty,
  getWeakTopics,
  getStrongTopics,
  getQuizRecommendation,
  getQuizzesTaken
};

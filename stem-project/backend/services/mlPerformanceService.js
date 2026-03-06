/**
 * ML Performance Initialization & Management Service
 * 
 * Handles creation and updates of ml_performance_records
 * Called when:
 * 1. User signs up (initialize empty record)
 * 2. User completes first quiz (populate with initial data)
 * 3. User completes any quiz (update with latest metrics)
 */

const { supabase } = require('../database');

/**
 * Initialize ml_performance_records for new user
 * Called on signup or first login
 * 
 * @param {number} userId - Auth user ID
 * @returns {Promise<Object>} Created record
 */
async function initializeUserMLPerformance(userId) {
  if (!supabase) {
    console.warn('[MLPerformance] Supabase not available');
    return null;
  }

  try {
    const record = {
      user_id: userId,
      quiz_id: 'initial',
      score: 0,
      percentage: 0,
      // NOTE: Supabase schema cache may be stale
      // If you get "Could not find 'quiz_type' column" error:
      // 1. Restart your Supabase project (Settings > Restart)
      // OR
      // 2. Run migration 003 again in SQL Editor
      // Then uncomment this line:
      // quiz_type: 'initial',
      cognitive_breakdown: {
        level1: { correct: 0, total: 0, points: 0 },
        level2: { correct: 0, total: 0, points: 0 },
        level3: { correct: 0, total: 0, points: 0 },
        level4: { correct: 0, total: 0, points: 0 }
      },
      topic_mastery: {},
      weak_topics: [],
      strong_topics: [],
      trend_metrics: {
        trend: 'stable',
        compared_to_last: 0,
        momentum: 0
      },
      time_on_task: {
        total_seconds: 0,
        per_question_avg: 0
      }
    };

    const { data, error } = await supabase
      .from('ml_performance_records')
      .insert([record])
      .select();

    if (error) {
      console.error('[MLPerformance] Error initializing for user', userId, error);
      return null;
    }

    console.log('[MLPerformance] ✓ Initialized for user', userId);
    return data[0];
  } catch (err) {
    console.error('[MLPerformance] Exception:', err);
    return null;
  }
}

/**
 * Save quiz performance after completion
 * Calculates metrics and saves to ml_performance_records
 * 
 * @param {Object} quizData - Quiz submission data
 * @returns {Promise<Object>} Saved performance record
 */
async function saveQuizPerformance(quizData) {
  const {
    userId,
    quizId,
    examId,
    topic,
    score,
    maxScore,
    answers,
    questions,
    completionTime,
    quizType = 'adaptive'
  } = quizData;

  if (!supabase) {
    console.warn('[MLPerformance] Supabase not available');
    return null;
  }

  if (!userId) {
    throw new Error('userId is required');
  }

  try {
    // Calculate metrics
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const topicMastery = calculateTopicMastery(questions, answers);
    const cognitiveBreakdown = calculateCognitiveBreakdown(questions, answers);
    const weakTopics = identifyWeakTopics(topicMastery);
    const strongTopics = identifyStrongTopics(topicMastery);
    const timeOnTask = calculateTimeOnTask(completionTime, questions.length);
    const trendMetrics = await calculateTrendMetrics(userId, percentage);

    const performanceRecord = {
      user_id: userId,
      result_id: null,  // Link to quiz_results if exists
      quiz_id: quizId,
      exam_id: examId,
      topic: topic,
      score: score,
      percentage: percentage,
      max_score: maxScore,
      difficulty_level: examId <= 3 ? 'easy' : 'hard',
      cognitive_breakdown: cognitiveBreakdown,
      topic_mastery: topicMastery,
      weak_topics: weakTopics,
      strong_topics: strongTopics,
      trend_metrics: trendMetrics,
      time_on_task: timeOnTask,
      answers: formatAnswersForStorage(answers),
      quiz_type: quizType,
      completion_rate: 100
    };

    const { data, error } = await supabase
      .from('ml_performance_records')
      .insert([performanceRecord])
      .select();

    if (error) {
      throw new Error(`[MLPerformance] Supabase error: ${error.message}`);
    }

    console.log('[MLPerformance] ✓ Saved quiz performance for user', userId, {
      score: score,
      percentage: percentage.toFixed(2),
      weakTopics: weakTopics.length,
      strongTopics: strongTopics.length
    });

    return data[0];
  } catch (err) {
    console.error('[MLPerformance] Error saving quiz performance:', err);
    throw err;
  }
}

/**
 * Calculate topic mastery scores
 * @param {Array} questions - Quiz questions with difficulty and topic
 * @param {Array} answers - User's answers (indices)
 * @returns {Object} Topic mastery data
 */
function calculateTopicMastery(questions, answers) {
  const topicScores = {};

  questions.forEach((q, idx) => {
    const topic = q.topic || 'General';
    const isCorrect = q.answerIndex === answers[idx];

    if (!topicScores[topic]) {
      topicScores[topic] = {
        correct: 0,
        total: 0,
        score: 0,
        last_attempted: new Date().toISOString()
      };
    }

    topicScores[topic].total += 1;
    if (isCorrect) {
      topicScores[topic].correct += 1;
    }
    topicScores[topic].score = (topicScores[topic].correct / topicScores[topic].total) * 100;
  });

  return topicScores;
}

/**
 * Calculate cognitive level breakdown (Bloom's taxonomy)
 * @param {Array} questions - Quiz questions with difficulty level
 * @param {Array} answers - User's answers
 * @returns {Object} Breakdown by cognitive level (1-4)
 */
function calculateCognitiveBreakdown(questions, answers) {
  const breakdown = {
    level1: { correct: 0, total: 0, points: 0 },
    level2: { correct: 0, total: 0, points: 0 },
    level3: { correct: 0, total: 0, points: 0 },
    level4: { correct: 0, total: 0, points: 0 }
  };

  questions.forEach((q, idx) => {
    const level = parseInt(q.difficulty) || 1;
    const levelKey = `level${level}`;
    const isCorrect = q.answerIndex === answers[idx];

    breakdown[levelKey].total += 1;
    if (isCorrect) {
      breakdown[levelKey].correct += 1;
    }
  });

  // Calculate points based on performance
  for (let level = 1; level <= 4; level++) {
    const levelKey = `level${level}`;
    const percentage = breakdown[levelKey].total > 0 
      ? (breakdown[levelKey].correct / breakdown[levelKey].total) * 100 
      : 0;
    
    breakdown[levelKey].points = calculateBloomIncrement(percentage);
  }

  return breakdown;
}

/**
 * Calculate Bloom increment points based on percentage
 * @param {number} percentage - Correct percentage
 * @returns {number} Points to add
 */
function calculateBloomIncrement(percentage) {
  if (percentage >= 80) return 10;  // Excellent
  if (percentage >= 60) return 6;   // Good
  if (percentage >= 40) return 2;   // Average
  if (percentage >= 20) return 1;   // Bad
  return 3;                         // Very bad (still progress)
}

/**
 * Identify weak topics (< 60% accuracy)
 * @param {Object} topicMastery - Topic scores from calculateTopicMastery()
 * @returns {Array} Array of weak topics
 */
function identifyWeakTopics(topicMastery) {
  return Object.entries(topicMastery)
    .filter(([topic, data]) => data.score < 60)
    .map(([topic, data]) => ({
      topic: topic,
      score: Math.round(data.score),
      total_questions: data.total,
      correct_answers: data.correct,
      priority: 100 - data.score
    }))
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Identify strong topics (≥ 80% accuracy)
 * @param {Object} topicMastery - Topic scores
 * @returns {Array} Array of strong topics
 */
function identifyStrongTopics(topicMastery) {
  return Object.entries(topicMastery)
    .filter(([topic, data]) => data.score >= 80)
    .map(([topic, data]) => ({
      topic: topic,
      score: Math.round(data.score),
      can_advance: true
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Calculate time-on-task metrics
 * @param {number} completionTime - Total time in seconds
 * @param {number} questionCount - Total questions
 * @returns {Object} Time metrics
 */
function calculateTimeOnTask(completionTime = 0, questionCount = 20) {
  return {
    total_seconds: completionTime,
    per_question_avg: questionCount > 0 ? Math.round(completionTime / questionCount) : 0,
    time_efficiency: calculateTimeEfficiency(completionTime, questionCount)
  };
}

/**
 * Calculate time efficiency (1.0 = normal, > 1.0 = slower, < 1.0 = faster)
 */
function calculateTimeEfficiency(time, count) {
  const EXPECTED_TIME_PER_QUESTION = 45; // seconds
  const expectedTotal = count * EXPECTED_TIME_PER_QUESTION;
  return (time / expectedTotal).toFixed(2);
}

/**
 * Calculate trend metrics compared to previous quiz
 * @param {number} userId - User ID
 * @param {number} currentPercentage - Current quiz percentage
 * @returns {Promise<Object>} Trend data
 */
async function calculateTrendMetrics(userId, currentPercentage) {
  if (!supabase) return { trend: 'stable', compared_to_last: 0 };

  try {
    // Get last quiz score
    const { data, error } = await supabase
      .from('ml_performance_records')
      .select('percentage')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(2);

    if (error || !data || data.length === 0) {
      return {
        trend: 'stable',
        compared_to_last: 0,
        momentum: 0,
        estimated_next_score: currentPercentage
      };
    }

    let comparedToLast = 0;
    if (data.length > 1) {
      comparedToLast = currentPercentage - data[1].percentage;
    }

    const trend = comparedToLast > 5 ? 'improving' : comparedToLast < -5 ? 'declining' : 'stable';
    const momentum = comparedToLast !== 0 ? (comparedToLast / 100).toFixed(2) : 0;

    return {
      trend: trend,
      compared_to_last: parseFloat(comparedToLast.toFixed(2)),
      momentum: parseFloat(momentum),
      estimated_next_score: (currentPercentage + parseFloat(momentum)).toFixed(2)
    };
  } catch (err) {
    console.warn('[MLPerformance] Error calculating trends:', err);
    return { trend: 'stable', compared_to_last: 0 };
  }
}

/**
 * Format answers for storage (remove answer keys, keep indices only)
 * @param {Array} answers - Answer indices
 * @returns {Object} Formatted answers object
 */
function formatAnswersForStorage(answers) {
  const formatted = {};
  answers.forEach((answer, idx) => {
    formatted[`q${idx + 1}`] = answer;
  });
  return formatted;
}

/**
 * Get user's latest performance metrics
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Latest performance record
 */
async function getLatestPerformance(userId) {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('ml_performance_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[MLPerformance] Error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[MLPerformance] Exception:', err);
    return null;
  }
}

/**
 * Get user's top weak areas across all quizzes
 * @param {number} userId - User ID
 * @param {number} limit - Number of weak areas to return
 * @returns {Promise<Array>} Top weak topics
 */
async function getTopWeakAreas(userId, limit = 5) {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('ml_performance_records')
      .select('weak_topics')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[MLPerformance] Error:', error);
      return [];
    }

    // Aggregate weak areas from recent quizzes
    const weakAreaMap = {};
    data.forEach(record => {
      const weakTopics = record.weak_topics || [];
      weakTopics.forEach(topic => {
        if (!weakAreaMap[topic.topic]) {
          weakAreaMap[topic.topic] = { count: 0, totalScore: 0 };
        }
        weakAreaMap[topic.topic].count += 1;
        weakAreaMap[topic.topic].totalScore += topic.score;
      });
    });

    return Object.entries(weakAreaMap)
      .map(([topic, data]) => ({
        topic: topic,
        frequency: data.count,
        average_score: Math.round(data.totalScore / data.count),
        priority: 100 - Math.round(data.totalScore / data.count)
      }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);
  } catch (err) {
    console.error('[MLPerformance] Exception:', err);
    return [];
  }
}

module.exports = {
  initializeUserMLPerformance,
  saveQuizPerformance,
  getLatestPerformance,
  getTopWeakAreas,
  calculateBloomIncrement,
  identifyWeakTopics,
  identifyStrongTopics
};

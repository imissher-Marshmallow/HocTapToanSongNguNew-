/**
 * Advanced Adaptive Learning Service
 * 
 * Implements:
 * 1. Recommendation Engine
 * 2. Question Memory (anti-repeat)
 * 3. Progress Curve Analytics
 * 4. Mastery Tracking
 * 5. Spaced Repetition
 * 6. Time Analysis
 * 7. Difficulty Calibration
 * 8. ELO Rating System
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

/**
 * 1️⃣ RECOMMENDATION ENGINE
 * Get next recommended topic based on weak areas
 */
async function getRecommendedTopic(userId) {
  try {
    if (!supabaseUrl || !supabaseKey) return null;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch latest record with weak topics
    const { data: latestRecord } = await supabase
      .from('ml_performance_records')
      .select('weak_topics, strong_topics, topic')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!latestRecord || !latestRecord[0]) return null;

    const record = latestRecord[0];

    // Priority 1: Return weakest topic
    if (record.weak_topics && record.weak_topics.length > 0) {
      const weakest = record.weak_topics.sort((a, b) => a.score - b.score)[0];
      return {
        recommendedTopic: weakest.topic,
        reason: `You scored ${weakest.score}% last time`,
        difficulty: 'easy',
        estimatedQuestions: 10,
        priority: 'high'
      };
    }

    // Priority 2: Return topic ready for harder difficulty
    if (record.strong_topics && record.strong_topics.length > 0) {
      const nextTopic = record.strong_topics[0]; // Mastered topic
      return {
        recommendedTopic: nextTopic.topic,
        reason: `You've mastered this - ready for harder questions`,
        difficulty: 'hard',
        estimatedQuestions: 10,
        priority: 'medium'
      };
    }

    // Priority 3: Random new topic
    return {
      recommendedTopic: null,
      reason: 'Start with a new topic',
      difficulty: 'easy',
      estimatedQuestions: 10,
      priority: 'low'
    };
  } catch (err) {
    console.warn('Error in recommendation engine:', err.message);
    return null;
  }
}

/**
 * 2️⃣ QUESTION MEMORY (Anti-repeat)
 * Track and avoid repeating questions
 */
async function trackQuestionsAnswered(userId, quizId, questionIds) {
  try {
    if (!supabaseUrl || !supabaseKey) return false;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Add question IDs to questions_seen array
    const { error } = await supabase
      .from('ml_performance_records')
      .update({ 
        questions_seen: questionIds 
      })
      .eq('user_id', userId)
      .eq('quiz_id', quizId);

    if (error) {
      console.warn('Error tracking questions:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Error in question memory:', err.message);
    return false;
  }
}

/**
 * Get unseen questions (avoid repeats)
 * @returns {Array} Filter: questions not in seen list
 */
function filterUnseenQuestions(allQuestions, seenQuestionIds = []) {
  if (!seenQuestionIds || seenQuestionIds.length === 0) {
    return allQuestions;
  }

  const unseenQuestions = allQuestions.filter(q => !seenQuestionIds.includes(q.id));
  
  // If not enough unseen questions, allow repeats
  if (unseenQuestions.length < 5) {
    return allQuestions; // Fallback to all questions
  }

  return unseenQuestions;
}

/**
 * 3️⃣ LEARNING PROGRESS CURVE
 * Historical data for charts
 */
async function getProgressCurve(userId, topicName = null) {
  try {
    if (!supabaseUrl || !supabaseKey) return [];

    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from('learning_progress')
      .select('quiz_date, score, percentage, topic')
      .eq('user_id', userId)
      .order('quiz_date', { ascending: true });

    if (topicName) {
      query = query.eq('topic', topicName);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map(d => ({
      date: d.quiz_date,
      score: d.percentage,
      topic: d.topic
    }));
  } catch (err) {
    console.warn('Error fetching progress curve:', err.message);
    return [];
  }
}

/**
 * 4️⃣ MASTERY TRACKING
 * Track when topic reaches mastery (80%+ avg)
 */
async function updateMasteryStatus(userId, topicName, scorePercentage, allAttempts) {
  try {
    if (!supabaseUrl || !supabaseKey) return null;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get last 3 attempts
    const last3Scores = allAttempts.slice(-3).map(a => a.percentage);
    const average = last3Scores.reduce((a, b) => a + b, 0) / last3Scores.length;

    let masteryStatus = 'not_started';
    let masteryDate = null;

    if (average >= 80) {
      masteryStatus = 'mastered';
      masteryDate = new Date().toISOString();
    } else if (average >= 70) {
      masteryStatus = 'near_mastery';
    } else if (average >= 50) {
      masteryStatus = 'developing';
    }

    // Upsert mastery record
    const { data, error } = await supabase
      .from('topic_mastery')
      .upsert([{
        user_id: userId,
        topic: topicName,
        average_score: average,
        last_three_scores: last3Scores,
        mastery_status: masteryStatus,
        mastery_date: masteryDate,
        attempts_total: allAttempts.length,
        updated_at: new Date().toISOString()
      }], { onConflict: 'user_id,topic' })
      .select();

    if (error) {
      console.warn('Error updating mastery:', error.message);
      return null;
    }

    return data[0];
  } catch (err) {
    console.warn('Error in mastery tracking:', err.message);
    return null;
  }
}

/**
 * 5️⃣ SPACED REPETITION
 * Schedule next review based on score
 */
async function scheduleNextReview(userId, topicName, scorePercentage) {
  try {
    if (!supabaseUrl || !supabaseKey) return null;

    const supabase = createClient(supabaseUrl, supabaseKey);

    let daysUntilReview = 1;  // Default
    let priority = 0;

    if (scorePercentage < 50) {
      daysUntilReview = 1;  // Review in 1 day
      priority = 1;  // High priority
    } else if (scorePercentage < 70) {
      daysUntilReview = 2;  // Review in 2 days
      priority = 1;
    } else if (scorePercentage < 80) {
      daysUntilReview = 5;  // Review in 5 days
      priority = 0;
    } else {
      daysUntilReview = 14; // Review in 14 days if mastered
      priority = 0;
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + daysUntilReview);

    const { data, error } = await supabase
      .from('topic_reviews')
      .upsert([{
        user_id: userId,
        topic: topicName,
        last_attempt_date: new Date().toISOString(),
        last_score: scorePercentage,
        next_review_date: nextReviewDate.toISOString(),
        review_priority: priority,
        review_count: 1
      }], { onConflict: 'user_id,topic' })
      .select();

    if (error) {
      console.warn('Error scheduling review:', error.message);
      return null;
    }

    return data[0];
  } catch (err) {
    console.warn('Error in spaced repetition:', err.message);
    return null;
  }
}

/**
 * Get topics due for review
 */
async function getTopicsDueForReview(userId) {
  try {
    if (!supabaseUrl || !supabaseKey) return [];

    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('topic_reviews')
      .select('*')
      .eq('user_id', userId)
      .lte('next_review_date', now)
      .order('review_priority', { ascending: false })
      .order('next_review_date', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data;
  } catch (err) {
    console.warn('Error fetching review due topics:', err.message);
    return [];
  }
}

/**
 * 6️⃣ TIME ANALYSIS
 * Categorize speed (fast/normal/slow)
 */
function categorizeSpeed(averageTimeSeconds) {
  if (averageTimeSeconds < 30) return 'fast';
  if (averageTimeSeconds < 70) return 'normal';
  return 'slow';
}

/**
 * 7️⃣ DIFFICULTY CALIBRATION
 * Adjust question difficulty based on actual performance
 */
async function calibrateDifficulty(questionId, isCorrect) {
  try {
    if (!supabaseUrl || !supabaseKey) return null;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch current stats
    const { data: existing } = await supabase
      .from('question_stats')
      .select('*')
      .eq('question_id', questionId)
      .single();

    let attempts = 1;
    let correctAttempts = isCorrect ? 1 : 0;

    if (existing) {
      attempts = existing.attempts + 1;
      correctAttempts = existing.correct_attempts + (isCorrect ? 1 : 0);
    }

    const correctRate = (correctAttempts / attempts) * 100;
    
    // Determine difficulty category
    let category = 'normal';
    if (correctRate >= 80) category = 'too_easy';
    else if (correctRate >= 60) category = 'good_fit';
    else if (correctRate >= 40) category = 'challenging';
    else category = 'too_hard';

    // Calculate adjusted difficulty
    const difficultyAdjusted = correctRate < 50 ? 
      (existing?.difficulty_adjusted || 3) + 0.5 : 
      (existing?.difficulty_adjusted || 3) - 0.2;

    const { data, error } = await supabase
      .from('question_stats')
      .upsert([{
        question_id: questionId,
        attempts,
        correct_attempts: correctAttempts,
        correct_rate: correctRate,
        difficulty_category: category,
        difficulty_adjusted: Math.max(1, Math.min(5, difficultyAdjusted))
      }], { onConflict: 'question_id' })
      .select();

    if (error) {
      console.warn('Error calibrating difficulty:', error.message);
      return null;
    }

    return data[0];
  } catch (err) {
    console.warn('Error in difficulty calibration:', err.message);
    return null;
  }
}

/**
 * 8️⃣ ELO RATING SYSTEM
 * Calculate ELO rating change
 */
function calculateEloChange(userRating, expectedScore, actualScore) {
  const K = 32; // K-factor (standard chess value)
  const ratingDiff = Math.max(Math.min(userRating - 1200, 400), -400);
  const adjustedExpected = expectedScore * (1 - ratingDiff * 0.001);
  
  return Math.round(K * (actualScore - adjustedExpected));
}

async function updateUserEloRating(userId, topicName, scorePercentage) {
  try {
    if (!supabaseUrl || !supabaseKey) return null;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch current ELO
    const { data: eloData } = await supabase
      .from('user_elo_ratings')
      .select('*')
      .eq('user_id', userId)
      .single();

    let overallRating = 1200;
    let topicRatings = {};

    if (eloData) {
      overallRating = eloData.overall_rating || 1200;
      topicRatings = eloData.topic_ratings || {};
    }

    // Expected score (percentage / 100)
    const expectedScore = 0.5; // Assume 50-50 chance
    const actualScore = scorePercentage / 100;

    const eloChange = calculateEloChange(overallRating, expectedScore, actualScore);
    const newOverallRating = overallRating + eloChange;
    const newTopicRating = (topicRatings[topicName] || 1200) + eloChange;

    topicRatings[topicName] = newTopicRating;

    const ratingHistory = (eloData?.rating_history || []);
    ratingHistory.push({
      date: new Date().toISOString(),
      rating: newOverallRating,
      change: eloChange,
      topic: topicName
    });

    const { data, error } = await supabase
      .from('user_elo_ratings')
      .upsert([{
        user_id: userId,
        overall_rating: newOverallRating,
        topic_ratings: topicRatings,
        rating_history: ratingHistory.slice(-100), // Keep last 100
        last_updated: new Date().toISOString()
      }], { onConflict: 'user_id' })
      .select();

    if (error) {
      console.warn('Error updating ELO:', error.message);
      return null;
    }

    return data[0];
  } catch (err) {
    console.warn('Error in ELO rating:', err.message);
    return null;
  }
}

module.exports = {
  // 1. Recommendation
  getRecommendedTopic,
  // 2. Question Memory
  trackQuestionsAnswered,
  filterUnseenQuestions,
  // 3. Progress Curve
  getProgressCurve,
  // 4. Mastery
  updateMasteryStatus,
  // 5. Spaced Repetition
  scheduleNextReview,
  getTopicsDueForReview,
  // 6. Time Analysis
  categorizeSpeed,
  // 7. Difficulty Calibration
  calibrateDifficulty,
  // 8. ELO Rating
  updateUserEloRating,
  calculateEloChange
};

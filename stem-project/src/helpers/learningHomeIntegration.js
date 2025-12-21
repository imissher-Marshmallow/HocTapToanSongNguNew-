/* eslint-disable no-unused-vars */

export async function trackQuizAttempt(
  userId,
  quizId,
  score,
  percentage,
  timeTaken,
  answers,
  questions,
  apiBaseUrl
) {
  try {
    const payload = {
      userId,
      quizId,
      score,
      percentage,
      timeTaken,
      answerCount: answers?.length || 0,
      questionCount: questions?.length || 0,
      timestamp: new Date().toISOString()
    };
    console.log('Quiz attempt tracked:', payload);
  } catch (error) {
    console.warn('Failed to track quiz attempt:', error);
  }
}

export async function getLearningStats(userId, apiBaseUrl) {
  try {
    const response = await fetch(`${apiBaseUrl}/api/user/${userId}/learning-stats`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch learning stats:', error);
    return null;
  }
}

export async function updateLearningProgress(userId, analysisResult, apiBaseUrl) {
  try {
    const payload = {
      userId,
      weakAreas: analysisResult?.weakAreas || [],
      strengths: analysisResult?.summary?.strengths || [],
      lastQuizScore: analysisResult?.score || 0,
      timestamp: new Date().toISOString()
    };
    console.log('Learning progress updated:', payload);
  } catch (error) {
    console.warn('Failed to update learning progress:', error);
  }
}

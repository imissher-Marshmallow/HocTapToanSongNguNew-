/**
 * PerformanceAnalytics.js - Advanced Analytics Engine
 * 
 * Calculates detailed performance metrics:
 * - Skill matrix per category
 * - Error pattern classification
 * - Time management analysis
 * - Benchmark comparison
 */

class PerformanceAnalytics {
  /**
   * Calculate mastery index (0-100) for each category
   */
  calculateMasteryIndex(quizData, userAnswers) {
    const questions = quizData.questions || [];
    const categoryMetrics = {};

    questions.forEach((q, idx) => {
      const category = q.category || 'uncategorized';
      const isCorrect = userAnswers[idx] === q.answerIndex || userAnswers[idx] === q.correctAnswer;
      const difficulty = q.difficulty || 'medium';

      if (!categoryMetrics[category]) {
        categoryMetrics[category] = {
          correct: 0,
          total: 0,
          difficulties: { easy: 0, medium: 0, hard: 0, 'very hard': 0 },
          correctByDifficulty: { easy: 0, medium: 0, hard: 0, 'very hard': 0 }
        };
      }

      categoryMetrics[category].total++;
      categoryMetrics[category].difficulties[difficulty]++;
      if (isCorrect) {
        categoryMetrics[category].correct++;
        categoryMetrics[category].correctByDifficulty[difficulty]++;
      }
    });

    const masteryIndex = {};
    for (const [category, metrics] of Object.entries(categoryMetrics)) {
      const accuracy = metrics.total > 0 ? (metrics.correct / metrics.total) * 100 : 0;
      const hardQuestionsCorrect = metrics.correctByDifficulty['hard'] + metrics.correctByDifficulty['very hard'];
      const hardQuestionsTotal = metrics.difficulties['hard'] + metrics.difficulties['very hard'];
      const hardAccuracy = hardQuestionsTotal > 0 ? (hardQuestionsCorrect / hardQuestionsTotal) * 100 : 50;
      
      masteryIndex[category] = Math.round((accuracy * 0.6 + hardAccuracy * 0.4) * 100) / 100;
    }

    return masteryIndex;
  }

  /**
   * Generate skill matrix with proficiency levels
   */
  generateSkillMatrix(quizData, userAnswers) {
    const masteryIndex = this.calculateMasteryIndex(quizData, userAnswers);
    const skillMatrix = {};

    for (const [skill, mastery] of Object.entries(masteryIndex)) {
      let proficiency;
      if (mastery >= 85) proficiency = 'mastered';
      else if (mastery >= 70) proficiency = 'proficient';
      else if (mastery >= 50) proficiency = 'developing';
      else proficiency = 'beginner';

      skillMatrix[skill] = {
        mastery_index: mastery,
        proficiency_level: proficiency,
        recommendation: this._getRecommendation(proficiency, skill)
      };
    }

    return skillMatrix;
  }

  /**
   * Analyze error patterns
   */
  analyzeErrorPatterns(quizData, userAnswers) {
    const questions = quizData.questions || [];
    const errorPatterns = {
      conceptual: [],
      calculation: [],
      reading: [],
      logical: [],
      unknown: []
    };

    questions.forEach((q, idx) => {
      const userAnswer = userAnswers[idx];
      const isCorrect = userAnswer === q.answerIndex || userAnswer === q.correctAnswer;

      if (!isCorrect) {
        const errorType = q.errorType || this._classifyError(q, userAnswer);
        if (errorPatterns[errorType]) {
          errorPatterns[errorType].push({
            question: q.content || q.question,
            category: q.category || 'uncategorized'
          });
        }
      }
    });

    return {
      pattern_counts: {
        conceptual: errorPatterns.conceptual.length,
        calculation: errorPatterns.calculation.length,
        reading: errorPatterns.reading.length,
        logical: errorPatterns.logical.length,
        unknown: errorPatterns.unknown.length
      },
      most_common: Object.entries(errorPatterns)
        .sort(([, a], [, b]) => b.length - a.length)[0]?.[0] || 'none'
    };
  }

  /**
   * Analyze time management
   */
  analyzeTimeManagement(quizData, userAnswers) {
    const questions = quizData.questions || [];
    const rushed = [];
    const slow = [];

    questions.forEach((q, idx) => {
      const timeLimit = q.timeLimit || 60; // seconds
      const difficulty = q.difficulty || 'medium';
      const isCorrect = userAnswers[idx] === q.answerIndex || userAnswers[idx] === q.correctAnswer;

      // Hard questions that were answered incorrectly = might be rushed
      if (difficulty === 'hard' && !isCorrect) {
        rushed.push({ difficulty, question: idx + 1 });
      }
    });

    return {
      potentially_rushed_questions: rushed.length,
      suggested_time_per_question: 'Spend more time on difficult questions',
      efficiency: rushed.length === 0 ? 'good' : 'needs improvement'
    };
  }

  /**
   * Compare with benchmark (mock cohort data)
   */
  compareWithBenchmark(studentScore) {
    // Mock cohort data for benchmarking
    const cohortScores = [45, 52, 58, 62, 65, 68, 72, 75, 78, 82, 85, 88, 90, 95];
    const betterThan = cohortScores.filter(s => s < studentScore).length;
    const percentile = Math.round((betterThan / cohortScores.length) * 100);

    return {
      student_score: studentScore,
      cohort_average: Math.round(cohortScores.reduce((a, b) => a + b) / cohortScores.length * 100) / 100,
      percentile_rank: percentile,
      above_average: studentScore > (cohortScores.reduce((a, b) => a + b) / cohortScores.length)
    };
  }

  /**
   * Generate detailed report
   */
  generateDetailedReport(quizData, userAnswers, overallScore) {
    return {
      skill_matrix: this.generateSkillMatrix(quizData, userAnswers),
      error_patterns: this.analyzeErrorPatterns(quizData, userAnswers),
      time_management: this.analyzeTimeManagement(quizData, userAnswers),
      benchmark_comparison: this.compareWithBenchmark(overallScore)
    };
  }

  // Helper methods
  _getRecommendation(proficiency, skill) {
    const recommendations = {
      mastered: `You have mastered ${skill}! Consider helping peers.`,
      proficient: `You are proficient in ${skill}. Keep practicing.`,
      developing: `You are developing ${skill}. Focus on weak areas.`,
      beginner: `You are new to ${skill}. Review fundamentals.`
    };
    return recommendations[proficiency] || 'Continue practicing.';
  }

  _classifyError(question, userAnswer) {
    // Simple error classification
    const content = (question.content || '').toLowerCase();
    if (content.includes('solve') || content.includes('calculate')) return 'calculation';
    if (content.includes('read') || content.includes('identify')) return 'reading';
    if (content.includes('why') || content.includes('explain')) return 'logical';
    return 'unknown';
  }
}

// Export singleton instance
module.exports = new PerformanceAnalytics();

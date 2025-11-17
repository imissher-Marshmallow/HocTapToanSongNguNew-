/**
 * Performance Analytics Service
 * Provides detailed metrics and analytics visualizations
 */

class PerformanceAnalytics {
  /**
   * Calculate Category Mastery Index
   * Combines accuracy, speed, and consistency
   */
  calculateMasteryIndex(performance, categoryName) {
    const category = performance.categoryPerformance[categoryName];
    if (!category) return 0;

    const accuracyScore = (category.percentage / 100) * 0.5; // 50% weight
    const consistencyScore = category.consistency || 0.5; // 30% weight
    const speedScore = category.avgSpeed || 0.5; // 20% weight

    return (accuracyScore * 0.5) + (consistencyScore * 0.3) + (speedScore * 0.2);
  }

  /**
   * Generate Skill Matrix
   * Shows skills that student has mastered vs needs work
   */
  generateSkillMatrix(performance, questions) {
    const skills = {};

    questions.forEach((question, idx) => {
      const skill = question.skill || question.category || 'General';
      
      if (!skills[skill]) {
        skills[skill] = {
          name: skill,
          attempts: 0,
          successes: 0,
          proficiency: 0,
          level: 'beginner'
        };
      }

      skills[skill].attempts++;
      if (performance.answerResults && performance.answerResults[idx]) {
        skills[skill].successes++;
      }
    });

    // Calculate proficiency levels
    Object.keys(skills).forEach(skill => {
      const s = skills[skill];
      s.proficiency = (s.successes / s.attempts) * 100;
      
      if (s.proficiency >= 85) s.level = 'mastered';
      else if (s.proficiency >= 70) s.level = 'proficient';
      else if (s.proficiency >= 50) s.level = 'developing';
      else s.level = 'beginner';
    });

    return skills;
  }

  /**
   * Comparative Analysis
   * Compare student's performance against benchmarks
   */
  compareWithBenchmark(performance, benchmark = {}) {
    const comparison = {
      overall: {
        student: performance.overallScore,
        benchmark: benchmark.overall || 70,
        difference: 0,
        percentile: 0
      },
      byCategory: {}
    };

    comparison.overall.difference = comparison.overall.student - comparison.overall.benchmark;
    comparison.overall.percentile = Math.max(0, Math.min(100, 
      ((comparison.overall.student / comparison.overall.benchmark) * 50) + 50
    ));

    // Category comparison
    Object.keys(performance.categoryPerformance).forEach(category => {
      const categoryScore = performance.categoryPerformance[category].percentage;
      const benchmarkScore = benchmark[category] || 70;

      comparison.byCategory[category] = {
        student: categoryScore,
        benchmark: benchmarkScore,
        difference: categoryScore - benchmarkScore,
        status: categoryScore >= benchmarkScore ? 'above' : 'below'
      };
    });

    return comparison;
  }

  /**
   * Time Analysis
   * Analyze time management and pacing
   */
  analyzeTimeManagement(answers, questions, totalTime) {
    const timeMetrics = {
      totalTime,
      averageTimePerQuestion: 0,
      pacing: 'optimal',
      timeDistribution: {},
      rushWarnings: [],
      slowQuestions: []
    };

    if (questions.length === 0) return timeMetrics;

    timeMetrics.averageTimePerQuestion = totalTime / questions.length;

    // Identify rushed answers
    answers.forEach((answer, idx) => {
      const timeSpent = answer.timeSpent || timeMetrics.averageTimePerQuestion;
      
      if (timeSpent < timeMetrics.averageTimePerQuestion * 0.5) {
        if (!answer.isCorrect) {
          timeMetrics.rushWarnings.push({
            questionId: idx + 1,
            timeSpent,
            isCorrect: answer.isCorrect
          });
        }
      }

      if (timeSpent > timeMetrics.averageTimePerQuestion * 1.5) {
        timeMetrics.slowQuestions.push({
          questionId: idx + 1,
          timeSpent,
          difficulty: questions[idx].difficulty
        });
      }
    });

    if (timeMetrics.rushWarnings.length > 2) {
      timeMetrics.pacing = 'rushed';
    } else if (timeMetrics.slowQuestions.length > 2) {
      timeMetrics.pacing = 'slow';
    }

    return timeMetrics;
  }

  /**
   * Error Pattern Analysis
   * Categorize and count error types
   */
  analyzeErrorPatterns(answers, questions) {
    const patterns = {
      conceptualErrors: [],
      calculationErrors: [],
      readingErrors: [],
      logicalErrors: [],
      unknownErrors: [],
      summary: {}
    };

    answers.forEach((answer, idx) => {
      if (answer.isCorrect) return;

      const errorType = this.classifyError(answer, questions[idx]);
      patterns[errorType].push(idx + 1);
    });

    // Summary
    patterns.summary = {
      totalErrors: Object.values(patterns)
        .filter(v => Array.isArray(v))
        .reduce((sum, arr) => sum + arr.length, 0),
      mostCommonError: this.getMostCommonErrorType(patterns),
      errorTrend: 'stable'
    };

    return patterns;
  }

  /**
   * Difficulty Distribution
   * Shows how many of each difficulty level student attempted
   */
  analyzeDifficultyDistribution(questions) {
    const distribution = {
      easy: { count: 0, correct: 0, percentage: 0 },
      medium: { count: 0, correct: 0, percentage: 0 },
      hard: { count: 0, correct: 0, percentage: 0 }
    };

    questions.forEach(question => {
      const difficulty = question.difficulty || 'medium';
      if (distribution[difficulty]) {
        distribution[difficulty].count++;
      }
    });

    Object.keys(distribution).forEach(diff => {
      const total = Object.values(distribution)
        .reduce((sum, d) => sum + d.count, 0);
      distribution[diff].percentage = total > 0 
        ? (distribution[diff].count / total) * 100 
        : 0;
    });

    return distribution;
  }

  /**
   * Helper: Classify error type
   */
  classifyError(answer, question) {
    // Simple heuristics - can be enhanced
    const errorText = (answer.reasoning || '').toLowerCase();
    
    if (errorText.includes('formula') || errorText.includes('concept')) {
      return 'conceptualErrors';
    } else if (errorText.includes('calculate') || errorText.includes('arithmetic')) {
      return 'calculationErrors';
    } else if (errorText.includes('read') || errorText.includes('understand')) {
      return 'readingErrors';
    } else if (errorText.includes('logic') || errorText.includes('reasoning')) {
      return 'logicalErrors';
    }
    
    return 'unknownErrors';
  }

  /**
   * Helper: Get most common error type
   */
  getMostCommonErrorType(patterns) {
    const errorTypes = ['conceptualErrors', 'calculationErrors', 'readingErrors', 'logicalErrors'];
    let maxCount = 0;
    let mostCommon = 'unknownErrors';

    errorTypes.forEach(type => {
      if (patterns[type].length > maxCount) {
        maxCount = patterns[type].length;
        mostCommon = type;
      }
    });

    return mostCommon;
  }

  /**
   * Generate Comprehensive Report
   */
  generateDetailedReport(performance, weaknesses, questions, answers) {
    return {
      performanceMetrics: {
        overallScore: performance.overallScore,
        byCategory: performance.categoryPerformance,
        byDifficulty: performance.difficultyAnalysis
      },
      skillMatrix: this.generateSkillMatrix(performance, questions),
      errorAnalysis: this.analyzeErrorPatterns(answers, questions),
      difficultyDistribution: this.analyzeDifficultyDistribution(questions),
      strength: weaknesses.patterns.conceptualGaps.length === 0 
        ? 'Advanced' 
        : weaknesses.patterns.conceptualGaps.length <= 1 
        ? 'Intermediate' 
        : 'Developing'
    };
  }
}

export default new PerformanceAnalytics();

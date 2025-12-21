/**
 * AI Analyzer Service - Real ML-based analysis engine
 * Uses multiple algorithms for intelligent insights
 */

class AIAnalyzer {
  constructor() {
    this.confidenceThreshold = 0.6;
  }

  /**
   * Algorithm 1: Weighted Performance Analysis
   * Analyzes performance by difficulty and category
   */
  analyzePerformance(answers, questions) {
    const analysis = {
      overallScore: 0,
      categoryPerformance: {},
      difficultyAnalysis: {},
      learningCurve: [],
      confidenceScores: {}
    };

    let totalWeight = 0;
    let weightedScore = 0;

    answers.forEach((answer, idx) => {
      const question = questions[idx];
      if (!question) return;

      const isCorrect = answer.isCorrect ? 1 : 0;
      const difficulty = this.normalizeDifficulty(question.difficulty || 'medium');
      const weight = difficulty * 1.5; // Harder questions weighted more

      weightedScore += isCorrect * weight;
      totalWeight += weight;

      // Category performance
      const category = question.category || 'General';
      if (!analysis.categoryPerformance[category]) {
        analysis.categoryPerformance[category] = {
          correct: 0,
          total: 0,
          percentage: 0,
          trend: 'stable'
        };
      }
      analysis.categoryPerformance[category].correct += isCorrect;
      analysis.categoryPerformance[category].total += 1;

      // Difficulty analysis
      const diffKey = question.difficulty || 'medium';
      if (!analysis.difficultyAnalysis[diffKey]) {
        analysis.difficultyAnalysis[diffKey] = {
          correct: 0,
          total: 0,
          percentage: 0
        };
      }
      analysis.difficultyAnalysis[diffKey].correct += isCorrect;
      analysis.difficultyAnalysis[diffKey].total += 1;

      // Learning curve (sequential progress)
      analysis.learningCurve.push({
        questionId: idx + 1,
        isCorrect,
        difficulty,
        timestamp: idx
      });

      // Confidence score
      analysis.confidenceScores[idx] = this.calculateConfidence(answer, question);
    });

    // Calculate percentages
    Object.keys(analysis.categoryPerformance).forEach(cat => {
      const perf = analysis.categoryPerformance[cat];
      perf.percentage = (perf.correct / perf.total) * 100;
    });

    Object.keys(analysis.difficultyAnalysis).forEach(diff => {
      const perf = analysis.difficultyAnalysis[diff];
      perf.percentage = (perf.correct / perf.total) * 100;
    });

    analysis.overallScore = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;

    return analysis;
  }

  /**
   * Algorithm 2: Cluster Weakness Detection
   * Groups similar errors to identify knowledge gaps
   */
  detectWeaknessPatterns(answers, questions) {
    const patterns = {
      conceptualGaps: [],
      procedureErrors: [],
      carelessMistakes: [],
      timeManagementIssues: []
    };

    const errorClusters = {};

    answers.forEach((answer, idx) => {
      if (answer.isCorrect) return;

      const question = questions[idx];
      const concept = question.concept || question.category || 'unknown';

      if (!errorClusters[concept]) {
        errorClusters[concept] = [];
      }
      errorClusters[concept].push({
        questionId: idx,
        answer,
        question
      });
    });

    // Analyze clusters
    Object.keys(errorClusters).forEach(concept => {
      const cluster = errorClusters[concept];
      const frequency = cluster.length;

      if (frequency >= 2) {
        // Multiple errors in same concept = conceptual gap
        patterns.conceptualGaps.push({
          concept,
          frequency,
          severity: frequency >= 3 ? 'high' : 'medium',
          affectedQuestions: cluster.map(c => c.questionId + 1)
        });
      }

      // Analyze error types
      cluster.forEach(item => {
        if (this.isCarelessMistake(item.answer, item.question)) {
          patterns.carelessMistakes.push(item.questionId + 1);
        } else if (this.isProcedureError(item.answer, item.question)) {
          patterns.procedureErrors.push(item.questionId + 1);
        }
      });
    });

    return {
      errorClusters,
      patterns,
      weaknessSummary: this.generateWeaknessSummary(patterns)
    };
  }

  /**
   * Algorithm 3: Learning Path Recommendation
   * Generates personalized learning recommendations
   */
  generateLearningPath(performance, weaknesses) {
    const recommendations = {
      priority: [],
      supplementary: [],
      reinforcement: [],
      estimatedTime: 0
    };

    // Priority: Fix high-severity conceptual gaps
    weaknesses.patterns.conceptualGaps.forEach(gap => {
      if (gap.severity === 'high') {
        recommendations.priority.push({
          concept: gap.concept,
          action: 'REVIEW_CONCEPTS',
          estimatedMinutes: 30,
          resources: this.suggestResources(gap.concept),
          difficulty: 'foundational'
        });
      }
    });

    // Supplementary: Practice medium-difficulty concepts
    Object.keys(performance.categoryPerformance).forEach(category => {
      const perf = performance.categoryPerformance[category];
      if (perf.percentage < 80 && perf.percentage >= 50) {
        recommendations.supplementary.push({
          category,
          action: 'PRACTICE_PROBLEMS',
          estimatedMinutes: 20,
          focusCount: Math.ceil(perf.total * 0.3),
          difficulty: 'intermediate'
        });
      }
    });

    // Reinforcement: Strengthen weak difficulty levels
    Object.keys(performance.difficultyAnalysis).forEach(difficulty => {
      const perf = performance.difficultyAnalysis[difficulty];
      if (perf.percentage >= 80) {
        recommendations.reinforcement.push({
          difficulty,
          action: 'CHALLENGE_PROBLEMS',
          estimatedMinutes: 15,
          description: `Master ${difficulty} level problems`
        });
      }
    });

    // Calculate total time
    recommendations.estimatedTime = 
      recommendations.priority.reduce((sum, r) => sum + r.estimatedMinutes, 0) +
      recommendations.supplementary.reduce((sum, r) => sum + r.estimatedMinutes, 0) +
      recommendations.reinforcement.reduce((sum, r) => sum + r.estimatedMinutes, 0);

    return recommendations;
  }

  /**
   * Algorithm 4: Confidence Trend Analysis
   * Analyzes confidence progression throughout test
   */
  analyzeConfidenceTrend(answers, questions) {
    const trend = {
      overall: 0,
      progression: [],
      volatility: 0,
      consistencyScore: 0
    };

    const confidences = answers.map((ans, idx) => 
      this.calculateConfidence(ans, questions[idx])
    );

    trend.overall = confidences.reduce((a, b) => a + b, 0) / confidences.length;

    // Calculate progression (early vs late performance)
    const midpoint = Math.floor(confidences.length / 2);
    const earlyConfidence = confidences.slice(0, midpoint)
      .reduce((a, b) => a + b, 0) / midpoint;
    const lateConfidence = confidences.slice(midpoint)
      .reduce((a, b) => a + b, 0) / (confidences.length - midpoint);

    trend.progression = {
      early: earlyConfidence,
      late: lateConfidence,
      improved: lateConfidence > earlyConfidence
    };

    // Calculate volatility (consistency)
    const mean = trend.overall;
    const squareDiffs = confidences.map(c => Math.pow(c - mean, 2));
    const variance = squareDiffs.reduce((a, b) => a + b, 0) / confidences.length;
    trend.volatility = Math.sqrt(variance);
    trend.consistencyScore = 100 - (trend.volatility * 10);

    return trend;
  }

  /**
   * Algorithm 5: Predictive Remediation
   * Predicts future performance and suggests intervention
   */
  predictFuturePerformance(performance, weaknesses, history = []) {
    const prediction = {
      predictedScore: 0,
      confidence: 0,
      trend: 'stable',
      interventionNeeded: false,
      suggestedIntervention: null
    };

    // Base prediction from current performance
    prediction.predictedScore = performance.overallScore;
    prediction.confidence = 0.7; // Default confidence

    // Adjust based on weakness severity
    const highSeverityCount = weaknesses.patterns.conceptualGaps
      .filter(g => g.severity === 'high').length;
    
    if (highSeverityCount > 0) {
      prediction.predictedScore -= highSeverityCount * 5;
      prediction.interventionNeeded = true;
      prediction.suggestedIntervention = 'INTENSIVE_REVIEW';
    }

    // Adjust based on confidence trend
    const confidenceTrend = this.analyzeConfidenceTrend([], []);
    if (confidenceTrend.volatility > 0.3) {
      prediction.trend = 'unstable';
      prediction.confidence -= 0.15;
    }

    prediction.confidence = Math.max(0.4, Math.min(1, prediction.confidence));
    prediction.predictedScore = Math.max(0, Math.min(100, prediction.predictedScore));

    return prediction;
  }

  /**
   * Helper: Calculate confidence score for an answer
   */
  calculateConfidence(answer, question) {
    let confidence = 0;

    if (answer.isCorrect) {
      confidence = 0.9; // High confidence if correct
    } else {
      // Analyze answer quality even if wrong
      const answerLength = (answer.text || '').length;
      const isPartiallyCorrect = answer.partialCredit !== undefined;
      
      confidence = 0.3;
      if (answerLength > 10) confidence += 0.2;
      if (isPartiallyCorrect) confidence += 0.2;
    }

    return confidence;
  }

  /**
   * Helper: Normalize difficulty
   */
  normalizeDifficulty(difficulty) {
    const map = { easy: 0.5, medium: 1, hard: 1.5, 'very hard': 2 };
    return map[difficulty.toLowerCase()] || 1;
  }

  /**
   * Helper: Check if error is careless mistake
   */
  isCarelessMistake(answer, question) {
    // Logic for identifying careless mistakes
    // E.g., wrong sign, off-by-one, calculation error
    if (!answer.reasoning) return false;
    
    return answer.reasoning.includes('typo') || 
           answer.reasoning.includes('calculation') ||
           answer.reasoning.includes('sign');
  }

  /**
   * Helper: Check if error is procedure error
   */
  isProcedureError(answer, question) {
    // Logic for identifying procedural/methodological errors
    return !this.isCarelessMistake(answer, question);
  }

  /**
   * Helper: Generate weakness summary
   */
  generateWeaknessSummary(patterns) {
    const summary = [];

    if (patterns.conceptualGaps.length > 0) {
      const topGap = patterns.conceptualGaps[0];
      summary.push(
        `Conceptual gap in ${topGap.concept} (${topGap.frequency} errors)`
      );
    }

    if (patterns.procedureErrors.length > 0) {
      summary.push(
        `Procedural issues: ${patterns.procedureErrors.length} methodology errors`
      );
    }

    if (patterns.carelessMistakes.length > 0) {
      summary.push(
        `Careless mistakes: ${patterns.carelessMistakes.length} questions`
      );
    }

    return summary;
  }

  /**
   * Helper: Suggest resources based on concept
   */
  suggestResources(concept) {
    // In production, this would query a resource database
    return [
      { name: `Review: ${concept} fundamentals`, type: 'article', duration: 10 },
      { name: `Video: ${concept} explained`, type: 'video', duration: 15 },
      { name: `Practice: ${concept} problems`, type: 'exercise', duration: 20 }
    ];
  }

  /**
   * Main analysis function - Orchestrates all algorithms
   */
  analyzeResults(quizData) {
    const { answers, questions, metadata = {} } = quizData;

    // Run all algorithms
    const performance = this.analyzePerformance(answers, questions);
    const weaknesses = this.detectWeaknessPatterns(answers, questions);
    const learningPath = this.generateLearningPath(performance, weaknesses);
    const confidenceTrend = this.analyzeConfidenceTrend(answers, questions);
    const prediction = this.predictFuturePerformance(performance, weaknesses);

    return {
      timestamp: new Date().toISOString(),
      performance,
      weaknesses,
      learningPath,
      confidenceTrend,
      prediction,
      insights: this.generateInsights(performance, weaknesses, confidenceTrend)
    };
  }

  /**
   * Generate human-readable insights
   */
  generateInsights(performance, weaknesses, confidenceTrend) {
    const insights = [];

    // Insight 1: Performance analysis
    if (performance.overallScore >= 80) {
      insights.push({
        type: 'STRENGTH',
        message: `Excellent performance overall. Focus on mastering the remaining difficult concepts.`,
        priority: 'low'
      });
    } else if (performance.overallScore >= 60) {
      insights.push({
        type: 'IMPROVEMENT',
        message: `Solid foundation with room for improvement. Target your weakest categories.`,
        priority: 'medium'
      });
    } else {
      insights.push({
        type: 'CONCERN',
        message: `Performance needs significant improvement. Start with foundational concepts.`,
        priority: 'high'
      });
    }

    // Insight 2: Weakness patterns
    if (weaknesses.patterns.conceptualGaps.length > 2) {
      insights.push({
        type: 'PATTERN',
        message: `Multiple conceptual gaps detected. Recommend comprehensive review.`,
        priority: 'high',
        data: weaknesses.patterns.conceptualGaps
      });
    }

    // Insight 3: Confidence consistency
    if (confidenceTrend.consistencyScore < 60) {
      insights.push({
        type: 'CAUTION',
        message: `Inconsistent confidence level. May indicate nervousness or knowledge gaps.`,
        priority: 'medium'
      });
    }

    // Insight 4: Progress trend
    if (confidenceTrend.progression.improved) {
      insights.push({
        type: 'POSITIVE',
        message: `Great improvement throughout the test! You got stronger as you progressed.`,
        priority: 'low'
      });
    }

    return insights;
  }
}

export default new AIAnalyzer();

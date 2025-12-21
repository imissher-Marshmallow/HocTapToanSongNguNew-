/**
 * AIAnalyzer.js - Machine Learning Analysis Service
 * 
 * 5 Core Algorithms:
 * 1. analyzePerformance() - Weighted scoring by difficulty
 * 2. detectWeaknessPatterns() - Cluster errors by concept
 * 3. analyzeConfidenceTrend() - Track performance consistency
 * 4. predictFuturePerformance() - Linear regression prediction
 * 5. generateInsights() - Convert to human-readable format
 */

class AIAnalyzer {
  /**
   * Algorithm 1: Weighted Performance Analysis
   * Higher difficulty = higher weight
   */
  analyzePerformance(quizData, userAnswers, overallScore) {
    const questions = quizData.questions || [];
    const difficultyWeights = {
      easy: 0.5,
      medium: 1.0,
      hard: 1.5,
      'very hard': 2.0
    };

    let totalWeight = 0;
    let weightedScore = 0;
    const categoryPerformance = {};

    questions.forEach((q, idx) => {
      const userAnswer = userAnswers[idx];
      const isCorrect = userAnswer === q.answerIndex || userAnswer === q.correctAnswer;
      const difficulty = q.difficulty || 'medium';
      const weight = difficultyWeights[difficulty] || 1.0;
      const category = q.category || 'uncategorized';

      totalWeight += weight;
      if (isCorrect) weightedScore += weight;

      if (!categoryPerformance[category]) {
        categoryPerformance[category] = { correct: 0, total: 0, weight: 0 };
      }
      categoryPerformance[category].total += 1;
      categoryPerformance[category].weight += weight;
      if (isCorrect) categoryPerformance[category].correct += 1;
    });

    return {
      overallScore: Math.round(overallScore * 100) / 100,
      weightedScore: totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0,
      categoryPerformance
    };
  }

  /**
   * Algorithm 2: Weakness Pattern Detection
   * Clusters errors by concept
   */
  detectWeaknessPatterns(quizData, userAnswers) {
    const questions = quizData.questions || [];
    const weaknessesByCategory = {};

    questions.forEach((q, idx) => {
      const userAnswer = userAnswers[idx];
      const isCorrect = userAnswer === q.answerIndex || userAnswer === q.correctAnswer;
      
      if (!isCorrect) {
        const category = q.category || 'uncategorized';
        if (!weaknessesByCategory[category]) {
          weaknessesByCategory[category] = [];
        }
        weaknessesByCategory[category].push({
          question: q.content || q.question,
          userAnswer: userAnswer,
          correctAnswer: q.answerIndex || q.correctAnswer,
          difficulty: q.difficulty || 'medium'
        });
      }
    });

    const weaknesses = [];
    for (const [category, errors] of Object.entries(weaknessesByCategory)) {
      const severity = errors.length > 2 ? 'HIGH' : errors.length === 2 ? 'MEDIUM' : 'LOW';
      
      weaknesses.push({
        concept: category,
        weakness_type: 'CONCEPTUAL_GAP',
        severity,
        frequency: errors.length,
        affected_questions: errors.map((e, i) => i + 1),
        description: `Struggled with ${errors.length} question(s) in ${category}`
      });
    }

    return weaknesses;
  }

  /**
   * Algorithm 3: Confidence Trend Analysis
   * Tracks performance consistency
   */
  analyzeConfidenceTrend(performanceHistory = []) {
    if (!performanceHistory || performanceHistory.length === 0) {
      return {
        consistency_score: 0.5,
        trend: 'stable',
        volatility: 0
      };
    }

    const scores = performanceHistory.map(p => p.score || 0);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, 1 - (stdDev / 100)); // Normalize to 0-1

    let trend = 'stable';
    if (scores.length >= 2) {
      const recent = scores.slice(-3);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const older = scores.slice(0, -3);
      const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
      
      if (recentAvg > olderAvg + 5) trend = 'improving';
      else if (recentAvg < olderAvg - 5) trend = 'declining';
    }

    return {
      consistency_score: Math.round(consistency * 100) / 100,
      trend,
      volatility: Math.round(stdDev * 100) / 100
    };
  }

  /**
   * Algorithm 4: Future Performance Prediction
   * Linear regression on historical data
   */
  predictFuturePerformance(performanceHistory = []) {
    if (!performanceHistory || performanceHistory.length < 2) {
      return {
        predicted_score: 75,
        confidence: 0.3,
        trend: 'stable'
      };
    }

    const scores = performanceHistory.map((p, i) => ({ x: i, y: p.score || 0 }));
    const n = scores.length;
    const sumX = scores.reduce((sum, p) => sum + p.x, 0);
    const sumY = scores.reduce((sum, p) => sum + p.y, 0);
    const sumXY = scores.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = scores.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const predictedScore = Math.min(100, Math.max(0, intercept + slope * n));

    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const ssRes = scores.reduce((sum, p) => sum + Math.pow(p.y - (intercept + slope * p.x), 2), 0);
    const ssTot = scores.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
    const confidence = Math.max(0, Math.min(1, rSquared));

    return {
      predicted_score: Math.round(predictedScore * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      trend: slope > 2 ? 'improving' : slope < -2 ? 'declining' : 'stable'
    };
  }

  /**
   * Algorithm 5: Generate Readable Insights
   */
  generateInsights(performance, weaknesses, confidenceTrend, prediction) {
    const insights = [];

    // Performance insights
    if (performance.overallScore >= 85) {
      insights.push({
        type: 'STRENGTH',
        message: `Excellent performance with ${performance.overallScore}% overall score`,
        priority: 'HIGH'
      });
    } else if (performance.overallScore >= 70) {
      insights.push({
        type: 'POSITIVE',
        message: `Good performance with ${performance.overallScore}% overall score`,
        priority: 'MEDIUM'
      });
    } else {
      insights.push({
        type: 'WEAKNESS',
        message: `Score of ${performance.overallScore}% - room for improvement`,
        priority: 'HIGH'
      });
    }

    // Weakness insights
    weaknesses.forEach(w => {
      if (w.severity === 'HIGH') {
        insights.push({
          type: 'WEAKNESS',
          message: `High severity gap in ${w.concept} (${w.frequency} errors)`,
          priority: 'HIGH'
        });
      }
    });

    // Trend insights
    if (confidenceTrend.trend === 'improving') {
      insights.push({
        type: 'POSITIVE',
        message: 'Performance trending upward - keep going!',
        priority: 'MEDIUM'
      });
    } else if (confidenceTrend.trend === 'declining') {
      insights.push({
        type: 'CAUTION',
        message: 'Performance trending downward - focus on weak areas',
        priority: 'HIGH'
      });
    }

    // Prediction insight
    if (prediction.confidence > 0.7) {
      insights.push({
        type: 'POSITIVE',
        message: `Predicted next score: ${prediction.predicted_score}% (confident prediction)`,
        priority: 'MEDIUM'
      });
    }

    return insights;
  }
}

// Export singleton instance
module.exports = new AIAnalyzer();

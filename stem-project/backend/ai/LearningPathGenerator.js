/**
 * LearningPathGenerator.js - Personalized Learning Path
 */

class LearningPathGenerator {
  generatePersonalizedPath(weaknesses = [], currentScore = 0, quizData = {}) {
    const phase = this._determinePhase(currentScore);
    const milestones = (weaknesses || [])
      .sort((a, b) => {
        const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
      })
      .slice(0, 3)
      .map((weakness, idx) => this._createMilestone(weakness, phase, idx));

    const dailyGoals = this._generateDailyGoals(milestones, phase);
    
    return {
      phase,
      milestones,
      daily_goals: dailyGoals,
      estimated_days: Math.min(14, milestones.length * 4),
      status: 'ACTIVE',
      success_metrics: this._defineSuccessMetrics(phase),
      adaptive_recommendations: this._generateAdaptiveRecommendations(weaknesses, currentScore)
    };
  }

  _determinePhase(score) {
    if (score < 50) return 'FOUNDATION';
    if (score < 70) return 'BUILDING';
    if (score < 85) return 'ADVANCING';
    return 'MASTERY';
  }

  _createMilestone(weakness, phase, index) {
    const baseTime = { FOUNDATION: 120, BUILDING: 150, ADVANCING: 240, MASTERY: 180 }[phase] || 120;
    return {
      title: `Master ${weakness.concept}`,
      concept: weakness.concept,
      duration: `${baseTime + (index * 30)} minutes`,
      phase,
      activities: [
        { type: 'review', description: `Review ${weakness.concept} (30 min)` },
        { type: 'practice', description: 'Practice problems (30 min)' },
        { type: 'quiz', description: 'Quiz to verify (30 min)' }
      ]
    };
  }

  _generateDailyGoals(milestones, phase) {
    return (milestones || []).map((milestone, idx) => ({
      day: idx + 1,
      focus: milestone.title,
      duration_minutes: 120,
      activities: (milestone.activities || []).map(a => a.description),
      target_accuracy: phase === 'FOUNDATION' ? 0.75 : 0.85
    }));
  }

  _defineSuccessMetrics(phase) {
    return {
      target_accuracy: phase === 'FOUNDATION' ? 0.75 : 0.85,
      completion: 'Complete all activities'
    };
  }

  _generateAdaptiveRecommendations(weaknesses, currentScore) {
    const recs = [];
    if (currentScore < 50) recs.push('Focus on fundamentals first');
    if ((weaknesses || []).some(w => w.severity === 'HIGH')) recs.push('Address high-priority gaps');
    return recs;
  }
}

module.exports = new LearningPathGenerator();

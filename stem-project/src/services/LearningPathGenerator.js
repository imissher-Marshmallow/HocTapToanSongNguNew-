/**
 * Learning Path Generator
 * Creates personalized learning paths based on analysis
 */

class LearningPathGenerator {
  /**
   * Generate complete learning path with milestones
   */
  generatePersonalizedPath(analysis) {
    const path = {
      phase: this.determinePhase(analysis.performance),
      milestones: [],
      timeline: this.estimateTimeline(analysis),
      dailyGoals: [],
      successMetrics: []
    };

    // Phase 1: Foundation (if needed)
    if (analysis.performance.overallScore < 50) {
      path.milestones.push(this.createFoundationMilestone(analysis));
    }

    // Phase 2: Target weak areas
    if (analysis.weaknesses.patterns.conceptualGaps.length > 0) {
      path.milestones.push(this.createConceptMilestone(analysis));
    }

    // Phase 3: Skill building
    path.milestones.push(this.createSkillBuildingMilestone(analysis));

    // Phase 4: Mastery
    path.milestones.push(this.createMasteryMilestone(analysis));

    // Generate daily goals
    path.dailyGoals = this.generateDailyGoals(path.milestones);

    // Define success metrics
    path.successMetrics = this.defineSuccessMetrics(analysis);

    return path;
  }

  /**
   * Determine current learning phase
   */
  determinePhase(performance) {
    const score = performance.overallScore;
    
    if (score < 40) return 'FOUNDATION';
    if (score < 60) return 'BUILDING';
    if (score < 80) return 'ADVANCING';
    return 'MASTERY';
  }

  /**
   * Create foundation phase milestone
   */
  createFoundationMilestone(analysis) {
    return {
      id: 'foundation',
      title: 'Build Strong Foundation',
      duration: '1-2 weeks',
      focusAreas: analysis.weaknesses.patterns.conceptualGaps
        .filter(g => g.severity === 'high')
        .map(g => g.concept),
      activities: [
        {
          type: 'CONCEPT_REVIEW',
          description: 'Review fundamental definitions and formulas',
          estimatedTime: 120,
          resources: ['textbook_chapter', 'explanatory_videos']
        },
        {
          type: 'WORKED_EXAMPLES',
          description: 'Study worked examples with detailed explanations',
          estimatedTime: 90,
          resources: ['solution_guides', 'step_by_step_solutions']
        },
        {
          type: 'GUIDED_PRACTICE',
          description: 'Solve problems with hints and feedback',
          estimatedTime: 120,
          resources: ['guided_practice_problems', 'tutorials']
        }
      ],
      completionCriteria: {
        minAccuracy: 75,
        conceptsMastered: 'all_high_priority'
      }
    };
  }

  /**
   * Create concept mastery milestone
   */
  createConceptMilestone(analysis) {
    return {
      id: 'concept_mastery',
      title: 'Master Key Concepts',
      duration: '2-3 weeks',
      focusAreas: analysis.weaknesses.patterns.conceptualGaps
        .filter(g => g.severity !== 'high')
        .map(g => g.concept),
      activities: [
        {
          type: 'DEEP_LEARNING',
          description: 'Understand concepts at deeper level',
          estimatedTime: 150,
          resources: ['advanced_videos', 'research_papers']
        },
        {
          type: 'APPLICATION_PROBLEMS',
          description: 'Apply concepts to real-world problems',
          estimatedTime: 180,
          resources: ['case_studies', 'problem_sets']
        },
        {
          type: 'PEER_DISCUSSION',
          description: 'Discuss concepts with peers for clarity',
          estimatedTime: 60,
          resources: ['study_groups', 'forums']
        }
      ],
      completionCriteria: {
        minAccuracy: 80,
        applicationProblems: 'solved_correctly'
      }
    };
  }

  /**
   * Create skill building milestone
   */
  createSkillBuildingMilestone(analysis) {
    const mediumDifficultyCategories = Object.keys(
      analysis.performance.categoryPerformance
    ).filter(cat => {
      const perf = analysis.performance.categoryPerformance[cat];
      return perf.percentage >= 60 && perf.percentage < 85;
    });

    return {
      id: 'skill_building',
      title: 'Develop Proficiency',
      duration: '2-3 weeks',
      focusAreas: mediumDifficultyCategories,
      activities: [
        {
          type: 'PRACTICE_PROBLEMS',
          description: 'Solve varied problems to build muscle memory',
          estimatedTime: 240,
          resources: ['problem_banks', 'quiz_sets']
        },
        {
          type: 'SPEED_DRILLS',
          description: 'Increase problem-solving speed',
          estimatedTime: 90,
          resources: ['timed_quizzes', 'flash_cards']
        },
        {
          type: 'MIXED_REVIEW',
          description: 'Practice mixed problem sets',
          estimatedTime: 120,
          resources: ['cumulative_quizzes', 'review_sheets']
        }
      ],
      completionCriteria: {
        minAccuracy: 85,
        consistencyScore: 'high'
      }
    };
  }

  /**
   * Create mastery phase milestone
   */
  createMasteryMilestone(analysis) {
    return {
      id: 'mastery',
      title: 'Achieve Mastery',
      duration: '1-2 weeks',
      focusAreas: ['challenging_problems', 'extended_thinking'],
      activities: [
        {
          type: 'CHALLENGE_PROBLEMS',
          description: 'Solve advanced/challenging problems',
          estimatedTime: 180,
          resources: ['competition_problems', 'advanced_sets']
        },
        {
          type: 'SYNTHESIS',
          description: 'Combine multiple concepts',
          estimatedTime: 120,
          resources: ['integration_problems', 'capstone_projects']
        },
        {
          type: 'TEACHING_OTHERS',
          description: 'Teach concepts to reinforce understanding',
          estimatedTime: 60,
          resources: ['tutoring', 'explaining_to_peers']
        }
      ],
      completionCriteria: {
        minAccuracy: 90,
        advancedProblems: 'solved'
      }
    };
  }

  /**
   * Generate daily goals from milestones
   */
  generateDailyGoals(milestones) {
    const dailyGoals = [];

    milestones.forEach((milestone, mIdx) => {
      const daysPerMilestone = this.estimateDaysForMilestone(milestone);
      let dayCounter = 0;

      milestone.activities.forEach((activity, aIdx) => {
        const daysPerActivity = Math.ceil(activity.estimatedTime / 120); // 120 min per day assumed
        
        for (let d = 0; d < daysPerActivity; d++) {
          dailyGoals.push({
            milestoneId: milestone.id,
            dayNumber: dayCounter + d,
            activityType: activity.type,
            description: activity.description,
            estimatedTime: Math.min(120, activity.estimatedTime - (d * 120)),
            resources: activity.resources,
            priority: this.calculatePriority(milestone.id)
          });
        }
        dayCounter += daysPerActivity;
      });
    });

    return dailyGoals;
  }

  /**
   * Define success metrics for tracking progress
   */
  defineSuccessMetrics(analysis) {
    return {
      accuracy: {
        target: 85,
        current: analysis.performance.overallScore,
        milestone: '+10 points'
      },
      consistency: {
        target: 75,
        current: analysis.confidenceTrend.consistencyScore,
        milestone: 'improve by 15%'
      },
      conceptMastery: {
        target: 'all_concepts',
        current: analysis.weaknesses.patterns.conceptualGaps.length,
        milestone: 'reduce gaps by 50%'
      },
      speedImprovement: {
        target: '+20%_faster',
        current: 'baseline',
        milestone: 'reduce time per question'
      }
    };
  }

  /**
   * Estimate timeline for completion
   */
  estimateTimeline(analysis) {
    const phase = this.determinePhase(analysis.performance);
    const gaps = analysis.weaknesses.patterns.conceptualGaps.length;
    const baseWeeks = {
      'FOUNDATION': 3,
      'BUILDING': 2,
      'ADVANCING': 1,
      'MASTERY': 1
    };

    const weeksNeeded = (baseWeeks[phase] || 2) + (gaps * 0.5);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (weeksNeeded * 7));

    return {
      startDate: new Date(),
      endDate,
      totalWeeks: weeksNeeded,
      currentPhase: phase,
      phasesRemaining: this.getPhasesRemaining(phase)
    };
  }

  /**
   * Helper: Estimate days for milestone
   */
  estimateDaysForMilestone(milestone) {
    const totalMinutes = milestone.activities.reduce((sum, a) => sum + a.estimatedTime, 0);
    return Math.ceil(totalMinutes / 120); // 2 hours per day
  }

  /**
   * Helper: Calculate priority
   */
  calculatePriority(milestoneId) {
    const priorities = {
      'foundation': 'CRITICAL',
      'concept_mastery': 'HIGH',
      'skill_building': 'MEDIUM',
      'mastery': 'LOW'
    };
    return priorities[milestoneId] || 'MEDIUM';
  }

  /**
   * Helper: Get remaining phases
   */
  getPhasesRemaining(currentPhase) {
    const phases = ['FOUNDATION', 'BUILDING', 'ADVANCING', 'MASTERY'];
    const currentIdx = phases.indexOf(currentPhase);
    return phases.slice(currentIdx + 1);
  }

  /**
   * Generate adaptive recommendations based on progress
   */
  generateAdaptiveRecommendations(analysis, previousAnalyses = []) {
    const recommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      adaptations: []
    };

    // Immediate: Fix critical issues
    if (analysis.performance.overallScore < 50) {
      recommendations.immediate.push({
        action: 'FOCUS_ON_BASICS',
        reason: 'Current score indicates foundational gaps',
        urgency: 'CRITICAL'
      });
    }

    // Short term: Next week focus
    analysis.weaknesses.patterns.conceptualGaps.forEach(gap => {
      if (gap.severity === 'high') {
        recommendations.shortTerm.push({
          concept: gap.concept,
          action: 'INTENSIVE_PRACTICE',
          frequency: '4-5 times per week'
        });
      }
    });

    // Long term: 1-3 months
    recommendations.longTerm.push({
      action: 'BUILD_MASTERY',
      timeline: '2-3 months',
      focus: 'Strengthen weak categories'
    });

    // Adaptations based on learning patterns
    if (previousAnalyses.length > 0) {
      const improvement = this.analyzeProgressTrend(previousAnalyses, analysis);
      if (improvement < 0) {
        recommendations.adaptations.push({
          type: 'PACE_CHANGE',
          suggestion: 'Slower, deeper learning approach'
        });
      }
    }

    return recommendations;
  }

  /**
   * Helper: Analyze progress trend
   */
  analyzeProgressTrend(previousAnalyses, currentAnalysis) {
    if (previousAnalyses.length === 0) return 0;
    
    const previousScore = previousAnalyses[previousAnalyses.length - 1].performance.overallScore;
    const currentScore = currentAnalysis.performance.overallScore;
    
    return currentScore - previousScore;
  }
}

export default new LearningPathGenerator();

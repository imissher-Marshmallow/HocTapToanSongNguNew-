/**
 * Adaptive Learning System - Assessment Engine
 * Calculates cognitive level scores and generates personalized profiles
 * 
 * Cognitive Levels:
 * 1. Knowledge (Recognition) - difficulty: "1"
 * 2. Comprehension (Understanding) - difficulty: "2"
 * 3. Application (Low-level) - difficulty: "3"
 * 4. Analysis (High-level) - difficulty: "4"
 */

class AssessmentEngine {
  /**
   * Calculate scores across cognitive levels
   * @param {Array} questions - Question objects with difficulty level
   * @param {Array} answers - User's answer indices
   * @returns {Object} Cognitive level scores and analysis
   */
  static assessPerformance(questions, answers) {
    // Validate inputs
    if (!questions || !answers || questions.length !== answers.length) {
      throw new Error('Questions and answers must have same length')
    }

    // Initialize counters for each cognitive level
    const levelData = {
      1: { correct: 0, total: 0, questions: [] },
      2: { correct: 0, total: 0, questions: [] },
      3: { correct: 0, total: 0, questions: [] },
      4: { correct: 0, total: 0, questions: [] }
    }

    // Analyze each question
    questions.forEach((question, index) => {
      const difficulty = parseInt(question.difficulty) || 1
      const isCorrect = question.answerIndex === answers[index]

      // Track results by cognitive level
      levelData[difficulty].total += 1
      if (isCorrect) {
        levelData[difficulty].correct += 1
      }

      levelData[difficulty].questions.push({
        questionId: question.id,
        topic: question.topic,
        correct: isCorrect,
        userAnswer: answers[index],
        correctAnswer: question.answerIndex
      })
    })

    // Calculate scores and determine proficiency levels
    const scores = {}
    const proficiency = {}

    for (let level = 1; level <= 4; level++) {
      const data = levelData[level]
      
      // Calculate percentage score
      const score = data.total > 0 ? (data.correct / data.total) * 100 : 0
      scores[`level${level}`] = Math.round(score)

      // Determine proficiency status
      if (score >= 80) {
        proficiency[`level${level}`] = 'MASTERED'
      } else if (score >= 60) {
        proficiency[`level${level}`] = 'DEVELOPING'
      } else if (score >= 40) {
        proficiency[`level${level}`] = 'NEEDS_WORK'
      } else {
        proficiency[`level${level}`] = 'NOT_READY'
      }
    }

    // Identify weak and strong areas
    const weakAreas = this.identifyWeakAreas(scores, levelData)
    const strongAreas = this.identifyStrongAreas(scores)

    return {
      scores,
      proficiency,
      levelData,
      weakAreas,
      strongAreas,
      overallScore: Math.round(
        (questions.reduce((sum, q, i) => sum + (q.answerIndex === answers[i] ? 1 : 0), 0) / 
         questions.length) * 100
      ),
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Identify weak cognitive areas that need improvement
   */
  static identifyWeakAreas(scores, levelData) {
    const weakAreas = []

    for (let level = 1; level <= 4; level++) {
      if (scores[`level${level}`] < 70) {
        const data = levelData[level]
        
        // Find topics where student struggled most
        const topicErrors = {}
        data.questions.forEach(q => {
          if (!q.correct) {
            topicErrors[q.topic] = (topicErrors[q.topic] || 0) + 1
          }
        })

        const topWeakTopic = Object.entries(topicErrors)
          .sort((a, b) => b[1] - a[1])[0]

        weakAreas.push({
          level,
          levelName: this.getLevelName(level),
          score: scores[`level${level}`],
          priority: 100 - scores[`level${level}`], // Higher = more urgent
          questionsFailed: Object.values(topicErrors).reduce((a, b) => a + b, 0),
          topWeakTopic: topWeakTopic ? topWeakTopic[0] : null,
          recommendation: this.getRecommendation(level, scores[`level${level}`])
        })
      }
    }

    // Sort by priority (descending)
    return weakAreas.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Identify strong cognitive areas
   */
  static identifyStrongAreas(scores) {
    const strongAreas = []

    for (let level = 1; level <= 4; level++) {
      if (scores[`level${level}`] >= 80) {
        strongAreas.push({
          level,
          levelName: this.getLevelName(level),
          score: scores[`level${level}`],
          canAdvance: true
        })
      }
    }

    return strongAreas
  }

  /**
   * Get recommendation for improvement
   */
  static getRecommendation(level, score) {
    const levelName = this.getLevelName(level)
    
    if (score < 40) {
      return `You're just beginning to understand ${levelName}. Let's focus on fundamentals first.`
    } else if (score < 60) {
      return `You're making progress in ${levelName}. Practice more to build confidence.`
    } else if (score < 80) {
      return `Almost there! Keep practicing ${levelName} to reach mastery.`
    } else {
      return `You've mastered ${levelName}! Ready for the next challenge.`
    }
  }

  /**
   * Get human-readable level name
   */
  static getLevelName(level) {
    const names = {
      1: 'Knowledge (Recognition)',
      2: 'Comprehension (Understanding)',
      3: 'Application (Low-level)',
      4: 'Analysis (High-level)'
    }
    return names[level] || 'Unknown'
  }
}

/**
 * Adaptive Question Selector
 * Selects questions based on student's learning profile
 */
class AdaptiveQuestionSelector {
  /**
   * Generate personalized quiz based on student profile
   * @param {Object} profile - Student's learning profile with scores
   * @param {Array} allQuestions - All available questions
   * @param {Number} quizSize - Number of questions (default: 20)
   * @returns {Array} Curated questions for this student
   */
  static generatePersonalizedQuiz(profile, allQuestions, quizSize = 20) {
    // Get student's cognitive level scores
    const scores = profile.scores || {}
    
    // Determine how many questions from each level
    const distribution = this.calculateDistribution(scores, quizSize)
    
    // Select questions for each level
    const selectedQuestions = []
    
    for (let level = 1; level <= 4; level++) {
      const count = distribution[level]
      if (count > 0) {
        const levelQuestions = this.selectQuestionsForLevel(
          level,
          count,
          scores[`level${level}`],
          allQuestions
        )
        selectedQuestions.push(...levelQuestions)
      }
    }

    // Shuffle for variety
    return this.shuffleArray(selectedQuestions)
  }

  /**
   * Calculate how many questions from each cognitive level
   */
  static calculateDistribution(scores, total) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0 }

    // Strategy: Focus on weak areas while maintaining some balance
    for (let level = 1; level <= 4; level++) {
      const score = scores[`level${level}`] || 0
      
      if (score < 40) {
        // Not ready - minimal challenge
        distribution[level] = Math.ceil(total * 0.35)
      } else if (score < 60) {
        // Needs work - focus here
        distribution[level] = Math.ceil(total * 0.40)
      } else if (score < 80) {
        // Developing - balanced
        distribution[level] = Math.ceil(total * 0.25)
      } else {
        // Mastered - maintenance only
        distribution[level] = Math.ceil(total * 0.15)
      }
    }

    // Adjust for rounding errors
    const totalAssigned = Object.values(distribution).reduce((a, b) => a + b, 0)
    if (totalAssigned !== total) {
      // Add/remove from the most appropriate level
      distribution[1] += (total - totalAssigned)
    }

    return distribution
  }

  /**
   * Select questions from a specific cognitive level
   */
  static selectQuestionsForLevel(level, count, studentScore, allQuestions) {
    // Filter questions by cognitive level
    const levelQuestions = allQuestions.filter(q => 
      parseInt(q.difficulty) === level
    )

    if (levelQuestions.length === 0) {
      console.warn(`No questions found for level ${level}`)
      return []
    }

    // If student is weak in this level, prioritize basic questions
    // If student is strong, include harder variants if available
    let selected = []

    if (studentScore < 60) {
      // Focus on foundational questions
      selected = levelQuestions
        .filter(q => !q.isVariant || q.isVariant === false)
        .slice(0, count)
    } else {
      // Mix of regular and challenging
      const basicQuestions = levelQuestions.filter(q => !q.isVariant)
      const challengingQuestions = levelQuestions.filter(q => q.isVariant)
      
      const basicCount = Math.ceil(count * 0.7)
      const challengeCount = count - basicCount
      
      selected.push(
        ...basicQuestions.slice(0, basicCount),
        ...challengingQuestions.slice(0, challengeCount)
      )
    }

    // If not enough questions, supplement with others
    if (selected.length < count) {
      const remaining = count - selected.length
      const others = levelQuestions
        .filter(q => !selected.includes(q))
        .slice(0, remaining)
      selected.push(...others)
    }

    return selected.slice(0, count)
  }

  /**
   * Shuffle array for variety
   */
  static shuffleArray(array) {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
}

/**
 * Learning Profile Manager
 * Maintains and updates student learning profiles
 */
class LearningProfileManager {
  /**
   * Create initial learning profile from first quiz
   */
  static createProfile(userId, assessmentResult) {
    return {
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // Current scores per cognitive level
      scores: assessmentResult.scores,
      proficiency: assessmentResult.proficiency,
      
      // Performance tracking
      quizzesTaken: 1,
      totalQuizzesCompleted: 1,
      
      // Areas of focus
      weakAreas: assessmentResult.weakAreas,
      strongAreas: assessmentResult.strongAreas,
      
      // History for trend analysis
      scoreHistory: {
        1: [assessmentResult.scores.level1],
        2: [assessmentResult.scores.level2],
        3: [assessmentResult.scores.level3],
        4: [assessmentResult.scores.level4]
      },
      
      // Learning recommendations
      recommendations: this.generateRecommendations(assessmentResult),
      
      // Learning path
      learningPath: this.generateLearningPath(assessmentResult),
      
      // Metadata
      totalTimeSpent: 0,
      averageScores: assessmentResult.scores
    }
  }

  /**
   * Update profile with new quiz results
   */
  static updateProfile(profile, assessmentResult) {
    const updated = { ...profile }
    
    // Update scores and proficiency
    updated.scores = assessmentResult.scores
    updated.proficiency = assessmentResult.proficiency
    
    // Update history
    for (let level = 1; level <= 4; level++) {
      updated.scoreHistory[level].push(assessmentResult.scores[`level${level}`])
    }
    
    // Update counts
    updated.quizzesTaken += 1
    updated.updatedAt = new Date().toISOString()
    
    // Recalculate weak/strong areas
    updated.weakAreas = AssessmentEngine.identifyWeakAreas(
      assessmentResult.scores,
      assessmentResult.levelData
    )
    updated.strongAreas = AssessmentEngine.identifyStrongAreas(assessmentResult.scores)
    
    // Update recommendations
    updated.recommendations = this.generateRecommendations(assessmentResult)
    
    // Update learning path
    updated.learningPath = this.generateLearningPath(assessmentResult)
    
    return updated
  }

  /**
   * Generate personalized recommendations
   */
  static generateRecommendations(assessmentResult) {
    const recommendations = []
    const weakAreas = assessmentResult.weakAreas

    if (weakAreas.length > 0) {
      // Primary recommendation: Focus on weakest area
      const primary = weakAreas[0]
      recommendations.push({
        priority: 1,
        type: 'FOCUS_AREA',
        title: `Master ${primary.levelName}`,
        description: primary.recommendation,
        action: `Take a personalized quiz focused on ${primary.levelName}`,
        expectedBenefit: 'Strengthen fundamental skills'
      })

      // Secondary recommendation: Next area to work on
      if (weakAreas.length > 1) {
        const secondary = weakAreas[1]
        recommendations.push({
          priority: 2,
          type: 'NEXT_FOCUS',
          title: `Develop ${secondary.levelName}`,
          description: `After mastering ${primary.levelName}, work on improving ${secondary.levelName}`,
          action: 'Coming soon - Complete your primary focus first',
          expectedBenefit: 'Build on your strengths'
        })
      }
    }

    // Challenge strong areas
    const strongAreas = assessmentResult.strongAreas
    if (strongAreas.length > 0) {
      const nextLevel = Math.min(
        Math.max(...strongAreas.map(a => a.level)) + 1,
        4
      )
      
      if (nextLevel <= 4) {
        recommendations.push({
          priority: 3,
          type: 'CHALLENGE',
          title: 'Challenge Yourself',
          description: `You've mastered Levels 1-${nextLevel-1}. Try harder questions!`,
          action: `Take advanced Level ${nextLevel} questions`,
          expectedBenefit: 'Continue growing and advancing'
        })
      }
    }

    return recommendations
  }

  /**
   * Generate personalized 4-week learning path
   */
  static generateLearningPath(assessmentResult) {
    const path = {
      duration: '4 weeks',
      weeks: []
    }

    const weakAreas = assessmentResult.weakAreas
    const strongAreas = assessmentResult.strongAreas

    // Week 1-2: Focus on primary weakness
    if (weakAreas.length > 0) {
      path.weeks.push({
        week: 1,
        focus: `Master ${weakAreas[0].levelName}`,
        quizzes: 2,
        goal: `Improve from ${weakAreas[0].score}% to 75%`,
        topics: [weakAreas[0].topWeakTopic || 'Core Concepts']
      },
      {
        week: 2,
        focus: `Continue ${weakAreas[0].levelName}`,
        quizzes: 2,
        goal: `Reach 80% mastery`,
        topics: [weakAreas[0].topWeakTopic || 'Practice Problems']
      })
    }

    // Week 3: Build on developing areas
    if (weakAreas.length > 1) {
      path.weeks.push({
        week: 3,
        focus: `Develop ${weakAreas[1].levelName}`,
        quizzes: 2,
        goal: `Improve from ${weakAreas[1].score}% to 70%`,
        topics: [weakAreas[1].topWeakTopic || 'Applications']
      })
    }

    // Week 4: Challenge and balance
    path.weeks.push({
      week: 4,
      focus: 'Challenge & Integration',
      quizzes: 2,
      goal: 'Mixed difficulty - maintain strengths while improving weaknesses',
      topics: ['Review & Challenge']
    })

    return path
  }

  /**
   * Calculate score trend (improving, declining, stable)
   */
  static getTrend(scoreHistory) {
    if (scoreHistory.length < 2) return 'NEW'
    
    const lastThree = scoreHistory.slice(-3)
    const avg1 = lastThree.slice(0, 1).reduce((a, b) => a + b, 0) / 1
    const avg2 = lastThree.slice(1).reduce((a, b) => a + b, 0) / Math.max(lastThree.length - 1, 1)
    
    const change = avg2 - avg1
    
    if (change > 5) return 'IMPROVING'
    if (change < -5) return 'DECLINING'
    return 'STABLE'
  }
}

// Export for use in other modules
module.exports = {
  AssessmentEngine,
  AdaptiveQuestionSelector,
  LearningProfileManager
}

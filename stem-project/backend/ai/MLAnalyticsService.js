/**
 * ML Analytics Service - Main Orchestrator
 * 
 * Coordinates all ML analysis and data persistence
 * Flow: AIAnalyzer → PerformanceAnalytics → LearningPathGenerator → MLAnalyticsDB → PostgreSQL
 */

const AIAnalyzer = require('./AIAnalyzer');
const PerformanceAnalytics = require('./PerformanceAnalytics');
const LearningPathGenerator = require('./LearningPathGenerator');
const MLAnalyticsDB = require('./MLAnalyticsDB');

class MLAnalyticsService {
  constructor(pool) {
    this.pool = pool;
    this.analyzer = new AIAnalyzer();
    this.analyticsEngine = PerformanceAnalytics;  // PerformanceAnalytics is already a singleton instance
    this.pathGenerator = new LearningPathGenerator();
    this.database = new MLAnalyticsDB(pool);
  }

  /**
   * Complete ML Analysis Pipeline
   * Analyzes quiz results and returns analysis (doesn't store to DB yet)
   */
  async analyzeAndStore(userId, quizId, quizData, userAnswers) {
    try {
      // Step 1: Calculate basic performance metrics
      const analysisData = this._calculateMetrics(quizData, userAnswers);
      
      // Step 2: Run AI Analysis (5 algorithms)
      const aiAnalysis = this.analyzer.analyzePerformance(quizData, userAnswers, analysisData.score);
      const weaknesses = this.analyzer.detectWeaknessPatterns(quizData, userAnswers);
      const confidenceTrend = this.analyzer.analyzeConfidenceTrend([analysisData]);
      const prediction = this.analyzer.predictFuturePerformance([analysisData]);
      const insights = this.analyzer.generateInsights(aiAnalysis, weaknesses, confidenceTrend, prediction);
      
      // Step 3: Run Performance Analytics
      const skillMatrix = this.analyticsEngine.generateSkillMatrix(quizData, userAnswers);
      const errorPatterns = this.analyticsEngine.analyzeErrorPatterns(quizData, userAnswers);
      const timeAnalysis = this.analyticsEngine.analyzeTimeManagement(quizData, userAnswers);
      const benchmarkComparison = this.analyticsEngine.compareWithBenchmark(analysisData.score);
      
      // Step 4: Generate Learning Path
      const learningPath = this.pathGenerator.generatePersonalizedPath(weaknesses, analysisData.score, quizData);
      
      // Step 5: Prepare final analysis object
      const finalAnalysis = {
        score: analysisData.score,
        categoryBreakdown: analysisData.categoryBreakdown,
        aiAnalysis,
        weaknesses,
        insights,
        confidenceTrend,
        prediction,
        skillMatrix,
        errorPatterns,
        timeAnalysis,
        benchmarkComparison,
        learningPath,
        strengths: insights.filter(i => i.type === 'STRENGTH' || i.type === 'POSITIVE')
      };
      
      return {
        success: true,
        analysis: finalAnalysis
      };
      
    } catch (error) {
      console.error('❌ ML Analysis Error:', error);
      return { success: false, error: error.message, analysis: {} };
    }
  }

  /**
   * Store analysis to PostgreSQL/Supabase (called after API returns)
   */
  async storeAnalysis(userId, quizId, analysis) {
    try {
      const storageResult = await this.database.storeMLAnalysis(userId, quizId, analysis);
      return storageResult;
    } catch (error) {
      console.error('❌ ML Storage Error:', error);
      throw error;
    }
  }

  /**
   * Calculate basic quiz metrics
   */
  _calculateMetrics(quizData, userAnswers) {
    let correctCount = 0;
    const categoryBreakdown = {};
    
    quizData.questions.forEach((question, index) => {
      const userAnswer = userAnswers[index];
      const isCorrect = userAnswer === question.correctAnswer;
      
      if (isCorrect) correctCount++;
      
      const category = question.category || 'uncategorized';
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { correct: 0, total: 0 };
      }
      categoryBreakdown[category].total++;
      if (isCorrect) categoryBreakdown[category].correct++;
    });
    
    const totalQuestions = quizData.questions.length;
    const score = (correctCount / totalQuestions) * 100;
    
    return {
      score: Math.round(score * 100) / 100,
      correctCount,
      totalQuestions,
      categoryBreakdown
    };
  }

  /**
   * Get student's complete ML profile
   */
  async getStudentProfile(userId) {
    return await this.database.getStudentMLProfile(userId);
  }

  /**
   * Get student's recent weaknesses
   */
  async getStudentWeaknesses(userId, limit = 10) {
    const profile = await this.getStudentProfile(userId);
    if (!profile) return [];
    
    return profile.recentWeaknesses.slice(0, limit);
  }

  /**
   * Get student's recent strengths
   */
  async getStudentStrengths(userId, limit = 10) {
    const profile = await this.getStudentProfile(userId);
    if (!profile) return [];
    
    return profile.recentStrengths.slice(0, limit);
  }

  /**
   * Get student's active learning path
   */
  async getActiveLearningPath(userId) {
    const profile = await this.getStudentProfile(userId);
    if (!profile) return null;
    
    return profile.activeLearningPath;
  }

  /**
   * Resolve a weakness (mark as fixed)
   */
  async resolveWeakness(weaknessId) {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT resolve_weakness($1)', [weaknessId]);
      return true;
    } finally {
      client.release();
    }
  }
}

module.exports = MLAnalyticsService;

/**
 * ML Analytics API Integration
 * Bridges AIAnalyzer output and Supabase storage
 */

const AIAnalyzer = require('../services/AIAnalyzer');
const SupabaseML = require('../services/SupabaseMLAnalytics');
const PerformanceAnalytics = require('../services/PerformanceAnalytics');
const LearningPathGenerator = require('../services/LearningPathGenerator');

class MLAnalyticsAPI {
  /**
   * Process quiz completion with full ML analysis and storage
   */
  static async analyzeAndStore(userId, quizId, answers, questions, metadata = {}) {
    try {
      console.log(`[MLAnalyticsAPI] Processing analysis for user ${userId}, quiz ${quizId}`);

      // Step 1: Run all ML algorithms
      const analysis = AIAnalyzer.analyzeResults({
        answers,
        questions,
        metadata: { ...metadata, userId, quizId }
      });

      console.log('[MLAnalyticsAPI] AI Analysis completed:', {
        score: analysis.performance.overallScore,
        weaknesses: analysis.weaknesses.patterns.conceptualGaps.length,
        insights: analysis.insights.length
      });

      // Step 2: Generate analytics
      const detailedReport = PerformanceAnalytics.generateDetailedReport(
        analysis.performance,
        analysis.weaknesses,
        questions,
        answers
      );

      console.log('[MLAnalyticsAPI] Analytics generated:', {
        skillMatrix: Object.keys(detailedReport.skillMatrix).length,
        errorPatterns: detailedReport.errorAnalysis.summary.totalErrors
      });

      // Step 3: Generate learning path
      const learningPath = LearningPathGenerator.generatePersonalizedPath(analysis);

      console.log('[MLAnalyticsAPI] Learning path created:', {
        phase: learningPath.phase,
        milestones: learningPath.milestones.length,
        dailyGoals: learningPath.dailyGoals.length
      });

      // Step 4: Store to Supabase
      const storageResult = await SupabaseML.storeAnalysis(userId, quizId, {
        ...analysis,
        learningPath,
        detailedReport
      });

      if (!storageResult.success) {
        console.warn('[MLAnalyticsAPI] Failed to store to Supabase:', storageResult.error);
      } else {
        console.log('[MLAnalyticsAPI] Successfully stored to Supabase:', storageResult);
      }

      // Step 5: Compile comprehensive response
      const response = {
        success: true,
        analysis: {
          performance: analysis.performance,
          weaknesses: analysis.weaknesses,
          insights: analysis.insights,
          prediction: analysis.prediction,
          confidenceTrend: analysis.confidenceTrend
        },
        analytics: detailedReport,
        learningPath,
        supabaseStorage: storageResult,
        timestamp: new Date().toISOString()
      };

      return response;
    } catch (error) {
      console.error('[MLAnalyticsAPI] Error in analysis process:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get comprehensive student profile with analytics
   */
  static async getStudentProfile(userId) {
    try {
      const analytics = await SupabaseML.getStudentAnalytics(userId);
      const comparison = await SupabaseML.getCohortComparison(userId);

      return {
        success: true,
        profile: analytics,
        comparison,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[MLAnalyticsAPI] Error fetching student profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if ML Analytics is properly configured
   */
  static async healthCheck() {
    try {
      const supabaseHealth = await SupabaseML.healthCheck();

      return {
        success: true,
        services: {
          supabase: supabaseHealth
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = MLAnalyticsAPI;

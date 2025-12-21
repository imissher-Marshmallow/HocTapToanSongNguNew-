/**
 * Supabase ML Analytics Integration Service
 * Pushes ML analysis data to Supabase (PostgreSQL) for persistence
 */

const { createClient } = require('@supabase/supabase-js');

class SupabaseMLAnalytics {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_KEY;

    if (!this.supabaseUrl || !this.supabaseKey) {
      console.warn('[SupabaseML] Missing SUPABASE_URL or SUPABASE_KEY in environment');
      this.client = null;
      return;
    }

    try {
      this.client = createClient(this.supabaseUrl, this.supabaseKey);
      console.log('[SupabaseML] Connected to Supabase');
    } catch (err) {
      console.error('[SupabaseML] Failed to initialize Supabase client:', err);
      this.client = null;
    }
  }

  /**
   * Store complete analysis to Supabase
   */
  async storeAnalysis(userId, quizId, analysis) {
    if (!this.client) {
      console.warn('[SupabaseML] Supabase client not initialized, skipping storage');
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // 1. Ensure student record exists
      await this.ensureStudentExists(userId);

      // 2. Store performance record
      const perfId = await this.storePerformanceRecord(userId, quizId, analysis);
      console.log(`[SupabaseML] Stored performance record: ${perfId}`);

      // 3. Store weakness patterns
      if (analysis.weaknesses) {
        await this.storeWeaknessPatterns(userId, quizId, analysis.weaknesses);
      }

      // 4. Update category mastery
      if (analysis.performance.categoryPerformance) {
        await this.updateCategoryMastery(userId, analysis.performance.categoryPerformance);
      }

      // 5. Store learning path
      if (analysis.learningPath) {
        await this.storeLearningPath(userId, quizId, analysis.learningPath);
      }

      // 6. Generate and store insights
      const insights = await this.generateAndStoreInsights(userId, perfId, analysis);

      // 7. Store predictions
      await this.storePredictions(userId, perfId, analysis.prediction);

      // 8. Generate recommendations
      const recommendations = await this.generateAndStoreRecommendations(
        userId,
        analysis.weakness,
        analysis.performance
      );

      return {
        success: true,
        performanceRecordId: perfId,
        insightsCount: insights.length,
        recommendationsCount: recommendations.length
      };
    } catch (error) {
      console.error('[SupabaseML] Error storing analysis:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ensure student exists in database
   */
  async ensureStudentExists(userId) {
    try {
      const { data: existing } = await this.client
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (existing && existing.length > 0) {
        return existing[0].id;
      }

      // Create new student
      const { data: newStudent, error } = await this.client
        .from('students')
        .insert([{
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .limit(1);

      if (error) throw error;
      console.log(`[SupabaseML] Created new student record for user ${userId}`);
      return newStudent[0].id;
    } catch (error) {
      console.error('[SupabaseML] Error ensuring student exists:', error);
      throw error;
    }
  }

  /**
   * Store performance record
   */
  async storePerformanceRecord(userId, quizId, analysis) {
    try {
      const studentId = await this.ensureStudentExists(userId);

      const { data, error } = await this.client
        .from('performance_records')
        .insert([{
          student_id: studentId,
          quiz_id: quizId,
          timestamp: new Date().toISOString(),
          overall_score: analysis.performance.overallScore,
          category_performance: analysis.performance.categoryPerformance,
          difficulty_analysis: analysis.performance.difficultyAnalysis,
          learning_curve: analysis.performance.learningCurve,
          confidence_score: analysis.confidenceTrend.overall
        }])
        .select()
        .limit(1);

      if (error) throw error;
      return data[0].id;
    } catch (error) {
      console.error('[SupabaseML] Error storing performance record:', error);
      throw error;
    }
  }

  /**
   * Store weakness patterns
   */
  async storeWeaknessPatterns(userId, quizId, weaknesses) {
    try {
      const studentId = await this.ensureStudentExists(userId);

      const patterns = weaknesses.patterns.conceptualGaps.map(gap => ({
        student_id: studentId,
        quiz_id: quizId,
        timestamp: new Date().toISOString(),
        concept: gap.concept,
        severity: gap.severity,
        error_frequency: gap.frequency,
        error_type: 'CONCEPTUAL',
        affected_questions: gap.affectedQuestions,
        first_detected: new Date().toISOString(),
        status: 'ACTIVE'
      }));

      if (patterns.length === 0) return [];

      const { data, error } = await this.client
        .from('weakness_patterns')
        .insert(patterns)
        .select();

      if (error) throw error;
      console.log(`[SupabaseML] Stored ${patterns.length} weakness patterns`);
      return data;
    } catch (error) {
      console.error('[SupabaseML] Error storing weakness patterns:', error);
      throw error;
    }
  }

  /**
   * Update category mastery
   */
  async updateCategoryMastery(userId, categoryPerformance) {
    try {
      const studentId = await this.ensureStudentExists(userId);

      for (const [category, perf] of Object.entries(categoryPerformance)) {
        // Check if category already exists
        const { data: existing } = await this.client
          .from('category_mastery')
          .select('id')
          .eq('student_id', studentId)
          .eq('category_name', category)
          .limit(1);

        const masteryLevel =
          perf.percentage >= 85 ? 'MASTERED' :
          perf.percentage >= 70 ? 'PROFICIENT' :
          perf.percentage >= 50 ? 'DEVELOPING' :
          'BEGINNER';

        if (existing && existing.length > 0) {
          // Update existing
          await this.client
            .from('category_mastery')
            .update({
              total_attempts: existing[0].total_attempts + perf.total,
              correct_answers: existing[0].correct_answers + perf.correct,
              mastery_percentage: perf.percentage,
              mastery_level: masteryLevel,
              last_practiced: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existing[0].id);
        } else {
          // Insert new
          await this.client
            .from('category_mastery')
            .insert([{
              student_id: studentId,
              category_name: category,
              total_attempts: perf.total,
              correct_answers: perf.correct,
              mastery_percentage: perf.percentage,
              mastery_level: masteryLevel,
              last_practiced: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);
        }
      }

      console.log('[SupabaseML] Updated category mastery for', Object.keys(categoryPerformance).length, 'categories');
    } catch (error) {
      console.error('[SupabaseML] Error updating category mastery:', error);
      throw error;
    }
  }

  /**
   * Store learning path
   */
  async storeLearningPath(userId, quizId, learningPath) {
    try {
      const studentId = await this.ensureStudentExists(userId);

      const { data, error } = await this.client
        .from('learning_paths')
        .insert([{
          student_id: studentId,
          quiz_id: quizId,
          created_at: new Date().toISOString(),
          phase: learningPath.phase,
          status: 'ACTIVE',
          estimated_completion_date: learningPath.timeline?.endDate,
          milestones: learningPath.milestones,
          daily_goals: learningPath.dailyGoals,
          success_metrics: learningPath.successMetrics,
          timeline_data: learningPath.timeline
        }])
        .select()
        .limit(1);

      if (error) throw error;
      console.log('[SupabaseML] Stored learning path');
      return data[0].id;
    } catch (error) {
      console.error('[SupabaseML] Error storing learning path:', error);
      throw error;
    }
  }

  /**
   * Generate and store AI insights
   */
  async generateAndStoreInsights(userId, performanceRecordId, analysis) {
    try {
      const studentId = await this.ensureStudentExists(userId);
      const insights = analysis.insights || [];

      const insightRecords = insights.map(insight => ({
        student_id: studentId,
        performance_record_id: performanceRecordId,
        generated_at: new Date().toISOString(),
        insight_type: insight.type,
        message: insight.message,
        priority: insight.priority,
        predictions: analysis.prediction,
        trend_data: analysis.confidenceTrend
      }));

      if (insightRecords.length === 0) return [];

      const { data, error } = await this.client
        .from('ai_insights')
        .insert(insightRecords)
        .select();

      if (error) throw error;
      console.log(`[SupabaseML] Stored ${insightRecords.length} AI insights`);
      return data;
    } catch (error) {
      console.error('[SupabaseML] Error storing insights:', error);
      throw error;
    }
  }

  /**
   * Store predictions
   */
  async storePredictions(userId, performanceRecordId, prediction) {
    try {
      const studentId = await this.ensureStudentExists(userId);

      if (!prediction) return [];

      const predictions = [
        {
          student_id: studentId,
          created_at: new Date().toISOString(),
          prediction_type: 'NEXT_SCORE',
          predicted_value: prediction.predictedScore,
          confidence: prediction.confidence,
          metadata: { trend: prediction.trend }
        }
      ];

      const { data, error } = await this.client
        .from('predictions')
        .insert(predictions)
        .select();

      if (error) throw error;
      console.log('[SupabaseML] Stored predictions');
      return data;
    } catch (error) {
      console.error('[SupabaseML] Error storing predictions:', error);
      throw error;
    }
  }

  /**
   * Generate and store learning recommendations
   */
  async generateAndStoreRecommendations(userId, weaknesses, performance) {
    try {
      const studentId = await this.ensureStudentExists(userId);
      const recommendations = [];

      // Generate recommendations from weaknesses
      if (weaknesses && weaknesses.patterns.conceptualGaps) {
        weaknesses.patterns.conceptualGaps.forEach(gap => {
          if (gap.severity === 'high') {
            recommendations.push({
              student_id: studentId,
              created_at: new Date().toISOString(),
              action_type: 'INTENSIVE_REVIEW',
              target_concept: gap.concept,
              priority: 'CRITICAL',
              reason: `Multiple errors (${gap.frequency}) indicate conceptual gap`,
              estimated_time_minutes: 60,
              target_accuracy: 85,
              was_followed: false
            });
          }
        });
      }

      // Generate recommendations from performance
      Object.keys(performance.categoryPerformance).forEach(category => {
        const perf = performance.categoryPerformance[category];
        if (perf.percentage < 50) {
          recommendations.push({
            student_id: studentId,
            created_at: new Date().toISOString(),
            action_type: 'PRACTICE_CATEGORY',
            target_concept: category,
            priority: 'HIGH',
            reason: 'Low performance in this category',
            estimated_time_minutes: 45,
            target_accuracy: 75,
            was_followed: false
          });
        }
      });

      if (recommendations.length === 0) return [];

      const { data, error } = await this.client
        .from('learning_recommendations')
        .insert(recommendations)
        .select();

      if (error) throw error;
      console.log(`[SupabaseML] Stored ${recommendations.length} recommendations`);
      return data;
    } catch (error) {
      console.error('[SupabaseML] Error storing recommendations:', error);
      throw error;
    }
  }

  /**
   * Get student analytics from Supabase
   */
  async getStudentAnalytics(userId) {
    try {
      const { data, error } = await this.client.rpc('get_student_analytics', {
        p_user_id: userId
      });

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('[SupabaseML] Error fetching student analytics:', error);
      return null;
    }
  }

  /**
   * Get cohort comparison
   */
  async getCohortComparison(userId) {
    try {
      // Get student's average
      const { data: studentData } = await this.client
        .from('students')
        .select('average_score, learning_velocity')
        .eq('user_id', userId)
        .limit(1);

      if (!studentData || studentData.length === 0) return null;

      const student = studentData[0];

      // Get cohort averages
      const { data: cohortData } = await this.client
        .from('students')
        .select('average_score, learning_velocity');

      const cohortAvg = cohortData.reduce((sum, s) => sum + s.average_score, 0) / cohortData.length;
      const cohortVelocity = cohortData.reduce((sum, s) => sum + s.learning_velocity, 0) / cohortData.length;

      const percentile = (cohortData.filter(s => s.average_score < student.average_score).length / cohortData.length) * 100;

      return {
        userScore: student.average_score,
        cohortAverage: cohortAvg,
        userVelocity: student.learning_velocity,
        cohortVelocity: cohortVelocity,
        percentile: percentile,
        rank: cohortData.filter(s => s.average_score > student.average_score).length + 1
      };
    } catch (error) {
      console.error('[SupabaseML] Error fetching cohort comparison:', error);
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.client) return { connected: false };

      const { data, error } = await this.client
        .from('students')
        .select('id')
        .limit(1);

      return { connected: !error, error: error?.message || null };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }
}

module.exports = new SupabaseMLAnalytics();

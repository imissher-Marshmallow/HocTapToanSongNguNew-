/**
 * ML Analytics PostgreSQL Service
 * Pushes AI analysis (strengths, weaknesses, predictions) to Supabase PostgreSQL
 */

class MLAnalyticsDB {
  constructor(pool) {
    this.pool = pool; // PostgreSQL pool from database.js
  }

  /**
   * Store complete ML analysis result to PostgreSQL
   */
  async storeMLAnalysis(userId, quizId, analysisData) {
    if (!this.pool) {
      console.warn('[MLAnalyticsDB] PostgreSQL pool not available');
      return { success: false, error: 'Database not configured' };
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Get or create student record
      const studentId = await this.getOrCreateStudent(client, userId);

      // 2. Store performance metrics
      const perfRecordId = await this.storePerformanceMetrics(
        client,
        studentId,
        quizId,
        analysisData.performance
      );

      // 3. Store weakness patterns (điểm yếu)
      if (analysisData.weaknesses) {
        await this.storeWeaknesses(
          client,
          studentId,
          quizId,
          analysisData.weaknesses,
          perfRecordId
        );
      }

      // 4. Store strengths (điểm mạnh)
      if (analysisData.insights) {
        await this.storeStrengths(
          client,
          studentId,
          quizId,
          analysisData.insights,
          perfRecordId
        );
      }

      // 5. Store predictions
      if (analysisData.prediction) {
        await this.storePredictions(
          client,
          studentId,
          quizId,
          analysisData.prediction
        );
      }

      // 6. Store learning path recommendations
      if (analysisData.learningPath) {
        await this.storeLearningPath(
          client,
          studentId,
          quizId,
          analysisData.learningPath
        );
      }

      // 7. Update student aggregate metrics
      await this.updateStudentMetrics(
        client,
        studentId,
        analysisData.performance,
        analysisData.confidenceTrend
      );

      await client.query('COMMIT');

      console.log(`[MLAnalyticsDB] Successfully stored ML analysis for user ${userId}, quiz ${quizId}`);

      return {
        success: true,
        studentId,
        performanceRecordId: perfRecordId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[MLAnalyticsDB] Error storing ML analysis:', error.message);
      return {
        success: false,
        error: error.message
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get or create student ML profile
   */
  async getOrCreateStudent(client, userId) {
    try {
      // Check if student exists
      let result = await client.query(
        `SELECT id FROM ml_student_profiles WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length > 0) {
        return result.rows[0].id;
      }

      // Create new student profile
      result = await client.query(
        `INSERT INTO ml_student_profiles 
         (user_id, created_at, updated_at) 
         VALUES ($1, NOW(), NOW())
         RETURNING id`,
        [userId]
      );

      console.log(`[MLAnalyticsDB] Created new ML student profile for user ${userId}`);
      return result.rows[0].id;
    } catch (error) {
      console.error('[MLAnalyticsDB] Error in getOrCreateStudent:', error.message);
      throw error;
    }
  }

  /**
   * Store performance metrics (điểm số, categories, difficulty)
   */
  async storePerformanceMetrics(client, studentId, quizId, performance) {
    try {
      const result = await client.query(
        `INSERT INTO ml_performance_records 
         (student_id, quiz_id, overall_score, category_performance, difficulty_analysis, timestamp)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id`,
        [
          studentId,
          quizId,
          performance.overallScore,
          JSON.stringify(performance.categoryPerformance || {}),
          JSON.stringify(performance.difficultyAnalysis || {})
        ]
      );

      console.log(`[MLAnalyticsDB] Stored performance metrics, record ID: ${result.rows[0].id}`);
      return result.rows[0].id;
    } catch (error) {
      console.error('[MLAnalyticsDB] Error storing performance metrics:', error.message);
      throw error;
    }
  }

  /**
   * Store weaknesses (điểm yếu - conceptual gaps, error patterns)
   */
  async storeWeaknesses(client, studentId, quizId, weaknesses, perfRecordId) {
    try {
      const weaknessRecords = [];

      // 1. Conceptual gaps (lỗi khái niệm)
      if (weaknesses.patterns && weaknesses.patterns.conceptualGaps) {
        for (const gap of weaknesses.patterns.conceptualGaps) {
          weaknessRecords.push({
            student_id: studentId,
            quiz_id: quizId,
            perf_record_id: perfRecordId,
            weakness_type: 'CONCEPTUAL_GAP',
            concept: gap.concept,
            severity: gap.severity,
            frequency: gap.frequency,
            affected_questions: gap.affectedQuestions,
            description: `${gap.frequency} errors in ${gap.concept} (${gap.severity} severity)`
          });
        }
      }

      // 2. Procedural errors (lỗi quy trình)
      if (weaknesses.patterns && weaknesses.patterns.procedureErrors) {
        weaknessRecords.push({
          student_id: studentId,
          quiz_id: quizId,
          perf_record_id: perfRecordId,
          weakness_type: 'PROCEDURAL_ERROR',
          concept: 'Problem-solving process',
          severity: weaknesses.patterns.procedureErrors.length > 2 ? 'MEDIUM' : 'LOW',
          frequency: weaknesses.patterns.procedureErrors.length,
          affected_questions: weaknesses.patterns.procedureErrors,
          description: `${weaknesses.patterns.procedureErrors.length} procedural/methodological errors`
        });
      }

      // 3. Careless mistakes (lỗi không cẩn thận)
      if (weaknesses.patterns && weaknesses.patterns.carelessMistakes) {
        weaknessRecords.push({
          student_id: studentId,
          quiz_id: quizId,
          perf_record_id: perfRecordId,
          weakness_type: 'CARELESS_MISTAKE',
          concept: 'Attention to detail',
          severity: weaknesses.patterns.carelessMistakes.length > 3 ? 'MEDIUM' : 'LOW',
          frequency: weaknesses.patterns.carelessMistakes.length,
          affected_questions: weaknesses.patterns.carelessMistakes,
          description: `${weaknesses.patterns.carelessMistakes.length} careless mistakes detected`
        });
      }

      // Batch insert all weaknesses
      if (weaknessRecords.length > 0) {
        for (const record of weaknessRecords) {
          await client.query(
            `INSERT INTO ml_weaknesses 
             (student_id, quiz_id, perf_record_id, weakness_type, concept, severity, frequency, affected_questions, description, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            [
              record.student_id,
              record.quiz_id,
              record.perf_record_id,
              record.weakness_type,
              record.concept,
              record.severity,
              record.frequency,
              JSON.stringify(record.affected_questions),
              record.description
            ]
          );
        }
      }

      console.log(`[MLAnalyticsDB] Stored ${weaknessRecords.length} weakness records`);
    } catch (error) {
      console.error('[MLAnalyticsDB] Error storing weaknesses:', error.message);
      throw error;
    }
  }

  /**
   * Store strengths (điểm mạnh - positive insights)
   */
  async storeStrengths(client, studentId, quizId, insights, perfRecordId) {
    try {
      const strengthRecords = [];

      // Parse insights to find strengths
      for (const insight of insights) {
        if (insight.type === 'STRENGTH' || insight.type === 'POSITIVE') {
          strengthRecords.push({
            student_id: studentId,
            quiz_id: quizId,
            perf_record_id: perfRecordId,
            insight_type: insight.type,
            message: insight.message,
            priority: insight.priority,
            category: this.extractCategory(insight.message)
          });
        }
      }

      // Batch insert all strengths
      if (strengthRecords.length > 0) {
        for (const record of strengthRecords) {
          await client.query(
            `INSERT INTO ml_strengths 
             (student_id, quiz_id, perf_record_id, insight_type, message, priority, category, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
              record.student_id,
              record.quiz_id,
              record.perf_record_id,
              record.insight_type,
              record.message,
              record.priority,
              record.category
            ]
          );
        }
      }

      console.log(`[MLAnalyticsDB] Stored ${strengthRecords.length} strength records`);
    } catch (error) {
      console.error('[MLAnalyticsDB] Error storing strengths:', error.message);
      throw error;
    }
  }

  /**
   * Store predictions (dự đoán điểm tiếp theo, thời gian mastery)
   */
  async storePredictions(client, studentId, quizId, prediction) {
    try {
      await client.query(
        `INSERT INTO ml_predictions 
         (student_id, quiz_id, predicted_score, confidence, trend, intervention_needed, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          studentId,
          quizId,
          prediction.predictedScore,
          prediction.confidence,
          prediction.trend || 'stable',
          prediction.interventionNeeded || false
        ]
      );

      console.log(`[MLAnalyticsDB] Stored prediction for user ${studentId}`);
    } catch (error) {
      console.error('[MLAnalyticsDB] Error storing predictions:', error.message);
      throw error;
    }
  }

  /**
   * Store learning path (lộ trình học tập cá nhân)
   */
  async storeLearningPath(client, studentId, quizId, learningPath) {
    try {
      await client.query(
        `INSERT INTO ml_learning_paths 
         (student_id, quiz_id, phase, milestones, daily_goals, estimated_days, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', NOW())`,
        [
          studentId,
          quizId,
          learningPath.phase,
          JSON.stringify(learningPath.milestones || []),
          JSON.stringify(learningPath.dailyGoals || []),
          learningPath.timeline?.totalWeeks ? learningPath.timeline.totalWeeks * 7 : 14
        ]
      );

      console.log(`[MLAnalyticsDB] Stored learning path for user ${studentId}`);
    } catch (error) {
      console.error('[MLAnalyticsDB] Error storing learning path:', error.message);
      throw error;
    }
  }

  /**
   * Update student aggregate metrics
   */
  async updateStudentMetrics(client, studentId, performance, confidenceTrend) {
    try {
      await client.query(
        `UPDATE ml_student_profiles 
         SET overall_score = $1,
             confidence_score = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [
          performance.overallScore,
          confidenceTrend.overall || 0,
          studentId
        ]
      );

      console.log(`[MLAnalyticsDB] Updated student metrics for student ${studentId}`);
    } catch (error) {
      console.error('[MLAnalyticsDB] Error updating student metrics:', error.message);
      throw error;
    }
  }

  /**
   * Get student ML profile with all analysis
   */
  async getStudentMLProfile(userId) {
    try {
      // Get student profile
      let result = await this.pool.query(
        `SELECT * FROM ml_student_profiles WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const studentId = result.rows[0].id;
      const profile = result.rows[0];

      // Get recent weaknesses
      result = await this.pool.query(
        `SELECT * FROM ml_weaknesses 
         WHERE student_id = $1 
         ORDER BY created_at DESC 
         LIMIT 10`,
        [studentId]
      );
      profile.recent_weaknesses = result.rows;

      // Get recent strengths
      result = await this.pool.query(
        `SELECT * FROM ml_strengths 
         WHERE student_id = $1 
         ORDER BY created_at DESC 
         LIMIT 5`,
        [studentId]
      );
      profile.recent_strengths = result.rows;

      // Get latest prediction
      result = await this.pool.query(
        `SELECT * FROM ml_predictions 
         WHERE student_id = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [studentId]
      );
      profile.latest_prediction = result.rows[0] || null;

      // Get active learning path
      result = await this.pool.query(
        `SELECT * FROM ml_learning_paths 
         WHERE student_id = $1 AND status = 'ACTIVE'
         ORDER BY created_at DESC 
         LIMIT 1`,
        [studentId]
      );
      profile.active_learning_path = result.rows[0] || null;

      return profile;
    } catch (error) {
      console.error('[MLAnalyticsDB] Error fetching student ML profile:', error.message);
      throw error;
    }
  }

  /**
   * Helper: Extract category from message
   */
  extractCategory(message) {
    if (!message) return 'General';
    
    const categoryMap = {
      'algebra': 'Algebra',
      'geometry': 'Geometry',
      'calculus': 'Calculus',
      'trigonometry': 'Trigonometry',
      'physics': 'Physics',
      'problem-solving': 'Problem Solving',
      'logic': 'Logic',
      'reasoning': 'Reasoning'
    };

    for (const [key, value] of Object.entries(categoryMap)) {
      if (message.toLowerCase().includes(key)) {
        return value;
      }
    }

    return 'General';
  }
}

module.exports = MLAnalyticsDB;

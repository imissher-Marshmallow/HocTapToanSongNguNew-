/**
 * MLAnalyticsDB.js - PostgreSQL/Supabase Integration Layer
 * 
 * Stores ML analysis results to Supabase PostgreSQL
 * Handles weaknesses (điểm yếu), strengths (điểm mạnh), predictions, learning paths
 */

class MLAnalyticsDB {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Main entry point: Store complete ML analysis
   * Handles transaction-based multi-table inserts
   */
  async storeMLAnalysis(userId, quizId, analysisData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Get or create student profile
      const student = await this.getOrCreateStudent(client, userId);
      const studentId = student.id;

      // 2. Store performance metrics
      await this.storePerformanceMetrics(client, studentId, quizId, analysisData);

      // 3. Store weaknesses (điểm yếu)
      if (analysisData.weaknesses && Array.isArray(analysisData.weaknesses)) {
        for (const weakness of analysisData.weaknesses) {
          await this.storeWeaknesses(client, studentId, quizId, weakness);
        }
      }

      // 4. Store strengths (điểm mạnh)
      if (analysisData.strengths && Array.isArray(analysisData.strengths)) {
        for (const strength of analysisData.strengths) {
          await this.storeStrengths(client, studentId, quizId, strength);
        }
      }

      // 5. Store predictions
      if (analysisData.prediction) {
        await this.storePredictions(client, studentId, quizId, analysisData.prediction);
      }

      // 6. Store learning path
      if (analysisData.learningPath) {
        await this.storeLearningPath(client, studentId, quizId, analysisData.learningPath);
      }

      // 7. Update student metrics
      await this.updateStudentMetrics(client, studentId, analysisData.score);

      await client.query('COMMIT');
      
      return {
        success: true,
        studentId,
        message: 'ML analysis stored successfully'
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error storing ML analysis:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get or create student profile
   */
  async getOrCreateStudent(client, userId) {
    try {
      // Try to get existing student
      const result = await client.query(
        'SELECT * FROM ml_student_profiles WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Create new profile
      const newStudent = await client.query(
        `INSERT INTO ml_student_profiles (user_id, overall_score, confidence_score, total_quizzes)
         VALUES ($1, 0, 0, 0)
         RETURNING *`,
        [userId]
      );

      return newStudent.rows[0];
    } catch (error) {
      console.error('Error getting/creating student:', error.message);
      throw error;
    }
  }

  /**
   * Store performance metrics
   */
  async storePerformanceMetrics(client, studentId, quizId, analysisData) {
    try {
      await client.query(
        `INSERT INTO ml_performance_records 
         (student_id, quiz_id, overall_score, category_performance, difficulty_analysis)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          studentId,
          quizId,
          analysisData.score || 0,
          JSON.stringify(analysisData.categoryBreakdown || {}),
          JSON.stringify(analysisData.aiAnalysis || {})
        ]
      );
    } catch (error) {
      console.error('Error storing performance metrics:', error.message);
      throw error;
    }
  }

  /**
   * Store weaknesses (điểm yếu)
   */
  async storeWeaknesses(client, studentId, quizId, weakness) {
    try {
      await client.query(
        `INSERT INTO ml_weaknesses 
         (student_id, quiz_id, weakness_type, concept, severity, frequency, affected_questions, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          studentId,
          quizId,
          weakness.weakness_type || 'CONCEPTUAL_GAP',
          weakness.concept || 'Unknown',
          weakness.severity || 'MEDIUM',
          weakness.frequency || 1,
          JSON.stringify(weakness.affected_questions || []),
          weakness.description || ''
        ]
      );
    } catch (error) {
      console.error('Error storing weakness:', error.message);
      throw error;
    }
  }

  /**
   * Store strengths (điểm mạnh)
   */
  async storeStrengths(client, studentId, quizId, strength) {
    try {
      await client.query(
        `INSERT INTO ml_strengths 
         (student_id, quiz_id, insight_type, message, priority, category)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          studentId,
          quizId,
          strength.insight_type || strength.type || 'STRENGTH',
          strength.message || strength.description || '',
          strength.priority || 'MEDIUM',
          strength.category || 'General'
        ]
      );
    } catch (error) {
      console.error('Error storing strength:', error.message);
      throw error;
    }
  }

  /**
   * Store predictions
   */
  async storePredictions(client, studentId, quizId, prediction) {
    try {
      await client.query(
        `INSERT INTO ml_predictions 
         (student_id, quiz_id, predicted_score, confidence, trend, intervention_needed)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          studentId,
          quizId,
          prediction.predicted_score || 75,
          prediction.confidence || 0.5,
          prediction.trend || 'stable',
          prediction.confidence < 0.5
        ]
      );
    } catch (error) {
      console.error('Error storing prediction:', error.message);
      throw error;
    }
  }

  /**
   * Store learning path
   */
  async storeLearningPath(client, studentId, quizId, learningPath) {
    try {
      await client.query(
        `INSERT INTO ml_learning_paths 
         (student_id, quiz_id, phase, milestones, daily_goals, estimated_days, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          studentId,
          quizId,
          learningPath.phase || 'FOUNDATION',
          JSON.stringify(learningPath.milestones || []),
          JSON.stringify(learningPath.daily_goals || []),
          learningPath.estimated_days || 14,
          'ACTIVE'
        ]
      );
    } catch (error) {
      console.error('Error storing learning path:', error.message);
      throw error;
    }
  }

  /**
   * Update student aggregate metrics
   */
  async updateStudentMetrics(client, studentId, newScore) {
    try {
      await client.query(
        `UPDATE ml_student_profiles 
         SET overall_score = $1, 
             confidence_score = (overall_score + $1) / 2,
             total_quizzes = total_quizzes + 1,
             updated_at = NOW()
         WHERE id = $2`,
        [newScore || 0, studentId]
      );
    } catch (error) {
      console.error('Error updating student metrics:', error.message);
      throw error;
    }
  }

  /**
   * Get complete student ML profile
   */
  async getStudentMLProfile(userId) {
    try {
      const result = await this.pool.query(
        `SELECT 
           sp.*,
           (SELECT json_agg(json_build_object(
             'id', id, 'concept', concept, 'weakness_type', weakness_type,
             'severity', severity, 'frequency', frequency, 'created_at', created_at
           )) FROM ml_weaknesses WHERE student_id = sp.id AND resolved_at IS NULL) as recentWeaknesses,
           (SELECT json_agg(json_build_object(
             'id', id, 'category', category, 'message', message, 'priority', priority
           )) FROM ml_strengths WHERE student_id = sp.id) as recentStrengths,
           (SELECT json_build_object(
             'predicted_score', predicted_score, 'confidence', confidence, 'trend', trend
           ) FROM ml_predictions WHERE student_id = sp.id ORDER BY created_at DESC LIMIT 1) as latestPrediction,
           (SELECT json_build_object(
             'phase', phase, 'milestones', milestones, 'daily_goals', daily_goals, 'status', status
           ) FROM ml_learning_paths WHERE student_id = sp.id AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1) as activeLearningPath
         FROM ml_student_profiles sp
         WHERE sp.user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting student profile:', error.message);
      throw error;
    }
  }
}

module.exports = MLAnalyticsDB;

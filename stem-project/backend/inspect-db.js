/**
 * Database Inspection Script
 * 
 * Display all users and AI-sent data (analysis, feedback, recommendations)
 * Works with both PostgreSQL (cloud) and SQLite (local)
 * 
 * Usage: node inspect-db.js
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Import database helpers (which auto-selects PostgreSQL or SQLite)
const { dbHelpers } = require('./database');

console.log(`\n📊 Database Inspector\n${'='.repeat(80)}\n`);

// Check which database is in use
if (process.env.DATABASE_URL) {
  console.log(`Database: PostgreSQL (Cloud)\n`);
} else {
  const dbPath = path.join(__dirname, '../data/quiz.db');
  console.log(`Database: SQLite (Local)\nPath: ${dbPath}\n`);
  
  if (!fs.existsSync(dbPath)) {
    console.warn(`⚠️  Database file not found at ${dbPath}`);
    console.log('Create a quiz first to populate the database.\n');
    process.exit(1);
  }
}

inspectDatabase();

async function inspectDatabase() {
  try {
    // 1. Get all users
    console.log('\n📋 ALL USERS\n' + '-'.repeat(80));
    const users = await dbHelpers.getAllUsers();
    if (users.length === 0) {
      console.log('  (no users yet)');
    } else {
      users.forEach((user, idx) => {
        console.log(`  ${idx + 1}. ID: ${user.id} | Email: ${user.email} | Username: ${user.username} | Created: ${user.created_at}`);
      });
    }

    // 2. Get all results
    console.log('\n\n📈 ALL QUIZ RESULTS\n' + '-'.repeat(80));
    const results = await dbHelpers.getAllResults();
    if (results.length === 0) {
      console.log('  (no quiz results yet)');
    } else {
      results.forEach((result, idx) => {
        console.log(`\n  ${idx + 1}. Result ID: ${result.id}`);
        console.log(`     User ID: ${result.user_id} | Quiz: ${result.quiz_id}`);
        console.log(`     Score: ${result.score}/${result.total_questions} | Date: ${result.created_at}`);
        
        // Parse and display weak areas
        try {
          const weakAreas = JSON.parse(result.weak_areas || '[]');
          if (weakAreas.length > 0) {
            console.log(`     Weak Areas: ${weakAreas.map(w => `${w.topic} (${w.count} errors)`).join(', ')}`);
          }
        } catch (e) {
          console.log(`     Weak Areas: ${result.weak_areas}`);
        }

        // Parse and display feedback
        try {
          const feedback = JSON.parse(result.feedback || '{}');
          if (feedback.overallMessage) {
            console.log(`     Feedback: ${feedback.overallMessage.substring(0, 100)}...`);
          } else if (feedback.overall) {
            console.log(`     Feedback: ${feedback.overall.substring(0, 100)}...`);
          }
        } catch (e) {
          console.log(`     Feedback: ${(result.feedback || 'none').substring(0, 100)}...`);
        }

        // Parse and display recommendations
        try {
          const recs = JSON.parse(result.recommendations || '[]');
          if (recs.length > 0) {
            console.log(`     Recommendations:`);
            recs.slice(0, 2).forEach((rec, recIdx) => {
              console.log(`       - ${rec.topic}: ${rec.action || rec.description || '(action)'}`);
            });
            if (recs.length > 2) console.log(`       ... and ${recs.length - 2} more`);
          }
        } catch (e) {
          console.log(`     Recommendations: ${(result.recommendations || 'none').substring(0, 100)}...`);
        }

        // Display AI analysis if available
        if (result.ai_analysis) {
          try {
            const analysis = JSON.parse(result.ai_analysis);
            console.log(`     AI Analysis Keys: ${Object.keys(analysis).join(', ')}`);
            if (analysis.insights) {
              console.log(`     AI Insights: ${(analysis.insights.substring ? analysis.insights : JSON.stringify(analysis.insights)).substring(0, 100)}...`);
            }
          } catch (e) {
            console.log(`     AI Analysis: ${result.ai_analysis.substring(0, 100)}...`);
          }
        }
      });
    }

    // 3. Get all learning plans
    console.log('\n\n📅 ALL LEARNING PLANS\n' + '-'.repeat(80));
    // Note: Need to fetch from database directly if getAllLearningPlans not available
    console.log('  (use getLearningPlans(userId) to view plans by user)');

    // 4. Summary statistics
    console.log('\n\n📊 SUMMARY STATISTICS\n' + '-'.repeat(80));
    console.log(`  Total Users: ${users.length}`);
    console.log(`  Total Quiz Results: ${results.length}`);
    
    if (results.length > 0) {
      const avgScore = (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1);
      const totalQuestions = results.reduce((sum, r) => sum + r.total_questions, 0);
      const avgPerQuiz = (totalQuestions / results.length).toFixed(1);
      console.log(`  Average Score: ${avgScore}/${results[0]?.total_questions || '?'}`);
      console.log(`  Total Questions Attempted: ${totalQuestions}`);
      console.log(`  Avg Questions per Quiz: ${avgPerQuiz}`);
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (err) {
    console.error('❌ Error during inspection:', err.message);
  }

  process.exit(0);
}

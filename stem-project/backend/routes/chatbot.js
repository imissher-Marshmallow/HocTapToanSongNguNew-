/**
 * AI Chatbot Routes
 * Personalized chatbot powered by OpenAI GPT-4
 * Fetches student context from Supabase for contextual responses
 */

const express = require('express');
const { supabase } = require('../database');
const router = express.Router();

// Initialize OpenAI - using environment variable OPENAI_API_KEY
const OpenAI = require('openai').default;
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * POST /api/chat/send-message
 * Send a message to the AI chatbot
 * 
 * Body: {
 *   userId: number,
 *   message: string,
 *   conversationHistory: [{role: 'user'|'assistant', content: string}]
 * }
 */
router.post('/send-message', async (req, res) => {
  try {
    const { userId, message, conversationHistory = [] } = req.body;

    // Validate input
    if (!userId || !message) {
      return res.status(400).json({ error: 'Missing userId or message' });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('[Chatbot] ❌ OpenAI API key not configured');
      return res.status(500).json({ error: 'AI service not available' });
    }

    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    console.log('[Chatbot] 📨 Message received from user:', numericUserId);
    console.log('[Chatbot] Message:', message.substring(0, 100) + '...');

    // ============================================
    // FETCH STUDENT CONTEXT FROM SUPABASE
    // ============================================
    
    console.log('[Chatbot] 📚 Fetching student context from Supabase...');

    // 1. Get user learning profile (cognitive levels, weak/strong areas)
    const { data: learningProfile } = await supabase
      .from('user_learning_profiles')
      .select('*')
      .eq('user_id', numericUserId)
      .single();

    if (learningProfile) {
      console.log('[Chatbot] ✅ Learning profile found');
    }

    // 2. Get recent quiz results (recent performance history)
    const { data: recentQuizzes } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', numericUserId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentQuizzes && recentQuizzes.length > 0) {
      console.log('[Chatbot] ✅ Found', recentQuizzes.length, 'recent quiz results');
    }

    // 3. Get recent AI feedback (latest coaching recommendations)
    const { data: aiFeedback } = await supabase
      .from('ai_feedback')
      .select('*')
      .eq('user_id', numericUserId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (aiFeedback && aiFeedback.length > 0) {
      console.log('[Chatbot] ✅ Found', aiFeedback.length, 'AI feedback records');
    }

    // 4. Get ml_performance_records (detailed performance analytics per topic)
    const { data: performanceRecords } = await supabase
      .from('ml_performance_records')
      .select('*')
      .eq('user_id', numericUserId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (performanceRecords && performanceRecords.length > 0) {
      console.log('[Chatbot] ✅ Found', performanceRecords.length, 'performance records');
    }

    // 5. Get ai_learning_insights (cumulative learning insights)
    const { data: learningInsights } = await supabase
      .from('ai_learning_insights')
      .select('*')
      .eq('user_id', numericUserId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (learningInsights && learningInsights.length > 0) {
      console.log('[Chatbot] ✅ Found', learningInsights.length, 'learning insights');
    }

    // Build context string for OpenAI
    let studentContext = `
# Student Learning Profile Context

## Current Performance Status:
`;

    if (learningProfile) {
      studentContext += `
- Cognitive Levels: ${JSON.stringify(learningProfile.cognitive_levels || {})}
- Weak Areas: ${(learningProfile.weak_areas || []).join(', ') || 'None identified yet'}
- Strong Areas: ${(learningProfile.strong_areas || []).join(', ') || 'None identified yet'}
- Topics Attempted: ${(learningProfile.topics_attempted || []).join(', ') || 'No topics attempted yet'}
- Proficiency Status: ${JSON.stringify(learningProfile.proficiency_status || {})}
- Quizzes Taken: ${learningProfile.quizzes_taken || 0}
`;
    } else {
      studentContext += '\n- No learning profile found yet. Student is new.';
    }

    // Add first vs recent exam comparison
    if (recentQuizzes && recentQuizzes.length > 0) {
      const firstQuiz = recentQuizzes[recentQuizzes.length - 1]; // Oldest quiz
      const latestQuiz = recentQuizzes[0]; // Most recent quiz
      const avgScore = recentQuizzes.reduce((sum, q) => sum + (q.overall_score || 0), 0) / recentQuizzes.length;
      
      studentContext += `\n## Exam Performance History:
- First Exam Score: ${firstQuiz.overall_score || 'N/A'}/10
- Most Recent Score: ${latestQuiz.overall_score || 'N/A'}/10
- Average Score: ${avgScore.toFixed(1)}/10
- Total Quizzes Completed: ${recentQuizzes.length}`;

      if (latestQuiz.overall_score > firstQuiz.overall_score) {
        const improvement = (latestQuiz.overall_score - firstQuiz.overall_score).toFixed(1);
        studentContext += `\n- 📈 Progress: +${improvement} points improvement!`;
      } else if (latestQuiz.overall_score < firstQuiz.overall_score) {
        const decline = (firstQuiz.overall_score - latestQuiz.overall_score).toFixed(1);
        studentContext += `\n- 📉 Trend: -${decline} points (needs focus)`;
      }

      // Recent quiz details
      studentContext += `\n\n## Last 3 Quiz Attempts:`;
      recentQuizzes.slice(0, 3).forEach((quiz, idx) => {
        const date = new Date(quiz.created_at).toLocaleDateString('vi-VN');
        studentContext += `\n- Quiz ${idx + 1}: Score: ${quiz.overall_score || 'N/A'}/10, Topic: "${quiz.topic || 'General'}", Date: ${date}`;
      });
    }

    // Add detailed topic performance from ml_performance_records
    if (performanceRecords && performanceRecords.length > 0) {
      const topicScores = {};
      performanceRecords.forEach(record => {
        if (!topicScores[record.topic]) {
          topicScores[record.topic] = [];
        }
        topicScores[record.topic].push(record.score || record.percentage || 0);
      });

      studentContext += `\n\n## Topic Performance Breakdown:`;
      
      // Find best and worst topics
      const topicStats = Object.entries(topicScores).map(([topic, scores]) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        return { topic, avg, count: scores.length, latest: scores[0] };
      }).sort((a, b) => b.avg - a.avg);

      if (topicStats.length > 0) {
        const bestTopic = topicStats[0];
        const worstTopic = topicStats[topicStats.length - 1];
        
        studentContext += `\n- 🏆 Strongest Topic: "${bestTopic.topic}" (Avg: ${bestTopic.avg.toFixed(1)}/10, ${bestTopic.count} attempts)`;
        studentContext += `\n- ⚠️ Needs Work: "${worstTopic.topic}" (Avg: ${worstTopic.avg.toFixed(1)}/10, ${worstTopic.count} attempts)`;
      }

      const avgScore = (performanceRecords.reduce((sum, r) => sum + (r.score || r.percentage || 0), 0) / performanceRecords.length).toFixed(1);
      studentContext += `\n- Overall Average Score: ${avgScore}/10`;
      studentContext += `\n- Total Attempts: ${performanceRecords.length}`;
    }

    // Add AI coaching insights
    if (aiFeedback && aiFeedback.length > 0) {
      const latestFeedback = aiFeedback[0];
      studentContext += `\n\n## AI Coaching Recommendations:
- Topic: ${latestFeedback.topic}
- Suggested Difficulty: ${latestFeedback.recommended_level || 'normal'} 
- AI Summary: ${latestFeedback.summary || 'N/A'}
- Recommended Topics: ${(latestFeedback.suggested_topics || []).join(', ') || 'General practice'}`;
    }

    // Add learning insights trends
    if (learningInsights && learningInsights.length > 0) {
      const latestInsight = learningInsights[0];
      studentContext += `\n\n## Recent Learning Insights:
- Confidence Score: ${(latestInsight.confidence_score * 100).toFixed(0)}%
- Strong Areas: ${(latestInsight.strong_areas || []).join(', ')}
- Weak Areas: ${(latestInsight.weak_areas || []).join(', ')}
- Difficulty Adjustment: ${latestInsight.difficulty_adjustment || 'normal'}`;
    }

    studentContext += `\n\n## Teaching Guidelines:
- Focus on weak areas identified: ${(learningProfile?.weak_areas || []).join(', ')}
- Reinforce strengths in: ${(learningProfile?.strong_areas || []).join(', ')}
- Tailor explanations to student's cognitive level
- Reference specific topics they've struggled with`;


    console.log('[Chatbot] 📚 Student context prepared');

    // ============================================
    // PREPARE SYSTEM PROMPT FOR OPENAI
    // ============================================
    
    const systemPrompt = `You are an expert Vietnamese mathematics tutor (Hướng dẫn viên toán học).

Your role is to:
1. Provide personalized tutoring based on the student's learning profile and performance
2. Adjust explanations based on their Bloom's cognitive level
3. Reference their specific weak and strong areas
4. Give targeted practice recommendations
5. Encourage and motivate the student
6. Answer questions with Vietnamese examples when helpful
7. Guide them toward mastery, not just quick answers

Student Context:
${studentContext}

Guidelines:
- Be conversational and encouraging
- Use the student's learning history to give relevant advice
- If they ask about weak areas, provide extra support
- If they're struggling, suggest easier difficulty level
- If they're excelling, suggest harder challenges
- Always relate answers back to their learning goals
- Be concise but comprehensive
- Use Vietnamese when appropriate (student name context suggests Vietnamese speakers)`;

    // ============================================
    // CALL OPENAI API
    // ============================================

    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    console.log('[Chatbot] 🤖 Calling OpenAI with', messages.length, 'messages in conversation');

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 1500,
      top_p: 0.95,
      presence_penalty: 0.6,
      frequency_penalty: 0.3
    });

    const assistantMessage = response.choices[0]?.message?.content || '';

    console.log('[Chatbot] ✅ Response generated successfully');

    // Save conversation to database (optional - for future analysis)
    if (learningProfile && supabase) {
      try {
        const { error } = await supabase
          .from('chat_conversations')
          .insert([{
            user_id: numericUserId,
            user_message: message,
            assistant_message: assistantMessage,
            student_context_used: {
              weak_areas: learningProfile.weak_areas || [],
              strong_areas: learningProfile.strong_areas || [],
              cognitive_levels: learningProfile.cognitive_levels || {}
            }
          }]);
        
        if (error) {
          console.warn('[Chatbot] ⚠️ Could not save conversation:', error.message);
        }
      } catch (err) {
        console.warn('[Chatbot] ⚠️ Exception saving conversation:', err.message);
      }
    }

    res.json({
      success: true,
      message: assistantMessage,
      studentContextUsed: {
        topicsAttempted: learningProfile?.topics_attempted || [],
        weakAreas: learningProfile?.weak_areas || [],
        strongAreas: learningProfile?.strong_areas || [],
        recentScore: recentQuizzes?.[0]?.overall_score || null,
        recommendedDifficulty: aiFeedback?.[0]?.recommended_level || null
      }
    });
  } catch (error) {
    console.error('[Chatbot] ❌ Error:', error);
    
    if (error.status === 401) {
      return res.status(500).json({ 
        error: 'AI service authentication failed. Check OpenAI API key.' 
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json({ 
        error: 'Too many requests to AI service. Please try again in a moment.' 
      });
    }

    res.status(500).json({ 
      error: 'Failed to get AI response',
      details: error.message 
    });
  }
});

/**
 * GET /api/chat/history/:userId
 * Get chat conversation history for a user
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const numericUserId = parseInt(req.params.userId, 10);
    
    if (isNaN(numericUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { data: conversations, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', numericUserId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      return res.json({ conversations: [], message: 'No chat history found' });
    }

    res.json({
      userId: numericUserId,
      conversationCount: conversations?.length || 0,
      conversations: conversations || []
    });
  } catch (error) {
    console.error('[Chatbot] Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

/**
 * DELETE /api/chat/clear/:userId
 * Clear chat history for a user
 */
router.delete('/clear/:userId', async (req, res) => {
  try {
    const numericUserId = parseInt(req.params.userId, 10);
    
    if (isNaN(numericUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('user_id', numericUserId);

    if (error) {
      return res.status(500).json({ error: 'Failed to clear history' });
    }

    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    console.error('[Chatbot] Error clearing history:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

module.exports = router;

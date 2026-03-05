/**
 * AI Insight Generation Routes
 * Generates personalized learning insights using OpenAI
 */

const express = require('express');
const OpenAI = require('openai');

const router = express.Router();

// Initialize OpenAI
let openai;
try {
  const apiKey = process.env.OPENAI_API_KEY_SUMMARY || process.env.OPENAI_API_KEY;
  if (apiKey) {
    openai = new OpenAI({ apiKey });
  }
} catch (error) {
  console.warn('Failed to initialize OpenAI:', error.message);
}

/**
 * POST /api/ai/generate-insight
 * Generate AI-powered learning insights based on student profile
 */
router.post('/generate-insight', async (req, res) => {
  try {
    const { userId, profile } = req.body;

    if (!profile) {
      return res.status(400).json({ error: 'Profile data required' });
    }

    console.log('[AIInsight] Generating insight for user:', userId);

    // If OpenAI not available, return fallback
    if (!openai) {
      console.warn('[AIInsight] OpenAI not configured, returning fallback');
      return res.json(generateFallbackInsight(profile));
    }

    // Build prompt for OpenAI
    const prompt = buildInsightPrompt(profile);

    try {
      // Use Promise.race to implement timeout (OpenAI SDK doesn't support timeout parameter)
      const completionPromise = openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert mathematics tutor and learning coach. Analyze the student's performance data and provide personalized, encouraging insights about their learning progress. Respond in JSON format with exactly these fields: strengths (string), bottleneck (string), primaryAction (string), actionDescription (string), activeWeek (number 1-4), roadmap (array of objects with focus and detail fields).`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1200
      });

      // Implement timeout using Promise.race
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('OpenAI API request timeout')), 8000)
      );

      const completion = await Promise.race([completionPromise, timeoutPromise]);

      const responseText = completion.choices[0]?.message?.content || '';
      
      // Parse JSON from response
      let insight = parseAIResponse(responseText, profile);
      
      console.log('[AIInsight] Generated insight successfully');
      return res.json(insight);
    } catch (aiError) {
      console.warn('[AIInsight] OpenAI API error:', aiError.message);
      // Fall back to template
      return res.json(generateFallbackInsight(profile));
    }
  } catch (error) {
    console.error('[AIInsight] Error:', error.message);
    res.status(500).json({ error: 'Failed to generate insight' });
  }
});

/**
 * Build prompt for OpenAI to analyze student profile
 */
function buildInsightPrompt(profile) {
  const scores = profile.scores || {};
  const weakAreas = (profile.weakAreas || []).slice(0, 3).join(', ') || 'No data yet';
  const strongAreas = (profile.strongAreas || []).slice(0, 3).join(', ') || 'No data yet';
  const quizzesTaken = profile.quizzesTaken || 0;
  const lastScore = profile.lastScore || 0;
  const roadmapUnlocked = profile.roadmapUnlocked || false;

  return `
Student Learning Profile:
- Quizzes taken: ${quizzesTaken}
- Last score: ${lastScore}/10
- Weak areas: ${weakAreas}
- Strong areas: ${strongAreas}
- Roadmap unlocked: ${roadmapUnlocked}
- Knowledge level (L1) score: ${scores.level1 || 'Not assessed'}
- Comprehension level (L2) score: ${scores.level2 || 'Not assessed'}
- Application level (L3) score: ${scores.level3 || 'Not assessed'}
- Analysis level (L4) score: ${scores.level4 || 'Not assessed'}

Based on this profile, provide:
1. Strengths: What the student does well (1-2 sentences in Vietnamese)
2. Bottleneck: Current learning gap (1-2 sentences in Vietnamese)
3. Primary action: Next recommended learning activity (e.g., "Knowledge Foundation" or "Low Application Practice")
4. Action description: Why this action is important and what the student will learn (2-3 sentences in Vietnamese)
5. Active week: Which week (1-4) the student should focus on
6. Roadmap: Array of 4 week objects, each with "focus" and "detail" fields (Vietnamese text)

Respond only with valid JSON, no markdown formatting.
`;
}

/**
 * Parse OpenAI response and extract insight data
 */
function parseAIResponse(responseText, profile) {
  try {
    // Extract JSON from response (handles markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[AIInsight] No JSON found in response');
      return generateFallbackInsight(profile);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    const insight = {
      strengths: parsed.strengths || '',
      bottleneck: parsed.bottleneck || '',
      primaryAction: parsed.primaryAction || 'Learning Practice',
      actionDescription: parsed.actionDescription || '',
      activeWeek: Math.max(1, Math.min(4, parsed.activeWeek || 2)),
      roadmap: Array.isArray(parsed.roadmap) && parsed.roadmap.length === 4 
        ? parsed.roadmap 
        : generateDefaultRoadmap()
    };

    // Ensure all string fields are filled
    if (!insight.strengths) {
      insight.strengths = getDefaultStrengths(profile);
    }
    if (!insight.bottleneck) {
      insight.bottleneck = getDefaultBottleneck(profile);
    }
    if (!insight.actionDescription) {
      insight.actionDescription = getDefaultActionDescription(insight.primaryAction);
    }

    return insight;
  } catch (error) {
    console.warn('[AIInsight] Failed to parse AI response:', error.message);
    return generateFallbackInsight(profile);
  }
}

/**
 * Generate fallback insight when AI is unavailable
 */
function generateFallbackInsight(profile) {
  const scores = profile.scores || {};
  const level1 = scores.level1 || 0;
  const level2 = scores.level2 || 0;
  const level3 = scores.level3 || 0;
  const lastScore = profile.lastScore || 0;

  let primaryAction = 'Low Application Practice';
  let activeWeek = 2;

  if (level1 < 50) {
    primaryAction = 'Knowledge Foundation';
    activeWeek = 1;
  } else if (level3 > 60) {
    primaryAction = 'High Application Challenge';
    activeWeek = 3;
  }

  return {
    strengths: getDefaultStrengths(profile),
    bottleneck: getDefaultBottleneck(profile),
    primaryAction,
    actionDescription: getDefaultActionDescription(primaryAction),
    activeWeek,
    roadmap: generateDefaultRoadmap()
  };
}

/**
 * Generate default strengths text
 */
function getDefaultStrengths(profile) {
  const level1 = profile.scores?.level1 || 0;
  
  if (level1 > 70) {
    return 'Bạn có nền tảng kiến thức vững chắc. Bạn nhớ và nhận ra các khái niệm chính một cách nhất quán.';
  } else if (level1 > 50) {
    return 'Bạn đang xây dựng nền tảng kiến thức của mình. Tiếp tục luyện tập nhận biết để củng cố.';
  } else {
    return 'Hãy bắt đầu bằng cách xây dựng nền tảng kiến thức cơ bản của bạn.';
  }
}

/**
 * Generate default bottleneck text
 */
function getDefaultBottleneck(profile) {
  const level2 = profile.scores?.level2 || 0;
  const level3 = profile.scores?.level3 || 0;
  
  if (level2 < 50) {
    return 'Hiểu biết là khoảng trống chính của bạn. Bạn biết khái niệm nhưng chưa thể giải thích chúng rõ ràng hoặc áp dụng chúng.';
  } else if (level3 < 30) {
    return 'Bạn hiểu các khái niệm nhưng vẫn chưa có thể áp dụng chúng. Đây là bước tiếp theo quan trọng.';
  } else {
    return 'Bạn đang tiến bộ tốt. Bước tiếp theo là luyện tập các vấn đề phức tạp hơn.';
  }
}

/**
 * Generate default action description
 */
function getDefaultActionDescription(primaryAction) {
  const descriptions = {
    'Knowledge Foundation': 'Bắt đầu bằng cách xây dựng nền tảng kiến thức vững chắc trước khi chuyển sang ứng dụng. Điều này sẽ cho bạn tự tin hơn khi đối mặt với các vấn đề phức tạp.',
    'Low Application Practice': 'Bắt đầu với các bài tập ứng dụng cơ bản để chuyển đổi hiểu biết của bạn thành khả năng giải quyết vấn đề thực tế. Đây là bước xây dựng kỹ năng quan trọng.',
    'High Application Challenge': 'Bạn sẵn sàng cho những vấn đề phức tạp hơn. Luyện tập các tình huống thế giới thực để phát triển tư duy phân tích và kỹ năng giải quyết vấn đề nâng cao.'
  };

  return descriptions[primaryAction] || 'Tiếp tục luyện tập để cải thiện kỹ năng của bạn.';
}

/**
 * Generate default roadmap
 */
function generateDefaultRoadmap() {
  return [
    {
      focus: '🎯 Tuần 1: Tăng cường kiến thức + Luyện tập ứng dụng cơ bản',
      detail: 'Ôn tập các khái niệm chính; giải quyết vấn đề đơn giản từng bước.'
    },
    {
      focus: '🚀 Tuần 2: Sự thành thạo ứng dụng mức thấp',
      detail: 'Giải quyết các vấn đề tiêu chuẩn; xây dựng sự tự tin.'
    },
    {
      focus: '💡 Tuần 3: Luyện tập ứng dụng mức cao với AI',
      detail: 'Các tình huống thế giới thực; phân tích phức tạp với bộ định vị mở rộng.'
    },
    {
      focus: '🎓 Tuần 4: Luyện tập hỗn hợp + Xem xét lỗi cá nhân',
      detail: 'Ôn tập chéo; khám phá cách suy nghĩ cá nhân và mô hình lỗi.'
    }
  ];
}

/**
 * ========================================
 * POST /api/ai/analyze-quiz
 * Trigger AI analysis of quiz performance
 * ========================================
 * 
 * Input:
 * {
 *   "userId": 1,
 *   "quizId": "quiz-Đại số-123",
 *   "topic": "Đa thức nhiều biến",
 *   "performanceRecord": { score, percentage, cognitive_breakdown, ... }
 * }
 * 
 * Output:
 * {
 *   "summary": "String",
 *   "recommendedTopics": ["topic1", "topic2"],
 *   "difficultyAdjustment": "maintain|upgrade|downgrade",
 *   "learningPlan": "String with action items"
 * }
 */
router.post('/analyze-quiz', async (req, res) => {
  try {
    const { userId, quizId, topic, performanceRecord } = req.body;

    // Validate inputs
    if (!userId || !quizId || !performanceRecord) {
      return res.status(400).json({ error: 'Missing required fields: userId, quizId, performanceRecord' });
    }

    const { supabase } = require('../database');
    const score = performanceRecord.percentage || 0;
    const cognitive = performanceRecord.cognitive_breakdown || {};
    const topicMastery = performanceRecord.topic_mastery || {};
    const weakTopics = performanceRecord.weak_topics || [];
    const strongTopics = performanceRecord.strong_topics || [];

    console.log(`[AI/analyze-quiz] User ${userId} completed quiz ${quizId} with score ${score}%`);

    // ========== AI ANALYSIS LOGIC ==========

    // 1. Generate Summary
    let summary = '';
    if (score >= 85) {
      summary = `Xuất sắc (${score}%)! Bạn đã thành thạo các khái niệm chính trong ${topic}.`;
    } else if (score >= 75) {
      summary = `Tốt (${score}%)! Bạn hiểu ${topic} khá tốt, nhưng vẫn có thể hiểu sâu hơn.`;
    } else if (score >= 60) {
      summary = `Khá (${score}%). Bạn đã nắm bắt được các kiến thức cơ bản của ${topic}, nhưng cần luyện tập thêm.`;
    } else {
      summary = `Bạn ghi được ${score}% trong ${topic}. Hãy tập trung vào việc hiểu các khái niệm cơ bản trước tiên.`;
    }

    // 2. Identify Weak Areas
    let weakAreas = [];
    let strongAreas = [];

    if (cognitive && Object.keys(cognitive).length > 0) {
      Object.entries(cognitive).forEach(([level, data]) => {
        if (data.correct && data.total) {
          const percentage = (data.correct / data.total) * 100;
          if (percentage < 60) {
            weakAreas.push(`Mức ${level} (${percentage.toFixed(0)}%)`);
          } else if (percentage >= 80) {
            strongAreas.push(`Mức ${level} (${percentage.toFixed(0)}%)`);
          }
        }
      });
    }

    // 3. Recommend Next Topics
    let recommendedTopics = [];
    let recommendation = '';

    if (weakTopics && weakTopics.length > 0) {
      // Recommend weakest topic for practice
      const weakest = weakTopics[0];
      recommendedTopics.push(weakest.topic);
      recommendation = `Khu vực yếu nhất của bạn là ${weakest.topic} (${weakest.score}%). Tôi khuyên bạn nên luyện tập chủ đề này tiếp theo.`;
    } else if (strongTopics && strongTopics.length > 0) {
      // If strong everywhere, recommend advancing
      recommendedTopics.push('Thách thức nâng cao');
      recommendation = 'Bạn mạnh mẽ trên khắp các chủ đề. Hãy thử các bài toán thực hành nâng cao.';
    } else {
      recommendation = 'Tiếp tục với chủ đề tiếp theo trong chuỗi.';
    }

    // 4. Difficulty Adjustment
    let difficultyAdjustment = 'maintain';
    if (score >= 85) {
      difficultyAdjustment = 'upgrade';
    } else if (score < 60) {
      difficultyAdjustment = 'downgrade';
    }

    // 5. Generate Learning Plan
    let learningPlan = '';
    if (score < 60) {
      learningPlan = `1. Ôn tập các nền tảng của ${topic}\n2. Tập trung vào mức 1 & 2 kiến thức\n3. Luyện tập các bài toán dễ trước khi thử những bài khó hơn\n4. Làm bài kiểm tra này lại để kiểm tra hiểu biết`;
    } else if (score < 75) {
      learningPlan = `1. Ôn tập các khái niệm yếu được xác định ở trên\n2. Luyện tập các bài toán mức 3 & 4\n3. Cố gắng làm bài kiểm tra này lại để đạt 75%+\n4. Sau đó chuyển sang chủ đề tiếp theo`;
    } else {
      learningPlan = `1. Củng cố các khu vực mạnh với các bài toán thách thức\n2. Ôn tập bất kỳ khái niệm mức yếu\n3. Chuyển sang chủ đề tiếp theo khi sẵn sàng\n4. Ôn tập chủ đề này minigame`;
    }

    // ========== SAVE TO DATABASE ==========

    try {
      const { data: insight, error: dbError } = await supabase
        .from('ai_learning_insights')
        .upsert({
          user_id: userId,
          quiz_id: quizId,
          topic: topic,
          ai_summary: summary,
          recommended_topics: recommendedTopics,
          difficulty_adjustment: difficultyAdjustment,
          learning_plan: learningPlan,
          strong_areas: strongAreas,
          weak_areas: weakAreas,
          confidence_score: (score / 100).toFixed(2)
        }, {
          onConflict: 'user_id,quiz_id'
        });

      if (dbError) {
        console.error('[AI/analyze-quiz] Database error saving insights:', dbError);
        // Don't fail the request, return analysis even if DB save fails
      } else {
        console.log(`[AI/analyze-quiz] Insights saved for user ${userId}`);
      }
    } catch (dbError) {
      console.error('[AI/analyze-quiz] Database error:', dbError);
      // Continue anyway - return the analysis
    }

    // ========== RETURN RESPONSE ==========

    res.json({
      userId,
      quizId,
      topic,
      summary: summary,
      strongAreas: strongAreas,
      weakAreas: weakAreas,
      recommendation: recommendation,
      recommendedTopics: recommendedTopics,
      difficulty_adjustment: difficultyAdjustment,
      learning_plan: learningPlan,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AI/analyze-quiz] Error analyzing quiz:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/ai/insights/:userId/:quizId
 * Retrieve saved AI insights for a specific quiz
 */
router.get('/insights/:userId/:quizId', async (req, res) => {
  try {
    const { userId, quizId } = req.params;
    const parsedUserId = parseInt(userId);

    if (isNaN(parsedUserId)) {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    const { supabase } = require('../database');

    const { data, error } = await supabase
      .from('ai_learning_insights')
      .select('*')
      .eq('user_id', parsedUserId)
      .eq('quiz_id', quizId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Insights not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('[AI/insights] Error fetching insights:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/ai/insights/:userId?limit=5
 * Get recent AI insights for user (last N quizzes)
 */
router.get('/insights/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 5 } = req.query;
    const parsedUserId = parseInt(userId);

    if (isNaN(parsedUserId)) {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    const { supabase } = require('../database');

    const { data, error } = await supabase
      .from('ai_learning_insights')
      .select('*')
      .eq('user_id', parsedUserId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error || !data) {
      return res.json({ insights: [] });
    }

    res.json({ insights: data });
  } catch (error) {
    console.error('[AI/insights] Error fetching recent insights:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

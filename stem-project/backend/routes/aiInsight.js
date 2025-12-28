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
      const completion = await openai.chat.completions.create({
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
        max_tokens: 1200,
        timeout: 8000
      });

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

module.exports = router;

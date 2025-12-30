/**
 * AI Coach Route
 * Interactive AI assistant that answers questions about quiz results
 * Uses OpenAI to generate contextual responses based on student performance
 */

const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
require('dotenv').config();

// Initialize OpenAI client
let openai = null;
try {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEYS?.split(',')[0];
  if (apiKey && apiKey.trim()) {
    openai = new OpenAI({ apiKey });
  } else {
    console.warn('[AICoach] OpenAI API key not configured');
  }
} catch (err) {
  console.warn('[AICoach] Failed to initialize OpenAI:', err.message);
}

/**
 * POST /api/ai/coach
 * Answer student questions about their quiz results
 * Body: { question, quizResult, analysisData }
 */
router.post('/coach', async (req, res) => {
  try {
    const { question, quizResult = {}, analysisData = {} } = req.body;

    // Validate input
    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        error: 'Vui lòng cung cấp câu hỏi'
      });
    }

    if (!openai) {
      console.warn('[AICoach] OpenAI not available, using fallback');
      const fallbackAnswer = generateFallbackResponse(question, quizResult, analysisData);
      return res.status(200).json({
        answer: fallbackAnswer,
        source: 'fallback'
      });
    }

    // Build context from quiz result
    const context = buildContext(quizResult, analysisData);

    // Generate prompt for OpenAI
    const systemPrompt = `Bạn là một trợ lý học tập AI chuyên hỗ trợ học sinh cải thiện kết quả học tập. 
Phân tích kết quả kiểm tra của học sinh và trả lời các câu hỏi bằng tiếng Việt.
Hãy:
1. Đưa ra lời khuyên cụ thể dựa trên dữ liệu hiệu suất thực tế
2. Giải thích tại sao học sinh sai ở những điểm nhất định
3. Đề xuất các bước hành động cụ thể để cải thiện
4. Khuyến khích và động viên học sinh

Luôn tập trung vào giáo dục và cải thiện kết quả học tập.`;

    const userPrompt = `Dữ liệu kết quả kiểm tra của học sinh:
${context}

Câu hỏi của học sinh: "${question}"

Vui lòng trả lời bằng tiếng Việt, cụ thể và hữu ích.`;

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const answer = response.choices[0]?.message?.content || 'Không thể xử lý câu hỏi của bạn.';

    return res.status(200).json({
      answer,
      source: 'openai'
    });
  } catch (err) {
    console.error('[AICoach] Error:', err);

    // Fallback response
    const fallback = generateFallbackResponse(
      req.body?.question || '',
      req.body?.quizResult || {},
      req.body?.analysisData || {}
    );

    return res.status(200).json({
      answer: fallback,
      source: 'fallback',
      note: 'OpenAI không khả dụng, sử dụng phản hồi dự phòng'
    });
  }
});

/**
 * Build context string from quiz result and analysis data
 */
function buildContext(quizResult, analysisData) {
  const parts = [];

  // Overall score
  if (quizResult.score !== undefined) {
    parts.push(`Điểm số: ${quizResult.score}/10`);
  }

  // Weak areas
  if (quizResult.weakAreas && Array.isArray(quizResult.weakAreas)) {
    const weakTopics = quizResult.weakAreas.slice(0, 5).map(w => {
      if (typeof w === 'string') return w;
      return `${w.topic} (${w.percentage || 0}% sai)`;
    }).join(', ');
    if (weakTopics) {
      parts.push(`Điểm yếu chính: ${weakTopics}`);
    }
  }

  // Strong areas
  if (quizResult.strongAreas && Array.isArray(quizResult.strongAreas)) {
    const strongTopics = quizResult.strongAreas.slice(0, 3).join(', ');
    if (strongTopics) {
      parts.push(`Điểm mạnh: ${strongTopics}`);
    }
  }

  // Answer comparison data
  if (quizResult.answerComparison && Array.isArray(quizResult.answerComparison)) {
    const correctCount = quizResult.answerComparison.filter(a => a.isCorrect).length;
    const totalCount = quizResult.answerComparison.length;
    parts.push(`Số câu đúng: ${correctCount}/${totalCount}`);

    // Include some wrong answer details
    const wrongAnswers = quizResult.answerComparison
      .filter(a => !a.isCorrect)
      .slice(0, 3);
    if (wrongAnswers.length > 0) {
      const details = wrongAnswers.map(a => {
        return `Câu ${a.questionId}: ${a.question?.substring(0, 60)}... (Trả lời: ${a.userAnswer?.substring(0, 30)}, Đúng: ${a.correctAnswer?.substring(0, 30)})`;
      }).join('; ');
      parts.push(`Chi tiết lỗi: ${details}`);
    }
  }

  // Analysis data
  if (analysisData.performance) {
    if (analysisData.performance.overallScore !== undefined) {
      parts.push(`Điểm phân tích: ${analysisData.performance.overallScore.toFixed(1)}/100`);
    }
  }

  if (analysisData.weaknesses) {
    if (analysisData.weaknesses.patterns?.conceptualGaps) {
      const gaps = analysisData.weaknesses.patterns.conceptualGaps.slice(0, 3);
      if (gaps.length > 0) {
        const gapText = gaps.map(g => `${g.concept} (${g.severity})`).join(', ');
        parts.push(`Lỗi khái niệm: ${gapText}`);
      }
    }
  }

  return parts.join('\n') || 'Không có dữ liệu kết quả kiểm tra.';
}

/**
 * Generate fallback response when OpenAI is unavailable
 */
function generateFallbackResponse(question, quizResult, analysisData) {
  const lowerQ = question.toLowerCase();
  
  // Extract score
  const score = quizResult.score || 0;
  
  // Weak areas
  const weakAreas = quizResult.weakAreas || [];
  const weakTopics = Array.isArray(weakAreas) 
    ? weakAreas.map(w => typeof w === 'string' ? w : w.topic).join(', ')
    : '';

  // Generate response based on question
  if (lowerQ.includes('yếu') || lowerQ.includes('sai') || lowerQ.includes('lỗi')) {
    if (weakTopics) {
      return `📌 Điểm yếu chính của bạn:\n• ${weakTopics}\n\n💡 Gợi ý: Hãy ôn lại những khái niệm cơ bản trong các chủ đề này và làm thêm bài tập thực hành.`;
    }
    return '✅ Bạn không có điểm yếu nào đáng kể! Tiếp tục phát huy.';
  }

  if (lowerQ.includes('tốt') || lowerQ.includes('mạnh') || lowerQ.includes('giỏi')) {
    if (score >= 8) {
      return `🌟 Rất tốt! Bạn đã đạt ${score}/10. Hãy tiếp tục giữ vững và cải thiện những khía cạnh còn lại.`;
    } else if (score >= 6) {
      return `👍 Bạn đã có tiến bộ với điểm ${score}/10. Còn một chút nữa là sẽ đạt mục tiêu. Hãy tiếp tục cố gắng!`;
    }
    return `💪 Không sao, bạn mới bắt đầu với điểm ${score}/10. Mỗi bài tập đều giúp bạn tiến bộ!`;
  }

  if (lowerQ.includes('làm') || lowerQ.includes('cải thiện') || lowerQ.includes('học')) {
    return `📚 Để cải thiện kết quả:\n1. Ôn lại lý thuyết cơ bản\n2. Làm thêm bài tập tương tự\n3. Xem lại những câu sai\n4. Hỏi thầy cô hoặc bạn bè\n\nHãy dành ít nhất 30 phút mỗi ngày ôn luyện để thấy hiệu quả!`;
  }

  if (lowerQ.includes('kế hoạch') || lowerQ.includes('lộ trình')) {
    return `📅 Kế hoạch học tập:\nNgày 1-2: Ôn lại lý thuyết cơ bản (${weakTopics || 'các chủ đề yếu'})\nNgày 3-4: Làm bài tập thực hành\nNgày 5: Kiểm tra lại bằng bài tập tương tự\n\nHãy theo kế hoạch này và kiểm tra tiến độ!`;
  }

  // Default response
  return `Hi! 👋 Tôi là AI Coach, trợ lý học tập của bạn. Dựa trên kết quả bài kiểm tra (${score}/10), tôi có thể giúp bạn:\n• Phân tích điểm yếu\n• Đề xuất cách cải thiện\n• Tạo kế hoạch học tập\n\nHãy hỏi một câu hỏi cụ thể để tôi có thể giúp tốt hơn!`;
}

module.exports = router;

/**
 * AI Coach Route
 * Interactive AI assistant that answers questions about quiz results
 * Uses OpenAI to generate contextual responses based on student performance
 */

const express = require('express');
const router = express.Router();

// Properly handle OpenAI import (works with both module formats)
let OpenAI;
try {
  const openaiModule = require('openai');
  OpenAI = openaiModule.default || openaiModule;
  if (typeof OpenAI !== 'function' && openaiModule.OpenAI) {
    OpenAI = openaiModule.OpenAI;
  }
  console.log('[AICoach] ✓ OpenAI module loaded successfully');
} catch (err) {
  console.error('[AICoach] ✗ Failed to load OpenAI module:', err.message);
  OpenAI = null;
}

require('dotenv').config();

// Initialize OpenAI client
let openai = null;
if (OpenAI) {
  try {
    const apiKey = process.env.OPENAI_API_KEY || (process.env.OPENAI_API_KEYS ? process.env.OPENAI_API_KEYS.split(',')[0] : null);
    console.log('[AICoach] Attempting to initialize OpenAI with key:', apiKey ? `${apiKey.substring(0, 20)}...` : 'NO_KEY');
    if (apiKey && apiKey.trim()) {
      openai = new OpenAI({ 
        apiKey: apiKey.trim(),
        timeout: 30000
      });
      console.log('[AICoach] ✓ OpenAI client initialized successfully');
    } else {
      console.warn('[AICoach] ⚠ OpenAI API key not configured - check OPENAI_API_KEY environment variable');
    }
  } catch (err) {
    console.error('[AICoach] ✗ Failed to initialize OpenAI client:', err.message);
    console.error('[AICoach] Stack trace:', err.stack);
  }
} else {
  console.warn('[AICoach] ⚠ OpenAI module not loaded - fallback responses will be used');
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
      console.warn('[AICoach] OpenAI not available (client is null), using fallback');
      const fallbackAnswer = generateFallbackResponse(question, quizResult, analysisData);
      return res.status(200).json({
        answer: fallbackAnswer,
        source: 'fallback',
        reason: 'OpenAI client not initialized'
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

    console.log('[AICoach] Calling OpenAI API...');
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

    console.log('[AICoach] ✓ OpenAI response successful');
    return res.status(200).json({
      answer,
      source: 'openai'
    });
  } catch (err) {
    console.error('[AICoach] ✗ OpenAI API error:', err.message);
    console.error('[AICoach] Error details:', {
      code: err.code,
      status: err.status,
      type: err.type
    });

    // Fallback response
    const fallback = generateFallbackResponse(
      req.body?.question || '',
      req.body?.quizResult || {},
      req.body?.analysisData || {}
    );

    return res.status(200).json({
      answer: fallback,
      source: 'fallback',
      note: 'OpenAI không khả dụng, sử dụng phản hồi dự phòng',
      error: err.message
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
    ? weakAreas.map(w => typeof w === 'string' ? w : w.topic).filter(t => t).join(', ')
    : '';

  // Generate response based on question
  if (lowerQ.includes('yếu') || lowerQ.includes('sai') || lowerQ.includes('lỗi')) {
    if (weakTopics) {
      return `📌 Điểm yếu chính của bạn:\n• ${weakTopics}\n\n💡 Gợi ý để cải thiện:\n1. Ôn lại những khái niệm cơ bản của các chủ đề này\n2. Làm thêm bài tập thực hành từng dạng\n3. So sánh câu trả lời của bạn với đáp án để hiểu lỗi\n4. Yêu cầu giáo viên giải thích những phần khó\n5. Luyện tập thường xuyên để nắm vững kiến thức`;
    }
    return '✅ Bạn không có điểm yếu nào đáng kể! Tiếp tục phát huy và nâng cao trình độ hơn nữa.';
  }

  if (lowerQ.includes('tốt') || lowerQ.includes('mạnh') || lowerQ.includes('giỏi') || lowerQ.includes('xuất sắc')) {
    if (score >= 8) {
      return `🌟 Rất tốt! Bạn đã đạt ${score}/10. Kết quả này chứng tỏ bạn nắm vững kiến thức. Hãy:\n• Tiếp tục ôn luyện để giữ vững kết quả\n• Thử thách bản thân với các bài tập nâng cao\n• Giúp các bạn khác học hỏi để sâu sắc hóa kiến thức`;
    } else if (score >= 6) {
      return `👍 Bạn đã có tiến bộ với điểm ${score}/10! Đó là một dấu hiệu tốt. Để tiến bộ hơn:\n• Tập trung vào các chủ đề yếu\n• Làm bài tập đa dạng\n• Không từ bỏ, cứ tiếp tục cố gắng`;
    }
    return `💪 Bạn mới bắt đầu với điểm ${score}/10. Mỗi bài tập đều giúp bạn tiến bộ. Hãy:\n• Bắt đầu từ những bài cơ bản\n• Làm bài tập thường xuyên\n• Yêu cầu sự hỗ trợ khi cần thiết`;
  }

  if (lowerQ.includes('làm sao') || lowerQ.includes('cách') || lowerQ.includes('cải thiện') || lowerQ.includes('học')) {
    return `📚 Để cải thiện kết quả của bạn:\n\n🎯 Chiến lược học tập:\n1. Ôn lại lý thuyết cơ bản mỗi ngày\n2. Làm bài tập thực hành từ dễ đến khó\n3. Xem lại những câu sai để hiểu sai lầm\n4. Luyện tập các dạng bài tương tự\n5. Kiểm tra lại bằng đề thi mô phỏng\n\n⏱️ Lập kế hoạch:\n• Dành 30-60 phút mỗi ngày ôn luyện\n• Chia thành các phần nhỏ (20 phút ôn lý thuyết + 40 phút bài tập)\n• Kiểm tra tiến độ mỗi tuần\n\nBạn sẽ thấy hiệu quả nếu kiên trì!`;
  }

  if (lowerQ.includes('kế hoạch') || lowerQ.includes('lộ trình') || lowerQ.includes('nên') || lowerQ.includes('tiếp')) {
    const topics = weakTopics || 'các chủ đề yếu';
    return `📅 Lộ trình học tập gợi ý (4 tuần):\n\n**Tuần 1:** Ôn lại lý thuyết cơ bản (${topics})\n• Đọc lại sách giáo khoa\n• Ghi chú những định nghĩa và công thức\n• Xem video giải thích nếu có\n\n**Tuần 2:** Làm bài tập thực hành\n• Bắt đầu với bài tập dễ\n• Tăng độ khó dần dần\n• Ghi chú những phần khó\n\n**Tuần 3:** Kiểm tra và cải thiện\n• Làm bài kiểm tra thử\n• Phân tích những câu sai\n• Ôn lại những phần còn yếu\n\n**Tuần 4:** Ôn tập tổng hợp\n• Làm đề thi mô phỏng\n• Đảm bảo nắm vững tất cả kiến thức\n• Tự tin cho bài kiểm tra tiếp theo\n\nHãy theo kế hoạch này một cách nghiêm túc để đạt kết quả tốt nhất!`;
  }

  if (lowerQ.includes('mục tiêu') || lowerQ.includes('mong muốn')) {
    return `🎯 Thiết lập mục tiêu học tập:\n\n1. **Mục tiêu ngắn hạn** (1-2 tuần):\n   • Nâng điểm từ ${score}/10 lên ${Math.min(score + 1, 10)}/10\n   • Hiểu rõ những khái niệm cơ bản\n\n2. **Mục tiêu trung hạn** (1 tháng):\n   • Đạt điểm 8/10 hoặc cao hơn\n   • Nắm chắc tất cả chủ đề\n\n3. **Mục tiêu dài hạn** (1 học kì):\n   • Duy trì điểm cao\n   • Nắm vững nền tảng cho năm học tiếp theo\n\nMỗi mục tiêu cần có kế hoạch cụ thể và theo dõi thường xuyên!`;
  }

  // Default response - comprehensive fallback
  return `👋 Xin chào! Tôi là AI Coach - trợ lý học tập của bạn.\n\n📊 Thông tin từ bài kiểm tra:\n• Điểm hiện tại: ${score}/10\n${weakTopics ? `• Điểm yếu: ${weakTopics}` : ''}\n\n❓ Bạn có thể hỏi tôi về:\n• Điểm yếu và cách cải thiện\n• Lộ trình học tập phù hợp\n• Kế hoạch ôn luyện chi tiết\n• Các mẹo và chiến lược học tập\n• Mục tiêu và động lực học tập\n\n💡 Hãy hỏi một câu hỏi cụ thể để tôi có thể giúp bạn tốt nhất! Ví dụ: "Làm sao để cải thiện?", "Tôi yếu chỗ nào?", "Nên học thế nào?"`;
}

module.exports = router;

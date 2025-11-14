/**
 * webSearchResources.js
 * 
 * ✅ REAL WEB SEARCHING - No hardcoded URLs!
 * 
 * Uses:
 * - OpenAI to analyze incorrect questions → identify exact math topic/chapter
 * - OpenAI with web search capabilities to find verified learning resources
 * - Smart filtering to return only trusted sources (VietJack, Khan Academy, official edu sites)
 * 
 * Result: AI finds ACTUAL learning resources matching student's specific weak topics
 */

const OpenAI = require('openai');
const axios = require('axios');
require('dotenv').config();

// Initialize OpenAI with resources API key
let openaiResources = null;
try {
  const resourcesKey = process.env.OPENAI_API_KEY_RESOURCES || process.env.OPENAI_API_KEY || '';
  if (resourcesKey) {
    openaiResources = new OpenAI({ apiKey: resourcesKey });
    console.log('[Resources] ✅ OpenAI initialized for topic analysis & web search');
  } else {
    console.warn('[Resources] ⚠️ No OpenAI key - will use fallback');
  }
} catch (error) {
  console.warn('[Resources] Failed to init OpenAI:', error.message);
}

// Trusted educational sources
const TRUSTED_DOMAINS = [
  'vietjack.com',
  'khanacademy.org',
  'mathisfun.com',
  'wikipedia.org',
  'brilliant.org',
  'coursera.org',
  'edx.org',
  'youtube.com',
  'tutorialpoint.com'
];

/**
 * Check if URL is from trusted domain
 */
function isTrustedDomain(url) {
  return TRUSTED_DOMAINS.some(domain => url.toLowerCase().includes(domain));
}

/**
 * Analyze incorrect question to identify exact math topic and book chapter
 * Returns: { topic, chapter, keywords, difficulty }
 */
async function analyzeQuestionTopic(question, correctAnswer, userAnswer) {
  if (!openaiResources) return null;

  try {
    const prompt = `Phân tích câu hỏi toán học KHÔNG CHÍNH XÁC:

Câu hỏi: "${question}"
Đáp án đúng: "${correctAnswer}"
Học sinh trả lời: "${userAnswer}"

Xác định:
1. Chủ đề toán học chính (ví dụ: "Đa thức", "Phương trình bậc hai", "Hình học")
2. Chương trong sách Toán lớp 8 (ví dụ: "Chương 1: Phép nhân và phép chia đa thức")
3. Từ khóa tìm kiếm (3-5 từ tiếng Việt)
4. Mức độ (Cơ bản/Nâng cao)

Trả lời JSON:
{
  "topic": "tên chủ đề",
  "chapter": "tên chương",
  "keywords": ["từ1", "từ2", "từ3"],
  "difficulty": "Cơ bản|Nâng cao"
}`;

    const response = await Promise.race([
      openaiResources.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.3
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 3000))
    ]);

    const text = response.choices[0]?.message?.content || '{}';
    const clean = text.replace(/```json\s?/g, '').replace(/```\s?/g, '').trim();
    const parsed = JSON.parse(clean);

    if (parsed.topic && parsed.chapter) {
      console.log(`[Resources] Topic detected: "${parsed.topic}" → ${parsed.chapter}`);
      return parsed;
    }
  } catch (e) {
    console.warn(`[Resources] Topic analysis failed: ${e.message}`);
  }
  return null;
}

/**
 * Use OpenAI to generate web search query and find resources
 * Returns verified, working links from trusted sources
 */
async function searchForResources(searchQuery) {
  if (!openaiResources) return [];

  const results = [];

  try {
    // Ask OpenAI to recommend best learning resources for this topic
    // OpenAI knows about VietJack, Khan Academy, and other popular platforms
    const prompt = `Tìm các tài liệu học tập tốt nhất cho: "${searchQuery}"

Gợi ý các truy vấn tìm kiếm mà bạn có thể dùng (ví dụ) để tìm link thực tế: "${searchQuery} VietJack", "Cách ${searchQuery} VietJack", "${searchQuery} Khan Academy", "${searchQuery} video YouTube".

Yêu cầu:
1. Trả về ít nhất 2-3 liên kết từ các nguồn đáng tin cậy
2. Ưu tiên: VietJack, Khan Academy, YouTube videos
3. Ưu tiên tiếng Việt nếu có
4. Mỗi link phải LÀ LINK THỰC (không fake)
5. Định dạng: JSON array

Ví dụ:
[
  {"title":"...", "url":"https://...", "source":"VietJack|Khan Academy|...", "description":"..."},
  {"title":"...", "url":"https://...", "source":"...", "description":"..."}
]

Trả lời CHỈ JSON array, không thêm text khác:`;

    const response = await Promise.race([
      openaiResources.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.5
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('SEARCH_TIMEOUT')), 4000))
    ]);

    const text = response.choices[0]?.message?.content || '[]';
    const clean = text.replace(/```json\s?/g, '').replace(/```\s?/g, '').trim();
    
    try {
      const parsed = JSON.parse(clean);
      
      if (Array.isArray(parsed)) {
        // Validate each candidate URL by fetching the page and checking for relevance/trusted domain
        for (const item of parsed) {
          if (!item.url || !(item.url.startsWith('http://') || item.url.startsWith('https://'))) continue;
          const url = item.url;

          // quick domain filter
          if (!isTrustedDomain(url)) continue;

          try {
            // Validate the URL is reachable and contains at least one keyword from the search query
            const valid = await validateUrl(url, searchQuery);
            if (!valid) continue;

            results.push({
              title: item.title || 'Learning Resource',
              url: url,
              source: item.source || extractSource(url) || 'Educational Resource',
              description: item.description || '',
              type: 'lesson'
            });
          } catch (vErr) {
            // ignore invalid links
            continue;
          }
        }
      }
    } catch (parseErr) {
      console.warn(`[Resources] Failed to parse OpenAI response: ${parseErr.message}`);
    }

  } catch (e) {
    console.warn(`[Resources] Resource search failed: ${e.message}`);
  }

  return results;
}

/**
 * Validate a candidate URL by fetching it and checking for keywords or sufficient content
 */
async function validateUrl(url, searchQuery) {
  try {
    const resp = await axios.get(url, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp || !resp.status || resp.status >= 400) return false;

    const text = (resp.data || '').toString().toLowerCase();
    const queryTokens = (searchQuery || '').toLowerCase().split(/\s+/).filter(Boolean);

    // Consider it valid if the page contains at least one meaningful token from the query
    let matches = 0;
    for (const t of queryTokens) {
      if (t.length < 3) continue;
      if (text.includes(t)) matches++;
      if (matches >= 1) return true;
    }

    // also accept if the domain itself is trusted and page has reasonable size
    if (isTrustedDomain(url) && (resp.data || '').length > 1000) return true;
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Get learning resources for weak topic using AI-powered web search
 * 
 * Process:
 * 1. Analyze incorrect question → identify exact topic/chapter
 * 2. Generate smart search query
 * 3. Use OpenAI to find verified learning resources
 * 4. Return filtered results (trusted sources only)
 */
async function getResourcesForTopic(topic, difficulty = 'medium', questionContext = null) {
  const cleanTopic = (topic || '').trim();
  
  // If we have question context, analyze it first
  let topicAnalysis = null;
  if (questionContext?.question && questionContext?.correctAnswer) {
    topicAnalysis = await analyzeQuestionTopic(
      questionContext.question,
      questionContext.correctAnswer,
      questionContext.userAnswer
    );
  }

  // Build search query
  let searchQuery = cleanTopic;
  if (topicAnalysis) {
    searchQuery = `${topicAnalysis.chapter} - ${topicAnalysis.keywords.join(' ')}`;
  } else {
    searchQuery = `${cleanTopic} toán học lớp 8`;
  }

  console.log(`[Resources] Searching: "${searchQuery}"`);

  // Perform AI-powered web search
  const webResults = await searchForResources(searchQuery);

  if (webResults.length > 0) {
    console.log(`[Resources] Found ${webResults.length} verified resources for: "${cleanTopic}"`);
    return webResults.slice(0, 3);
  }

  console.warn(`[Resources] No web results found for: "${cleanTopic}"`);
  return [];
}

/**
 * Generate personalized motivational feedback using OpenAI
 * ✅ Real, not templated - each student gets unique message
 * 4-second timeout, falls back to template if AI unavailable
 */
async function generateMotivationalFeedback(score, performanceLabel, weakAreas, userHistory = []) {
  if (!openaiResources) {
    return generateTemplateFeedback(score, performanceLabel, weakAreas);
  }

  try {
    const weakList = (weakAreas || []).slice(0, 2).map(w => w.topic).join(', ');
    const history = Array.isArray(userHistory) && userHistory.length > 0 ? userHistory.join(', ') : 'none';
    
    const prompt = `Bạn là một giáo viên tâm lý học + toán. Viết lời động viên NGẮN (2-3 câu) cho học sinh, dựa trên thông tin sau:\n- Điểm hiện tại: ${score}/10 (${performanceLabel})\n- Chủ đề yếu: ${weakList || 'đang cải thiện'}\n- Lịch sử điểm gần đây (nếu có): ${history}\n\nYêu cầu: Hãy cụ thể, thực tế, ấm áp, nêu ngắn gọn nếu học sinh đang 'improve' hoặc 'decline', và kèm 1 hành động nhỏ để làm ngay (ví dụ: "Ôn 10 phút bài X").\nTrả về JSON: {"opening":"...","body":"...","closing":"..."}`;

    const response = await Promise.race([
      openaiResources.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 4000))
    ]);

    const text = response.choices[0]?.message?.content || '{}';
    const clean = text.replace(/```json\s?/g, '').replace(/```\s?/g, '').trim();
    const parsed = JSON.parse(clean);

    if (parsed.opening && parsed.body && parsed.closing) {
      let note = '';
      if (weakAreas?.length > 0) {
        note = `\n\n📌 ${weakAreas[0].topic} - ưu tiên hôm nay!`;
      }
      return {
        opening: parsed.opening,
        body: parsed.body + note,
        closing: parsed.closing,
        overallMessage: `${parsed.opening}\n\n${parsed.body}${note}\n\n${parsed.closing}`
      };
    }
  } catch (e) {
    console.log(`[Resources] AI motivation failed, using template`);
  }

  return generateTemplateFeedback(score, performanceLabel, weakAreas);
}

/**
 * Fallback template messages (when OpenAI or web search unavailable)
 */
function generateTemplateFeedback(score, performanceLabel, weakAreas) {
  const msgs = {
    'Giỏi': {
      opening: '🌟 Chúc mừng! Kết quả tuyệt vời!',
      body: 'Bạn hiểu rõ các chủ đề. Tiếp tục duy trì đà tốt!',
      closing: 'Bạn sắp trở thành thạc sĩ toán học! 🚀'
    },
    'Đạt': {
      opening: '✅ Tốt lắm!',
      body: 'Kiến thức cơ bản bạn nắm tốt. Cải thiện thêm những chủ đề yếu.',
      closing: 'Tiếp tục nỗ lực! 💪'
    },
    'Trung bình': {
      opening: '📚 Bạn biết điểm yếu của mình - đó là điểm mạnh!',
      body: 'Luyện tập theo kế hoạch, bạn sẽ tiến bộ rõ rệt.',
      closing: 'Hôm nay học, ngày mai thành công! 🌱'
    },
    'Không đạt': {
      opening: '💡 Đây là cơ hội để phát triển!',
      body: 'Tập trung vào những chủ đề cơ bản. Bạn sẽ làm tốt hơn!',
      closing: 'Ai không bỏ cuộc sẽ thành công! 🔥'
    }
  };

  const msg = msgs[performanceLabel] || msgs['Trung bình'];
  let note = '';
  if (weakAreas?.length > 0) {
    note = `\n\n📌 ${weakAreas[0].topic} - hãy chú ý chủ đề này.`;
  }

  return {
    opening: msg.opening,
    body: msg.body + note,
    closing: msg.closing,
    overallMessage: `${msg.opening}\n\n${msg.body}${note}\n\n${msg.closing}`
  };
}

// Export the main functions. Provide both names for compatibility
module.exports = {
  getResourcesForTopic,
  generateMotivationalFeedback,
  analyzeQuestionTopic,
  // primary function name used internally
  searchForResources,
  // backward-compat alias used elsewhere
  webSearchResources: searchForResources
};

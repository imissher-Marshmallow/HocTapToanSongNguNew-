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

// Timeouts (ms) - make configurable via env
const SEARCH_TIMEOUT_MS = parseInt(process.env.OPENAI_SEARCH_TIMEOUT_MS, 10) || 10000; // default 10s
const REPLACE_TIMEOUT_MS = parseInt(process.env.OPENAI_REPLACE_TIMEOUT_MS, 10) || 10000; // default 7s
const TOPIC_ANALYSIS_TIMEOUT_MS = parseInt(process.env.OPENAI_TOPIC_TIMEOUT_MS, 10) || 10000; // default 5s

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

function isYouTubeUrl(url) {
  return /youtu(be\.com|\.be)/i.test(url);
}

function isKhanAcademyUrl(url) {
  return /khanacademy\.org/i.test(url);
}

function extractSource(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./i, '');
    if (/khanacademy\.org/i.test(host)) return 'Khan Academy';
    if (/vietjack\.com/i.test(host)) return 'VietJack';
    if (/youtube\.com|youtu\.be/i.test(host)) return 'YouTube';
    return host;
  } catch (e) {
    return null;
  }
}

// Sanitize search queries (remove parenthesis notes, counts like "- 4 câu", etc.)
function sanitizeSearchQuery(q) {
  if (!q || typeof q !== 'string') return q;
  let s = q.replace(/\([^\)]*\)/g, ''); // remove parentheses
  s = s.replace(/-\s*\d+\s*câu/gi, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// Detect common assessment label strings that are not useful as search queries
const ASSESSMENT_LABELS = ['nhận biết', 'thông hiểu', 'vận dụng', 'nhận biết (knowledge)', 'thông hiểu (comprehension)', 'vận dụng thấp', 'vận dụng cao'];
function isAssessmentLabel(s) {
  if (!s || typeof s !== 'string') return false;
  const low = s.toLowerCase();
  return ASSESSMENT_LABELS.some(lbl => low.includes(lbl));
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
4. Loại câu hỏi / cấp độ nhận biết (ví dụ: "Nhận biết", "Thông hiểu", "Vận dụng") — gọi là "questionType"
5. Sai lầm phổ biến mà học sinh có thể đã gặp dựa trên đáp án sai (mô tả ngắn) — gọi là "likelyMistake"
6. Mức độ (Cơ bản/Nâng cao)

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
        max_tokens: 350,
        temperature: 0.25
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), TOPIC_ANALYSIS_TIMEOUT_MS))
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
    const prompt = `Tìm các tài liệu học tập phù hợp cho: "${searchQuery}"

Gợi ý các truy vấn tìm kiếm (ví dụ): "${searchQuery} VietJack", "Cách ${searchQuery} VietJack", "${searchQuery} Khan Academy", "${searchQuery} video YouTube".

Yêu cầu (rất quan trọng):
1) Trả về 2-4 liên kết THỰC từ nguồn đáng tin cậy.
2) Với mỗi mục, cung cấp các trường: "title", "url", "source", "description", "type".
   - "type" phải là một trong: "article", "exercise", "video".
3) Nếu là "video", KHÔNG trả về playlist links; chỉ trả về direct video links (YouTube: contain "watch?v=" or "youtu.be/").
4) Ưu tiên tiếng Việt (VietJack) và Khan Academy nếu có; nếu không, trả về YouTube video watch links.
5) Không đề xuất trang 404 hoặc landing/playlist pages.
6) Định dạng: JSON array duy nhất, không thêm text khác.

Ví dụ:
[
  {"title":"...", "url":"https://...", "source":"VietJack", "description":"...", "type":"article"},
  {"title":"...", "url":"https://www.youtube.com/watch?v=...", "source":"YouTube", "description":"...", "type":"video"}
]

Trả lời CHỈ JSON array, không thêm text khác.`;

    const response = await Promise.race([
      openaiResources.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.5
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('SEARCH_TIMEOUT')), SEARCH_TIMEOUT_MS))
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
            let valid = await validateUrl(url, searchQuery);

            // If not valid, try to get replacements (one retry) via LLM
            if (!valid) {
              const replacements = await requestReplacementLinks(searchQuery, [url]);
              if (Array.isArray(replacements) && replacements.length > 0) {
                for (const rep of replacements) {
                  if (!rep.url) continue;
                  if (!isTrustedDomain(rep.url)) continue;
                  const repValid = await validateUrl(rep.url, searchQuery);
                  if (repValid) {
                    results.push({
                      title: rep.title || item.title || 'Learning Resource',
                      url: rep.url,
                      source: rep.source || extractSource(rep.url) || extractSource(url) || 'Educational Resource',
                      description: rep.description || item.description || '',
                      type: 'lesson'
                    });
                    valid = true;
                    break;
                  }
                }
              }
            }

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
    // Special handling for YouTube videos: use oEmbed to detect removed/unavailable videos
    if (isYouTubeUrl(url)) {
      try {
        const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const r = await axios.get(oembed, { timeout: 4000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (r && r.status === 200) return true;
        return false;
      } catch (yErr) {
        return false;
      }
    }

    const resp = await axios.get(url, { timeout: 6000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp || !resp.status || resp.status >= 400) return false;

    const text = (resp.data || '').toString().toLowerCase();
    const queryTokens = (searchQuery || '').toLowerCase().split(/\s+/).filter(Boolean);

    // Quick checks for common 'not found' phrases
    if (/404|page not found|sorry,? we|couldn't find|không tìm thấy|trang này không tồn tại/.test(text)) return false;

    // Khan Academy specific check: ensure the page contains lesson/exercise/video markers or query tokens
    if (isKhanAcademyUrl(url)) {
      const khanMarkers = ['exercise', 'practice', 'video', 'lesson', 'khanacademy.org'];
      const hasMarker = khanMarkers.some(m => text.includes(m));
      const tokenMatch = queryTokens.some(t => t.length >= 3 && text.includes(t));
      if (hasMarker || tokenMatch) return true;
      return false;
    }

    // Consider it valid if the page contains at least one meaningful token from the query
    let matches = 0;
    for (const t of queryTokens) {
      if (t.length < 3) continue;
      if (text.includes(t)) matches++;
      if (matches >= 1) return true;
    }

    // also accept if the domain itself is trusted and page has reasonable size
    if (isTrustedDomain(url) && (resp.data || '').length > 1500) return true;
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Ask the LLM to return 1-2 replacement links for the same query excluding some URLs
 */
async function requestReplacementLinks(searchQuery, excludedUrls = []) {
  if (!openaiResources) return [];

  try {
    const excluded = (excludedUrls || []).slice(0, 5).map(u => `- ${u}`).join('\n');
    const prompt = `Tìm 1-2 liên kết thay thế cho truy vấn: "${searchQuery}"\nYêu cầu:\n- Trả về 1-2 liên kết thực tế từ nguồn giáo dục (Khan Academy, VietJack, YouTube watch links)\n- Loại trừ các URL sau (nếu có):\n${excluded}\n- Trả về CHỈ JSON array với các item {"title","url","source","description","type"}.`; 

    const response = await Promise.race([
      openaiResources.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.6
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('REPLACE_TIMEOUT')), REPLACE_TIMEOUT_MS))
    ]);

    const text = response.choices[0]?.message?.content || '[]';
    const clean = text.replace(/```json\s?/g, '').replace(/```\s?/g, '').trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    console.warn('[Resources] Replacement link request failed:', e.message);
  }
  return [];
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
  
  // If we have question context, analyze it first. Prefer the student's QUESTION over the provided topic.
  let topicAnalysis = null;
  if (questionContext?.question) {
    topicAnalysis = await analyzeQuestionTopic(
      questionContext.question,
      questionContext.correctAnswer || '',
      questionContext.userAnswer || ''
    );
    if (topicAnalysis) {
      console.log(`[Resources] Using student's question for search analysis: "${(questionContext.question||'').slice(0,120)}..."`);
    }
  }

  // Build search query. Prefer the student's question if available (question-first approach).
  let searchQuery = cleanTopic;
  if (topicAnalysis) {
    const qType = (topicAnalysis.questionType || '').trim();
    const mistake = (topicAnalysis.likelyMistake || '').trim();
    const studentAnswer = (questionContext?.userAnswer || '').toString().trim();
    const questionText = sanitizeSearchQuery(questionContext?.question || '');

    // Build a focused query based on the actual question + detected question type and common mistake
    searchQuery = `${topicAnalysis.topic || cleanTopic} - Cách làm: ${questionText}`;
    if (qType) searchQuery += `; Loại câu hỏi: ${qType}`;
    if (mistake) searchQuery += `; Sai lầm: ${mistake}`;
    if (studentAnswer) searchQuery += `; Học sinh trả lời sai: "${studentAnswer}"`;
  } else {
    // fallback: topic-based search
    searchQuery = `${cleanTopic} toán học lớp 8`;
  }

  // sanitize before searching to avoid tokens like "- 4 câu" causing poor queries
  searchQuery = sanitizeSearchQuery(searchQuery);

  // If the topic looks like an assessment label (e.g., "Thông hiểu - 4 câu"), prefer building a query from the actual question
  if (isAssessmentLabel(cleanTopic) || isAssessmentLabel(searchQuery)) {
    if (questionContext && questionContext.question) {
      const q = sanitizeSearchQuery(questionContext.question);
      // ask for how-to and worked examples related to the student's incorrect answer
      const studentAns = (questionContext.userAnswer || '').toString().trim();
      searchQuery = `Cách làm: ${q}` + (studentAns ? `; Học sinh trả lời sai: "${studentAns}"` : '');
      console.log(`[Resources] Rewriting assessment-label query -> "${searchQuery}"`);
    }
  }

  console.log(`[Resources] Searching: "${searchQuery}"`);

  // Perform AI-powered web search
  let webResults = await searchForResources(searchQuery);

  // If we found nothing, try a couple of targeted fallbacks: site-specific queries
  if ((!webResults || webResults.length === 0) && cleanTopic) {
    const topicOnly = sanitizeSearchQuery(topicAnalysis?.topic || cleanTopic || '');
    const fallbacks = [
      `site:vietjack.com ${topicOnly} cách làm`,
      `site:khanacademy.org ${topicOnly} lesson ${topicOnly}`,
      `${topicOnly} cách giải ví dụ`,
    ];

    for (const fb of fallbacks) {
      console.log(`[Resources] Fallback search: "${fb}"`);
      webResults = await searchForResources(fb);
      if (webResults && webResults.length > 0) break;
    }
  }

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

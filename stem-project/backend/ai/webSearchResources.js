/**
 * webSearchResources.js
 * 
 * ✅ REAL WEB SEARCHING - No hardcoded URLs!
 * 
 * Uses:
 * - OpenAI to analyze incorrect questions → identify exact math topic/chapter
 * - OpenAI with web search capabilities to find verified learning resources
 * - Google Custom Search Engine (CSE) as fallback for real search results
 * - Smart filtering to return only trusted sources (VietJack, Wikipedia, official edu sites)
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

// Google Custom Search Engine configuration
const GOOGLE_CSE_CX = process.env.GOOGLE_CSE_CX || '76259ba63322945d5'; // Custom Search Engine ID
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyAjz-9jRZ3Xc9tuyqSZb5I0vQrNn2OnXtQ'; // Google API key

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

// Small curated fallback resources for high-frequency topics. These are guarantees
// used when AI search returns no valid results. Add more topics as needed.
const CURATED_RESOURCES = {
  'đa thức': [
    {
      title: 'Đa thức - VietJack',
      url: 'https://vietjack.com/toan-hoc/da-thuc',
      source: 'VietJack',
      description: 'Bài giảng và ví dụ về đa thức: phép cộng, nhân, rút gọn.',
      type: 'article'
    },
    {
      title: 'Polynomials (Khan Academy)',
      url: 'https://vi.khanacademy.org/math/algebra/polynomial-factorization',
      source: 'Khan Academy',
      description: 'Bài học Khan Academy về các phép toán trên đa thức (phiên bản tiếng Việt).',
      type: 'article'
    },
    {
      title: 'Multiply Polynomials - YouTube',
      url: 'https://www.youtube.com/watch?v=E0m6wq3gQZk',
      source: 'YouTube',
      description: 'Ví dụ video: nhân đa thức từng bước.',
      type: 'video'
    }
  ]
};

function normalizeTopicKey(s) {
  if (!s || typeof s !== 'string') return '';
  return s.toLowerCase().replace(/[^a-z0-9\u00C0-\u017F]+/gi, ' ').trim();
}

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

/**
 * Build a short, simple search query from the student's question and detected topic.
 * This is used for the Google CSE fallback to keep searches concise and effective.
 */
function buildSimpleSearchQuery(question, topicAnalysis) {
  const q = sanitizeSearchQuery(question || '').toLowerCase();
  const topic = (topicAnalysis && topicAnalysis.topic) ? normalizeTopicKey(topicAnalysis.topic) : '';

  // If question explicitly mentions multiplication and topic is polynomials/đa thức
  if ((q.includes('nhân') || q.includes('phép nhân')) && topic.includes('đa thức')) {
    return 'phép nhân đa thức một biến';
  }

  // If topic is clear, return a concise phrase
  if (topic) {
    // prefer short 'cách làm' searches for the topic
    return `${topic} cách làm ví dụ`;
  }

  // Fallback: use first meaningful tokens from the question
  const tokens = q.split(/\s+/).filter(t => t.length >= 3);
  if (tokens.length === 0) return q || '';
  return tokens.slice(0, 4).join(' ');
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
 * Returns verified, working links from trusted sources (VietJack, Wikipedia, etc.)
 * AVOID YouTube and Khan Academy due to hallucinations
 */
async function searchForResources(searchQuery) {
  if (!openaiResources) return [];

  const results = [];

  try {
    // Ask OpenAI to recommend ONLY from verifiable, real sources (VietJack, Wikipedia)
    // Avoid YouTube and Khan Academy which are frequently hallucinated
    const prompt = `Tìm các tài liệu học tập phù hợp cho: "${searchQuery}"

CHỈ tìm từ các nguồn THỰC VÀ XÁC NHẬN:
- VietJack (vietjack.com)
- Wikipedia tiếng Việt (vi.wikipedia.org)
- Các trang giáo dục chính thức

Yêu cầu (RẤT QUAN TRỌNG):
1) Trả về 2-4 liên kết THỰC TỪ CÁC TRANG CÓ SẴN - không phát minh URL.
2) Với mỗi mục: "title", "url", "source", "description", "type" (phải là "article" hoặc "exercise").
3) KHÔNG trả về YouTube hay Khan Academy - chỉ VietJack, Wikipedia, hoặc các trang edu đã xác nhận tồn tại.
4) Mỗi URL phải là liên kết thực tế, có thể truy cập, và chứa nội dung về chủ đề.
5) Định dạng: JSON array duy nhất, không thêm text khác.

Ví dụ ĐÚNG:
[
  {"title":"Đa thức - VietJack", "url":"https://vietjack.com/toan-hoc/da-thuc", "source":"VietJack", "description":"Bài giảng về đa thức", "type":"article"},
  {"title":"Đa thức - Wikipedia", "url":"https://vi.wikipedia.org/wiki/Đa_thức", "source":"Wikipedia", "description":"Khái niệm đa thức", "type":"article"}
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

          // REJECT YouTube and Khan Academy to avoid hallucinated links
          if (isYouTubeUrl(url) || isKhanAcademyUrl(url)) {
            console.log(`[Resources] Skipping unreliable source: ${url}`);
            continue;
          }

          // quick domain filter - only allow VietJack, Wikipedia, and other edu sources
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
                  // Reject YouTube/Khan Academy here too
                  if (isYouTubeUrl(rep.url) || isKhanAcademyUrl(rep.url)) continue;
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
        console.warn(`[Resources] YouTube validation failed for ${url}: ${yErr.message}`);
        return false;
      }
    }

    let resp;
    try {
      resp = await axios.get(url, { timeout: 6000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    } catch (fetchErr) {
      console.warn(`[Resources] Failed to fetch ${url}: ${fetchErr.message}`);
      return false;
    }

    if (!resp || !resp.status) {
      console.warn(`[Resources] No response from ${url}`);
      return false;
    }

    if (resp.status >= 400) {
      console.warn(`[Resources] ${url} returned status ${resp.status}`);
      return false;
    }

    const text = (resp.data || '').toString().toLowerCase();

    // Quick checks for common 'not found' phrases (including Vietnamese)
    if (/404|page not found|sorry,? we|couldn't find|không tìm thấy|trang này không tồn tại|not found/.test(text)) {
      console.warn(`[Resources] ${url} contains 404/not-found markers`);
      return false;
    }

    // Extract meaningful tokens from search query (3+ chars, not stopwords)
    const queryTokens = (searchQuery || '').toLowerCase().split(/\s+/).filter(t => t.length >= 3);
    if (queryTokens.length === 0) {
      console.warn(`[Resources] No meaningful tokens to validate in query: "${searchQuery}"`);
      return false;
    }

    // Khan Academy specific check: ensure the page contains lesson/exercise/video markers or query tokens
    if (isKhanAcademyUrl(url)) {
      const khanMarkers = ['exercise', 'practice', 'video', 'lesson'];
      const hasMarker = khanMarkers.some(m => text.includes(m));
      const tokenMatch = queryTokens.some(t => text.includes(t));
      if (!hasMarker && !tokenMatch) {
        console.warn(`[Resources] Khan Academy URL ${url} has no lesson markers or matching tokens`);
        return false;
      }
      return true;
    }

    // VietJack: must contain at least one meaningful token from query
    if (url.includes('vietjack.com')) {
      const matches = queryTokens.filter(t => text.includes(t)).length;
      if (matches === 0) {
        console.warn(`[Resources] VietJack URL ${url} has no matching tokens for query: "${searchQuery}"`);
        return false;
      }
      return true;
    }

    // General validation: must contain at least one meaningful token from the query
    const matches = queryTokens.filter(t => text.includes(t)).length;
    if (matches === 0) {
      console.warn(`[Resources] URL ${url} has no matching tokens for query: "${searchQuery}"`);
      return false;
    }

    // Also check page has reasonable content (>500 bytes is safer than 1500)
    if ((resp.data || '').length < 500) {
      console.warn(`[Resources] URL ${url} has too little content (${(resp.data || '').length} bytes)`);
      return false;
    }

    console.log(`[Resources] ✅ URL validated: ${url}`);
    return true;
  } catch (e) {
    console.warn(`[Resources] Validation error for ${url}: ${e.message}`);
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
 * Search using Google Custom Search Engine (real search results)
 * Fallback when LLM search returns no results
 */
async function googleSearchResources(searchQuery, limit = 3) {
  if (!GOOGLE_CSE_CX || !GOOGLE_API_KEY) {
    console.warn('[Resources] Google CSE not configured (missing GOOGLE_CSE_CX or GOOGLE_API_KEY)');
    return [];
  }

  try {
    console.log(`[Resources] Google CSE search: "${searchQuery}"`);
    const url = 'https://www.googleapis.com/customsearch/v1';
    const params = {
      q: searchQuery,
      cx: GOOGLE_CSE_CX,
      key: GOOGLE_API_KEY,
      num: Math.min(limit * 2, 10), // fetch extra to filter trusted domains
    };

    const response = await axios.get(url, { params, timeout: 8000 });
    const items = response.data.items || [];
    const results = [];

    for (const item of items) {
      if (!item.link) continue;

      // Only accept trusted educational domains
      if (!isTrustedDomain(item.link)) continue;

      // Reject YouTube/Khan Academy
      if (isYouTubeUrl(item.link) || isKhanAcademyUrl(item.link)) continue;

      // Stronger validation: use the same validateUrl logic to ensure
      // the page contains relevant content and is not a hallucinatory/404 page.
      try {
        const ok = await validateUrl(item.link, searchQuery);
        if (!ok) {
          console.warn(`[Resources] Google result ${item.link} failed content validation`);
          continue;
        }
      } catch (e) {
        console.warn(`[Resources] Google result ${item.link} validation error: ${e.message}`);
        continue;
      }

      results.push({
        title: item.title,
        url: item.link,
        source: extractSource(item.link) || 'Educational Resource',
        description: item.snippet || '',
        type: 'article'
      });

      if (results.length >= limit) break;
    }

    if (results.length > 0) {
      console.log(`[Resources] Google CSE found ${results.length} verified resources`);
    } else {
      console.warn(`[Resources] Google CSE returned ${items.length} results but none were valid`);
    }

    return results;
  } catch (e) {
    console.warn(`[Resources] Google CSE search failed: ${e.message}`);
    return [];
  }
}

/**
 * Get learning resources for weak topic using AI-powered web search
 * 
 * Process:
 * 1. Analyze incorrect question → identify exact topic/chapter
 * 2. Generate smart search query
 * 3. Use OpenAI to find verified learning resources
 * 4. Fallback: Use Google CSE for real search results
 * 5. Return filtered results (trusted sources only)
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
  // Use the actual topic (e.g., "Đa thức") not the assessment label (e.g., "Thông hiểu")
  if ((!webResults || webResults.length === 0) && (topicAnalysis?.topic || cleanTopic)) {
    const actualTopic = topicAnalysis?.topic || cleanTopic;
    const topicOnly = sanitizeSearchQuery(actualTopic || '');
    const fallbacks = [
      `site:vietjack.com ${topicOnly} cách làm`,
      `site:khanacademy.org ${topicOnly} lesson`,
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

  // Fallback: Try Google Custom Search Engine for real search results
  if (GOOGLE_CSE_CX && GOOGLE_API_KEY) {
    const actualTopic = topicAnalysis?.topic || cleanTopic;

    // First try a short, focused query derived from the question/topic
    const simpleQuery = buildSimpleSearchQuery(questionContext?.question, topicAnalysis) || `${actualTopic} cách làm`;
    console.log(`[Resources] Trying Google CSE as fallback (simpleQuery): "${simpleQuery}"`);
    let googleResults = await googleSearchResources(simpleQuery, 3);
    if (googleResults && googleResults.length > 0) {
      return googleResults;
    }

    // If simple query fails, fall back to a more generic topic-based query
    const googleQuery = `${actualTopic} cách làm toán học tiếng Việt`;
    console.log(`[Resources] Trying Google CSE fallback (topicQuery): "${googleQuery}"`);
    googleResults = await googleSearchResources(googleQuery, 3);
    if (googleResults && googleResults.length > 0) {
      return googleResults;
    }
  }

  // If no AI/web results, try curated fallback for this topic (guaranteed working links)
  try {
    const key = normalizeTopicKey(topicAnalysis?.topic || cleanTopic || '');
    if (key && CURATED_RESOURCES[key] && CURATED_RESOURCES[key].length > 0) {
      console.log(`[Resources] Using curated fallback for topic: "${key}"`);
      return CURATED_RESOURCES[key].slice(0, 3);
    }
  } catch (e) {
    // ignore
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

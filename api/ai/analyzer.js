const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Load questions data with require() fallback for Vercel bundling
let questionsData = null;
const questionsPath = (() => {
  const possiblePaths = [
    // PRIORITY 1: Try from /api directory (this file's location)
    path.join(__dirname, './data/questions_updated.json'),
    path.join(__dirname, '../../api/data/questions_updated.json'),
    // PRIORITY 2: Try from current working directory
    path.join(process.cwd(), 'api/data/questions_updated.json'),
    path.join(process.cwd(), './api/data/questions_updated.json'),
    // PRIORITY 3: Vercel root fallback
    path.join(process.cwd(), 'data/questions_updated.json'),
    path.join(process.cwd(), './data/questions_updated.json'),
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log('[API Analyzer] ✓ Using:', p);
      return p;
    }
  }
  
  console.error('[API Analyzer] ✗ File not found. Tried:', possiblePaths);
  
  // As a last resort, try to require() the data (works in Vercel if bundled)
  try {
    console.log('[API Analyzer] Attempting to require questions data as fallback...');
    questionsData = require('./data/questions_updated.json');
    console.log('[API Analyzer] Successfully loaded via require()');
    return null; // Signal that we loaded via require, not fs
  } catch (e) {
    console.error('[API Analyzer] Failed to require data:', e.message);
  }
  
  return possiblePaths[0];
})();

// Shuffle questions
function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// SIMPLE: Just use chapter ID and contest ID as numbers
function loadQuestions(chapterId, contestNum) {
  try {
    let data;
    
    // Use require'd data if available, otherwise read from file
    if (questionsData) {
      data = questionsData;
      console.log('[API] Using pre-loaded questions data (via require)');
    } else if (questionsPath && fs.existsSync(questionsPath)) {
      data = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
      console.log('[API] Using questions data from file:', questionsPath);
    } else {
      console.error('[API] Questions file does not exist at:', questionsPath, '| questionsData:', questionsData ? 'loaded' : 'null');
      return { error: 'Questions data not found' };
    }
    
    if (!data.chapters || !Array.isArray(data.chapters)) {
      console.error('[API] Error: No chapters array in file');
      return { error: 'File structure error' };
    }
    
    const chapter = data.chapters.find(c => c.id === chapterId);
    if (!chapter) {
      console.error(`[API] Chapter ${chapterId} not found`);
      return { error: `Chapter ${chapterId} not found` };
    }
    
    const contest = chapter.contests.find(c => c.id === contestNum);
    if (!contest) {
      console.error(`[API] Contest ${contestNum} not found in chapter ${chapterId}`);
      return { error: `Contest ${contestNum} not found` };
    }
    
    const difficulty = contestNum >= 4 ? 'hard' : 'normal';
    
    // Mix all question types and randomize
    const allQuestions = shuffle([
      ...(contest.questions || []).filter(q => q.type === 'multipleChoice'),
      ...(contest.questions || []).filter(q => q.type === 'trueFalse'),
      ...(contest.questions || []).filter(q => q.type === 'shortAnswer')
    ]);
    
    return {
      success: true,
      chapterId,
      contestNum,
      difficulty,
      chapterName: chapter.name,
      contestName: contest.name,
      questions: allQuestions, // Return all questions
      totalQuestions: allQuestions.length
    };
  } catch (error) {
    console.error(`[API Analyzer] Error loading chapter questions:`, error.message);
    return null;
  }
}

// Helper: resilient OpenAI chat call with retries and optional key rotation
let __openai_key_index = 0;
async function sendChatWithRetries(opts) {
  const { model, messages, max_tokens = 300, temperature = 0, maxRetries = 4 } = opts || {};
  const rawKeys = (process.env.OPENAI_API_KEYS || process.env.OPENAI_API_KEY || '').split(',').map(k => k && k.trim()).filter(Boolean);
  const keys = rawKeys.length ? rawKeys : [''];

  // Start index is rotated per-request to distribute load across keys
  const startIndex = (__openai_key_index++ % keys.length + keys.length) % keys.length;

  let lastErr = null;
  for (let attempt = 0; attempt < Math.max(1, maxRetries); attempt++) {
    const key = keys[(startIndex + attempt) % keys.length];
    try {
      const client = new OpenAI({ apiKey: key });
      // prefer chat.completions.create when available
      if (client.chat && client.chat.completions && typeof client.chat.completions.create === 'function') {
        return await client.chat.completions.create({ model: model || DEFAULT_MODEL, messages, temperature, max_tokens });
      }
      // fallback to other SDK shapes
      if (typeof client.createChatCompletion === 'function') {
        return await client.createChatCompletion({ model: model || DEFAULT_MODEL, messages, temperature, max_tokens });
      }
      if (client.responses && typeof client.responses.create === 'function') {
        // Map messages array into a single input string
        const input = (messages || []).map(m => `${m.role}: ${m.content}`).join('\n');
        return await client.responses.create({ model: model || DEFAULT_MODEL, input });
      }
      throw new Error('No supported OpenAI client method found');
    } catch (err) {
      lastErr = err;
      const status = err?.status || (err?.response && err.response.status) || null;
      const low = String(err || '').toLowerCase();
      const isAuth = status === 401 || low.includes('unauthor') || low.includes('invalid api key');
      const isRate = status === 429 || low.includes('rate limit') || low.includes('quota') || low.includes('rpm');

      if (isAuth) {
        console.error('OpenAI auth error (invalid key). Aborting retries.');
        throw err;
      }

      if (isRate) {
        const wait = Math.min(30000, Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 1000));
        console.warn(`OpenAI rate/quota error (attempt ${attempt + 1}), will retry after ${wait}ms.`, err && err.message ? err.message : err);
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, wait));
        continue; // try next key/attempt
      }

      // For other transient errors, do a short backoff and retry
      const shortWait = Math.min(8000, 500 * (attempt + 1));
      console.warn(`OpenAI call failed (attempt ${attempt + 1}), retrying after ${shortWait}ms:`, err && err.message ? err.message : err);
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, shortWait));
    }
  }
  console.error('sendChatWithRetries exhausted all attempts. Last error:', lastErr);
  throw lastErr;
}

// Load questions for a quiz - accepts "1-2" format (chapter-contest)
function loadQuestionsForQuiz(quizId) {
  try {
    if (!fs.existsSync(questionsPath)) {
      console.error('[API] Questions file does not exist at:', questionsPath);
      return { error: 'Questions file not found' };
    }
    
    const data = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
    
    if (!data || !data.chapters || !Array.isArray(data.chapters)) {
      console.error('[API] Error: Invalid file structure. Data:', data ? Object.keys(data).slice(0, 5) : 'null');
      return { error: 'File structure error' };
    }
    
    // Parse quizId: expects format like "1-2" or just numeric chapter
    let chapterId = 1;
    let contestNum = 1;
    
    if (typeof quizId === 'string' && quizId) {
      if (quizId.includes('-')) {
        const parts = quizId.split('-');
        const ch = parseInt(parts[0], 10);
        const cn = parseInt(parts[1], 10);
        if (!isNaN(ch)) chapterId = ch;
        if (!isNaN(cn)) contestNum = cn;
      } else {
        const ch = parseInt(quizId, 10);
        if (!isNaN(ch)) chapterId = ch;
      }
    }
    
    // Validate ranges
    chapterId = Math.max(1, Math.min(5, chapterId));
    contestNum = Math.max(1, Math.min(5, contestNum));
    
    console.log(`[API] Loading: chapter=${chapterId}, contest=${contestNum}`);
    
    const chapter = data.chapters.find(c => c.chapterId === chapterId || c.id === chapterId);
    if (!chapter) {
      console.error(`[API] Chapter ${chapterId} not found. Available:`, data.chapters.map(c => c.chapterId || c.id));
      return { error: `Chapter ${chapterId} not found` };
    }
    
    const contest = chapter.contests.find(c => c.exam_id === contestNum || c.id === contestNum);
    if (!contest) {
      console.error(`[API] Contest ${contestNum} not found in chapter ${chapterId}. Available:`, chapter.contests.map(c => c.exam_id || c.id));
      return { error: `Contest ${contestNum} not found` };
    }
    
    const difficulty = contestNum >= 4 ? 'hard' : 'normal';
    
    // Mix all question types and randomize
    const allQuestions = shuffle([
      ...(contest.questions_multiple_choice || []),
      ...(contest.questions_true_false || []),
      ...(contest.questions_short_answer || [])
    ]);
    
    return {
      success: true,
      chapterId,
      contestNum,
      difficulty,
      chapterName: chapter.chapterName,
      contestName: `Contest ${contestNum}`,
      questions: allQuestions,
      totalQuestions: allQuestions.length
    };
  } catch (error) {
    console.error(`[API Analyzer] Error loading chapter questions:`, error.message);
    return null;
  }
}

// Load questions grouped by topic categories for a specific quiz
function loadGroupedQuestionsForQuiz(quizId) {
  const result = loadQuestionsForQuiz(quizId);
  if (!result || !result.questions) {
    return { knowledge: [], comprehension: [], lowApplication: [], highApplication: [], other: [] };
  }
  
  const mapTopicToBucket = (topicStr) => {
    if (!topicStr || typeof topicStr !== 'string') return 'other';
    const s = topicStr.toLowerCase();
    if (s.includes('nhận biết') || s.includes('knowledge')) return 'knowledge';
    if (s.includes('thông hiểu') || s.includes('comprehension')) return 'comprehension';
    if (s.includes('vận dụng thấp') || s.includes('low application')) return 'lowApplication';
    if (s.includes('vận dụng cao') || s.includes('high application')) return 'highApplication';
    return 'other';
  };
  
  const buckets = { knowledge: [], comprehension: [], lowApplication: [], highApplication: [], other: [] };
  for (const q of result.questions) {
    const b = mapTopicToBucket(q.topic);
    buckets[b].push(q);
  }
  
  return buckets;
}

// Helper to get weak areas
function getWeakAreas(topicStats) {
  const weakAreas = [];
  for (const [topic, stats] of Object.entries(topicStats)) {
    const total = stats.total || 0;
    const wrong = stats.wrong || 0;
    const correct = stats.correct || 0;
    const rate = total > 0 ? wrong / total : 0;
    const percentage = Math.round((total > 0 ? (wrong / total) * 100 : 0));
    let severity = 'low';
    if (rate > 0.5) severity = 'high';
    else if (rate > 0.25) severity = 'medium';
    weakAreas.push({
      topic,
      severity,
      rate,
      percentage,
      wrong,
      total,
      correct,
    });
  }
  return weakAreas.sort((a, b) => b.rate - a.rate);
}

// Basic subtopic detection from question text/topic to give students concrete labels
function detectSubtopic(text) {
  if (!text || typeof text !== 'string') return 'General';
  const s = text.toLowerCase();
  // mapping of simple keyword -> subtopic label (Vietnamese)
  const map = [
    { k: ['đa thức', 'đa thức', 'thu gọn', 'rút gọn', 'đa thức'], v: 'Đa thức / Biểu thức' },
    { k: ['hình', 'tam giác', 'hình học', 'đường', 'điểm', 'góc'], v: 'Hình học' },
    { k: ['phép nhân', 'phép chia', 'nhân', 'chia', 'tổng', 'hiệu'], v: 'Toán cơ bản (phép toán)' },
    { k: ['bậc', 'độ', 'degree', 'coefficient'], v: 'Bậc / Hệ số' },
    { k: ['tìm x', 'tìm giá trị', 'giá trị lớn nhất', 'giá trị nhỏ nhất', 'tìm giá trị'], v: 'Tối ưu / Giá trị cực trị' },
    { k: ['hằng đẳng thức', 'hằng đẳng thức đáng nhớ'], v: 'Hằng đẳng thức' },
    { k: ['phương trình', 'hệ phương trình', 'equation'], v: 'Phương trình' },
    { k: ['chia', 'chia cho'], v: 'Chia / Phân tích' },
  ];

  for (const item of map) {
    for (const kw of item.k) {
      if (s.includes(kw)) return item.v;
    }
  }
  // fallback: try to detect keywords like 'number' or 'số'
  if (s.includes('số') || s.includes('number')) return 'Số học';
  return 'General';
}

// Sample function for recommendations
function recommendNextQuestions(weakAreas, allQuestions) {
  const rec = [];
  // Difficulty in questions uses numeric strings ("1".."4"). We'll pick easier ones first.
  for (const area of weakAreas) {
    const candidates = allQuestions.filter(q => q.topic === area.topic);
    // sort by numeric difficulty ascending (easier first)
    const sorted = candidates.slice().sort((a, b) => (parseInt(a.difficulty || '2', 10) - parseInt(b.difficulty || '2', 10)));
    const pick = sorted.slice(0, 5).map(q => q.id);
    rec.push({
      topic: area.topic,
      nextQuestions: pick,
      resources: [],
    });
  }
  return rec;
}

// Stub for fetching resources
async function fetchResourcesFor(weakAreas) {
  // Placeholder: integrate PressAI scraper here
  return weakAreas.map(area => ({
    topic: area.topic,
    resources: [
      {
        title: `Bài giảng về ${area.topic}`,
        url: `https://example.com/${area.topic}`,
      },
    ],
  }));
}

// LLM call for feedback
async function callLLMGenerateFeedback(q, selectedOption) {
  const options = q.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}: ${opt}`).join('; ');
  const correctLetter = String.fromCharCode(65 + q.answerIndex);
  const studentLetter = String.fromCharCode(65 + q.options.indexOf(selectedOption));

  const prompt = `Bạn là giáo viên Toán trung học; nhiệm vụ: phân tích vì sao học sinh trả lời sai.
Input:
Question: "${q.question}"
Options: ${options}
CorrectOption: "${correctLetter}"
StudentChoice: "${studentLetter}"

Yêu cầu:
Trả về một duy nhất JSON không có chữ thừa với keys:
- reason: ngắn gọn (<=120 chars)
- hint: gợi ý ngắn (<=80 chars)
- mini_steps: array tối đa 3 bước
Example:
{"reason":"...", "hint":"...", "mini_steps":["..."]}`;

  try {
    // Ask the LLM to respond in Vietnamese and include actionable improvement items
    const enhancedPrompt = `Bạn là giáo viên Toán trung học, vui lòng trả lời bằng TIẾNG VIỆT.
Hãy phân tích tại sao học sinh trả lời sai và trả về một JSON duy nhất (không kèm văn bản khác) có các keys sau:
- reason: mô tả ngắn gọn (<=120 ký tự) — vì sao sai
- improve: một câu tóm tắt nói học sinh cần cải thiện điều gì (<=100 ký tự)
- suggestions: mảng các chủ đề hoặc kỹ năng nên ôn (tối đa 5 mục)
- mini_steps: mảng tối đa 3 bước hành động cụ thể để sửa lỗi
- resources: mảng các tài nguyên (title, url) gợi ý để ôn luyện
Ví dụ JSON:
{"reason":"...","improve":"...","suggestions":["phương trình bậc 2","định nghĩa delta"],"mini_steps":["Bước 1..."],"resources":[{"title":"Giải thích...","url":"https://..."}]}

Input gốc:
Question: "${q.question}"
Options: ${options}
CorrectOption: "${correctLetter}"
StudentChoice: "${studentLetter}"
`;

    // Use resilient send helper to mitigate rate limits or multiple API keys
    let response;
    try {
      response = await sendChatWithRetries({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: enhancedPrompt }],
        max_tokens: 300
      });
    } catch (e) {
      // If it's a rate/quota error mention, try an immediate fallback to gpt-3.5-turbo
      const msg = String(e || '').toLowerCase();
      if (msg.includes('rate limit') || msg.includes('rpm') || msg.includes('quota') || msg.includes('429')) {
        try {
          response = await sendChatWithRetries({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: enhancedPrompt }], max_tokens: 300 });
        } catch (e2) {
          throw e; // rethrow original
        }
      } else {
        throw e;
      }
    }
    const raw = response.choices[0].message.content.trim();
    console.log('LLM Raw Response:', raw);
    // Robust parsing
    const jsonMatch = raw.match(/\{.*\}/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found');
  } catch (error) {
    console.error('LLM Error:', error);
    // Fallback
    return {
      reason: 'Không thể tạo phản hồi chi tiết.',
      hint: 'Xem lại giải thích cơ bản.',
      mini_steps: ['Bước 1: Đọc lại câu hỏi', 'Bước 2: Tính toán cẩn thận'],
    };
  }
}

// LLM call for overall summary of the quiz
async function callLLMGenerateSummary({ score, weakAreas, feedback, recommendations, rulesTriggered }) {
  // Prepare a strict prompt that asks for JSON ONLY. We'll still fall back to a programmatic summary if the LLM fails
  const topWeak = (weakAreas || []).slice(0, 6).map(w => `${w.topic} (${w.percentage ?? Math.round((w.rate||0)*100)}%)`).join(', ');
  const feedbackBrief = (feedback || []).slice(0, 8).map(f => `Câu ${f.questionId}: ${f.reason || ''}`).join('; ');

  const systemMessage = `You are an experienced Vietnamese high-school math teacher. Output EXACTLY one JSON object and nothing else. Do NOT add any explanatory text.`;

  const userMessage = `Hãy phân tích kết quả bài kiểm tra sau và trả về duy nhất một JSON (không kèm văn bản khác) với các keys: overall (string), strengths (array of strings), weaknesses (array of strings), plan (array of strings). Mỗi mục trong strengths/weaknesses phải cụ thể, có số liệu: "[Chủ đề]: Đúng X/Y (Z%). [Nhận xét]." Plan phải là các bước học cụ thể, có thời lượng và tài liệu.

Dữ liệu đầu vào:
Score: ${score}/10
Top weak areas: ${topWeak}
Sample feedback: ${feedbackBrief}
Recommendations: ${ (recommendations || []).map(r => r.topic).join(', ') }
Rules: ${ (rulesTriggered || []).join(', ') }

Trả về JSON ví dụ:
{"overall":"...","strengths":["..."],"weaknesses":["..."],"plan":["..."]}`;

  try {
    if (!openai) throw new Error('OpenAI client not initialized');
    let response;
    try {
      response = await sendChatWithRetries({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        temperature: 0,
        max_tokens: 600
      });
    } catch (e) {
      const msg = String(e || '').toLowerCase();
      if (msg.includes('rate limit') || msg.includes('rpm') || msg.includes('quota') || msg.includes('429')) {
        // try fallback to gpt-3.5 once
        try {
          response = await sendChatWithRetries({ model: 'gpt-3.5-turbo', messages: [{ role: 'system', content: systemMessage }, { role: 'user', content: userMessage }], temperature: 0, max_tokens: 600 });
        } catch (e2) {
          console.error('Fallback model also failed:', e2);
          throw e; // rethrow original so upper layer falls back
        }
      } else {
        throw e;
      }
    }

    const raw = (response && response.choices && response.choices[0] && response.choices[0].message && response.choices[0].message.content) ? response.choices[0].message.content.trim() : '';
    console.log('LLM Summary Raw Response:', raw);

    // Try to extract JSON object from the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('JSON parse error from LLM output:', e, 'raw:', jsonMatch[0]);
      }
    }
  } catch (err) {
    console.error('LLM summary error:', err && (err.message || err));
  }

  // Fallback: generate a deterministic, detailed summary programmatically
  const fallback = {};
  // overall
  const topList = (weakAreas || []).slice(0, 3).map(w => `${w.topic} (${w.percentage}%)`).join(', ') || 'không rõ';
  fallback.overall = `Bạn đạt ${score}/10. Điểm yếu chính: ${topList}. Hãy theo kế hoạch bên dưới để cải thiện.`;

  // strengths: topics with low error rate
  fallback.strengths = (weakAreas || []).filter(w => (w.rate || 0) <= 0.25).slice(0,5).map(w => `${w.topic}: Đúng ${w.correct || 0}/${w.total || 0} (${100 - (w.percentage||0)}%). Tiếp tục phát huy.`);

  // weaknesses: topics with highest error rates
  fallback.weaknesses = (weakAreas || []).filter(w => (w.rate || 0) > 0).slice(0,6).map(w => `${w.topic}: Sai ${w.wrong}/${w.total} (${w.percentage}%). Nguyên nhân có thể là ${w.rate > 0.5 ? 'chưa nắm vững kiến thức cơ bản' : 'cần thêm luyện tập'}.`);

  // plan: actionable steps
  const plan = [];
  let day = 1;
  for (const w of (weakAreas || []).slice(0,4)) {
    const dur = w.rate > 0.5 ? '2-3 ngày' : '1-2 ngày';
    plan.push(`Ngày ${day}-${day + (w.rate > 0.5 ? 2 : 1)}: Ôn ${w.topic} - Tài liệu: sách giáo khoa + 10-20 bài tập mức độ tương ứng - Thời lượng: ${w.rate > 0.5 ? '2-3 giờ/ngày' : '1-2 giờ/ngày'}`);
    day += (w.rate > 0.5 ? 3 : 2);
  }
  if (plan.length === 0) plan.push('Ôn lại các chủ đề cơ bản và làm 10 bài tập tổng hợp trong 2 ngày.');
  fallback.plan = plan;

  return fallback;
}

// Main analyze function
async function analyzeQuiz(payload) {
  const { userId, quizId, answers } = payload;
  // loadQuestionsForQuiz now returns { questions, contestKey }
  const loadResult = loadQuestionsForQuiz(quizId);
  const questions = Array.isArray(loadResult) ? loadResult : (loadResult.questions || []);
  const contestKey = loadResult && loadResult.contestKey ? loadResult.contestKey : quizId;
  let correct = 0;
  const perQuestionFeedback = [];
  const topicStats = {};
  const subtopicStats = {}; // track finer-grained subtopics
  const rulesTriggered = [];

  for (const ans of answers) {
    const q = questions.find(x => x.id === ans.questionId);
    if (!q) continue;
    const selectedIndex = q.options.indexOf(ans.selectedOption);
    const isCorrect = selectedIndex === q.answerIndex;
    if (isCorrect) correct++;

  // Ensure topic stats exist and update totals
  topicStats[q.topic] = topicStats[q.topic] || { wrong: 0, total: 0, correct: 0 };
  if (!isCorrect) topicStats[q.topic].wrong++;
  else topicStats[q.topic].correct++;
  topicStats[q.topic].total++;

  // Detect and track subtopic (more actionable label for students)
  const sub = detectSubtopic(`${q.topic} ${q.question} ${q.english_question || ''}`);
  subtopicStats[sub] = subtopicStats[sub] || { wrong: 0, total: 0, correct: 0 };
  if (!isCorrect) subtopicStats[sub].wrong++;
  else subtopicStats[sub].correct++;
  subtopicStats[sub].total++;

    // Rule-based detection (only for wrong answers)
    if (!isCorrect) {
      if (ans.timeTakenSec < 10) rulesTriggered.push('quick_guess_detected');
      if (topicStats[q.topic].wrong > 1) rulesTriggered.push('topic_repeat_errors');

        // Add only basic explanation if available
      if (q.explanation) {
        perQuestionFeedback.push({
          questionId: q.id,
          reason: q.explanation
        });
      }
    }
  }

  const score = answers.length > 0 ? Math.round((correct / answers.length) * 10) : 0; // integer 0-10
  // Keep full weak area details (topic, severity, rate, percentage, wrong, total, correct)
  const weakAreas = getWeakAreas(Object.assign({}, topicStats, subtopicStats));
  const feedbackOut = perQuestionFeedback.map(f => ({
    questionId: f.questionId,
    reason: f.reason || null,
    improve: f.improve || null,
    suggestions: f.suggestions || [],
    mini_steps: f.mini_steps || [],
    resources: f.resources || [],
  }));
  const recommendations = recommendNextQuestions(weakAreas, questions).map(rec => ({ topic: rec.topic, nextQuestions: rec.nextQuestions }));

  // Generate an overall AI summary (friendly Vietnamese) to show on the result page
  let summary = null;
  try {
    summary = await callLLMGenerateSummary({ score, weakAreas, feedback: feedbackOut, recommendations, rulesTriggered });
  } catch (e) {
    console.error('Error generating summary:', e);
  }

  // Derive a performance label. User requested that score >= 8 => 'Giỏi'.
  // We'll use a simple, clear mapping:
  // - score >= 8: 'Giỏi'
  // - score >= 6 and < 8: 'Đạt'
  // - score <= 5: 'Không đạt'
  let performanceLabel = 'Không đạt';
  if (score >= 8) performanceLabel = 'Giỏi';
  else if (score >= 6) performanceLabel = 'Đạt';
  else performanceLabel = 'Không đạt';

  // Add answer comparison data
  const answerComparison = answers.map(ans => {
    const q = questions.find(x => x.id === ans.questionId);
    if (!q) return null;
    return {
      questionId: q.id,
      question: q.question,
      userAnswer: ans.selectedOption,
      correctAnswer: q.options[q.answerIndex],
      isCorrect: q.options.indexOf(ans.selectedOption) === q.answerIndex,
      explanation: q.explanation || null
    };
  }).filter(x => x !== null);

  return {
    score,
    performanceLabel,
    weakAreas,
    feedback: feedbackOut,
    recommendations,
    summary,
    answerComparison, // Add the answer comparison data
  };
}

module.exports = { analyzeQuiz, loadQuestionsForQuiz, loadGroupedQuestionsForQuiz };

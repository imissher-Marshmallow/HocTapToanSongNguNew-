const fs = require('fs');
const path = require('path');
require('dotenv').config();
const OpenAI = require('openai');

let openai;
try {
  // Prefer an environment variable; fall back to a (placeholder) embedded key if present.
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
} catch (error) {
  console.warn('Failed to initialize OpenAI client:', error);
}

// Diagnostic help: show whether the OPENAI_API_KEY was found in the environment
if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY not found in environment. LLM functionality will fall back to the built-in stub/fallback responses.\n' +
    'To enable LLM, add OPENAI_API_KEY to backend/.env or set the environment variable and restart the server.');
} else {
  console.log('OPENAI_API_KEY detected in environment.');
}

// Prefer updated questions file if present (user may be editing questions_updated.json)
const defaultQuestionsPath = path.join(__dirname, '../data/questions_updated.json');
const updatedQuestionsPath = path.join(__dirname, '../data/questions_updated.json');
const questionsPath = fs.existsSync(updatedQuestionsPath) ? updatedQuestionsPath : defaultQuestionsPath;

// Utility: Fisher-Yates shuffle (in-place)
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Load questions for a quiz (supports new `contests` format in questions.json)
function loadQuestionsForQuiz(quizId) {
  const data = fs.readFileSync(questionsPath, 'utf8');
  const parsed = JSON.parse(data);
  // Support two shapes for parsed.contests:
  // - Array: parsed.contests = [ [...contest1...], [...contest2...], ... ]
  // - Object: parsed.contests = { "contest1": [...], "contest2": [...], ... }
  if (parsed && parsed.contests) {
    // If contests is an array (legacy), keep existing numeric selection behavior
    if (Array.isArray(parsed.contests)) {
      // Numeric array style contests: pick by index or random
      let idx = 0;
      if (!quizId || quizId === 'random' || quizId === 'rand' || quizId === '0') {
        idx = Math.floor(Math.random() * parsed.contests.length);
      } else {
        const parsedId = parseInt(quizId, 10);
        if (!isNaN(parsedId) && parsedId >= 1 && parsedId <= parsed.contests.length) {
          idx = parsedId - 1;
        } else {
          idx = Math.floor(Math.random() * parsed.contests.length);
        }
      }
      const contest = parsed.contests[idx] || [];
      const shuffled = shuffleArray([...contest]);
      const chosenKey = `contest${idx + 1}`;
      return { questions: shuffled, contestKey: chosenKey };
    }

    // If contests is an object with named contests, support selecting by name, numeric index or random
    if (typeof parsed.contests === 'object') {
      // Prefer explicit named contest keys that match the pattern 'contest<NUMBER>' so we only select
      // among contest1..contestN. This avoids picking unrelated keys if the object has other fields.
      const allKeys = Object.keys(parsed.contests);
      const namedKeys = allKeys.filter(k => /^contest\d+$/.test(k)).sort((a, b) => {
        const na = parseInt((a.match(/\d+/) || [0])[0], 10);
        const nb = parseInt((b.match(/\d+/) || [0])[0], 10);
        return na - nb;
      });
      const keys = namedKeys.length ? namedKeys : allKeys; // fallback to all keys if no contestN keys found

      if (keys.length === 0) return [];
      let chosenKey;
      // treat several forms of 'random' as a request to pick a random contest
      if (!quizId || quizId === 'random' || quizId === 'rand' || quizId === '0') {
        const idx = Math.floor(Math.random() * keys.length);
        chosenKey = keys[idx];
        console.log(`loadQuestionsForQuiz: selected random named contest "${chosenKey}"`);
      } else if (parsed.contests.hasOwnProperty(quizId)) {
        // user passed a named contest key like 'contest3'
        chosenKey = quizId;
      } else {
        // try numeric mapping: 1 -> contest1, 2 -> contest2, etc.
        const parsedId = parseInt(quizId, 10);
        if (!isNaN(parsedId) && parsedId >= 1 && parsedId <= keys.length) {
          chosenKey = keys[parsedId - 1];
        } else {
          chosenKey = keys[0];
          console.log(`loadQuestionsForQuiz: invalid quizId "${quizId}", defaulting to first named contest "${chosenKey}"`);
        }
      }
      const contest = parsed.contests[chosenKey] || [];
      const shuffled = shuffleArray([...contest]);
      const trimmed = shuffled.length > 20 ? shuffled.slice(0, 20) : shuffled;
      return { questions: trimmed, contestKey: chosenKey };
    }
  }
  // backwards compatibility: if file is a plain array of questions
  if (Array.isArray(parsed)) {
    const shuffled = shuffleArray([...parsed]);
    const trimmed = shuffled.length > 20 ? shuffled.slice(0, 20) : shuffled;
    return { questions: trimmed, contestKey: 'contest1' };
  }
  return { questions: [], contestKey: null };
}

// Load questions grouped by topic categories for a specific quiz
function loadGroupedQuestionsForQuiz(quizId) {
  const data = fs.readFileSync(questionsPath, 'utf8');
  const parsed = JSON.parse(data);
  // Helper to map topic strings to buckets
  const mapTopicToBucket = (topicStr) => {
    if (!topicStr || typeof topicStr !== 'string') return 'other';
    const s = topicStr.toLowerCase();
    if (s.includes('nhận biết') || s.includes('knowledge')) return 'knowledge';
    if (s.includes('thông hiểu') || s.includes('comprehension')) return 'comprehension';
    if (s.includes('vận dụng thấp') || s.includes('low application')) return 'lowApplication';
    if (s.includes('vận dụng cao') || s.includes('high application')) return 'highApplication';
    // fallback: try to detect '(Knowledge)' style
    if (s.includes('knowledge')) return 'knowledge';
    if (s.includes('comprehension')) return 'comprehension';
    if (s.includes('low')) return 'lowApplication';
    if (s.includes('high')) return 'highApplication';
    return 'other';
  };

  // pick contest similarly to loadQuestionsForQuiz
  let contestArray = [];
  if (parsed && parsed.contests) {
    if (Array.isArray(parsed.contests)) {
      // numeric or random selection
      let idx;
      if (!quizId || quizId === 'random' || quizId === 'rand' || quizId === '0') {
        idx = Math.floor(Math.random() * parsed.contests.length);
      } else {
        const parsedId = parseInt(quizId, 10);
        idx = (!isNaN(parsedId) && parsedId >= 1 && parsedId <= parsed.contests.length) ? parsedId - 1 : 0;
      }
      contestArray = parsed.contests[idx] || [];
    } else if (typeof parsed.contests === 'object') {
      const allKeys = Object.keys(parsed.contests);
      const namedKeys = allKeys.filter(k => /^contest\d+$/.test(k)).sort((a, b) => {
        const na = parseInt((a.match(/\d+/) || [0])[0], 10);
        const nb = parseInt((b.match(/\d+/) || [0])[0], 10);
        return na - nb;
      });
      const keys = namedKeys.length ? namedKeys : allKeys;
      if (keys.length === 0) return { knowledge: [], comprehension: [], lowApplication: [], highApplication: [], other: [] };
      let chosenKey;
      if (!quizId || quizId === 'random' || quizId === 'rand' || quizId === '0') {
        const idx = Math.floor(Math.random() * keys.length);
        chosenKey = keys[idx];
      } else if (parsed.contests.hasOwnProperty(quizId)) {
        chosenKey = quizId;
      } else {
        const parsedId = parseInt(quizId, 10);
        chosenKey = (!isNaN(parsedId) && parsedId >= 1 && parsedId <= keys.length) ? keys[parsedId - 1] : keys[0];
      }
      contestArray = parsed.contests[chosenKey] || [];
    }
  }

  // group into buckets
  const buckets = { knowledge: [], comprehension: [], lowApplication: [], highApplication: [], other: [] };
  for (const q of contestArray) {
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

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: enhancedPrompt }],
      max_tokens: 300,
    });
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
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
      temperature: 0,
      max_tokens: 600,
    });

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

  // Derive a performance label based on the requested mapping.
  // Assumption (interpreting the user's overlapping ranges into integer-friendly buckets):
  // - score <= 5: 'Not passed'
  // - score > 5 and <= 7: 'Average'
  // - score > 7 and <= 8: 'Đạt'
  // - score > 8: 'GIỏi'
  // This maps integer scores as: 0-5 Not passed, 6-7 Average, 8 Đạt, 9-10 GIỏi.
  let performanceLabel = 'Không đạt';
  if (score <= 5) performanceLabel = 'Không đạt';
  else if (score > 5 && score <= 7) performanceLabel = 'Trung bình';
  else if (score > 7 && score <= 8) performanceLabel = 'Đạt';
  else if (score > 8) performanceLabel = 'Giỏi';

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

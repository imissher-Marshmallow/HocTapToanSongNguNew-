const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const OpenAI = require('openai');
const { getResourcesForTopic, generateMotivationalFeedback } = require('./webSearchResources');
const { dbHelpers } = require('../database');

// Initialize OpenAI clients for different agents (separate to avoid RPM limits)
// OPENAI_API_KEY_SUMMARY: For generating AI summary and feedback
// OPENAI_API_KEY_RESOURCES: For web search and resource recommendations
// OPENAI_API_KEY: Fallback/default API key
let openaiSummary, openaiResources;

try {
  const summaryKey = process.env.OPENAI_API_KEY_SUMMARY || process.env.OPENAI_API_KEY || '';
  openaiSummary = new OpenAI({ apiKey: summaryKey });
} catch (error) {
  console.warn('Failed to initialize OpenAI Summary client:', error);
}

try {
  const resourcesKey = process.env.OPENAI_API_KEY_RESOURCES || process.env.OPENAI_API_KEY || '';
  openaiResources = new OpenAI({ apiKey: resourcesKey });
} catch (error) {
  console.warn('Failed to initialize OpenAI Resources client:', error);
}

if (!process.env.OPENAI_API_KEY_SUMMARY && !process.env.OPENAI_API_KEY_RESOURCES && !process.env.OPENAI_API_KEY) {
  console.warn('No OpenAI API keys found in environment. LLM functionality will fall back to built-in responses.');
  console.warn('  Set OPENAI_API_KEY_SUMMARY for AI summary generation');
  console.warn('  Set OPENAI_API_KEY_RESOURCES for resource recommendations');
  console.warn('  Or set OPENAI_API_KEY as fallback for both');
} else {
  if (process.env.OPENAI_API_KEY_SUMMARY) console.log('✓ OPENAI_API_KEY_SUMMARY detected');
  if (process.env.OPENAI_API_KEY_RESOURCES) console.log('✓ OPENAI_API_KEY_RESOURCES detected');
  if (process.env.OPENAI_API_KEY) console.log('✓ OPENAI_API_KEY (fallback) detected');
}

// Prefer updated questions file
const defaultQuestionsPath = path.join(__dirname, '../data/questions_updated.json');
const updatedQuestionsPath = path.join(__dirname, '../data/questions_updated.json');
const questionsPath = fs.existsSync(updatedQuestionsPath) ? updatedQuestionsPath : defaultQuestionsPath;

// Fisher-Yates shuffle
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Load questions for a quiz
function loadQuestionsForQuiz(quizId) {
  const data = fs.readFileSync(questionsPath, 'utf8');
  const parsed = JSON.parse(data);
  
  // Support multiple top-level container names. Prefer 'contests' but fall back to first object key
  let containerName = null;
  let container = null;
  if (parsed && parsed.contests) {
    containerName = 'contests';
    container = parsed.contests;
  } else if (parsed && typeof parsed === 'object') {
    // find first key whose value looks like a contests map (object with arrays)
    const keys = Object.keys(parsed);
    for (const k of keys) {
      if (parsed[k] && typeof parsed[k] === 'object') {
        // heuristic: value has child keys mapping to arrays of question objects
        const childKeys = Object.keys(parsed[k] || {});
        if (childKeys.length > 0 && childKeys.every(ck => Array.isArray(parsed[k][ck]))) {
          containerName = k;
          container = parsed[k];
          break;
        }
      }
    }
  }

  if (container) {
    if (Array.isArray(parsed.contests)) {
      let idx = 0;
      if (!quizId || quizId === 'random' || quizId === 'rand' || quizId === '0') {
        // Use crypto.randomInt when available for more robust randomness
        idx = (typeof crypto.randomInt === 'function') ? crypto.randomInt(0, parsed.contests.length) : Math.floor(Math.random() * parsed.contests.length);
      } else {
        const parsedId = parseInt(quizId, 10);
        if (!isNaN(parsedId) && parsedId >= 1 && parsedId <= parsed.contests.length) {
          idx = parsedId - 1;
        } else {
          idx = (typeof crypto.randomInt === 'function') ? crypto.randomInt(0, parsed.contests.length) : Math.floor(Math.random() * parsed.contests.length);
        }
      }
      const contest = parsed.contests[idx] || [];
      const shuffled = shuffleArray([...contest]);
      return { questions: shuffled, contestKey: `contest${idx + 1}`, contestIndex: idx + 1, contestId: idx + 1, contestName: parsed.name || null };
    }

    if (typeof container === 'object') {
      const allKeys = Object.keys(container);
      const namedKeys = allKeys.filter(k => /^contest\d+$/.test(k)).sort((a, b) => {
        const na = parseInt((a.match(/\d+/) || [0])[0], 10);
        const nb = parseInt((b.match(/\d+/) || [0])[0], 10);
        return na - nb;
      });
      const keys = namedKeys.length ? namedKeys : allKeys;

      if (keys.length === 0) return { questions: [], contestKey: 'none' };
      let chosenKey;
      if (!quizId || quizId === 'random' || quizId === 'rand' || quizId === '0') {
        const idx = (typeof crypto.randomInt === 'function') ? crypto.randomInt(0, keys.length) : Math.floor(Math.random() * keys.length);
        chosenKey = keys[idx];
      } else if (parsed.contests.hasOwnProperty(quizId)) {
        chosenKey = quizId;
      } else {
        const parsedId = parseInt(quizId, 10);
        if (!isNaN(parsedId) && parsedId >= 1 && parsedId <= keys.length) {
          chosenKey = keys[parsedId - 1];
        } else {
          chosenKey = keys[0];
        }
      }
      const contest = container[chosenKey] || [];
      const shuffled = shuffleArray([...contest]);
      const trimmed = shuffled.length > 20 ? shuffled.slice(0, 20) : shuffled;
      // Ensure english fields present for frontend (fallback to original fields)
      const normalized = trimmed.map(q => ({
        ...q,
        english_question: q.english_question || q.question,
        english_options: q.english_options || (Array.isArray(q.options) ? q.options.slice() : [])
      }));
      // derive numeric index from chosenKey if possible
      let contestIndex = null;
      const m = String(chosenKey).match(/contest(\d+)/);
      if (m) contestIndex = parseInt(m[1], 10);
      return { questions: normalized, contestKey: chosenKey, contestIndex, contestId: contestIndex, contestName: parsed.name || containerName };
    }
  }
  return { questions: [], contestKey: 'none' };
}

// Load grouped questions
function loadGroupedQuestionsForQuiz(quizId) {
  const loadResult = loadQuestionsForQuiz(quizId);
  const questions = Array.isArray(loadResult) ? loadResult : (loadResult.questions || []);
  
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
  for (const q of questions) {
    const b = mapTopicToBucket(q.topic);
    buckets[b].push(q);
  }
  return buckets;
}

// Get weak areas from topic stats
function getWeakAreas(topicStats) {
  const weak = [];
  for (const topic in topicStats) {
    const stats = topicStats[topic];
    const errorRate = stats.total > 0 ? (stats.wrong / stats.total) : 0;
    const percentage = Math.round(errorRate * 100);
    
    if (percentage > 0) {
      let severity = 'low';
      if (percentage >= 70) severity = 'high';
      else if (percentage >= 40) severity = 'medium';
      
      weak.push({
        topic,
        severity,
        rate: errorRate,
        percentage,
        wrong: stats.wrong,
        total: stats.total,
        correct: stats.correct || (stats.total - stats.wrong)
      });
    }
  }
  return weak.sort((a, b) => b.percentage - a.percentage);
}

// Detect subtopic from question content
function detectSubtopic(text) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('phương trình')) return 'Phương trình';
  if (lowerText.includes('hình học') || lowerText.includes('tam giác')) return 'Hình học';
  if (lowerText.includes('đa thức')) return 'Đa thức';
  if (lowerText.includes('hằng đẳng thức')) return 'Hằng đẳng thức';
  if (lowerText.includes('phân số') || lowerText.includes('số học')) return 'Số học';
  if (lowerText.includes('tối ưu') || lowerText.includes('cực trị')) return 'Tối ưu / Giá trị cực trị';
  return 'Toán cơ bản (phép toán)';
}

// Recommend next questions
function recommendNextQuestions(weakAreas, questions) {
  const recommendations = [];
  if (!weakAreas || weakAreas.length === 0) return recommendations;
  
  const topWeakTopics = weakAreas.slice(0, 2).map(w => w.topic);
  for (const topic of topWeakTopics) {
    const relatedQuestions = questions
      .filter(q => q.topic === topic)
      .map(q => q.id)
      .slice(0, 5);
    if (relatedQuestions.length > 0) {
      recommendations.push({
        topic,
        nextQuestions: relatedQuestions
      });
    }
  }
  return recommendations;
}

// Call LLM to generate comprehensive summary with timeout (uses OPENAI_API_KEY_SUMMARY or fallback)
async function callLLMGenerateSummary({ score, weakAreas, feedback, recommendations, rulesTriggered, performanceLabel }, timeoutMs = 8000) {
  if (!openaiSummary) {
    console.log('[Summary] OpenAI Summary client not initialized. Using fallback.');
    return null;
  }

  try {
    const weakAreasList = weakAreas.slice(0, 3).map(w => `${w.topic} (${w.percentage}% sai)`).join(', ');
    
    // Comprehensive prompt to generate full analysis with a clear 5-step plan and start actions
    const prompt = `Bạn là một giáo viên toán giỏi và huấn luyện viên học tập. Học sinh vừa hoàn thành bài kiểm tra với kết quả ${score}/10 (${performanceLabel}).
Điểm yếu chính: ${weakAreasList || 'không có'}.

Yêu cầu (rất quan trọng):
- Trả về JSON duy nhất (không chứa markdown fencing).
- Bao gồm các trường:
  - "overall": một thông điệp tổng hợp 1-4 câu bằng tiếng Việt chi tiết.
  - "start_here": một câu hướng dẫn rõ ràng để học sinh BẮT ĐẦU ngay (ví dụ: "Ôn 15 phút phần X trên VietJack, sau đó làm 5 bài tập").
  - "strengths": mảng các điểm mạnh (ngắn gọn).
  - "weaknesses": mảng các điểm yếu chi tiết (bao gồm % sai nếu có).
  - "plan": một mảng 5 bước chi tiết, mỗi bước là một object với: {"step": "mô tả hành động cụ thể","duration": "thời lượng (ví dụ: '15 phút')","action":"việc làm cụ thể","resource_suggestion": {"type":"article|video|exercise","name":"tên nguồn (ví dụ: VietJack bài X hoặc YouTube video tiêu đề)"} }.
  - "priority": mảng short list (1-3) những việc cần làm NGAY.
  - "motivationalMessage": một lời động viên cụ thể 3 câu theo cảm nhận cá nhân về học sinh này.

Ví dụ:
{
  "overall":"...",
  "start_here":"Ôn 15 phút phần Đa thức - Bài 2 trên VietJack, sau đó làm 5 bài tập tương tự.",
  "strengths":["..."],
  "weaknesses":["..."],
  "plan":[{"step":"Ôn lại khái niệm...","duration":"15 phút","action":"đọc bài và  làm 3 bài tập","resource_suggestion":{"type":"article","name":"VietJack - Đa thức"}}, ...],
  "priority":["Ôn phần X", "Làm 5 bài tập"],
  "motivationalMessage":"..."
}
`;

    // Create promise with timeout
    const summaryPromise = openaiSummary.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.7
    });

    // Race against timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('LLM_TIMEOUT')), timeoutMs)
    );

    const message = await Promise.race([summaryPromise, timeoutPromise]);
    const responseText = message.choices[0]?.message?.content || '{}';

    // Parse JSON response (handling cases where LLM adds markdown wrapping)
    let parsed;
    try {
      const cleanedText = responseText.replace(/```json\s?/g, '').replace(/```\s?/g, '').trim();
      parsed = JSON.parse(cleanedText);
    } catch (parseError) {
      console.warn('[Summary] Failed to parse LLM JSON response, using fallback:', parseError.message);
      return null;
    }

    console.log('[Summary] OpenAI generated: overall, strengths, weaknesses, plan');
    // Normalize plan: if items are objects keep them, otherwise convert strings to {step: string}
    let planOut = [];
    if (Array.isArray(parsed.plan) && parsed.plan.length > 0) {
      planOut = parsed.plan.map(p => {
        if (typeof p === 'string') return { step: p };
        return p;
      });
    }

    return {
      overall: parsed.overall || '',
      start_here: parsed.start_here || '',
      strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0 ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) && parsed.weaknesses.length > 0 ? parsed.weaknesses : weakAreas.slice(0, 3).map(w => `${w.topic}: ${w.percentage}% sai`),
      plan: planOut,
      priority: Array.isArray(parsed.priority) ? parsed.priority : [],
      motivationalMessage: parsed.motivationalMessage || ''
    };
  } catch (error) {
    const errorMsg = error && (error.message || String(error));
    console.warn(`[Summary] OpenAI failed (${errorMsg}). Using fallback.`);
    return null;
  }
}

// Fallback summary without LLM
function getFallbackSummary(score, performanceLabel, weakAreas) {
  let overall = '';
  if (score >= 8) {
    overall = `Tuyệt vời! Bạn đã đạt điểm ${score}/10 (${performanceLabel}). Tiếp tục nỗ lực!`;
  } else if (score >= 6) {
    overall = `Tốt lắm! Bạn đạt ${score}/10 (${performanceLabel}). Chỉ cần ôn lại các phần còn yếu.`;
  } else if (score >= 5) {
    overall = `Bạn đạt ${score}/10 (${performanceLabel}). Hãy tập trung vào các phần yếu để cải thiện.`;
  } else {
    overall = `Bạn đạt ${score}/10 (${performanceLabel}). Đừng nản chí - hãy bắt đầu ôn từ những phần cơ bản.`;
  }

  const motivation = generateMotivationalFeedback(score, performanceLabel, weakAreas);

  // Build detailed weaknesses list
  const detailedWeaknesses = weakAreas.slice(0, 5).map(w => {
    const errorRate = Math.round(w.percentage || 0);
    if (errorRate >= 75) {
      return `${w.topic}: ${errorRate}% sai - Cần ôn tập gấp cấp!`;
    } else if (errorRate >= 50) {
      return `${w.topic}: ${errorRate}% sai - Cần luyện tập thêm`;
    } else {
      return `${w.topic}: ${errorRate}% sai - Ôn lại một vài phần`;
    }
  });

  // Build detailed strengths list based on performance
  // Always generate meaningful strengths even if student has weak areas
  let strengths = [];
  if (score >= 8) {
    strengths = ['Khả năng hiểu bài toán rất tốt', 'Nắm vững kiến thức cơ bản'];
  } else if (score >= 6) {
    const topicsCorrect = Math.floor(score * 0.6); // estimate topics with correct answers
    strengths = [`Làm đúng ${topicsCorrect} chủ đề`, 'Hiểu được các phần kiến thức chính'];
  } else if (score >= 4) {
    strengths = ['Đã nắm được một số kiến thức cơ bản', 'Khả năng giải quyết vấn đề đang phát triển'];
  } else {
    strengths = ['Bạn đã cố gắng hoàn thành bài kiểm tra', 'Đây là điểm khởi đầu cho sự cải thiện'];
  }

  // Ensure strengths is never empty
  if (!strengths || strengths.length === 0) {
    strengths = ['Bạn đã hoàn thành bài kiểm tra'];
  }

  // Build learning plan
  const learningPlan = weakAreas.slice(0, 3).map((w, idx) => {
    const topic = w.topic || w.subtopic;
    const dayNum = idx + 1;
    return `Ngày ${dayNum}: Ôn ${topic} (xem bài giảng + làm bài tập)`;
  });

  return {
    overall,
    strengths, // Now guaranteed to have at least 1 element
    weaknesses: detailedWeaknesses,
    plan: learningPlan.length > 0 ? learningPlan : ['Hãy tiếp tục ôn tập toàn bộ các phần'],
    motivationalMessage: motivation.overallMessage,
    detailedFeedback: `Bạn sai ${Math.max(0, 10 - score)} trong 10 câu. Hãy tập trung vào: ${weakAreas.slice(0, 3).map(w => w.topic || w.subtopic).join(', ')}`
  };
}

// Main analyze function
async function analyzeQuiz(payload) {
  const { userId, quizId, answers, isAutoSubmitted } = payload;
  const loadResult = loadQuestionsForQuiz(quizId);
  const questions = Array.isArray(loadResult) ? loadResult : (loadResult.questions || []);
  const contestKey = loadResult && loadResult.contestKey ? loadResult.contestKey : quizId;
  const contestName = loadResult && loadResult.contestName ? loadResult.contestName : null;
  
  let correct = 0;
  const perQuestionFeedback = [];
  const topicStats = {};
  const subtopicStats = {};
  const rulesTriggered = [];
  
  // Add auto-submit to rules if detected (for anti-cheat flagging)
  if (isAutoSubmitted) {
    rulesTriggered.push('auto_submitted');
  }

  for (const ans of answers) {
    const q = questions.find(x => x.id === ans.questionId);
    if (!q) continue;
    
    const selectedIndex = q.options.indexOf(ans.selectedOption);
    const isCorrect = selectedIndex === q.answerIndex;
    if (isCorrect) correct++;

    topicStats[q.topic] = topicStats[q.topic] || { wrong: 0, total: 0, correct: 0 };
    if (!isCorrect) topicStats[q.topic].wrong++;
    else topicStats[q.topic].correct++;
    topicStats[q.topic].total++;

    const sub = detectSubtopic(`${q.topic} ${q.question} ${q.english_question || ''}`);
    subtopicStats[sub] = subtopicStats[sub] || { wrong: 0, total: 0, correct: 0 };
    if (!isCorrect) subtopicStats[sub].wrong++;
    else subtopicStats[sub].correct++;
    subtopicStats[sub].total++;

    if (!isCorrect) {
      if (ans.timeTakenSec < 10) rulesTriggered.push('quick_guess_detected');
      if (topicStats[q.topic].wrong > 1) rulesTriggered.push('topic_repeat_errors');

      if (q.explanation) {
        perQuestionFeedback.push({
          questionId: q.id,
          reason: q.explanation
        });
      }
    }
  }

  const score = answers.length > 0 ? Math.round((correct / answers.length) * 10) : 0;
  
  // Detect anti-cheat flags: auto-submit with incomplete answers suggests cheating
  // If user only answered few questions and got high score, it's suspicious
  let isFlaggedForCheating = false;
  let cheatReason = '';
  
  if (rulesTriggered.includes('auto_submitted')) {
    const answeredPercentage = (answers.length / Math.max(10, questions.length)) * 100;
    if (answeredPercentage < 50) {
      // Only answered <50% of questions but auto-submitted = likely cheating
      isFlaggedForCheating = true;
      cheatReason = `Auto-submitted with only ${answers.length}/${questions.length} answers`;
    }
  }
  
  // Correct grade mapping
  let performanceLabel = 'Không đạt';
  if (score >= 8) performanceLabel = 'Giỏi';
  else if (score >= 6) performanceLabel = 'Đạt';
  else if (score >= 5) performanceLabel = 'Trung bình';
  else performanceLabel = 'Không đạt';
  
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

  // Generate summary
  let summary = null;
  try {
    summary = await callLLMGenerateSummary({ score, weakAreas, feedback: feedbackOut, recommendations, rulesTriggered, performanceLabel });
  } catch (e) {
    console.error('Error generating summary:', e);
  }

  // Fallback if no summary
  if (!summary) {
    summary = getFallbackSummary(score, performanceLabel, weakAreas);
  }

  // Fetch recent user history (if available) to personalize feedback
  let historyScores = [];
  try {
    if (userId && dbHelpers && typeof dbHelpers.getUserResults === 'function') {
      const recent = await dbHelpers.getUserResults(userId, 5);
      if (Array.isArray(recent) && recent.length > 0) {
        // Extract numeric scores (if stored as string, coerce)
        historyScores = recent.map(r => (typeof r.score === 'number' ? r.score : parseInt(r.score, 10))).filter(s => !Number.isNaN(s));
      }
    }
  } catch (e) {
    // ignore history errors
    historyScores = [];
  }

  // Generate motivational feedback using OpenAI (personalized with history)
  let motivationalFeedback = null;
  try {
    motivationalFeedback = await generateMotivationalFeedback(score, performanceLabel, weakAreas, historyScores);
  } catch (error) {
    console.warn(`[Analyzer] Motivational feedback error: ${error.message}`);
  }

  // Generate resource links for weak areas
  const resourceLinks = [];
  if (weakAreas && weakAreas.length > 0) {
    const topWeakAreas = weakAreas.slice(0, 3);
    for (const area of topWeakAreas) {
      const topic = area.topic || area.subtopic;
      try {
        // find a sample incorrect question for this topic to provide context to the resource search
        let questionContext = null;
        const sampleQ = questions.find(q => q.topic === topic && answers.some(a => a.questionId === q.id && q.options.indexOf(a.selectedOption) !== q.answerIndex));
        if (sampleQ) {
          const userAns = answers.find(a => a.questionId === sampleQ.id);
          questionContext = {
            question: sampleQ.question || sampleQ.english_question || '',
            correctAnswer: sampleQ.options[sampleQ.answerIndex],
            userAnswer: userAns ? userAns.selectedOption : ''
          };
        }

        // getResourcesForTopic accepts questionContext to craft targeted search queries
        // eslint-disable-next-line no-await-in-loop
        const resources = await getResourcesForTopic(topic, 'medium', questionContext);
        if (resources && resources.length > 0) {
          resourceLinks.push(...resources);
        }
      } catch (e) {
        console.warn(`Resource lookup failed for topic "${topic}":`, e && (e.message || e));
      }
    }
  }

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
    answerComparison,
    motivationalFeedback,
    resourceLinks,
    // Anti-cheat flags
    isFlaggedForCheating,
    cheatReason: isFlaggedForCheating ? cheatReason : null,
    isAutoSubmitted: isAutoSubmitted || false,
    contestKey,
    contestName

  };
}

module.exports = { analyzeQuiz, loadQuestionsForQuiz, loadGroupedQuestionsForQuiz };

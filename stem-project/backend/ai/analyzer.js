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

// Load from /api/data (where chapters structure exists) or fall back to /backend/data
const questionsPath = (() => {
  const possiblePaths = [
    // Try from current working directory (Vercel root)
    path.join(process.cwd(), 'api/data/questions_updated.json'),
    path.join(process.cwd(), './api/data/questions_updated.json'),
    // Try relative to this file (from stem-project/backend/ai/)
    path.join(__dirname, '../../api/data/questions_updated.json'),
    path.join(__dirname, '../data/questions_updated.json'),
    // Try from stem-project root
    path.join(__dirname, '../../../api/data/questions_updated.json'),
    // Additional fallbacks for different deployment structures
    path.join(process.cwd(), 'stem-project/backend/data/questions_updated.json'),
    path.join(process.cwd(), 'data/questions_updated.json'),
    path.join(process.cwd(), './data/questions_updated.json'),
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log('[Backend Analyzer] Using:', p);
      return p;
    }
  }
  
  console.error('[Backend Analyzer] No questions file found. Tried:', possiblePaths);
  return possiblePaths[0];
})();

// Fisher-Yates shuffle
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Load questions for a quiz - accepts "1-2" format (chapter-contest)
function loadQuestionsForQuiz(quizId) {
  try {
    if (!fs.existsSync(questionsPath)) {
      console.error('[Backend] Questions file does not exist at:', questionsPath);
      return null;
    }
    
    const data = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
    
    if (!data || !data.chapters || !Array.isArray(data.chapters)) {
      console.error('[Backend] Error: Invalid file structure. Data:', data ? Object.keys(data).slice(0, 5) : 'null');
      return null;
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
    
    console.log(`[Backend] Loading: chapter=${chapterId}, contest=${contestNum}`);
    
    const chapter = data.chapters.find(c => c.chapterId === chapterId || c.id === chapterId);
    if (!chapter) {
      console.error(`[Backend] Chapter ${chapterId} not found. Available:`, data.chapters.map(c => c.chapterId || c.id));
      return null;
    }
    
    const contest = chapter.contests.find(c => c.exam_id === contestNum || c.id === contestNum);
    if (!contest) {
      console.error(`[Backend] Contest ${contestNum} not found in chapter ${chapterId}. Available:`, chapter.contests.map(c => c.exam_id || c.id));
      return null;
    }
    
    // Mix all question types and randomize
    const allQuestions = shuffleArray([
      ...(contest.questions_multiple_choice || []),
      ...(contest.questions_true_false || []),
      ...(contest.questions_short_answer || [])
    ]);
    
    if (allQuestions.length === 0) return null;
    
    console.log(`[Backend] Loaded ${allQuestions.length} questions for chapter ${chapterId} contest ${contestNum}`);
    return {
      questions: allQuestions,
      contestKey: `${chapterId}-${contestNum}`,
      contestIndex: contestNum,
      contestId: contestNum,
      contestName: chapter.chapterName,
      chapterId,
      difficulty: contestNum >= 4 ? 'hard' : 'normal'
    };
  } catch (error) {
    console.error('[Backend] Error loading questions:', error.message);
    return null;
  }
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
/**
 * OPTIMIZED: Fast quiz analysis without blocking on AI/resources
 * 
 * This function prioritizes speed over advanced features to avoid Vercel 30-second timeout.
 * 
 * Fast path (blocking):
 * - Calculate score and correct answers
 * - Detect weak/strong areas by topic
 * - Generate basic feedback
 * - Anti-cheat detection
 * 
 * Non-blocking (fire-and-forget):
 * - OpenAI summary generation (dev only)
 * - Resource link generation (skipped)
 * - Motivational feedback (skipped)
 * 
 * Result: Completes in <5 seconds instead of timeout at 30+ seconds
 */
async function analyzeQuiz(payload) {
  const { userId, quizId, answers, questions: providedQuestions, isAutoSubmitted } = payload;
  
  // Use provided questions if available (for personalized quizzes), otherwise load from file
  let questions = providedQuestions || [];
  let contestKey = quizId;
  let contestName = null;
  
  if (!questions || questions.length === 0) {
    // Fallback: load from file
    const loadResult = loadQuestionsForQuiz(quizId);
    questions = Array.isArray(loadResult) ? loadResult : (loadResult.questions || []);
    contestKey = loadResult && loadResult.contestKey ? loadResult.contestKey : quizId;
    contestName = loadResult && loadResult.contestName ? loadResult.contestName : null;
  }
  
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

  // FAST PATH: Generate basic summary synchronously (no AI call)
  let summary = getFallbackSummary(score, performanceLabel, weakAreas);

  // Fire-and-forget: Advanced features happen in background (don't block response)
  // This allows the quiz result to return immediately
  if (process.env.NODE_ENV === 'production') {
    // In production (Vercel), skip AI and resource calls to avoid timeout
    console.log('[Analyzer] Skipping AI features (production/timeout prevention)');
  } else {
    // In development, optionally run these if they don't timeout
    (async () => {
      try {
        const aiSummary = await callLLMGenerateSummary({ score, weakAreas, feedback: feedbackOut, recommendations, rulesTriggered, performanceLabel });
        if (aiSummary) summary = aiSummary;
      } catch (e) {
        console.warn('[Analyzer] Background AI summary failed:', e.message);
      }
    })().catch(err => console.warn('[Analyzer] Background task error:', err));
  }

  // Don't wait for motivational feedback or resources (return immediately)
  let motivationalFeedback = null;
  let resourceLinks = [];

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

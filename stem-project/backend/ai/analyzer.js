const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const OpenAI = require('openai');
const { getResourcesForTopic, generateMotivationalFeedback } = require('./webSearchResources');

let openai;
try {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
} catch (error) {
  console.warn('Failed to initialize OpenAI client:', error);
}

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY not found in environment. LLM functionality will fall back to built-in responses.');
} else {
  console.log('OPENAI_API_KEY detected in environment.');
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
  
  if (parsed && parsed.contests) {
    if (Array.isArray(parsed.contests)) {
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
      return { questions: shuffled, contestKey: `contest${idx + 1}` };
    }

    if (typeof parsed.contests === 'object') {
      const allKeys = Object.keys(parsed.contests);
      const namedKeys = allKeys.filter(k => /^contest\d+$/.test(k)).sort((a, b) => {
        const na = parseInt((a.match(/\d+/) || [0])[0], 10);
        const nb = parseInt((b.match(/\d+/) || [0])[0], 10);
        return na - nb;
      });
      const keys = namedKeys.length ? namedKeys : allKeys;

      if (keys.length === 0) return { questions: [], contestKey: 'none' };
      let chosenKey;
      if (!quizId || quizId === 'random' || quizId === 'rand' || quizId === '0') {
        const idx = Math.floor(Math.random() * keys.length);
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
      const contest = parsed.contests[chosenKey] || [];
      const shuffled = shuffleArray([...contest]);
      const trimmed = shuffled.length > 20 ? shuffled.slice(0, 20) : shuffled;
      return { questions: trimmed, contestKey: chosenKey };
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

// Call LLM to generate summary
async function callLLMGenerateSummary({ score, weakAreas, feedback, recommendations, rulesTriggered, performanceLabel }) {
  if (!openai) return null;

  try {
    const weakAreasList = weakAreas.slice(0, 3).map(w => `${w.topic} (${w.percentage}% lỗi)`).join(', ');
    const prompt = `Bạn là một giáo viên toán tốt bụng. Sinh viên vừa làm bài kiểm tra và được ${score}/10 điểm (${performanceLabel}). Điểm yếu chính: ${weakAreasList}.\n\nHãy viết một thông điệp khuyến khích ngắn gọn (2-3 câu) bằng tiếng Việt, kèm lời khuyên ôn tập.`;

    // Use defensive API call in case of invalid key or network error
    const message = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300
    });

    return {
      overall: message.choices[0]?.message?.content || '',
      strengths: [],
      weaknesses: weakAreas.slice(0, 2).map(w => `${w.topic}: ${w.percentage}% sai`),
      plan: (recommendations || []).slice(0, 2).map(r => `Ôn lại ${r.topic}`)
    };
  } catch (error) {
    // Detect invalid/unauthorized (401) errors and attach friendly hint
    try {
      const status = error?.status || (error?.response && error.response.status);
      if (status === 401) {
        console.warn('LLM returned 401 Unauthorized. Check OPENAI_API_KEY.');
        return {
          overall: null,
          strengths: [],
          weaknesses: weakAreas.slice(0, 2).map(w => `${w.topic}: ${w.percentage}% sai`),
          plan: (recommendations || []).slice(0, 2).map(r => `Ôn lại ${r.topic}`),
          error: { code: 401, message: 'Invalid or missing OPENAI_API_KEY' }
        };
      }
    } catch (inner) {
      // ignore
    }

    console.error('LLM error:', error && (error.message || error));
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

  // Build detailed strengths list
  const allTopics = weakAreas.map(w => w.topic || w.subtopic);
  const strengths = allTopics.length > 0 
    ? [`Bạn đã nắm vững ${Math.max(0, 10 - score)} trong 10 câu`]
    : [`Làm bài với kết quả ${score}/10`];

  // Build learning plan
  const learningPlan = weakAreas.slice(0, 3).map((w, idx) => {
    const topic = w.topic || w.subtopic;
    const dayNum = idx + 1;
    return `Ngày ${dayNum}: Ôn ${topic} (xem bài giảng + làm bài tập)`;
  });

  return {
    overall,
    strengths,
    weaknesses: detailedWeaknesses,
    plan: learningPlan.length > 0 ? learningPlan : ['Hãy tiếp tục ôn tập toàn bộ các phần'],
    motivationalMessage: motivation.overallMessage,
    detailedFeedback: `Bạn sai ${Math.max(0, 10 - score)} trong 10 câu. Hãy tập trung vào: ${weakAreas.slice(0, 3).map(w => w.topic || w.subtopic).join(', ')}`
  };
}

// Main analyze function
async function analyzeQuiz(payload) {
  const { userId, quizId, answers } = payload;
  const loadResult = loadQuestionsForQuiz(quizId);
  const questions = Array.isArray(loadResult) ? loadResult : (loadResult.questions || []);
  const contestKey = loadResult && loadResult.contestKey ? loadResult.contestKey : quizId;
  
  let correct = 0;
  const perQuestionFeedback = [];
  const topicStats = {};
  const subtopicStats = {};
  const rulesTriggered = [];

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

  // Generate motivational feedback
  const motivationalFeedback = generateMotivationalFeedback(score, performanceLabel, weakAreas);

  // Generate resource links for weak areas
  const resourceLinks = [];
  if (weakAreas && weakAreas.length > 0) {
    const topWeakAreas = weakAreas.slice(0, 3);
    for (const area of topWeakAreas) {
      const topic = area.topic || area.subtopic;
      try {
        // getResourcesForTopic is async (performs HEAD checks); await it so resources are populated
        // eslint-disable-next-line no-await-in-loop
        const resources = await getResourcesForTopic(topic);
        if (resources && resources.length > 0) {
          resourceLinks.push(...resources);
        }
      } catch (e) {
        // If reachability checks fail (network or blocked HEAD), fall back to returning an empty set for this topic
        // The webSearchResources module will itself return curated items as a last resort.
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
    resourceLinks
  };
}

module.exports = { analyzeQuiz, loadQuestionsForQuiz, loadGroupedQuestionsForQuiz };

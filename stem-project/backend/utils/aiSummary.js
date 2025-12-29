const axios = require('axios');

/**
 * Generate AI Summary using OpenAI API
 * Vietnamese language only with fallback
 * Token optimization: concise prompts
 */

const generateAISummary = async (quizData) => {
  const apiKey = process.env.OPENAI_API_KEY;
  
  // If no API key, use fallback
  if (!apiKey) {
    console.log('[AISummary] No OpenAI API key found. Using fallback.');
    return generateFallbackSummary(quizData);
  }

  try {
    // Prepare concise prompt (Vietnamese)
    const topicsList = Object.keys(quizData.topicFeedback || {})
      .map(t => `${t}: ${quizData.topicFeedback[t].percentage}%`)
      .join(', ');

    const weakTopics = Object.entries(quizData.topicFeedback || {})
      .filter(([_, data]) => data.percentage < 60)
      .map(([t]) => t)
      .slice(0, 3)
      .join(', ');

    const prompt = `Bạn là một giáo viên toán học. Dựa trên kết quả kiểm tra của học sinh:
- Điểm số: ${quizData.overallScore}%
- Câu trả lời đúng: ${quizData.correctAnswers}/${quizData.totalQuestions}
- Điểm yếu: ${weakTopics || 'không có'}

Hãy viết 2-3 câu phản hồi tích cực và khuyến khích, đúng 50 từ.`;

    console.log('[AISummary] Calling OpenAI API...');
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 150
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      timeout: 10000
    });

    const feedback = response.data.choices[0]?.message?.content?.trim();
    
    if (!feedback) {
      console.warn('[AISummary] OpenAI returned empty response, using fallback');
      return generateFallbackSummary(quizData);
    }
    
    console.log('[AISummary] ✅ Generated AI feedback successfully:', feedback.substring(0, 50) + '...');
    
    return {
      aiCoachFeedback: feedback,
      source: 'openai'
    };
  } catch (error) {
    console.error('[AISummary] ❌ OpenAI API error:', error.message);
    if (error.response?.status === 401) {
      console.error('[AISummary] Invalid API key - check OPENAI_API_KEY environment variable');
    } else if (error.response?.status === 429) {
      console.error('[AISummary] Rate limited - too many requests to OpenAI');
    } else if (error.code === 'ECONNABORTED') {
      console.error('[AISummary] Request timeout - OpenAI API took too long');
    }
    console.log('[AISummary] Falling back to generated summary');
    return generateFallbackSummary(quizData);
  }
};

/**
 * Fallback summary generation (Vietnamese)
 * Now generates 3 comprehensive sentences: weak areas, planning, motivation
 */
const generateFallbackSummary = (quizData) => {
  const { overallScore, correctAnswers, totalQuestions, topicFeedback = {} } = quizData;
  
  // Extract weak topics (< 70%)
  const weakTopics = Object.entries(topicFeedback || {})
    .filter(([_, data]) => data.percentage < 70)
    .map(([t, data]) => `${t} (${data.percentage}%)`)
    .slice(0, 3);

  // Extract strong topics (≥ 80%)
  const strongTopics = Object.entries(topicFeedback || {})
    .filter(([_, data]) => data.percentage >= 80)
    .map(([t]) => t)
    .slice(0, 2);

  // Build 3-sentence feedback
  let sentence1 = ''; // About weak areas
  let sentence2 = ''; // About learning plan
  let sentence3 = ''; // Motivation

  // Sentence 1: Identify weak areas
  if (weakTopics.length > 0) {
    sentence1 = `Bạn cần cải thiện ở các chủ đề: ${weakTopics.join(', ')}. Đây là những lĩnh vực mà bạn chưa nắm vững đủ.`;
  } else {
    sentence1 = `Tuyệt vời! Bạn đã thành thạo tất cả các chủ đề trong bài kiểm tra này.`;
  }

  // Sentence 2: Learning plan/strategy
  if (overallScore < 60) {
    sentence2 = `Hãy bắt đầu bằng cách ôn tập lại những khái niệm cơ bản, sau đó làm bài tập từ dễ đến khó để xây dựng nền tảng vững chắc.`;
  } else if (overallScore < 80) {
    sentence2 = `Kế hoạch học tập của bạn nên tập trung vào các bài tập nâng cao để giải quyết các lỗi sơ suất và đạt mức hiểu biết sâu hơn.`;
  } else {
    sentence2 = `Duy trì mức hiểu hiện tại với luyện tập thường xuyên và thử thách bản thân với các bài toán nâng cao.`;
  }

  // Sentence 3: Motivation
  if (overallScore >= 80) {
    sentence3 = `Xuất sắc! Bạn đang tiến bộ rất tốt. Hãy tiếp tục nỗ lực và bạn sẽ đạt được mục tiêu.`;
  } else if (overallScore >= 60) {
    sentence3 = `Bạn đang trên con đường đúng. Với luyện tập thêm một chút, bạn sẽ cải thiện đáng kể.`;
  } else {
    sentence3 = `Hãy kiên nhẫn với bản thân - mọi người đều bắt đầu từ con số 0. Cứ tiếp tục luyện tập, bạn sẽ tiến bộ nhanh chóng.`;
  }

  const feedback = `${sentence1} ${sentence2} ${sentence3}`;

  return {
    aiCoachFeedback: feedback,
    source: 'fallback'
  };
};

/**
 * Generate detailed topic feedback with AI (Vietnamese, token optimized)
 */
const generateDetailedTopicFeedback = async (topic, topicData) => {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('[DetailedTopicFeedback] No API key, using fallback');
    return generateFallbackTopicFeedback(topic, topicData);
  }

  try {
    const percentage = topicData.percentage || 0;
    const prompt = `Bạn là giáo viên toán. Học sinh có điểm ${percentage}% về chủ đề "${topic}" (${topicData.correct}/${topicData.total} đúng).

Hãy cung cấp:
1. Lý do tại sao điểm số thấp (1-2 khái niệm chính)
2. Ví dụ cụ thể về bài toán cơ bản (với công thức)
3. Lộ trình ôn tập 3 ngày (ngày 1: gì, ngày 2: gì, ngày 3: kiểm tra)

Viết bằng tiếng Việt, súc tích, dễ hiểu.`;

    console.log('[DetailedTopicFeedback] Calling OpenAI for topic:', topic);
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 300
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      timeout: 10000
    });

    const feedback = response.data.choices[0]?.message?.content?.trim();
    if (!feedback) {
      throw new Error('Empty response from OpenAI');
    }
    
    console.log('[DetailedTopicFeedback] ✅ Generated AI feedback for:', topic);
    return feedback;
  } catch (error) {
    console.error('[DetailedTopicFeedback] ❌ Error:', error.message);
    return generateFallbackTopicFeedback(topic, topicData);
  }
};

/**
 * Fallback for detailed topic feedback with emojis
 */
const generateFallbackTopicFeedback = (topic, topicData) => {
  const percentage = topicData.percentage || 0;
  const correct = topicData.correct || 0;
  const total = topicData.total || 1;
  
  // Generate different feedback based on performance
  if (percentage >= 90) {
    return `🌟 Xuất sắc ở ${topic}! Đúng ${correct}/${total} câu. Tiếp tục phát huy!`;
  }
  if (percentage >= 80) {
    return `✅ Rất tốt ở ${topic}! Đúng ${correct}/${total} câu. Thêm một chút luyện tập nữa!`;
  }
  if (percentage >= 70) {
    return `👍 Khá tốt ${topic} (${correct}/${total}). Luyện tập thêm để hoàn thiện.`;
  }
  if (percentage >= 60) {
    return `📚 ${topic}: Hiểu được ${correct}/${total}. Ôn tập thêm để vững kiến thức.`;
  }
  if (percentage >= 40) {
    return `⚠️ ${topic}: Đúng ${correct}/${total}. Ôn tập lại từ cơ bản, làm thêm bài tập.`;
  }
  return `❌ ${topic}: Chỉ đúng ${correct}/${total}. Bắt đầu ôn từ những bài cơ bản.`;
};

/**
 * Generate learning roadmap with AI (Vietnamese)
 */
const generateDefaultRoadmap = (topicFeedback) => {
  const weakTopics = Object.entries(topicFeedback || {})
    .filter(([_, data]) => data.percentage < 70)
    .map(([t]) => t)
    .slice(0, 2)
    .join(', ');

  return [
    {
      week: 1,
      focus: `Ôn tập: ${weakTopics}`,
      duration: '30 phút/ngày',
      action: 'Học lý thuyết, làm 5 bài cơ bản',
      goal: 'Nắm vững kiến thức cơ bản'
    },
    {
      week: 2,
      focus: 'Luyện tập nâng cao',
      duration: '45 phút/ngày',
      action: 'Làm bài tập khó, giải thích từng bước',
      goal: 'Đạt 70% trở lên'
    },
    {
      week: 3,
      focus: 'Ôn tập toàn bộ',
      duration: '60 phút/ngày',
      action: 'Làm bài kiểm tra mẫu',
      goal: 'Cải thiện 10-15%'
    },
    {
      week: 4,
      focus: 'Kiểm tra thành quả',
      duration: '45 phút/ngày',
      action: 'Làm đề thi toàn bộ',
      goal: 'Đạt 80% trở lên'
    }
  ];
};

const generateLearningRoadmap = async (profile, topicFeedback) => {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('[LearningRoadmap] No API key, using default roadmap');
    return generateDefaultRoadmap(topicFeedback);
  }

  try {
    // Find weak topics (score < 50%)
    const weakTopics = Object.entries(topicFeedback || {})
      .filter(([_, data]) => (data.percentage || 0) < 50)
      .map(([t, data]) => `${t} (${data.percentage}%)`)
      .join(', ') || 'Toán cơ bản';

    const overallScore = profile.overallScore || 0;

    const prompt = `Bạn là giáo viên toán lập kế hoạch học tập. Học sinh:
- Điểm chung: ${overallScore}%
- Chủ đề yếu (< 50%): ${weakTopics}

Tạo lộ trình ôn tập 4 tuần cụ thể (JSON array):
[
  {
    "week": 1,
    "focus": "Chủ đề ôn",
    "duration": "30 phút/ngày",
    "action": "Làm gì cụ thể",
    "goal": "Kết quả cuối tuần"
  },
  ...tuần 2, 3, 4
]

Trả về CHỈ JSON array, không code block, có action cụ thể.`;

    console.log('[LearningRoadmap] Calling OpenAI for personalized roadmap');
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 600
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      timeout: 15000
    });

    let content = response.data.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    // Extract JSON - handle markdown code blocks
    let jsonString = content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    const roadmap = JSON.parse(jsonString);

    if (!Array.isArray(roadmap) || roadmap.length === 0) {
      throw new Error('Invalid roadmap structure from AI');
    }

    // Validate roadmap structure
    const validRoadmap = roadmap.slice(0, 4).map((week, idx) => ({
      week: week.week || idx + 1,
      focus: week.focus || `Tuần ${idx + 1}`,
      duration: week.duration || '30 phút/ngày',
      action: week.action || 'Ôn tập và luyện tập',
      goal: week.goal || 'Cải thiện kỹ năng'
    }));

    console.log('[LearningRoadmap] ✅ Generated AI roadmap with', validRoadmap.length, 'weeks');
    return validRoadmap;
  } catch (error) {
    console.error('[LearningRoadmap] ❌ Error:', error.message);
    console.log('[LearningRoadmap] Using default roadmap as fallback');
    return generateDefaultRoadmap(topicFeedback);
  }
};

module.exports = {
  generateAISummary,
  generateDetailedTopicFeedback,
  generateLearningRoadmap
};

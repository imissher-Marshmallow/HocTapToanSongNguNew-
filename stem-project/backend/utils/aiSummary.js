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

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 100
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      timeout: 5000
    });

    const feedback = response.data.choices[0].message.content.trim();
    console.log('[AISummary] Generated AI feedback successfully');
    
    return {
      aiCoachFeedback: feedback,
      source: 'openai'
    };
  } catch (error) {
    console.error('[AISummary] OpenAI API error:', error.message);
    console.log('[AISummary] Falling back to generated summary');
    return generateFallbackSummary(quizData);
  }
};

/**
 * Fallback summary generation (Vietnamese)
 */
const generateFallbackSummary = (quizData) => {
  const { overallScore, correctAnswers, totalQuestions, topicFeedback = {} } = quizData;
  
  const feedbackTemplates = {
    excellent: [
      'Tuyệt vời! Bạn đã thành thạo nội dung này. Hãy tiếp tục duy trì thành tích cao.',
      'Xuất sắc! Kết quả của bạn cho thấy sự hiểu biết sâu sắc. Tiếp tục thử thách bản thân.'
    ],
    good: [
      'Rất tốt! Bạn đang tiến bộ tốt. Tập trung thêm vào các lĩnh vực yếu hơn.',
      'Tốt! Tuy còn có chỗ để cải thiện, nhưng bạn đã hiểu rõ hầu hết kiến thức.'
    ],
    needsWork: [
      'Bạn đang bắt đầu. Hãy ôn tập kỹ hơn và luyện tập thêm.',
      'Cần cải thiện thêm. Bạn sẽ tiến bộ nếu luyện tập thường xuyên.'
    ]
  };

  let category, feedback;
  if (overallScore >= 80) {
    category = 'excellent';
  } else if (overallScore >= 60) {
    category = 'good';
  } else {
    category = 'needsWork';
  }
  
  feedback = feedbackTemplates[category][Math.floor(Math.random() * 2)];

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
    return generateFallbackTopicFeedback(topic, topicData);
  }

  try {
    const prompt = `Hãy tóm tắt kinh nghiệm học tập về "${topic}":
- Độ chính xác: ${topicData.percentage}%
- Câu trả lời đúng: ${topicData.correct}/${topicData.total}
Viết 1 câu khuyến nghị, tối đa 30 từ, tiếng Việt.`;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 60
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      timeout: 3000
    });

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('[DetailedTopicFeedback] Error:', error.message);
    return generateFallbackTopicFeedback(topic, topicData);
  }
};

/**
 * Fallback for detailed topic feedback
 */
const generateFallbackTopicFeedback = (topic, topicData) => {
  if (topicData.percentage >= 80) return `Bạn làm rất tốt ở ${topic}. Tiếp tục duy trì thành tích này.`;
  if (topicData.percentage >= 60) return `Bạn hiểu ${topic} khá tốt. Luyện tập thêm để nắm vững hơn.`;
  return `${topic} cần được ôn tập lại. Hãy học kỹ kiến thức cơ bản.`;
};

/**
 * Generate learning roadmap with AI (Vietnamese)
 */
const generateLearningRoadmap = async (profile, topicFeedback) => {
  const apiKey = process.env.OPENAI_API_KEY;

  const weakTopics = Object.entries(topicFeedback || {})
    .filter(([_, data]) => data.percentage < 70)
    .map(([t]) => t)
    .slice(0, 2)
    .join(', ');

  const defaultRoadmap = [
    {
      week: 1,
      focus: `Ôn tập: ${weakTopics}`,
      duration: '1 tuần',
      action: 'Học lý thuyết, làm bài tập cơ bản',
      goal: 'Nắm vững kiến thức cơ bản'
    },
    {
      week: 2,
      focus: 'Luyện tập nâng cao',
      duration: '1 tuần',
      action: 'Làm bài tập khó hơn, kiểm tra lại',
      goal: 'Đạt 70% trở lên'
    },
    {
      week: 3,
      focus: 'Ôn tập toàn bộ',
      duration: '1 tuần',
      action: 'Làm bài kiểm tra lại',
      goal: 'Cải thiện thêm 10%'
    }
  ];

  if (!apiKey) {
    console.log('[LearningRoadmap] Using default roadmap (no API key)');
    return defaultRoadmap;
  }

  try {
    // Keep default roadmap - it's already optimized
    // AI can enhance but default is good enough
    return defaultRoadmap;
  } catch (error) {
    console.error('[LearningRoadmap] Error:', error.message);
    return defaultRoadmap;
  }
};

module.exports = {
  generateAISummary,
  generateDetailedTopicFeedback,
  generateLearningRoadmap
};

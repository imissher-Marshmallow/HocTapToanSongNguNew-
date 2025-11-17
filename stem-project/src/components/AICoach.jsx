import React, { useState, useEffect } from 'react';
import AIAnalyzer from '../services/AIAnalyzer';
import PerformanceAnalytics from '../services/PerformanceAnalytics';
import LearningPathGenerator from '../services/LearningPathGenerator';

export default function AICoach({ feedback = [], result = null }) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);

  // Blacklist các từ khóa không phù hợp
  const invalidKeywords = [
    'system', 'hệ thống',
    'database', 'cơ sở dữ liệu',
    'admin', 'quản trị',
    'code', 'mã nguồn',
    'exploit', 'khai thác',
    'hack', 'tấn công',
    'password', 'mật khẩu',
    'private', 'bí mật',
    'inject', 'tiêm',
    'delete', 'xóa',
    'khen tôi',
    'tả tôi',
    'viết về tôi',
    'ai là',
    'bạn là ai'
  ];

  // Validate input
  const isValidPrompt = (text) => {
    if (!text || text.trim().length === 0) {
      return { valid: false, message: 'Vui lòng nhập câu hỏi của bạn' };
    }

    if (text.length > 500) {
      return { valid: false, message: 'Câu hỏi quá dài (tối đa 500 ký tự)' };
    }

    if (text.length < 5) {
      return { valid: false, message: 'Câu hỏi quá ngắn (tối thiểu 5 ký tự)' };
    }

    const lowerText = text.toLowerCase();
    for (let keyword of invalidKeywords) {
      if (lowerText.includes(keyword)) {
        return { 
          valid: false, 
          message: `Xin lỗi, tôi không thể trả lời câu hỏi về "${keyword}". Vui lòng hỏi những câu hỏi liên quan đến học tập hoặc bài kiểm tra.` 
        };
      }
    }

    const learningKeywords = [
      'cách', 'làm sao', 'giải', 'hiểu', 'tính',
      'công thức', 'phương pháp', 'dạng bài', 'ví dụ',
      'bài tập', 'kiểm tra', 'exam', 'quiz',
      'định nghĩa', 'khái niệm', 'lý thuyết',
      'sai', 'lỗi', 'cải thiện', 'mục tiêu', 'tại sao', 'why', 'how'
    ];

    const hasLearningContext = learningKeywords.some(keyword => lowerText.includes(keyword));

    if (!hasLearningContext) {
      return { 
        valid: false, 
        message: 'Vui lòng hỏi những câu hỏi liên quan đến học tập, bài kiểm tra hoặc cách cải thiện.' 
      };
    }

    return { valid: true };
  };

  // Initialize AI suggestions on component mount
  useEffect(() => {
    if (result) {
      generateAISuggestions();
    }
  }, [result]);

  const generateAISuggestions = () => {
    try {
      // Use real AI algorithms for analysis
      const analysis = AIAnalyzer.analyzeResults({
        answers: result.answers || [],
        questions: result.questions || [],
        metadata: { score: result.score }
      });

      setAiSuggestions(analysis);
    } catch (err) {
      console.error('Error generating AI suggestions:', err);
    }
  };

  const generateContextualResponse = (userQuestion) => {
    if (!aiSuggestions) {
      return 'Chưa có dữ liệu phân tích. Vui lòng hoàn thành một bài kiểm tra trước.';
    }

    const lowerQ = userQuestion.toLowerCase();
    const insights = aiSuggestions.insights;

    // Match user question with relevant insights
    let contextualResp = '';

    if (lowerQ.includes('yếu') || lowerQ.includes('sai') || lowerQ.includes('lỗi')) {
      const weaknesses = aiSuggestions.weaknesses.patterns.conceptualGaps;
      if (weaknesses.length > 0) {
        contextualResp = `Điểm yếu chính của bạn:\n${weaknesses
          .map(w => `• ${w.concept} (${w.severity})`)
          .join('\n')}\n\nHãy tập trung vào những khái niệm này trước tiên.`;
      }
    } else if (lowerQ.includes('tốt') || lowerQ.includes('mạnh')) {
      if (aiSuggestions.performance.overallScore >= 80) {
        contextualResp = `🌟 Bạn đã có thành tích tốt! Hãy tiếp tục hoàn thiện những khía cạnh còn yếu.`;
      }
    } else if (lowerQ.includes('lộ trình') || lowerQ.includes('cải thiện')) {
      const learningPath = LearningPathGenerator.generatePersonalizedPath(aiSuggestions);
      contextualResp = `📚 Lộ trình học tập được đề xuất:\n${learningPath.milestones
        .map(m => `• ${m.title} (${m.duration})`)
        .join('\n')}`;
    } else if (lowerQ.includes('tốc độ') || lowerQ.includes('thời gian')) {
      contextualResp = `⏱️ Phân tích quản lý thời gian:\nĐể cải thiện tốc độ làm bài, hãy luyện tập thêm các dạng bài tương tự.`;
    } else {
      // Default intelligent response based on performance
      const mainInsight = insights[0];
      if (mainInsight) {
        contextualResp = `${mainInsight.message}\n\nÞ ưu tiên: ${mainInsight.priority}`;
      }
    }

    return contextualResp || 'Hãy cụ thể hóa câu hỏi của bạn để tôi có thể giúp tốt hơn.';
  };

  const handleAskAI = async () => {
    setError('');
    setResponse('');

    const validation = isValidPrompt(prompt);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    setIsLoading(true);

    // Generate contextual response using AI analysis
    setTimeout(() => {
      const aiResponse = generateContextualResponse(prompt);
      setResponse(aiResponse);
      setIsLoading(false);
      setPrompt('');
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAskAI();
    }
  };

  return (
    <div className="ai-coach-container">
      <div className="ai-coach">
        <h2 className="text-2xl font-bold mb-4">🤖 AI Coach - Trợ lý học tập thông minh</h2>
        <p className="text-sm text-gray-600 mb-4">
          💡 Hỏi về điểm yếu, lộ trình học, hoặc cách cải thiện kết quả dựa trên phân tích thực tế.
        </p>

        {aiSuggestions && (
          <div className="ai-insights-summary mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
            <p className="text-sm text-blue-900">
              📊 <strong>AI Analysis:</strong> {aiSuggestions.performance.overallScore.toFixed(1)}/100 
              • {aiSuggestions.weaknesses.patterns.conceptualGaps.length} gaps detected 
              • {aiSuggestions.insights.length} insights generated
            </p>
          </div>
        )}
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ví dụ: 'Điểm yếu chính của tôi là gì?' hoặc 'Nên học gì tiếp theo?'..."
          className="w-full p-3 border-2 border-gray-300 rounded-lg mb-4 focus:border-purple-500 focus:outline-none transition-colors"
          rows="4"
          disabled={isLoading}
        />

        {error && (
          <div className="error-message mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleAskAI}
          disabled={isLoading}
          className={`ai-coach-btn ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading ? '⏳ Phân tích...' : '✨ Hỏi AI'}
        </button>

        {response && (
          <div className="response mt-4 p-4 bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 rounded-lg border border-purple-200">
            <h3 className="font-semibold mb-2 text-purple-900">💬 Phân tích từ AI:</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{response}</p>
          </div>
        )}
      </div>
    </div>
  );
}

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
      'sai', 'lỗi', 'cải thiện', 'mục tiêu', 'tại sao', 'why', 'how',
      'học', 'ôn', 'luyện', 'tốt', 'giỏi', 'yếu', 'khó', 'dễ',
      'điểm', 'kết quả', 'score', 'improvement',
      'nên', 'tiếp', 'nắm', 'thêm', 'bao lâu', 'nào', 'nhỉ'
    ];

    const hasLearningContext = learningKeywords.some(keyword => lowerText.includes(keyword));

    if (!hasLearningContext) {
      return { 
        valid: false, 
        message: 'Vui lòng hỏi những câu hỏi liên quan đến học tập hoặc cách cải thiện bài kiểm tra.' 
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
    const score = aiSuggestions.performance?.overallScore || 0;
    const weaknesses = aiSuggestions.weaknesses?.patterns?.conceptualGaps || [];

    let contextualResp = '';

    if (lowerQ.includes('yếu') || lowerQ.includes('sai') || lowerQ.includes('lỗi')) {
      if (weaknesses.length > 0) {
        contextualResp = `📌 Điểm yếu chính của bạn:\n${weaknesses
          .slice(0, 3)
          .map(w => `• ${w.concept || 'Phần chưa nắm'}`)
          .join('\n')}\n\nHãy tập trung vào những khái niệm này trước tiên. Luyện tập thêm bài tập liên quan.`;
      } else {
        contextualResp = `✅ Bạn không có điểm yếu nổi bật! Tiếp tục ôn luyện để giữ kết quả.`;
      }
    } else if (lowerQ.includes('tốt') || lowerQ.includes('mạnh') || lowerQ.includes('giỏi')) {
      if (score >= 80) {
        contextualResp = `🌟 Rất tốt! Bạn đã đạt ${score.toFixed(1)}/100.\n\nTiếp tục phát huy và không ngần ngại luyện tập thêm các bài tập khó hơn!`;
      } else {
        contextualResp = `👍 Bạn đã có tiến bộ! Điểm hiện tại: ${score.toFixed(1)}/100.\n\nTập trung vào các điểm yếu để nâng cao kết quả.`;
      }
    } else if (lowerQ.includes('lộ trình') || lowerQ.includes('cải thiện') || lowerQ.includes('nên') || lowerQ.includes('tiếp')) {
      contextualResp = `📚 Lộ trình học tập gợi ý:\n1️⃣ Ôn lại những phần cơ bản\n2️⃣ Làm thêm bài tập thực hành\n3️⃣ Kiểm tra lại những phần sai\n4️⃣ Tập trung vào những dạng bài khó hơn\n5️⃣ Kiểm tra lại toàn bộ để đánh giá tiến bộ`;
    } else if (lowerQ.includes('tốc độ') || lowerQ.includes('thời gian') || lowerQ.includes('bao lâu')) {
      contextualResp = `⏱️ Để cải thiện tốc độ làm bài:\n• Luyện tập thêm các dạng bài tương tự\n• Ghi nhớ công thức và phương pháp\n• Bắt đầu với bài dễ, rồi chuyển lên khó\n• Thực hành liên tục để tăng tốc độ`;
    } else if (lowerQ.includes('học') || lowerQ.includes('cách')) {
      contextualResp = `🎯 Cách học hiệu quả:\n• Đọc kỹ định nghĩa và khái niệm\n• Làm bài tập từng dạng\n• Kiểm tra lại những phần sai\n• Ôn tập thường xuyên\n• Không ngại hỏi khi gặp khó khăn`;
    } else {
      contextualResp = `📈 Điểm của bạn: ${score.toFixed(1)}/100\n\nBạn có thể hỏi tôi về:\n• Điểm yếu của mình\n• Cách cải thiện\n• Lộ trình học tập\n• Gợi ý để học tốt hơn`;
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

    try {
      console.log('[AICoach] Asking question:', prompt);
      const apiBase = process.env.REACT_APP_API_BASE || 
                     (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                       ? 'http://localhost:5000' 
                       : '');
      const apiUrl = apiBase ? `${apiBase}/api/ai/coach` : '/api/ai/coach';
      
      console.log('[AICoach] API endpoint:', apiUrl);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: prompt,
          quizResult: result || {},
          analysisData: aiSuggestions || {}
        })
      });

      console.log('[AICoach] API response status:', response.status);
      
      if (!response.ok) {
        console.log('[AICoach] Using fallback response due to API error');
        const fallbackResponse = generateContextualResponse(prompt);
        setResponse(fallbackResponse);
        setPrompt('');
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      console.log('[AICoach] API response:', data);
      setResponse(data.answer || data.response || 'Không thể xử lý câu hỏi. Sử dụng phân tích cục bộ.');
      setPrompt('');
    } catch (err) {
      console.log('[AICoach] Fetch failed, using fallback:', err.message);
      const fallbackResponse = generateContextualResponse(prompt);
      setResponse(fallbackResponse);
      setPrompt('');
    } finally {
      setIsLoading(false);
    }
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
          <div className="response mt-4 p-4 bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-50 rounded-lg border border-cyan-200">
            <h3 className="font-semibold mb-2 text-cyan-900">💬 Phân tích từ AI:</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{response}</p>
          </div>
        )}
      </div>
    </div>
  );
}

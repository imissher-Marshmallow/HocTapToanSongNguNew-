import React, { useState } from 'react';

export default function AICoach() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');

  const handleAskAI = () => {
    // setset
    setResponse('Đây là phản hồi mẫu từ AI Coach. Bạn có thể cải thiện bằng cách luyện tập thêm các bài tập về nhận biết và vận dụng.');
  };

  return (
    <div className="ai-coach bg-gray-50 p-6 rounded-lg mt-12">
      <h2 className="text-2xl font-bold mb-4">AI Coach - Hỏi đáp với Trợ lý AI</h2>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Nhập câu hỏi của bạn về bài kiểm tra hoặc cách cải thiện..."
        className="w-full p-3 border rounded mb-4"
        rows="4"
      />
      <button
        onClick={handleAskAI}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
      >
        Hỏi AI
      </button>
      {response && (
        <div className="response mt-4 p-4 bg-white rounded border">
          <h3 className="font-semibold mb-2">Phản hồi từ AI:</h3>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}

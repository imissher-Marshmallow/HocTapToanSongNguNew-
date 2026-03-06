/**
 * AI Chatbot Component
 * Real-time chat with GPT-4 powered by student learning context from Supabase
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, RotateCcw, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AIChat.css';

const AIChat = () => {
  const { userId } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(null);
  const [contextInfo, setContextInfo] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history on mount
  useEffect(() => {
    if (userId) {
      loadChatHistory();
    }
  }, [userId]);

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`/api/chat/history/${userId}`);
      const data = await response.json();
      
      if (data.conversations && data.conversations.length > 0) {
        const formattedMessages = data.conversations.flatMap(conv => [
          { id: conv.id, role: 'user', content: conv.user_message, timestamp: conv.created_at },
          { id: `${conv.id}-ans`, role: 'assistant', content: conv.assistant_message, timestamp: conv.created_at }
        ]);
        setMessages(formattedMessages);
      } else {
        // Start with welcome message
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: '👋 Xin chào! Tôi là trợ lý học tập AI của bạn. Tôi có thể giúp bạn hiểu các khái niệm toán học, trả lời câu hỏi, và gợi ý lộ trình học tập dựa trên hiệu suất của bạn. Bạn có câu hỏi nào không?',
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } catch (err) {
      console.error('[Chat] Error loading history:', err);
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: '👋 Xin chào! Tôi là AI tutor của bạn. Có câu hỏi gì tôi có thể giúp không?',
          timestamp: new Date().toISOString()
        }
      ]);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;

    // Get userId from Auth context or localStorage (fallback)
    const finalUserId = userId || parseInt(localStorage.getItem('userId'));
    if (!finalUserId) {
      setError('User not authenticated. Please log in again.');
      setLoading(false);
      return;
    }

    // Add user message to UI immediately
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    setError(null);

    try {
      // Prepare conversation history for API
      const conversationHistory = messages
        .filter(m => m.role !== 'system')
        .slice(-10) // Last 10 messages for context
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      const response = await fetch('/api/chat/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: parseInt(finalUserId),
          message: inputValue,
          conversationHistory
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to get response');
      }

      const data = await response.json();

      // Add assistant response
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
        contextUsed: data.studentContextUsed
      };

      setMessages(prev => [...prev, assistantMessage]);
      setContextInfo(data.studentContextUsed);
    } catch (err) {
      console.error('[Chat]Error sending message:', err);
      setError(err.message);
      
      // Add error message
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `❌ Xin lỗi, có lỗi xảy ra: ${err.message}. Vui lòng thử lại.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    const finalUserId = userId || parseInt(localStorage.getItem('userId'));
    if (!finalUserId) {
      setError('User not authenticated');
      return;
    }
    
    if (window.confirm('Bạn có chắc chắn muốn xóa lịch sử chat?')) {
      try {
        await fetch(`/api/chat/clear/${finalUserId}`, { method: 'DELETE' });
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: '👋 Xin chào! Tôi là AI tutor của bạn. Có câu hỏi gì tôi có thể giúp không?',
            timestamp: new Date().toISOString()
          }
        ]);
        setContextInfo(null);
      } catch (err) {
        console.error('[Chat] Error clearing chat:', err);
        setError('Failed to clear chat history');
      }
    }
  };

  // Floating button view
  if (!isOpen) {
    return (
      <button
        className="chat-floating-button"
        onClick={() => setIsOpen(true)}
        title="Open AI Tutor"
      >
        🤖
      </button>
    );
  }

  // Full chat view
  return (
    <motion.div
      className="ai-chat-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-title">
          <h3>🤖 AI Tutor</h3>
          <p className="chat-subtitle">Powered by GPT-4 + Your Learning Data</p>
        </div>
        <div className="chat-actions">
          <button
            className="chat-btn clear-btn"
            onClick={clearChat}
            title="Clear chat history"
          >
            <RotateCcw size={18} />
          </button>
          <button
            className="chat-btn close-btn"
            onClick={() => setIsOpen(false)}
            title="Close chat"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Context Info Bar */}
      {contextInfo && (
        <motion.div
          className="chat-context-info"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <p className="context-label">📚 Using your learning data:</p>
          <div className="context-tags">
            {contextInfo.weakAreas?.length > 0 && (
              <span className="tag weak">🔧 {contextInfo.weakAreas[0]}</span>
            )}
            {contextInfo.strongAreas?.length > 0 && (
              <span className="tag strong">✅ {contextInfo.strongAreas[0]}</span>
            )}
            {contextInfo.recommendedDifficulty && (
              <span className="tag difficulty">📈 {contextInfo.recommendedDifficulty}</span>
            )}
            {contextInfo.recentScore && (
              <span className="tag score">📊 {contextInfo.recentScore}/10</span>
            )}
          </div>
        </motion.div>
      )}

      {/* Messages Area */}
      <div className="chat-messages">
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={msg.id}
              className={`chat-message ${msg.role}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                <p className="message-text">{msg.content}</p>
                <span className="message-time">
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : ''}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            className="chat-message assistant"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          className="chat-error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {error}
        </motion.div>
      )}

      {/* Input Area */}
      <form className="chat-input-form" onSubmit={sendMessage}>
        <input
          type="text"
          className="chat-input"
          placeholder="Hỏi về toán học, kế hoạch học tập, khó khăn của bạn..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={loading || !inputValue.trim()}
          title="Send message"
        >
          {loading ? '⏳' : <Send size={20} />}
        </button>
      </form>

      {/* Footer Info */}
      <div className="chat-footer">
        <p className="footer-text">
          💡 Tip: Hãy hỏi về những điểm yếu của bạn hoặc yêu cầu gợi ý lộ trình học tập!
        </p>
      </div>
    </motion.div>
  );
};

export default AIChat;

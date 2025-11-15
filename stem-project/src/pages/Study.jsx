import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/Study.css';

export default function Study() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [timerConfig, setTimerConfig] = useState({ hours: 0, minutes: 30, seconds: 0 });
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { type: 'ai', text: language === 'vi' ? 'Chào bạn! Tôi là trợ lý AI của bạn. Cần giúp gì không?' : 'Hello! I\'m your AI assistant. How can I help?' }
  ]);
  const [userInput, setUserInput] = useState('');
  const [activeTab, setActiveTab] = useState('resources'); // resources, notes, chat

  // Calculate total seconds from config
  useEffect(() => {
    const total = timerConfig.hours * 3600 + timerConfig.minutes * 60 + timerConfig.seconds;
    setTotalSeconds(total);
    if (!isRunning) {
      setRemainingSeconds(total);
    }
  }, [timerConfig, isRunning]);

  // Timer logic
  useEffect(() => {
    let interval = null;
    if (isRunning && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsFocusMode(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, remainingSeconds]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    if (totalSeconds > 0) {
      setIsRunning(true);
      setIsFocusMode(true);
    }
  };

  const handlePauseTimer = () => {
    setIsRunning(false);
  };

  const handleResumeTimer = () => {
    if (remainingSeconds > 0) {
      setIsRunning(true);
    }
  };

  const handleCancelTimer = () => {
    setIsRunning(false);
    setIsFocusMode(false);
    setRemainingSeconds(totalSeconds);
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      const task = {
        id: Date.now(),
        title: newTaskTitle,
        description: newTaskDesc,
        completed: false
      };
      setTasks([...tasks, task]);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setShowTaskForm(false);
    }
  };

  const handleToggleTask = (id) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleRemoveTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const handleSendMessage = () => {
    if (userInput.trim()) {
      setChatMessages([...chatMessages, { type: 'user', text: userInput }]);
      setUserInput('');

      setTimeout(() => {
        const responses = language === 'vi' ? [
          'Tuyệt vời! Bạn đang làm rất tốt. Tiếp tục cố gắng!',
          'Đó là một câu hỏi hay. Bạn nên tập trung vào khái niệm này.',
          'Bạn đã tiến bộ rất nhiều. Hãy thử bài tập tiếp theo!',
          'Cần giải thích chi tiết hơn? Tôi sẵn sàng giúp!'
        ] : [
          'Great! You\'re doing well. Keep going!',
          'That\'s a good question. Focus on this concept.',
          'You\'ve made great progress. Try the next exercise!',
          'Need a more detailed explanation? I\'m here to help!'
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        setChatMessages(prev => [...prev, { type: 'ai', text: randomResponse }]);
      }, 500);
    }
  };

  const studyResources = [
    { id: 1, title: language === 'vi' ? 'Các hằng đẳng thức đáng nhớ' : 'Notable Identities', link: 'https://vietjack.com', icon: '📐' },
    { id: 2, title: language === 'vi' ? 'Phương trình bậc nhất' : 'First-degree Equations', link: 'https://hoc247.net', icon: '📝' },
    { id: 3, title: language === 'vi' ? 'Hệ phương trình' : 'System of Equations', link: 'https://vietjack.com', icon: '🔢' },
  ];

  if (isFocusMode) {
    return (
      <div className="focus-mode-overlay">
        <motion.div
          className="focus-mode-container"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="focus-animation">
            <svg className="focus-ring" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="url(#focusGradient)" strokeWidth="2" />
              <defs>
                <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="focus-content">
            <h2>{language === 'vi' ? 'Chế độ Tập Trung' : 'Focus Mode'}</h2>
            <div className="focus-timer">{formatTime(remainingSeconds)}</div>

            <div className="focus-controls">
              {isRunning ? (
                <>
                  <button className="btn-focus btn-pause" onClick={handlePauseTimer}>
                    {language === 'vi' ? 'Tạm dừng' : 'Pause'}
                  </button>
                  <button className="btn-focus btn-cancel" onClick={handleCancelTimer}>
                    {language === 'vi' ? 'Hủy' : 'Cancel'}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-focus btn-resume" onClick={handleResumeTimer}>
                    {language === 'vi' ? 'Tiếp tục' : 'Resume'}
                  </button>
                  <button className="btn-focus btn-cancel" onClick={handleCancelTimer}>
                    {language === 'vi' ? 'Hủy' : 'Cancel'}
                  </button>
                </>
              )}
            </div>

            <p className="focus-message">
              {language === 'vi' ? 'Hãy tập trung vào việc học của bạn...' : 'Stay focused on your learning...'}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="study-container">
      <div className="study-layout">
        {/* Left: Timer & Tasks */}
        <div className="study-sidebar">
          {/* Timer Section */}
          <motion.div className="timer-section" layout>
            <h3>⏱️ {language === 'vi' ? 'Bộ Đếm Giờ' : 'Timer'}</h3>

            <div className="timer-config">
              <div className="time-input-group">
                <label>{language === 'vi' ? 'Giờ' : 'Hours'}</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={timerConfig.hours}
                  onChange={(e) => setTimerConfig({ ...timerConfig, hours: parseInt(e.target.value) || 0 })}
                  disabled={isRunning}
                />
              </div>
              <div className="time-input-group">
                <label>{language === 'vi' ? 'Phút' : 'Minutes'}</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={timerConfig.minutes}
                  onChange={(e) => setTimerConfig({ ...timerConfig, minutes: parseInt(e.target.value) || 0 })}
                  disabled={isRunning}
                />
              </div>
              <div className="time-input-group">
                <label>{language === 'vi' ? 'Giây' : 'Seconds'}</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={timerConfig.seconds}
                  onChange={(e) => setTimerConfig({ ...timerConfig, seconds: parseInt(e.target.value) || 0 })}
                  disabled={isRunning}
                />
              </div>
            </div>

            <div className="timer-display">
              <div className="time-large">{formatTime(remainingSeconds)}</div>
            </div>

            <div className="timer-buttons">
              {!isRunning ? (
                <button className="btn-start" onClick={handleStartTimer} disabled={totalSeconds === 0}>
                  {language === 'vi' ? 'Bắt Đầu' : 'Start'}
                </button>
              ) : (
                <>
                  <button className="btn-pause" onClick={handlePauseTimer}>
                    {language === 'vi' ? 'Tạm Dừng' : 'Pause'}
                  </button>
                  <button className="btn-cancel" onClick={handleCancelTimer}>
                    {language === 'vi' ? 'Hủy' : 'Cancel'}
                  </button>
                </>
              )}
            </div>
          </motion.div>

          {/* Task List */}
          <motion.div className="tasks-section" layout>
            <div className="tasks-header">
              <h3>📋 {language === 'vi' ? 'Danh Sách Việc' : 'Task List'}</h3>
              <button className="btn-add-task" onClick={() => setShowTaskForm(!showTaskForm)}>
                +
              </button>
            </div>

            <AnimatePresence>
              {showTaskForm && (
                <motion.div
                  className="task-form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <input
                    type="text"
                    placeholder={language === 'vi' ? 'Tiêu đề' : 'Title'}
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="task-input"
                  />
                  <textarea
                    placeholder={language === 'vi' ? 'Mô tả' : 'Description'}
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    className="task-textarea"
                    rows="2"
                  />
                  <div className="task-form-buttons">
                    <button className="btn-submit" onClick={handleAddTask}>
                      {language === 'vi' ? 'Thêm' : 'Add'}
                    </button>
                    <button className="btn-cancel-form" onClick={() => setShowTaskForm(false)}>
                      {language === 'vi' ? 'Hủy' : 'Cancel'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="tasks-list">
              <AnimatePresence>
                {tasks.length === 0 ? (
                  <p className="no-tasks">{language === 'vi' ? 'Không có công việc' : 'No tasks'}</p>
                ) : (
                  tasks.map(task => (
                    <motion.div
                      key={task.id}
                      className={`task-item ${task.completed ? 'completed' : ''}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleTask(task.id)}
                        className="task-checkbox"
                      />
                      <div className="task-content">
                        <p className="task-title">{task.title}</p>
                        {task.description && <p className="task-desc">{task.description}</p>}
                      </div>
                      <button
                        className="btn-remove-task"
                        onClick={() => handleRemoveTask(task.id)}
                      >
                        ✕
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Right: Resources, Notes, Chat */}
        <motion.div className="study-main" layout>
          {/* Tab Navigation */}
          <div className="study-tabs">
            <button
              className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`}
              onClick={() => setActiveTab('resources')}
            >
              📚 {language === 'vi' ? 'Tài Nguyên' : 'Resources'}
            </button>
            <button
              className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              📝 {language === 'vi' ? 'Ghi Chú' : 'Notes'}
            </button>
            <button
              className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              💬 {language === 'vi' ? 'Chat AI' : 'AI Chat'}
            </button>
          </div>

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <motion.div
              className="tab-content resources-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h3>{language === 'vi' ? 'Tài Nguyên Học Tập' : 'Study Resources'}</h3>
              <div className="resources-list">
                {studyResources.map((resource) => (
                  <motion.a
                    key={resource.id}
                    href={resource.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="resource-card"
                    whileHover={{ y: -4 }}
                  >
                    <div className="resource-icon">{resource.icon}</div>
                    <div className="resource-info">
                      <h4>{resource.title}</h4>
                      <p className="resource-link">{resource.link}</p>
                    </div>
                    <span className="resource-arrow">→</span>
                  </motion.a>
                ))}
              </div>
            </motion.div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <motion.div
              className="tab-content notes-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h3>{language === 'vi' ? 'Ghi Chú Của Bạn' : 'Your Notes'}</h3>
              <textarea
                className="notes-textarea"
                placeholder={language === 'vi' ? 'Ghi chú của bạn ở đây...' : 'Type your notes here...'}
              />
            </motion.div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <motion.div
              className="tab-content chat-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="chat-messages">
                <AnimatePresence>
                  {chatMessages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      className={`chat-message ${msg.type}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="message-bubble">{msg.text}</div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="chat-input-area">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                  placeholder={language === 'vi' ? 'Nhập câu hỏi...' : 'Ask a question...'}
                  className="chat-input"
                  rows="3"
                />
                <button className="btn-send" onClick={handleSendMessage}>
                  {language === 'vi' ? 'Gửi' : 'Send'}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

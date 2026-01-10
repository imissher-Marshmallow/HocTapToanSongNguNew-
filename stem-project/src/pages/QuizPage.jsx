import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth, getApiBase } from '../contexts/AuthContext';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import { quizTranslations } from '../translations/quizTranslations';
import { trackQuizAttempt } from '../helpers/learningHomeIntegration';
import '../styles/AzotaQuiz.css';
import classNames from 'classnames';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Small timer display component
function TimerDisplay({ seconds }) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return (
    <div className="timer-display" style={{fontWeight:700,color:'#0f172a'}}>
      ⏱ {mm}:{ss}
    </div>
  );
}

const TOPICS = [
  'Nhận biết (Knowledge)',
  'Thông hiểu (Comprehension)',
  'Vận dụng thấp (Low Application)',
  'Vận dụng cao (High Application)'
];

function QuizPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { token, getUserId } = useAuth();
  const t = quizTranslations[language];
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [selectedContestKey, setSelectedContestKey] = useState(null);
  const [selectedContestIndex, setSelectedContestIndex] = useState(null);
  const [selectedContestName, setSelectedContestName] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [quizStartAt, setQuizStartAt] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const lastSubmitAtRef = React.useRef(0);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const containerRef = React.useRef(null);

  // Anti-cheat state
  const [infractions, setInfractions] = useState(0);
  const infractionsRef = React.useRef(0);
  const lastInfractionAt = React.useRef(0);
  const autoSubmittedRef = React.useRef(false);

  useEffect(() => {
    if (!started) return;
    // Request questions for the selected quiz id when provided, otherwise fall back to 'random'
    const quizKey = id || 'random';
    const apiBaseUrl = getApiBase();
    const endpoint = `${apiBaseUrl}/api/questions/${quizKey}`;

    fetch(endpoint)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        // API returns { questions, contestKey } now. Support both shapes for compatibility.
        if (data && data.questions && Array.isArray(data.questions)) {
          setQuestions(data.questions);
          setSelectedContestKey(data.contestKey || (id || 'random'));
          setSelectedContestIndex(data.contestIndex || null);
          setSelectedContestName(data.contestName || null);
        } else if (Array.isArray(data)) {
          setQuestions(data);
          setSelectedContestKey(id || 'random');
          setSelectedContestIndex(null);
          setSelectedContestName(null);
        } else {
          // unexpected shape
          console.warn('Unexpected questions payload shape', data);
          setQuestions([]);
          setSelectedContestKey(id || 'random');
        }
        setQuestionStartTime(Date.now());
      })
      .catch(err => console.error('Error fetching questions:', err));
  }, [started, id]);

  // Anti-cheat: monitor visibility, focus and fullscreen changes
  useEffect(() => {
    if (!started) return;

    const MIN_INFRACTION_GAP_MS = 1500;

    function recordInfraction(reason) {
      const now = Date.now();
      if (now - lastInfractionAt.current < MIN_INFRACTION_GAP_MS) return; // debounce repeated events
      lastInfractionAt.current = now;
      infractionsRef.current += 1;
      setInfractions(infractionsRef.current);
      // show quick warning
      try { window.navigator && window.navigator.vibrate && window.navigator.vibrate(200); } catch (e) {}
      // If reached limit, auto-submit
      if (infractionsRef.current >= 3 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        // small timeout so UI can update before submit
        setTimeout(() => {
          submitQuiz(answersRef.current);
        }, 300);
      }
      console.warn('Cheat infraction recorded:', reason, 'count=', infractionsRef.current);
    }

    function onVisibilityChange() {
      if (document.hidden) recordInfraction('visibility:hidden');
    }

    function onBlur() {
      recordInfraction('window:blur');
    }

    function onFullscreenChange() {
      // If user exits fullscreen during exam, count as infraction
      if (!document.fullscreenElement) recordInfraction('fullscreen:exit');
    }

    function onKeyDown(e) {
      // Best-effort detection of Alt+Tab or switching keys. Browsers may not expose Alt+Tab reliably,
      // but we can watch for common modifier combos (Alt, Meta) plus Tab or Escape.
      if (e.altKey && e.key === 'Tab') {
        recordInfraction('alt+tab');
      }
      // detect Meta/Command+Tab on Mac (best-effort)
      if ((e.metaKey || e.ctrlKey) && e.key === 'Tab') {
        recordInfraction('meta+tab');
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [started]);

  // Countdown timer (default 60 minutes = 3600 seconds)
  const [remainingSec, setRemainingSec] = useState(60 * 60);
  const answersRef = React.useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  // FIX: Add navigation warning to prevent losing quiz progress
  useEffect(() => {
    if (!started || isSubmitting) return;

    // Warn before closing/navigating away
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Bạn có chắc chắn muốn rời khỏi? Bạn sẽ mất tiến độ của bài kiểm tra.';
      return 'You will lose your quiz progress if you leave now.';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [started, isSubmitting]);

  // Start handler requests fullscreen on user gesture then starts the quiz
  const handleStart = async () => {
    try {
      const el = containerRef.current || document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch (e) {
      console.warn('Failed to enter fullscreen:', e);
    }
    setStarted(true);
    setQuizStartAt(Date.now());
  };
  useEffect(() => {
    if (!started) return;
    // reset timer when quiz starts
    setRemainingSec(60 * 60);
    const interval = setInterval(() => {
      setRemainingSec(prev => {
        if (prev <= 1) {
          // time's up: auto-submit
          // submit only the answers collected so far (use ref to get latest)
          submitQuiz(answersRef.current);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  useEffect(() => {
    setSelectedAnswer(null); // Reset selection when changing questions
  }, [currentQuestionIndex]);

  // Math formatter: convert LaTeX $...$ to HTML with KaTeX and handle x^2 notation
  const formatMath = (text) => {
    if (!text) return '';
    
    let html = text;
    
    // Replace $...$ patterns with KaTeX-rendered HTML
    html = html.replace(/\$([^\$]+)\$/g, (match, latex) => {
      try {
        return katex.renderToString(latex, { throwOnError: false });
      } catch (e) {
        console.warn('KaTeX render error:', e);
        return match; // return original if fails
      }
    });
    
    // Also handle ^digits for fallback (convert to <sup>)
    html = html.replace(/\^(\d+)/g, '<sup>$1</sup>');
    
    return html;
  };

  // Adapt remaining questions: move questions of the same topic earlier
  const adaptQuestions = (currentIdx, topic) => {
    setQuestions(prev => {
      const remaining = prev.slice(currentIdx + 1);
      const before = prev.slice(0, currentIdx + 1);
      // pull candidates with same topic to front of remaining
      const sameTopic = remaining.filter(q => q.topic === topic);
      const others = remaining.filter(q => q.topic !== topic);
      return [...before, ...sameTopic, ...others];
    });
  };

  // State for tracking multi-statement true/false answers
  const [tfStatementAnswers, setTfStatementAnswers] = useState({});
  const [shortAnswerValue, setShortAnswerValue] = useState('');

  // Detect question type based on structure
  const getQuestionType = (q) => {
    if (!q) return 'multiple_choice';
    if (q.statements && Array.isArray(q.statements)) return 'true_false';
    if (q.numerical_answer !== undefined || q.text_answer !== undefined) return 'short_answer';
    return 'multiple_choice';
  };

  // Reset form values when changing questions
  useEffect(() => {
    setTfStatementAnswers({});
    setShortAnswerValue('');
    setSelectedAnswer(null);
  }, [currentQuestionIndex]);

  const handleAnswer = (answerData) => {
    if (!questions || questions.length === 0 || !questions[currentQuestionIndex]) {
      console.error('[QuizPage] Invalid question state');
      return;
    }
    
    const timeTakenSec = Math.floor((Date.now() - questionStartTime) / 1000);
    const q = questions[currentQuestionIndex];
    const questionType = getQuestionType(q);
    
    // DEBUG: Log answer before updating state
    console.log('[QuizPage] ✅ ANSWER HANDLER DEBUG:');
    console.log('[QuizPage]   - Current question index:', currentQuestionIndex);
    console.log('[QuizPage]   - Question ID:', q.id);
    console.log('[QuizPage]   - Current answers array BEFORE:', answers.length, 'answers');
    answers.forEach((a, idx) => {
      console.log('[QuizPage]     Answer ' + idx + ':', a.questionId);
    });
    
    const newAnswer = {
      questionId: q.id,
      questionType,
      timeTakenSec,
      ...answerData
    };
    
    // FIX: Check if this question was already answered before
    // If it was, REPLACE the old answer instead of appending a new one
    let updatedAnswers;
    const existingAnswerIndex = answers.findIndex(a => a.questionId === q.id);
    
    if (existingAnswerIndex >= 0) {
      // Replace existing answer for this question
      updatedAnswers = [...answers];
      updatedAnswers[existingAnswerIndex] = newAnswer;
      console.log('[QuizPage]   - RE-ANSWERED: Replacing answer at index', existingAnswerIndex);
    } else {
      // New answer - append to the list
      updatedAnswers = [...answers, newAnswer];
      console.log('[QuizPage]   - NEW ANSWER: Adding new answer (was not previously answered)');
    }
    
    console.log('[QuizPage]   - Updated answers array AFTER:', updatedAnswers.length, 'answers');
    updatedAnswers.forEach((a, idx) => {
      console.log('[QuizPage]     Answer ' + idx + ':', a.questionId);
    });
    
    setAnswers(updatedAnswers);
    
    // Adapt questions if answer was wrong (for multiple choice)
    if (questionType === 'multiple_choice' && q.options && Array.isArray(q.options)) {
      const selectedIndex = q.options.indexOf(answerData.selectedOption);
      const isCorrect = selectedIndex === (q.answerIndex ?? -1);
      if (!isCorrect && q.topic) {
        adaptQuestions(currentQuestionIndex, q.topic);
      }
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setQuestionStartTime(Date.now());
    } else {
      // FIX: On last question, don't auto-submit - wait for user to click submit
      console.log('[QuizPage] ✅ LAST QUESTION ANSWERED');
      console.log('[QuizPage]   - Total answers before submit:', updatedAnswers.length);
      console.log('[QuizPage]   - Total questions:', questions.length);
      console.log('[QuizPage]   - Waiting for user to click submit button');
      setShowSubmitDialog(true);
    }
  };

  const submitQuiz = async (finalAnswers) => {
    if (isSubmitting) {
      console.warn('Submission already in progress — skipping duplicate submit');
      return;
    }
    // client-side debounce (2s)
    const now = Date.now();
    if (now - lastSubmitAtRef.current < 2000) {
      console.warn('Debounced duplicate submit');
      return;
    }
    lastSubmitAtRef.current = now;
    setIsSubmitting(true);
    const userId = getUserId();
    const isAutoSubmitted = autoSubmittedRef.current;
    
    // DEBUG: Log submission details
    console.log('[QuizPage] ✅ SUBMIT HANDLER DEBUG:');
    console.log('[QuizPage]   - Final answers count:', finalAnswers.length);
    console.log('[QuizPage]   - Total questions:', questions.length);
    console.log('[QuizPage]   - Is auto submitted:', isAutoSubmitted);
    finalAnswers.forEach((ans, idx) => {
      console.log('[QuizPage]     Answer ' + idx + ':', ans.questionId, '- Type:', ans.questionType);
    });
    
    const payload = {
      userId,
      quizId: selectedContestKey || id || 'random',
      answers: finalAnswers,
      questions: questions,
      isAutoSubmitted: isAutoSubmitted
    };
    // attach contest metadata when available so backend and history can record it
    if (selectedContestIndex) payload.contestIndex = selectedContestIndex;
    if (selectedContestName) payload.contestName = selectedContestName;
    try {
      const apiBaseUrl = getApiBase();
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      // 1. Analyze quiz for AI feedback
      // Mark analyze request as skipSave so backend will not persist here (we'll persist once below)
      // generate a submissionId to make server-side saves idempotent
      const submissionId = (window && window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `sid-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
      const analyzePayload = { ...payload, skipSave: true, submissionId };
    const res = await fetch(`${apiBaseUrl}/api/analyze-quiz`, {
        method: 'POST',
        headers,
        body: JSON.stringify(analyzePayload),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const result = await res.json();
      
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response from server');
      }
      const timeTaken = quizStartAt ? Math.floor((Date.now() - quizStartAt) / 1000) : Math.floor((Date.now() - questionStartTime) / 1000);
      const savePayload = {
        userId,
        quizId: selectedContestKey || id || 'random',
        quizName: selectedContestKey || id || 'random',
        answers: finalAnswers,
        questions: questions,
        score: result.score || 0,
        percentage: result.percentage || 0,
        ai_analysis: result,
        timeTaken,
        isAutoSubmitted: isAutoSubmitted
      };
      // attach submissionId so server can dedupe
      savePayload.submissionId = submissionId;
      const saveRes = await fetch(`${apiBaseUrl}/api/results`, {
        method: 'POST',
        headers,
        body: JSON.stringify(savePayload),
      });
      if (!saveRes.ok) {
        throw new Error(`Failed to save result! status: ${saveRes.status}`);
      }
      const savedResult = await saveRes.json();

      // Track quiz attempt for learning home (automatically updates weak areas, daily stats, etc.)
      if (userId && result.percentage !== undefined) {
        const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);
        await trackQuizAttempt(
          userId,
          selectedContestKey || id || 'random',
          result.score || 0,
          result.percentage / 100,
          timeTaken,
          finalAnswers,
          questions,
          apiBaseUrl
        );
      }

      // Pass full result object with answers and questions for AICoach analysis
      setToastMessage('Submitted successfully');
      navigate('/result', { state: { ...result, answers: finalAnswers, questions: questions } });
      return;
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setIsSubmitting(false);
      setToastMessage('Submission failed. Please try again.');
    }
  };

  if (!started) {
    return (
      <div className="quiz-start container mx-auto px-6 py-12 text-center">
        <h1 className="text-3xl font-bold mb-4">{t.test} {id}</h1>
        <p className="text-gray-600 mb-6">{t.ready}</p>
        <button
          onClick={handleStart}
          className="bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors"
        >
          {t.startTest}
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return <div className="container mx-auto px-6 py-12 text-center">{t.loading}</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];

  
  return (
    <div ref={containerRef} className={classNames('quiz-container', { 'review-mode': isReviewMode })}>
      <div className="quiz-header">
        <h1 className="quiz-title">{t.test} {id}</h1>
        <div className="quiz-progress">
          {t.question} {currentQuestionIndex + 1} {t.of} {questions.length}
        </div>
        <div className="quiz-timer">
          <TimerDisplay seconds={remainingSec} />
        </div>
      </div>

      {/* Anti-cheat banner */}
      {infractions > 0 && infractions < 3 && (
        <div className="anti-cheat-banner" style={{background:'#fee2e2',color:'#991b1b',padding:'8px',borderRadius:6,margin:'8px 0'}}>
          Cảnh báo: Phát hiện rời khỏi bài kiểm tra {infractions} lần. Hết cảnh báo sau {3 - infractions} lần nữa sẽ tự động nộp bài.
        </div>
      )}
      {infractions >= 3 && (
        <div className="anti-cheat-banner" style={{background:'#fecaca',color:'#7f1d1d',padding:'8px',borderRadius:6,margin:'8px 0'}}>
          Bài kiểm tra đang được nộp tự động do vi phạm chính sách thi.
        </div>
      )}

      <div className="topics-section">
        <div className="topic-tabs">
          {TOPICS.map((topic, idx) => (
            <div
              key={idx}
              className={classNames('topic-tab', {
                'active': currentQuestion?.topic === topic
              })}
            >
              {topic}
            </div>
          ))}
        </div>
      </div>

      <div className="quiz-instructions">
        <div className="instruction-item">
          <span className="instruction-icon"></span>
          <span className="instruction-text">
            {isReviewMode ? t.reviewInstructions : t.quizInstructions}
          </span>
        </div>
        <div className="instruction-item">
          <span className="instruction-icon"></span>
          <span className="instruction-text">{t.timeInstructions}</span>
        </div>
        <div className="instruction-item">
          <span className="instruction-icon"></span>
          <span className="instruction-text">{t.navigationInstructions}</span>
        </div>
      </div>

      <div className="question-container">
        <div className="question-topic">{currentQuestion?.topic}</div>
        <div
          className="question-text"
          dangerouslySetInnerHTML={{
            __html: formatMath(
              language === 'en'
                ? currentQuestion?.english_question || currentQuestion?.question
                : currentQuestion?.question
            ),
          }}
        />
        
        {/* Multiple Choice Questions */}
        {getQuestionType(currentQuestion) === 'multiple_choice' && (
          <div className="options-container">
            {((language === 'en'
              ? currentQuestion?.english_options || currentQuestion?.options
              : currentQuestion?.options
            ) || []).map((option, idx) => (
              <button
                key={idx}
                onClick={() => !isReviewMode && (() => {
                  setSelectedAnswer(idx);
                  handleAnswer({ selectedOption: option });
                })()}
                className={classNames('option-button', {
                  'selected': selectedAnswer === idx
                })}
              >
                <span className="option-label">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span dangerouslySetInnerHTML={{ __html: formatMath(option) }} />
              </button>
            ))}
          </div>
        )}
        
        {/* True/False Questions */}
        {getQuestionType(currentQuestion) === 'true_false' && (
          <div className="true-false-container">
            <div className="statements-list">
              {(currentQuestion?.statements || []).map((stmt, idx) => {
                const statementContent = language === 'en' ? stmt.content_en : stmt.content_vn;
                const userAnswer = tfStatementAnswers[idx];
                
                return (
                  <div key={idx} className="statement-item">
                    <div
                      className="statement-text"
                      dangerouslySetInnerHTML={{ __html: formatMath(statementContent) }}
                    />
                    <div className="statement-buttons">
                      <button
                        className={classNames('tf-button true-btn', {
                          'selected': userAnswer === true,
                          'disabled': isReviewMode
                        })}
                        onClick={() => {
                          if (!isReviewMode) {
                            setTfStatementAnswers(prev => ({ ...prev, [idx]: true }));
                          }
                        }}
                      >
                        ✓ {language === 'en' ? 'True' : 'Đúng'}
                      </button>
                      <button
                        className={classNames('tf-button false-btn', {
                          'selected': userAnswer === false,
                          'disabled': isReviewMode
                        })}
                        onClick={() => {
                          if (!isReviewMode) {
                            setTfStatementAnswers(prev => ({ ...prev, [idx]: false }));
                          }
                        }}
                      >
                        ✗ {language === 'en' ? 'False' : 'Sai'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {!isReviewMode && (
              <button
                className="submit-statement-btn"
                onClick={() => handleAnswer({ statements: tfStatementAnswers })}
                disabled={Object.keys(tfStatementAnswers).length < (currentQuestion?.statements?.length || 0)}
              >
                {language === 'en' ? 'Confirm & Next' : 'Xác nhận & Tiếp theo'}
              </button>
            )}
          </div>
        )}
        
        {/* Short Answer Questions */}
        {getQuestionType(currentQuestion) === 'short_answer' && (
          <div className="short-answer-container">
            {currentQuestion?.numerical_answer !== undefined && (
              <div className="answer-input-group">
                <label>{language === 'en' ? 'Your answer (number)' : 'Câu trả lời của bạn (số)'}</label>
                <input
                  type="number"
                  step="any"
                  placeholder={language === 'en' ? 'Enter your answer...' : 'Nhập câu trả lời...'}
                  value={shortAnswerValue}
                  onChange={(e) => setShortAnswerValue(e.target.value)}
                  disabled={isReviewMode}
                  className="answer-input-field"
                />
              </div>
            )}
            {currentQuestion?.text_answer !== undefined && (
              <div className="answer-input-group">
                <label>{language === 'en' ? 'Your answer' : 'Câu trả lời của bạn'}</label>
                <textarea
                  placeholder={language === 'en' ? 'Enter your answer...' : 'Nhập câu trả lời...'}
                  value={shortAnswerValue}
                  onChange={(e) => setShortAnswerValue(e.target.value)}
                  disabled={isReviewMode}
                  className="answer-textarea-field"
                  rows="4"
                />
              </div>
            )}
            {!isReviewMode && (
              <button
                className="submit-statement-btn"
                onClick={() => handleAnswer({ userAnswer: shortAnswerValue })}
                disabled={!shortAnswerValue.trim()}
              >
                {language === 'en' ? 'Confirm & Next' : 'Xác nhận & Tiếp theo'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Question Navigation */}
      <div className="question-nav">
        <div className="nav-title">{t.questionsOverview}</div>
        <div className="question-stats">
          <div>
            <span className="stat-label">{t.answered}:</span>
            <span className="stat-value">{answers.length}</span>
          </div>
          <div>
            <span className="stat-label">{t.remaining}:</span>
            <span className="stat-value">{questions.length - answers.length}</span>
          </div>
        </div>
        <div className="question-grid">
          {questions.map((q, idx) => (
            <div
              key={idx}
              className={classNames('question-number', {
                'current': idx === currentQuestionIndex,
                'answered': answers.some(a => a.questionId === q.id),
                'not-answered': !answers.some(a => a.questionId === q.id)
              })}
              onClick={() => {
                if (isReviewMode || answers.some(a => a.questionId === q.id)) {
                  setCurrentQuestionIndex(idx);
                }
              }}
            >
              {idx + 1}
            </div>
          ))}
        </div>
        <div className="nav-controls">
          <button
            className="nav-button"
            onClick={() => currentQuestionIndex > 0 && setCurrentQuestionIndex(currentQuestionIndex - 1)}
            disabled={currentQuestionIndex === 0}
          >
            {t.previous}
          </button>
          <button
            className="nav-button submit"
            onClick={() => !isSubmitting && setShowSubmitDialog(true)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (<><Spinner size={14} color="#fff" />&nbsp;{t.submitting || 'Submitting'}</>) : t.submit}
          </button>
          <button
            className="nav-button"
            onClick={() => currentQuestionIndex < questions.length - 1 && setCurrentQuestionIndex(currentQuestionIndex + 1)}
            disabled={currentQuestionIndex === questions.length - 1}
          >
            {t.next}
          </button>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      {showSubmitDialog && (
        <div className="submit-dialog-overlay">
          <div className="submit-dialog">
            <h3 className="dialog-title">{t.confirmSubmit}</h3>
            <div className="dialog-content">
              <p>{t.confirmText}</p>
              <div className="stats">
                <div>{t.answered}: {answers.length}</div>
                <div>{t.unanswered}: {questions.length - answers.length}</div>
              </div>
              <div className="dialog-buttons">
                <button
                  className="review-button"
                  onClick={() => {
                    setIsReviewMode(true);
                    setShowSubmitDialog(false);
                  }}
                >
                  {t.review}
                </button>
                <button
                  className="submit-button"
                  onClick={() => { if (!isSubmitting) submitQuiz(answers); }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (<><Spinner size={16} color="#fff" />&nbsp;{t.submitting || 'Submitting...'}</>) : t.confirmSubmit}
                </button>
                <button
                  className="cancel-button"
                  onClick={() => setShowSubmitDialog(false)}
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuizPage;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { quizTranslations } from '../translations/quizTranslations';
import '../styles/AzotaQuiz.css';
import classNames from 'classnames';

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
  const t = quizTranslations[language];
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [selectedContestKey, setSelectedContestKey] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);

  useEffect(() => {
    if (!started) return;
    // Request questions for the selected quiz id when provided, otherwise fall back to 'random'
    const quizKey = id || 'random';
    const endpoint = `/api/questions/${quizKey}`;

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
        } else if (Array.isArray(data)) {
          setQuestions(data);
          setSelectedContestKey(id || 'random');
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

  // Countdown timer (default 30 minutes = 1800 seconds)
  const [remainingSec, setRemainingSec] = useState(30 * 60);
  const answersRef = React.useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => {
    if (!started) return;
    // reset timer when quiz starts
    setRemainingSec(30 * 60);
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

  // Simple math formatter: convert x^2 to x<sup>2</sup> for nicer display
  const formatMath = (text) => {
    if (!text) return '';
    // replace ^{digits} or ^digit patterns
    let out = text.replace(/\^(\d+)/g, '<sup>$1</sup>');
    // replace occurrences like x^2 or a^10, and handle spaced expressions
    return out;
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

  const handleAnswer = (selectedOption) => {
    const timeTakenSec = Math.floor((Date.now() - questionStartTime) / 1000);
    const newAnswer = {
      questionId: questions[currentQuestionIndex].id,
      selectedOption,
      timeTakenSec,
    };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);
    // if answer was wrong, adapt remaining questions to focus on same topic
    const q = questions[currentQuestionIndex];
    const selectedIndex = q.options.indexOf(selectedOption);
    const isCorrect = selectedIndex === q.answerIndex;
    if (!isCorrect) {
      adaptQuestions(currentQuestionIndex, q.topic);
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setQuestionStartTime(Date.now());
    } else {
      submitQuiz(updatedAnswers);
    }
  };

  const submitQuiz = async (finalAnswers) => {
    const payload = {
      userId: 'user1',
      // Prefer the contest key returned by the questions API so grading uses the same contest
      quizId: selectedContestKey || id || 'random',
      answers: finalAnswers,
    };
    try {
      const res = await fetch('/api/analyze-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
  const result = await res.json();
  // pass result object directly in location.state (not nested) for ResultPage
  navigate('/result', { state: result });
    } catch (err) {
      console.error('Error submitting quiz:', err);
    }
  };

  if (!started) {
    return (
      <div className="quiz-start container mx-auto px-6 py-12 text-center">
        <h1 className="text-3xl font-bold mb-4">{t.test} {id}</h1>
        <p className="text-gray-600 mb-6">{t.ready}</p>
        <button
          onClick={() => setStarted(true)}
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

  const handleOptionClick = (option, idx) => {
    setSelectedAnswer(idx);
    handleAnswer(option);
  };

  return (
    <div className={classNames('quiz-container', { 'review-mode': isReviewMode })}>
      <div className="quiz-header">
        <h1 className="quiz-title">{t.test} {id}</h1>
        <div className="quiz-progress">
          {t.question} {currentQuestionIndex + 1} {t.of} {questions.length}
        </div>
        <div className="quiz-timer">
          <TimerDisplay seconds={remainingSec} />
        </div>
      </div>

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
        <div className="options-container">
          {(language === 'en'
            ? currentQuestion?.english_options || currentQuestion?.options
            : currentQuestion?.options
          ).map((option, idx) => (
            <button
              key={idx}
              onClick={() => !isReviewMode && handleOptionClick(option, idx)}
              className={classNames('option-button', {
                'selected': selectedAnswer === idx
              })}
            >
              <span className="option-label">
                {String.fromCharCode(65 + idx)}
              </span>
              <span>{option}</span>
            </button>
          ))}
        </div>
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
            onClick={() => setShowSubmitDialog(true)}
          >
            {t.submit}
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
                  onClick={() => submitQuiz(answers)}
                >
                  {t.confirmSubmit}
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

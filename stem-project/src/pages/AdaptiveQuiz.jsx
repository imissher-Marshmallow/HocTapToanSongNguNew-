/**
 * Adaptive Quiz Component
 * Presents personalized quiz tailored to student's cognitive level proficiency
 * 
 * Features:
 * - Dynamically loaded questions based on proficiency
 * - Progress tracking
 * - Real-time feedback
 * - Adaptive question selection during quiz
 * - Performance analysis after completion
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Clock, BarChart3, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AdaptiveQuiz.css';

export default function AdaptiveQuiz({ userId, onComplete }) {
  const { user: authUser } = useAuth();
  const finalUserId = userId || authUser?.id;
  
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [timeStarted, setTimeStarted] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (finalUserId) {
      loadPersonalizedQuiz();
    }
  }, [finalUserId]);

  // Timer effect
  useEffect(() => {
    if (!timeStarted || results) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - timeStarted) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeStarted, results]);

  const loadPersonalizedQuiz = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/adaptive/quiz/personalized?userId=${finalUserId}`);
      
      if (!response.ok) throw new Error('Failed to load quiz');
      
      const data = await response.json();
      // Backend returns {quiz: [...], questionCount, userId, message}
      const questions = data.quiz || data.questions || data;
      
      // Ensure each question has a unique ID (use index as fallback)
      const questionsWithIds = Array.isArray(questions) ? questions.map((q, idx) => ({
        ...q,
        id: q.id !== undefined && q.id !== null ? q.id : `q-${idx}` // Ensure unique ID even if missing
      })) : [];
      
      console.log('[AdaptiveQuiz] Loaded questions:', questionsWithIds.length, 'IDs:', questionsWithIds.map(q => q.id));
      
      setQuiz({
        questions: questionsWithIds,
        userId: finalUserId,
        questionCount: questionsWithIds.length
      });
      setTimeStarted(Date.now());
    } catch (err) {
      console.error('Error loading quiz:', err);
      setQuiz({ questions: [], error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex, selectedAnswer) => {
    setAnswers(prev => {
      const updated = {
        ...prev,
        [questionIndex]: selectedAnswer
      };
      console.log('[AdaptiveQuiz] Answer selected - Index:', questionIndex, 'Answer:', selectedAnswer, 'All Answers:', updated);
      return updated;
    });
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    try {
      setAnalyzing(true);

      // Prepare answers in expected format for backend
      // Convert from index-based answers to question ID format
      const formattedAnswers = quiz.questions.map((q, idx) => ({
        questionId: q.id,
        answer: answers[idx] || null
      }));

      // Filter out any null answers (unanswered questions)
      const answeredQuestions = formattedAnswers.filter(a => a.answer !== null);

      console.log('[AdaptiveQuiz] Quiz submission details:', {
        totalQuestions: quiz.questions.length,
        answeredQuestions: answeredQuestions.length,
        unansweredQuestions: quiz.questions.length - answeredQuestions.length,
        allAnswers: formattedAnswers.map(a => ({ id: a.questionId, answered: a.answer !== null }))
      });

      // Require at least one answer before submitting
      if (answeredQuestions.length === 0) {
        alert('Please answer at least one question before submitting.');
        setAnalyzing(false);
        return;
      }

      const payload = {
        userId: finalUserId,  // Use finalUserId which is either from prop or auth context
        quizId: 'personalized',
        personalizedQuizData: quiz.questions,  // Send the actual questions for analysis
        answers: formattedAnswers, // Send all answers including nulls - backend will handle them
        timeSpent: elapsedTime
      };

      console.log('[AdaptiveQuiz] Sending payload:', {
        userId: payload.userId,
        quizId: payload.quizId,
        questionsCount: payload.personalizedQuizData?.length,
        answersCount: payload.answers.length,
        timeSpent: payload.timeSpent,
        firstAnswer: payload.answers[0],
        lastAnswer: payload.answers[payload.answers.length - 1]
      });

      const response = await fetch('/api/adaptive/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      console.log('[AdaptiveQuiz] Response status:', response.status);
      console.log('[AdaptiveQuiz] Response body:', responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText };
        }
        console.error('[AdaptiveQuiz] Backend error response:', errorData);
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: Failed to analyze quiz`);
      }

      const analysisResults = JSON.parse(responseText);
      console.log('[AdaptiveQuiz] Analysis successful:', {
        overallScore: analysisResults.overallScore,
        correctAnswers: analysisResults.correctAnswers,
        cognitiveAnalysis: analysisResults.cognitiveAnalysis
      });
      
      // Store results in session storage so other pages can access updated data
      sessionStorage.setItem('lastQuizResults', JSON.stringify(analysisResults));
      sessionStorage.setItem('profileRefreshNeeded', 'true');
      
      setResults(analysisResults);

      if (onComplete) {
        onComplete(analysisResults);
      }
    } catch (err) {
      console.error('[AdaptiveQuiz] Error submitting quiz:', err);
      alert('Error analyzing quiz: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) {
    return (
      <div className="adaptive-quiz loading">
        <div className="loading-container">
          <div className="spinner"></div>
          <h2>Loading Your Personalized Quiz...</h2>
          <p>We're preparing questions tailored to your skill level</p>
        </div>
      </div>
    );
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="adaptive-quiz error">
        <div className="error-container">
          <h2>Unable to Load Quiz</h2>
          <p>{quiz?.error || 'Please try refreshing the page or contact support.'}</p>
          <button onClick={loadPersonalizedQuiz} className="btn-retry">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (results) {
    return <QuizResults results={results} timeSpent={elapsedTime} />;
  }

  const question = quiz.questions[currentQuestion];
  const isAnswered = answers[currentQuestion] !== undefined && answers[currentQuestion] !== null;
  // Count only valid (non-null, non-undefined) answers using indices
  const answeredCount = Object.values(answers).filter(ans => ans !== null && ans !== undefined).length;
  const allAnswered = answeredCount === quiz.questions.length;
  // Progress based on answered questions, not current question
  const progressPercent = ((answeredCount) / quiz.questions.length) * 100;

  return (
    <div className="adaptive-quiz">
      {/* Header */}
      <header className="quiz-header">
        <div className="quiz-title">
          <h1>Personalized Quiz</h1>
          <p>Questions adapted to your level</p>
        </div>

        <div className="quiz-stats">
          <div className="stat">
            <Clock size={18} />
            <span>{formatTime(elapsedTime)}</span>
          </div>
          <div className="stat">
            <span className="progress-badge">
              {currentQuestion + 1}/{quiz.questions.length}
            </span>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar">
          <motion.div
            className="progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
          ></motion.div>
        </div>
        <p className="progress-text">{progressPercent.toFixed(0)}% Complete</p>
      </div>

      {/* Main Content */}
      <div className="quiz-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            className="question-section"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Cognitive Level Badge */}
            <div className="cognitive-badge">
              {getCognitiveLevelDisplay(question.cognitiveLevel)}
            </div>

            {/* Question */}
            <div className="question">
              <h2>{question.question}</h2>
              {question.description && (
                <p className="question-context">{question.description}</p>
              )}
            </div>

            {/* Answer Options */}
            <div className="options">
              {question.options.map((option, idx) => (
                <motion.label
                  key={idx}
                  className={`option ${
                    answers[currentQuestion] === option ? 'selected' : ''
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion}`}
                    value={option}
                    checked={answers[currentQuestion] === option}
                    onChange={(e) =>
                      handleAnswerSelect(currentQuestion, e.target.value)
                    }
                  />
                  <span className="option-content">{option}</span>
                </motion.label>
              ))}
            </div>

            {/* Question Info */}
            <div className="question-info">
              <p>
                <strong>Difficulty:</strong>{' '}
                {getDifficultyLabel(question.cognitiveLevel)}
              </p>
              {question.topic && (
                <p>
                  <strong>Topic:</strong> {question.topic}
                </p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="navigation">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="btn-nav btn-prev"
          >
            ← Previous
          </button>

          <div className="question-indicators">
            {quiz.questions.map((_, idx) => {
              const answerValue = answers[idx];
              const isQuestionAnswered = answerValue !== null && answerValue !== undefined;
              return (
              <motion.button
                key={idx}
                data-question-index={idx}
                data-is-answered={isQuestionAnswered}
                className={`indicator ${
                  idx === currentQuestion ? 'active' : ''
                } ${isQuestionAnswered ? 'answered' : ''}`}
                onClick={() => setCurrentQuestion(idx)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title={`Q${idx + 1} - ${isQuestionAnswered ? 'Answered' : 'Not answered'}`}
              >
                {idx + 1}
              </motion.button>
              );
            })}
          </div>

          {currentQuestion < quiz.questions.length - 1 ? (
            <button onClick={handleNext} className="btn-nav btn-next">
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmitQuiz}
              disabled={!allAnswered || analyzing}
              className={`btn-submit ${!allAnswered ? 'disabled' : ''}`}
            >
              {analyzing ? 'Analyzing...' : 'Submit Quiz'}
            </button>
          )}
        </div>

        {/* Answer Summary */}
        <div className="answer-summary">
          <p>Answered: {answeredCount} / {quiz.questions.length}</p>
          {!allAnswered && (
            <p className="warning">
              Answer all {quiz.questions.length - answeredCount} remaining questions before submitting
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Quiz Results Component
 * Displays adaptive analysis and personalized recommendations
 */
function QuizResults({ results, timeSpent }) {
  const [viewingDetails, setViewingDetails] = useState(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="quiz-results">
      <header className="results-header">
        <h1>Quiz Complete!</h1>
        <p>Your Adaptive Analysis</p>
      </header>

      {/* Overall Performance */}
      <div className="results-container">
        <motion.section
          className="overall-score"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="score-circle">
            <div className="score-value">
              {Math.round(results.overallScore)}%
            </div>
          </div>
          <p className="time-info">
            Completed in: {formatTime(timeSpent)}
          </p>
        </motion.section>

        {/* Cognitive Level Analysis */}
        <motion.section
          className="cognitive-analysis"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2>
            <BarChart3 size={20} />
            Cognitive Level Performance
          </h2>

          <div className="levels-grid">
            {renderCognitiveAnalysis(results.cognitiveAnalysis)}
          </div>
        </motion.section>

        {/* Topic Analysis */}
        {results.topicAnalysis && results.topicAnalysis.length > 0 && (
          <motion.section
            className="topic-analysis"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2>📊 Performance by Topic</h2>
            <div className="topics-grid">
              {results.topicAnalysis.map((topic, idx) => (
                <motion.div
                  key={idx}
                  className={`topic-card topic-${topic.performance.toLowerCase()}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + idx * 0.05 }}
                >
                  <h3>{topic.topic}</h3>
                  <div className="topic-score">
                    <span className="score">{topic.percentage}%</span>
                    <span className={`performance-badge ${topic.performance.toLowerCase()}`}>
                      {topic.performance}
                    </span>
                  </div>
                  <div className="topic-bar">
                    <div className="topic-fill" style={{ width: `${topic.percentage}%` }}></div>
                  </div>
                  <p className="topic-result">{topic.correct}/{topic.total} correct</p>
                  {topic.performance !== 'EXCELLENT' && topic.searchSuggestion && (
                    <p className="search-suggestion">
                      💡 Search for: <strong>{topic.searchSuggestion}</strong>
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Topic-Level Detailed Feedback */}
        {results.topicFeedback && Object.keys(results.topicFeedback).length > 0 && (
          <motion.section
            className="topic-feedback"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2>📖 Detailed Feedback by Topic</h2>
            <div className="feedback-cards">
              {Object.entries(results.topicFeedback).map(([topicName, feedback], idx) => (
                <motion.div
                  key={`feedback-${topicName}`}
                  className={`feedback-card topic-${feedback.performance.toLowerCase()}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + idx * 0.08 }}
                >
                  <div className="feedback-header">
                    <h3>{topicName}</h3>
                    <span className="feedback-score">{feedback.percentage}%</span>
                  </div>
                  <p className="feedback-summary">{feedback.summary}</p>
                  
                  <div className="feedback-section">
                    <h4>✅ Strengths:</h4>
                    <ul>
                      {feedback.strengths.map((strength, i) => (
                        <li key={i}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {feedback.weaknesses.length > 0 && (
                    <div className="feedback-section">
                      <h4>⚠️ Areas to Improve:</h4>
                      <ul>
                        {feedback.weaknesses.map((weakness, i) => (
                          <li key={i}>{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="feedback-section">
                    <h4>🎯 Next Steps:</h4>
                    <ul>
                      {feedback.improvements.map((improvement, i) => (
                        <li key={i}>{improvement}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="feedback-section">
                    <h4>🔍 Search & Learn:</h4>
                    <ul>
                      {feedback.resources.map((resource, i) => (
                        <li key={i}>{resource}</li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Answer Review Section */}
        {results.answerDetails && results.answerDetails.length > 0 && (
          <motion.section
            className="answer-review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h2>📋 Review Your Answers</h2>
            <div className="answer-list">
              {results.answerDetails.map((answer, idx) => (
                <motion.div
                  key={`answer-${idx}`}
                  className={`answer-item ${answer.isCorrect ? 'correct' : 'incorrect'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 + idx * 0.03 }}
                >
                  <div className="answer-header">
                    <div className="answer-status">
                      {answer.isCorrect ? <span className="badge-correct">✓ Correct</span> : <span className="badge-incorrect">✗ Incorrect</span>}
                    </div>
                    <div className="answer-metadata">
                      <span className="topic-tag">{answer.topic}</span>
                      <span className="difficulty-tag">Difficulty: {answer.difficulty === '1' ? 'Easy' : answer.difficulty === '2' ? 'Medium' : answer.difficulty === '3' ? 'Hard' : 'Expert'}</span>
                    </div>
                  </div>
                  
                  <div className="question-text">
                    <strong>Question {idx + 1}:</strong> {answer.questionText}
                  </div>
                  
                  <div className="answer-details">
                    <div className="student-answer">
                      <p><strong>Your Answer:</strong> {answer.options[answer.studentAnswer] || 'Not answered'}</p>
                    </div>
                    {!answer.isCorrect && (
                      <div className="correct-answer">
                        <p><strong>Correct Answer:</strong> {answer.options[answer.correctAnswer]}</p>
                      </div>
                    )}
                  </div>
                  
                  {answer.explanation && (
                    <div className="explanation">
                      <p><strong>💡 Explanation:</strong> {answer.explanation}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Weak Areas */}
        {results.learningProfile?.weakAreas && results.learningProfile.weakAreas.length > 0 && (
          <motion.section
            className="weak-areas"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <h2>⚠️ Areas Needing Improvement</h2>
            <div className="weak-areas-list">
              {results.learningProfile.weakAreas.map((area, idx) => (
                <div key={idx} className="weak-area-item">
                  <span className="weak-area-topic">{area}</span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Strong Areas */}
        {results.learningProfile?.strongAreas && results.learningProfile.strongAreas.length > 0 && (
          <motion.section
            className="strong-areas"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
          >
            <h2>✨ Your Strengths</h2>
            <div className="strong-areas-list">
              {results.learningProfile.strongAreas.map((area, idx) => (
                <div key={idx} className="strong-area-item">
                  <span className="strong-area-topic">{area}</span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Feedback */}
        {results.feedback && (
          <motion.section
            className="ai-feedback"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36 }}
          >
            <h2>💬 Feedback from AI Coach</h2>
            <div className="feedback-content">
              <p>{results.feedback}</p>
            </div>
          </motion.section>
        )}

        {/* Learning Roadmap */}
        {(results.learningProfile?.learningPath || results.aiSummary?.plan) && (
          <motion.section
            className="learning-roadmap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <h2>📚 Your Personalized Learning Roadmap</h2>
            <div className="roadmap-content">
              {results.aiSummary?.plan ? (
                <div className="roadmap-steps">
                  {Array.isArray(results.aiSummary.plan) ? (
                    results.aiSummary.plan.map((step, idx) => (
                      <div key={idx} className="roadmap-step">
                        <div className="step-number">{idx + 1}</div>
                        <div className="step-content">
                          {typeof step === 'string' ? (
                            <p>{step}</p>
                          ) : (
                            <>
                              <h4>{step.step || step.title || step.topic || 'Step ' + (idx + 1)}</h4>
                              {step.duration && <p className="duration">⏱️ {step.duration}</p>}
                              <p>{step.description || step.action || ''}</p>
                              {(step.resource_suggestion || step.resources) && (
                                <div className="step-resources">
                                  {step.resource_suggestion ? (
                                    <>
                                      <small>
                                        <strong>📎 {step.resource_suggestion.type}:</strong> {step.resource_suggestion.name}
                                      </small>
                                    </>
                                  ) : (
                                    <small>Resources: {step.resources}</small>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>{typeof results.aiSummary.plan === 'string' ? results.aiSummary.plan : 'AI-generated learning plan available'}</p>
                  )}
                </div>
              ) : results.learningProfile?.learningPath ? (
                <div className="roadmap-steps">
                  {typeof results.learningProfile.learningPath === 'string' ? (
                    <p>{results.learningProfile.learningPath}</p>
                  ) : Array.isArray(results.learningProfile.learningPath) ? (
                    results.learningProfile.learningPath.map((step, idx) => (
                      <div key={idx} className="roadmap-step">
                        <div className="step-number">{idx + 1}</div>
                        <div className="step-content">
                          {typeof step === 'string' ? (
                            <p>{step}</p>
                          ) : (
                            <>
                              <h4>{step.title || step.topic || 'Step ' + (idx + 1)}</h4>
                              <p>{step.description || step.action || ''}</p>
                              {step.resources && (
                                <div className="step-resources">
                                  <small>Resources: {step.resources}</small>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    Object.entries(results.learningProfile.learningPath).map(([key, value], idx) => (
                      <div key={idx} className="roadmap-step">
                        <div className="step-number">{idx + 1}</div>
                        <div className="step-content">
                          <h4>{key}</h4>
                          <p>{value}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </motion.section>
        )}

        {/* Priority Actions from AI */}
        {results.aiSummary?.priority && results.aiSummary.priority.length > 0 && (
          <motion.section
            className="priority-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.47 }}
          >
            <h2>🚀 Priority Actions (Do These First)</h2>
            <div className="priority-list">
              {results.aiSummary.priority.map((action, idx) => (
                <div key={`priority-${idx}`} className="priority-item">
                  <div className="priority-number">{idx + 1}</div>
                  <div className="priority-text">{action}</div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Strengths */}
        {results.strengths && results.strengths.length > 0 && (
          <motion.section
            className="strengths-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2>🌟 Your Strengths</h2>
            <div className="strengths-list">
              {results.strengths.map((strength, idx) => (
                <div key={`strength-${idx}`} className="strength-item">
                  <p>{strength}</p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Areas to Improve */}
        {results.areasToImprove && results.areasToImprove.length > 0 && (
          <motion.section
            className="improve-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2>📈 Areas to Improve</h2>
            <div className="improve-list">
              {results.areasToImprove.map((area, idx) => (
                <div key={`area-${idx}`} className="area-item">
                  <p>{area}</p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Next Steps */}
        {results.nextSteps && (
          <motion.section
            className="next-steps"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2>🎯 Your Next Steps</h2>
            <div className="next-steps-content">
              <p>{results.nextSteps}</p>
            </div>
          </motion.section>
        )}

        {/* Recommendations */}
        {results.recommendations && results.recommendations.length > 0 && (
          <motion.section
            className="recommendations"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2>💡 Personalized Recommendations</h2>
            <div className="recommendations-list">
              {results.recommendations.map((rec, idx) => (
                <motion.div
                  key={idx}
                  className="recommendation-item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                >
                  <h4>{rec.title}</h4>
                  <p>{rec.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Action Buttons */}
        <div className="results-actions">
          <button className="btn-dashboard">
            <Home size={18} />
            Back to Dashboard
          </button>
          <button className="btn-next-quiz">
            <ChevronRight size={18} />
            Take Another Quiz
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper: Render cognitive level analysis cards
 */
function renderCognitiveAnalysis(analysis) {
  if (!analysis || !analysis.levels) return null;

  return analysis.levels.map((level, idx) => (
    <motion.div
      key={`level-${level.name}-${idx}`}
      className="analysis-card"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.1 }}
    >
      <h3>{level.name}</h3>
      <div className="score-display">
        <span className="score">{Math.round(level.score)}%</span>
      </div>
      <div className="mini-bar">
        <div className="mini-fill" style={{ width: `${level.score}%` }}></div>
      </div>
      <p className="level-status">{level.status}</p>
      {level.questionCount && (
        <p className="detail">
          {level.correct}/{level.questionCount} correct
        </p>
      )}
    </motion.div>
  ));
}

/**
 * Helper: Get cognitive level display
 */
function getCognitiveLevelDisplay(level) {
  const labels = {
    1: { name: 'Knowledge', icon: '📚', color: '#3b82f6' },
    2: { name: 'Comprehension', icon: '💡', color: '#f59e0b' },
    3: { name: 'Application', icon: '🔧', color: '#8b5cf6' },
    4: { name: 'Analysis', icon: '🧠', color: '#ef4444' }
  };

  const info = labels[level] || labels[1];
  return (
    <span className="cognitive-badge" style={{ '--badge-color': info.color }}>
      {info.icon} Level {level}: {info.name}
    </span>
  );
}

/**
 * Helper: Get difficulty label
 */
function getDifficultyLabel(level) {
  const labels = {
    1: 'Basic (Knowledge)',
    2: 'Intermediate (Understanding)',
    3: 'Advanced (Application)',
    4: 'Expert (Analysis)'
  };
  return labels[level] || 'Unknown';
}

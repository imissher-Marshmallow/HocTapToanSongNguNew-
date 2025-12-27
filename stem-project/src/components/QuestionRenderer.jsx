import React, { useState } from 'react';
import classNames from 'classnames';

/**
 * QuestionRenderer - Renders different question types:
 * 1. Multiple Choice - 4 options, select one
 * 2. True/False - 4 statements (A, B, C, D), each can be true or false
 * 3. Short Answer - numerical answer with format hints
 */
export function QuestionRenderer({
  question,
  language = 'vi',
  isReviewMode = false,
  selectedAnswer,
  onAnswerChange,
  formatMath = (text) => text
}) {
  const [shortAnswerInput, setShortAnswerInput] = useState(selectedAnswer?.answer || '');
  const [trueFalseAnswers, setTrueFalseAnswers] = useState(selectedAnswer?.answer || {});

  const questionText = language === 'en' 
    ? question.english_question || question.question || question.content_vn
    : question.question || question.content_vn;

  // MULTIPLE CHOICE TYPE
  if (question.type === 'multipleChoice' || (!question.type && question.options && Array.isArray(question.options) && question.options.length === 4)) {
    const options = language === 'en'
      ? question.english_options || question.options
      : question.options;

    return (
      <div className="question-multiple-choice">
        <div className="question-topic">{question.topic}</div>
        <div
          className="question-text"
          dangerouslySetInnerHTML={{ __html: formatMath(questionText) }}
        />
        <div className="options-container">
          {options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => !isReviewMode && onAnswerChange({ type: 'multipleChoice', answer: idx })}
              className={classNames('option-button', {
                'selected': selectedAnswer?.answer === idx,
                'correct': isReviewMode && idx === question.answerIndex,
                'incorrect': isReviewMode && selectedAnswer?.answer === idx && idx !== question.answerIndex
              })}
              disabled={isReviewMode}
            >
              <span className="option-label">{String.fromCharCode(65 + idx)}</span>
              <span>{option}</span>
            </button>
          ))}
        </div>
        {isReviewMode && selectedAnswer && (
          <div className={classNames('answer-feedback', {
            'correct': selectedAnswer.answer === question.answerIndex,
            'incorrect': selectedAnswer.answer !== question.answerIndex
          })}>
            {selectedAnswer.answer === question.answerIndex
              ? '✅ Câu trả lời chính xác'
              : `❌ Câu trả lời sai. Đáp án đúng: ${String.fromCharCode(65 + question.answerIndex)} - ${options[question.answerIndex]}`}
          </div>
        )}
      </div>
    );
  }

  // TRUE/FALSE TYPE (4 statements, each with true/false answer)
  if (question.type === 'trueFalse' || (!question.type && question.statements && Array.isArray(question.statements))) {
    return (
      <div className="question-true-false">
        <div className="question-topic">{question.topic}</div>
        <div
          className="question-text"
          dangerouslySetInnerHTML={{ __html: formatMath(questionText) }}
        />
        <div className="statements-container">
          {question.statements.map((statement, idx) => {
            const statementText = language === 'en'
              ? statement.content_en || statement.content_vn
              : statement.content_vn;
            const isCorrect = statement.is_true;
            const userAnswer = trueFalseAnswers[idx];

            return (
              <div key={idx} className="statement-item">
                <div className="statement-label">{String.fromCharCode(65 + idx)})</div>
                <div className="statement-content">
                  <p dangerouslySetInnerHTML={{ __html: formatMath(statementText) }} />
                </div>
                <div className="statement-answer">
                  <button
                    onClick={() => {
                      if (!isReviewMode) {
                        const newAnswers = { ...trueFalseAnswers, [idx]: true };
                        setTrueFalseAnswers(newAnswers);
                        onAnswerChange({ type: 'trueFalse', answer: newAnswers });
                      }
                    }}
                    className={classNames('btn-true-false', 'btn-true', {
                      'selected': userAnswer === true,
                      'correct': isReviewMode && userAnswer === true && isCorrect,
                      'incorrect': isReviewMode && userAnswer === true && !isCorrect
                    })}
                    disabled={isReviewMode}
                  >
                    Đúng ✓
                  </button>
                  <button
                    onClick={() => {
                      if (!isReviewMode) {
                        const newAnswers = { ...trueFalseAnswers, [idx]: false };
                        setTrueFalseAnswers(newAnswers);
                        onAnswerChange({ type: 'trueFalse', answer: newAnswers });
                      }
                    }}
                    className={classNames('btn-true-false', 'btn-false', {
                      'selected': userAnswer === false,
                      'correct': isReviewMode && userAnswer === false && !isCorrect,
                      'incorrect': isReviewMode && userAnswer === false && isCorrect
                    })}
                    disabled={isReviewMode}
                  >
                    Sai ✗
                  </button>
                </div>
                {isReviewMode && userAnswer !== undefined && (
                  <div className={classNames('statement-feedback', {
                    'correct': userAnswer === isCorrect,
                    'incorrect': userAnswer !== isCorrect
                  })}>
                    {userAnswer === isCorrect ? '✅ Chính xác' : `❌ Sai - Câu này ${isCorrect ? 'đúng' : 'sai'}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // SHORT ANSWER TYPE (numerical or formatted)
  if (question.type === 'shortAnswer' || (!question.type && question.numerical_answer !== undefined)) {
    return (
      <div className="question-short-answer">
        <div className="question-topic">{question.topic}</div>
        <div
          className="question-text"
          dangerouslySetInnerHTML={{ __html: formatMath(questionText) }}
        />
        
        <div className="short-answer-input-container">
          <input
            type="text"
            value={shortAnswerInput}
            onChange={(e) => {
              setShortAnswerInput(e.target.value);
              onAnswerChange({ type: 'shortAnswer', answer: e.target.value });
            }}
            placeholder="Nhập câu trả lời..."
            className="short-answer-input"
            disabled={isReviewMode}
          />
          {question.answerFormat && (
            <div className="answer-format-hint">
              📝 Format: {question.answerFormat}
            </div>
          )}
          {question.answerGuide && (
            <div className="answer-guide">
              💡 {question.answerGuide}
            </div>
          )}
        </div>

        {isReviewMode && selectedAnswer && (
          <div className="short-answer-review">
            <div className="user-answer">
              <strong>Câu trả lời của bạn:</strong> {selectedAnswer.answer}
            </div>
            <div className="expected-answer">
              <strong>Đáp án đúng:</strong> {question.numerical_answer || question.expected_answer}
            </div>
            {selectedAnswer.validation && (
              <div className={classNames('validation-feedback', {
                'correct': selectedAnswer.validation.isCorrect,
                'incorrect': !selectedAnswer.validation.isCorrect
              })}>
                {selectedAnswer.validation.feedback}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Fallback for unknown type
  return (
    <div className="question-unknown">
      <p>Loại câu hỏi không được hỗ trợ</p>
      <pre>{JSON.stringify(question, null, 2)}</pre>
    </div>
  );
}

export default QuestionRenderer;

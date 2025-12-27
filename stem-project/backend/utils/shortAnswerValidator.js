/**
 * Short Answer Question Validator
 * Validates numerical/format-based answers for short answer questions
 * 
 * Handles:
 * - Numerical answers with tolerance (exact, ±n value, ±n%)
 * - Unit validation (cm, m, cm^2, m^2, degrees, etc.)
 * - Format suggestions and hints
 */

/**
 * Validate a short answer response
 * Returns: { isCorrect: boolean, feedback: string, tolerance: number }
 */
function validateShortAnswer(userAnswer, expectedAnswer, question = {}) {
  try {
    // Handle empty response
    if (userAnswer === null || userAnswer === undefined || userAnswer === '') {
      return {
        isCorrect: false,
        feedback: question.answerFormat 
          ? `Vui lòng nhập câu trả lời. Format: ${question.answerFormat}` 
          : 'Vui lòng nhập câu trả lời',
        tolerance: 0
      };
    }

    // If expectedAnswer is a number, validate numerically
    if (typeof expectedAnswer === 'number' || !isNaN(parseFloat(expectedAnswer))) {
      return validateNumericalAnswer(
        userAnswer,
        parseFloat(expectedAnswer),
        question
      );
    }

    // If expectedAnswer is a string with specific format
    if (typeof expectedAnswer === 'string') {
      return validateFormattedAnswer(userAnswer, expectedAnswer, question);
    }

    return {
      isCorrect: false,
      feedback: 'Không thể xác nhận câu trả lời',
      tolerance: 0
    };
  } catch (error) {
    console.error('[ShortAnswerValidator] Error:', error.message);
    return {
      isCorrect: false,
      feedback: 'Lỗi kiểm tra câu trả lời. Vui lòng thử lại.',
      tolerance: 0
    };
  }
}

/**
 * Validate numerical answers with tolerance
 */
function validateNumericalAnswer(userAnswer, expectedValue, question = {}) {
  // Parse user input - remove units, spaces, common symbols
  const cleanedInput = String(userAnswer)
    .trim()
    .toLowerCase()
    .replace(/[^\d.,\-+*/()]/g, '') // Keep only numbers and math operators
    .replace(',', '.'); // Convert comma to decimal point

  // Try to parse as number
  let userValue = parseFloat(cleanedInput);
  if (isNaN(userValue)) {
    return {
      isCorrect: false,
      feedback: `"${userAnswer}" không phải là số hợp lệ. ${question.answerFormat || 'Vui lòng nhập một số.'}`,
      tolerance: 0
    };
  }

  // Determine tolerance (default: exact, ±10%, or ±1 depending on magnitude)
  let tolerance = 0;
  const toleranceHint = question.answerGuide || 'Chấp nhận sai số';

  if (toleranceHint && toleranceHint.includes('%')) {
    // Parse percentage tolerance, e.g., "±5%"
    const match = toleranceHint.match(/±\s*(\d+(?:\.\d+)?)\s*%/);
    if (match) {
      const percent = parseFloat(match[1]);
      tolerance = (expectedValue * percent) / 100;
    }
  } else if (toleranceHint && toleranceHint.match(/±\s*\d+/)) {
    // Parse absolute tolerance, e.g., "±2"
    const match = toleranceHint.match(/±\s*(\d+(?:\.\d+)?)/);
    if (match) {
      tolerance = parseFloat(match[1]);
    }
  } else if (expectedValue !== 0) {
    // Default: 10% tolerance for non-zero values
    tolerance = Math.abs(expectedValue * 0.1);
  }

  // Check if answer is within tolerance
  const difference = Math.abs(userValue - expectedValue);
  const isCorrect = difference <= tolerance;

  if (isCorrect) {
    return {
      isCorrect: true,
      feedback: `✅ Chính xác! ${difference === 0 ? '(Đáp án chính xác)' : `(Sai số: ${difference.toFixed(2)})`}`,
      tolerance,
      userValue,
      expectedValue,
      difference
    };
  } else {
    return {
      isCorrect: false,
      feedback: `❌ Không chính xác. Bạn trả lời: ${userValue}, Đáp án: ${expectedValue}. Chênh lệch: ${difference.toFixed(2)}.`,
      tolerance,
      userValue,
      expectedValue,
      difference,
      hint: question.answerGuide ? `Gợi ý: ${question.answerGuide}` : undefined
    };
  }
}

/**
 * Validate formatted string answers
 * e.g., "6.5 cm", "4π m^2", "45 degrees"
 */
function validateFormattedAnswer(userAnswer, expectedAnswer, question = {}) {
  const userTrimmed = String(userAnswer).trim().toLowerCase();
  const expectedTrimmed = String(expectedAnswer).trim().toLowerCase();

  // Exact match
  if (userTrimmed === expectedTrimmed) {
    return {
      isCorrect: true,
      feedback: '✅ Chính xác!',
      tolerance: 0
    };
  }

  // Normalize variations (spaces, multiple spaces, etc.)
  const userNormalized = userTrimmed.replace(/\s+/g, ' ');
  const expectedNormalized = expectedTrimmed.replace(/\s+/g, ' ');

  if (userNormalized === expectedNormalized) {
    return {
      isCorrect: true,
      feedback: '✅ Chính xác!',
      tolerance: 0
    };
  }

  // Try to extract numbers and compare
  const userNumbers = extractNumbers(userTrimmed);
  const expectedNumbers = extractNumbers(expectedTrimmed);

  if (userNumbers.length > 0 && expectedNumbers.length > 0) {
    const numDiff = Math.abs(userNumbers[0] - expectedNumbers[0]);
    if (numDiff <= 0.01) {
      return {
        isCorrect: true,
        feedback: `✅ Chính xác! (Định dạng nhẹ khác nhau)`,
        tolerance: 0.01
      };
    }
  }

  return {
    isCorrect: false,
    feedback: `❌ Không chính xác. Bạn: "${userAnswer}", Đáp án: "${expectedAnswer}"`,
    tolerance: 0,
    hint: question.answerFormat ? `Format: ${question.answerFormat}` : undefined
  };
}

/**
 * Extract numerical values from string
 */
function extractNumbers(str) {
  const matches = str.match(/[+-]?\d+\.?\d*/g);
  return matches ? matches.map(parseFloat) : [];
}

/**
 * Get format hint from answer guide
 */
function getFormatHint(answerFormat) {
  const hints = {
    'cm': 'Trả lời theo cm (centimet)',
    'm': 'Trả lời theo m (mét)',
    'cm^2': 'Trả lời theo cm² (centimet vuông)',
    'm^2': 'Trả lời theo m² (mét vuông)',
    'cm^3': 'Trả lời theo cm³ (centimet khối)',
    'm^3': 'Trả lời theo m³ (mét khối)',
    'degrees': 'Trả lời theo độ (°)',
    'percent': 'Trả lời theo phần trăm (%)',
    'fraction': 'Trả lời dưới dạng phân số (a/b)',
    'decimal': 'Trả lời dưới dạng số thập phân'
  };

  return hints[answerFormat?.toLowerCase()] || `Format: ${answerFormat}`;
}

/**
 * Batch validate multiple short answers
 */
function validateMultipleAnswers(answers, questions) {
  return answers.map((userAnswer, idx) => {
    const question = questions[idx];
    const expectedAnswer = question?.numerical_answer || question?.answer || null;
    return validateShortAnswer(userAnswer, expectedAnswer, question);
  });
}

module.exports = {
  validateShortAnswer,
  validateNumericalAnswer,
  validateFormattedAnswer,
  extractNumbers,
  getFormatHint,
  validateMultipleAnswers
};

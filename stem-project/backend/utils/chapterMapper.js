/**
 * Chapter Mapper - Maps chapter IDs to correct contest data
 * Ensures quiz selection routes to correct chapter in questions_updated.json
 * 
 * Structure:
 * chapter1 → Chương 1: Đa thức nhiều biến (Polynomials of Multiple Variables)
 * chapter2 → Chương 2: Phân thức đại số (Algebraic Fractions)
 * chapter3 → Chương 3: Hàm số và đồ thị (Functions and Graphs)
 * chapter4 → Chương 4: Hình học trực quan (Visual Geometry)
 * chapter5 → Chương 5: Tam giác, tứ giác (Triangles and Quadrilaterals)
 * 
 * Each chapter has 5 contests:
 * - Contests 1-3: normal difficulty (difficulties 1, 2, 3)
 * - Contests 4-5: hard difficulty (difficulties 4, 5)
 */

const fs = require('fs');
const path = require('path');

const CHAPTER_METADATA = {
  1: {
    id: 'chapter1',
    name: 'Đa thức nhiều biến',
    englishName: 'Polynomials of Multiple Variables',
    description: 'Kiểm tra kiến thức về đa thức nhiều biến'
  },
  2: {
    id: 'chapter2',
    name: 'Phân thức đại số',
    englishName: 'Algebraic Fractions',
    description: 'Kiểm tra kiến thức về phân thức đại số'
  },
  3: {
    id: 'chapter3',
    name: 'Hàm số và đồ thị',
    englishName: 'Functions and Graphs',
    description: 'Kiểm tra kiến thức về hàm số và đồ thị'
  },
  4: {
    id: 'chapter4',
    name: 'Hình học trực quan',
    englishName: 'Visual Geometry',
    description: 'Kiểm tra kiến thức về hình học trực quan'
  },
  5: {
    id: 'chapter5',
    name: 'Tam giác, tứ giác',
    englishName: 'Triangles and Quadrilaterals',
    description: 'Kiểm tra kiến thức về tam giác và tứ giác'
  }
};

const DIFFICULTY_RANGES = {
  easy: [1, 2, 3],      // Contests 1, 2, 3 (normal difficulty levels 1-3)
  hard: [4, 5]          // Contests 4, 5 (hard difficulty levels 4-5)
};

/**
 * Parse chapter ID to get chapter number
 * Returns: { chapterId: 1-5, contestNum: 1-5, difficulty: 'easy'|'hard' } or null if invalid
 */
function parseQuizId(quizId) {
  if (!quizId || typeof quizId !== 'string') return null;

  // Match patterns like: "chapter1-contest2", "chapter2-normal", "chapter3-contest4"
  const match = quizId.match(/^chapter(\d+)(?:-(?:contest(\d+)|normal|hard))?$/i);
  if (!match) return null;

  const chapterId = parseInt(match[1], 10);
  if (chapterId < 1 || chapterId > 5) return null;

  let contestNum = match[2] ? parseInt(match[2], 10) : null;
  let difficulty = null;

  // If contest number is specified, determine difficulty based on it
  if (contestNum) {
    if (contestNum < 1 || contestNum > 5) return null;
    difficulty = contestNum <= 3 ? 'easy' : 'hard';
  } else {
    // Default to easy if not specified
    difficulty = 'easy';
    contestNum = 1; // Start with contest 1
  }

  return { chapterId, contestNum, difficulty };
}

/**
 * Get chapter metadata by ID
 */
function getChapterMetadata(chapterId) {
  return CHAPTER_METADATA[chapterId] || null;
}

/**
 * Select contest based on user score
 * score < 9 → easy contests (1-3)
 * score >= 9 → hard contests (4-5)
 * Returns: recommended contest number (1-5)
 */
function selectContestByScore(score) {
  if (typeof score !== 'number') return 1; // Default to contest 1

  if (score < 9) {
    // Easy: randomly select from contests 1, 2, 3
    // Or could use score to select: 0-3→1, 3-6→2, 6-9→3
    if (score < 3) return 1;
    if (score < 6) return 2;
    return 3;
  } else {
    // Hard: randomly select from contests 4, 5
    // 9-9.5 → contest 4, 9.5-10 → contest 5
    return score >= 9.5 ? 5 : 4;
  }
}

/**
 * Load questions from questions_updated.json for specific chapter/contest
 * Returns the flattened questions array or null if not found
 */
function loadQuestionsForChapterContest(chapterId, contestNum) {
  try {
    const questionsPath = path.join(__dirname, '../data/questions_updated.json');
    const data = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));

    // Navigate to chapters array
    if (!data.chapters || !Array.isArray(data.chapters)) {
      console.warn('[ChapterMapper] No chapters array found in questions_updated.json');
      return null;
    }

    // Find chapter by chapterId
    const chapter = data.chapters.find(c => c.chapterId === chapterId);
    if (!chapter) {
      console.warn(`[ChapterMapper] Chapter ${chapterId} not found`);
      return null;
    }

    // Find contest in chapter
    const contest = chapter.contests.find(c => c.testId === `chapter${chapterId}-contest${contestNum}`);
    if (!contest) {
      console.warn(`[ChapterMapper] Contest ${contestNum} not found in chapter ${chapterId}`);
      return null;
    }

    // Flatten questions from all types: multipleChoice + trueFalse + shortAnswer
    const allQuestions = [];
    
    if (contest.questions.multipleChoice && Array.isArray(contest.questions.multipleChoice)) {
      allQuestions.push(...contest.questions.multipleChoice.map(q => ({ ...q, type: 'multipleChoice' })));
    }

    if (contest.questions.trueFalse && Array.isArray(contest.questions.trueFalse)) {
      allQuestions.push(...contest.questions.trueFalse.map(q => ({ ...q, type: 'trueFalse' })));
    }

    if (contest.questions.shortAnswer && Array.isArray(contest.questions.shortAnswer)) {
      allQuestions.push(...contest.questions.shortAnswer.map(q => ({ ...q, type: 'shortAnswer' })));
    }

    return {
      questions: allQuestions,
      chapterId,
      chapterName: chapter.chapterName,
      contestNum,
      contestKey: `chapter${chapterId}-contest${contestNum}`,
      difficulty: contestNum <= 3 ? 'easy' : 'hard',
      totalQuestions: allQuestions.length
    };
  } catch (error) {
    console.error('[ChapterMapper] Error loading questions:', error.message);
    return null;
  }
}

/**
 * Get user's recommended contest for a chapter
 * Based on their last score in that chapter
 */
function getRecommendedContest(chapterId, lastScore) {
  const contestNum = selectContestByScore(lastScore || 0);
  return {
    chapterId,
    recommendedContestNum: contestNum,
    difficulty: contestNum <= 3 ? 'easy' : 'hard',
    recommendation: lastScore < 9 
      ? `Score ${lastScore} - Start with ${contestNum <= 3 ? 'normal' : 'hard'} difficulty`
      : `Good score ${lastScore}! Try hard challenge (contest ${contestNum})`
  };
}

/**
 * Validate quiz ID format
 */
function isValidQuizId(quizId) {
  return parseQuizId(quizId) !== null;
}

module.exports = {
  CHAPTER_METADATA,
  DIFFICULTY_RANGES,
  parseQuizId,
  getChapterMetadata,
  selectContestByScore,
  loadQuestionsForChapterContest,
  getRecommendedContest,
  isValidQuizId
};

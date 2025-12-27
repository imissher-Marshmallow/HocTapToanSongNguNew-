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
    // Default to easy if not specified (for "chapter1-normal" format)
    difficulty = 'easy';
    contestNum = 1; // Default to contest 1
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
    // Try multiple possible paths
    let questionsPath;
    const possiblePaths = [
      path.join(__dirname, '../data/questions_updated.json'),
      path.join(__dirname, '../../api/data/questions_updated.json'),
      path.join(process.cwd(), 'backend/data/questions_updated.json'),
      path.join(process.cwd(), 'data/questions_updated.json')
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        questionsPath = p;
        console.log('[ChapterMapper] Using questions file:', questionsPath);
        break;
      }
    }

    if (!questionsPath) {
      console.error('[ChapterMapper] Cannot find questions_updated.json in any location:', possiblePaths);
      return null;
    }

    const data = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));

    // Navigate to chapters array
    if (!data.chapters || !Array.isArray(data.chapters)) {
      console.warn('[ChapterMapper] No chapters array found, chapters type:', typeof data.chapters);
      return null;
    }

    // Find chapter by chapterId
    const chapter = data.chapters.find(c => c.chapterId === chapterId);
    if (!chapter) {
      console.warn(`[ChapterMapper] Chapter ${chapterId} not found, available chapters:`, data.chapters.map(c => c.chapterId));
      return null;
    }

    // Find contest in chapter (by index, since we don't have testId matching)
    if (!chapter.contests || chapter.contests.length < contestNum) {
      console.warn(`[ChapterMapper] Contest ${contestNum} not found in chapter ${chapterId}, available contests:`, chapter.contests?.length || 0);
      return null;
    }

    const contest = chapter.contests[contestNum - 1]; // 0-indexed
    if (!contest) {
      console.warn(`[ChapterMapper] Contest ${contestNum} index not available in chapter ${chapterId}`);
      return null;
    }

    // Flatten questions from all types: questions_multiple_choice + questions_true_false + questions_short_answer
    const allQuestions = [];
    
    // Handle both formats: nested 'questions' object OR flat 'questions_*' keys
    if (contest.questions) {
      // New format: nested structure
      if (contest.questions.multipleChoice && Array.isArray(contest.questions.multipleChoice)) {
        allQuestions.push(...contest.questions.multipleChoice.map(q => ({ ...q, type: 'multipleChoice' })));
      }
      if (contest.questions.trueFalse && Array.isArray(contest.questions.trueFalse)) {
        allQuestions.push(...contest.questions.trueFalse.map(q => ({ ...q, type: 'trueFalse' })));
      }
      if (contest.questions.shortAnswer && Array.isArray(contest.questions.shortAnswer)) {
        allQuestions.push(...contest.questions.shortAnswer.map(q => ({ ...q, type: 'shortAnswer' })));
      }
    } else {
      // Old format: flat keys like questions_multiple_choice
      if (contest.questions_multiple_choice && Array.isArray(contest.questions_multiple_choice)) {
        allQuestions.push(...contest.questions_multiple_choice.map(q => ({ ...q, type: 'multipleChoice' })));
      }
      if (contest.questions_true_false && Array.isArray(contest.questions_true_false)) {
        allQuestions.push(...contest.questions_true_false.map(q => ({ ...q, type: 'trueFalse', statements: q.statements || [] })));
      }
      if (contest.questions_short_answer && Array.isArray(contest.questions_short_answer)) {
        allQuestions.push(...contest.questions_short_answer.map(q => ({ ...q, type: 'shortAnswer', numerical_answer: q.numerical_answer })));
      }
    }

    console.log(`[ChapterMapper] Loaded ${allQuestions.length} questions for chapter ${chapterId} contest ${contestNum}`);

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
    console.error('[ChapterMapper] Error loading questions:', error.message, error.stack);
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

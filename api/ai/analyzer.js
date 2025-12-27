const fs = require('fs');
const path = require('path');
require('dotenv').config();

const questionsPath = (() => {
  const possiblePaths = [
    path.join(process.cwd(), 'api/data/questions_updated.json'),
    path.join(process.cwd(), './api/data/questions_updated.json'),
    path.join(__dirname, '../../api/data/questions_updated.json'),
    path.join(__dirname, '../data/questions_updated.json')
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log('[API Analyzer] ✓ Using:', p);
      return p;
    }
  }
  
  console.error('[API Analyzer] ✗ File not found:', possiblePaths);
  return possiblePaths[0];
})();

// Shuffle questions
function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// SIMPLE: Just use chapter ID and contest ID as numbers
function loadQuestions(chapterId, contestNum) {
  try {
    const data = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
    
    if (!data.chapters || !Array.isArray(data.chapters)) {
      console.error('[API] Error: No chapters array in file');
      return { error: 'File structure error' };
    }
    
    const chapter = data.chapters.find(c => c.id === chapterId);
    if (!chapter) {
      console.error(`[API] Chapter ${chapterId} not found`);
      return { error: `Chapter ${chapterId} not found` };
    }
    
    const contest = chapter.contests.find(c => c.id === contestNum);
    if (!contest) {
      console.error(`[API] Contest ${contestNum} not found in chapter ${chapterId}`);
      return { error: `Contest ${contestNum} not found` };
    }
    
    const difficulty = contestNum >= 4 ? 'hard' : 'normal';
    
    // Mix all question types and randomize
    const allQuestions = shuffle([
      ...(contest.questions || []).filter(q => q.type === 'multipleChoice'),
      ...(contest.questions || []).filter(q => q.type === 'trueFalse'),
      ...(contest.questions || []).filter(q => q.type === 'shortAnswer')
    ]);
    
    return {
      success: true,
      chapterId,
      contestNum,
      difficulty,
      chapterName: chapter.name,
      contestName: contest.name,
      questions: allQuestions, // Return all questions
      totalQuestions: allQuestions.length
    };
  } catch (error) {
    console.error('[API] Error loading questions:', error.message);
    return { error: error.message };
  }
}

// API Endpoint: /api/questions?chapterId=1&contestId=2
async function handleQuizRequest(req, res) {
  const { chapterId, contestId } = req.query;
  
  if (!chapterId || !contestId) {
    return res.status(400).json({ 
      error: 'Missing parameters. Use ?chapterId=1&contestId=2' 
    });
  }
  
  const chapter = parseInt(chapterId, 10);
  const contest = parseInt(contestId, 10);
  
  if (isNaN(chapter) || isNaN(contest) || chapter < 1 || chapter > 5 || contest < 1 || contest > 5) {
    return res.status(400).json({ 
      error: 'Invalid parameters. chapterId and contestId must be 1-5' 
    });
  }
  
  const result = loadQuestions(chapter, contest);
  
  if (result.error) {
    return res.status(404).json(result);
  }
  
  res.json(result);
}

module.exports = { loadQuestions, handleQuizRequest };

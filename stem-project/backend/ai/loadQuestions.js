/**
 * Shared utility for loading questions data
 * Provides robust loading with filesystem and require() fallbacks
 * Used by both analyzer.js and routes
 */

const fs = require('fs');
const path = require('path');

let cachedData = null;

/**
 * Load questions data from file or require() fallback
 * Returns the parsed questions data or null if unable to load
 */
function loadQuestionsData() {
  // Return cached data if available
  if (cachedData) {
    return cachedData;
  }

  // Try multiple filesystem paths
  const possiblePaths = [
    path.join(process.cwd(), 'api/data/questions_updated.json'),
    path.join(process.cwd(), './api/data/questions_updated.json'),
    path.join(__dirname, '../../api/data/questions_updated.json'),
    path.join(__dirname, '../../../api/data/questions_updated.json'),
    path.join(__dirname, '../data/questions_updated.json'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        cachedData = data;
        console.log('[LoadQuestions] Loaded from filesystem:', p);
        return data;
      } catch (e) {
        console.warn('[LoadQuestions] Failed to parse file:', p, e.message);
      }
    }
  }

  // Fallback: Try require() for Vercel bundling
  const requirePaths = [
    require.resolve('../../api/data/questions_updated.json').catch(() => null),
    '../../api/data/questions_updated.json',
    '../../../api/data/questions_updated.json',
    '../data/questions_updated.json',
  ];

  for (const rpath of requirePaths) {
    if (!rpath) continue;
    try {
      const data = require(rpath);
      cachedData = data;
      console.log('[LoadQuestions] Loaded via require():', rpath);
      return data;
    } catch (e) {
      // Continue to next path
    }
  }

  console.error('[LoadQuestions] Failed to load questions data from any source');
  return null;
}

/**
 * Get all questions as a flat array
 * Works with both old format (contests) and new format (chapters)
 */
function getAllQuestions() {
  const data = loadQuestionsData();
  if (!data) return [];

  const allQuestions = [];

  // Handle new format: chapters with contests
  if (data.chapters && Array.isArray(data.chapters)) {
    data.chapters.forEach(chapter => {
      if (chapter.contests && Array.isArray(chapter.contests)) {
        chapter.contests.forEach(contest => {
          // Flatten all question types
          allQuestions.push(
            ...(contest.questions_multiple_choice || []),
            ...(contest.questions_true_false || []),
            ...(contest.questions_short_answer || [])
          );
        });
      }
    });
  }
  // Handle old format: direct contests object
  else if (data.contests && typeof data.contests === 'object') {
    Object.values(data.contests).forEach(contest => {
      if (Array.isArray(contest)) {
        allQuestions.push(...contest);
      }
    });
  }

  return allQuestions;
}

module.exports = {
  loadQuestionsData,
  getAllQuestions,
};

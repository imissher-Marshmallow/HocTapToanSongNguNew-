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
    console.log('[LoadQuestions] Using cached data');
    return cachedData;
  }

  console.log('[LoadQuestions] Starting load. cwd:', process.cwd());
  console.log('[LoadQuestions] __dirname:', __dirname);

  // Try multiple filesystem paths (local and Vercel)
  const possiblePaths = [
    // Vercel environment: data is in /var/task/api/data/
    '/var/task/api/data/questions_updated.json',
    path.join('/var/task', 'api/data/questions_updated.json'),
    // Local development: from project root
    path.join(process.cwd(), 'api/data/questions_updated.json'),
    path.join(process.cwd(), './api/data/questions_updated.json'),
    // Fallback paths
    path.join(__dirname, '../../api/data/questions_updated.json'),
    path.join(__dirname, '../../../api/data/questions_updated.json'),
    path.join(__dirname, '../data/questions_updated.json'),
  ];

  console.log('[LoadQuestions] Trying filesystem paths:');
  for (const p of possiblePaths) {
    console.log('[LoadQuestions]   - ', p, 'exists:', fs.existsSync(p));
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        cachedData = data;
        console.log('[LoadQuestions] ✓ Loaded from filesystem:', p);
        return data;
      } catch (e) {
        console.warn('[LoadQuestions] Failed to parse file:', p, e.message);
      }
    }
  }

  // Fallback: Try require() for Vercel bundling
  const requirePaths = [
    './data/questions_updated.json',  // Relative to this file's location
    '../data/questions_updated.json',
    '../../api/data/questions_updated.json',
    '../../../api/data/questions_updated.json',
  ];

  console.log('[LoadQuestions] Trying require() paths:');
  for (const rpath of requirePaths) {
    console.log('[LoadQuestions]   - ', rpath);
    try {
      const data = require.cache ? (require.cache[require.resolve(rpath)] && require.cache[require.resolve(rpath)].exports) : null;
      if (data) {
        cachedData = data;
        console.log('[LoadQuestions] ✓ Loaded via require.cache:', rpath);
        return data;
      }
    } catch (e) {
      // Try regular require
    }

    try {
      const data = require(rpath);
      cachedData = data;
      console.log('[LoadQuestions] ✓ Loaded via require():', rpath);
      return data;
    } catch (e) {
      console.log('[LoadQuestions]   Failed:', e.code, e.message);
    }
  }

  // Last resort: Try to read from api/data directly by scanning parent directories
  console.log('[LoadQuestions] Last resort: scanning parent directories...');
  let currentDir = __dirname;
  for (let i = 0; i < 5; i++) {
    const candidatePath = path.join(currentDir, 'api/data/questions_updated.json');
    console.log('[LoadQuestions]   Checking:', candidatePath, 'exists:', fs.existsSync(candidatePath));
    if (fs.existsSync(candidatePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
        cachedData = data;
        console.log('[LoadQuestions] ✓ Loaded from parent scan:', candidatePath);
        return data;
      } catch (e) {
        console.warn('[LoadQuestions] Failed to parse:', candidatePath, e.message);
      }
    }
    currentDir = path.dirname(currentDir);
  }

  console.error('[LoadQuestions] ✗ Failed to load questions data from any source');
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

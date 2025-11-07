const express = require('express');
const { analyzeQuiz, loadQuestionsForQuiz, loadGroupedQuestionsForQuiz } = require('../ai/analyzer');

const router = express.Router();

// GET /api/questions/:quizId
router.get('/questions/:quizId', (req, res) => {
  try {
    const { quizId } = req.params;
    const result = loadQuestionsForQuiz(quizId);
    // result may be { questions, contestKey } or an array for backward compatibility
    if (result && result.questions) res.json(result);
    else res.json({ questions: result, contestKey: quizId });
  } catch (error) {
    console.error('Error loading questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/questions/random -> pick one random contest (1..N) and return shuffled questions
router.get('/questions/random', (req, res) => {
  try {
    const result = loadQuestionsForQuiz('random');
    if (result && result.questions) res.json(result);
    else res.json({ questions: result, contestKey: 'random' });
  } catch (error) {
    console.error('Error loading random questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/questions/:quizId/grouped -> return questions grouped by topic buckets
router.get('/questions/:quizId/grouped', (req, res) => {
  try {
    const { quizId } = req.params;
    const grouped = loadGroupedQuestionsForQuiz(quizId);
    res.json(grouped);
  } catch (error) {
    console.error('Error loading grouped questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/analyze-quiz
router.post('/analyze-quiz', async (req, res) => {
  try {
    const payload = req.body;
    console.log('Received quiz analysis request:', payload);

    const result = await analyzeQuiz(payload);

    console.log('Analysis result:', result);
    res.json(result);
  } catch (error) {
    console.error('Error analyzing quiz:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

const analyzer = require('./ai/analyzer');
const { dbHelpers } = require('./database');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    const payload = req.body;
    if (!payload) {
      res.status(400).json({ error: 'Missing JSON body' });
      return;
    }

  const result = await analyzer.analyzeQuiz(payload);
    
    // Save to database
    try {
      const { userId, quizId, answers, questions } = payload;
      const { score } = result; // score is already out of 10
      
      if (userId && quizId) {
        // Prepare answers with correct flag
        const answersWithCorrect = answers.map(ans => {
          const question = questions?.find(q => q.id === ans.questionId);
          if (!question) return ans;
          
          const isCorrect = question.options[question.answerIndex] === ans.selectedOption;
          const topic = question.topic || 'unknown';
          
          return {
            questionId: ans.questionId,
            selectedAnswer: ans.selectedOption,
            isCorrect,
            topic,
            timeTaken: ans.timeTakenSec
          };
        });
        
        // Calculate weak areas
        const wrongAnswers = answersWithCorrect.filter(a => !a.isCorrect);
        const weakAreas = [...new Set(wrongAnswers.map(a => a.topic))];
        
        // Save to database
        const resultId = await dbHelpers.saveResult(
          userId,
          quizId,
          score,
          answers.length,
          answersWithCorrect,
          weakAreas,
          {
            correctAnswers: answersWithCorrect.filter(a => a.isCorrect).length,
            accuracy: answers.length > 0 ? ((answersWithCorrect.filter(a => a.isCorrect).length / answers.length) * 100).toFixed(2) : 0
          },
          result.recommendations || []
        );
        
        console.log('[API] Quiz results saved to database:', { resultId, userId, quizId, score });
      }
    } catch (dbError) {
      console.warn('[API] Warning: Failed to save to database:', dbError.message);
      // Don't fail the API response, just log warning
    }
    
    res.json(result);
  } catch (err) {
    console.error('API /api/analyze-quiz error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

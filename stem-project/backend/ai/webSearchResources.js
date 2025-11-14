/**
 * webSearchResources.js
 * 
 * CALLS THE PYTHON AI_ENGINE (port 8000) to get:
 * 1. AI-generated motivational feedback (personalized, not templated)
 * 2. Real web-searched learning resources (from AI, not hardcoded curated list)
 * 
 * The ai_engine uses OpenAI + web scraping to find actual learning materials
 * and generate emotional, personalized feedback.
 */

const axios = require('axios');
require('dotenv').config();

// AI Engine URL - should be running on port 8000
const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

/**
 * Get learning resources for a specific topic by calling the AI Engine
 * The AI Engine will use OpenAI + web search to find REAL resources, not templates
 */
async function getResourcesForTopic(topic, difficulty = 'medium') {
  const cleanTopic = (topic || 'General').trim();

  try {
    console.log(`[Resources] Calling AI Engine for topic: ${cleanTopic}`);
    
    // Call the Python ai_engine /resources endpoint which uses OpenAI + web search
    const response = await Promise.race([
      axios.get(`${AI_ENGINE_URL}/resources/`, {
        params: {
          topic: cleanTopic,
          difficulty: difficulty,
          type: 'lesson'
        },
        timeout: 8000
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('AI_ENGINE_TIMEOUT')), 8000))
    ]);

    const resources = response.data?.resources || [];
    if (resources.length > 0) {
      console.log(`[Resources] AI Engine returned ${resources.length} resources for: ${cleanTopic}`);
      return resources.slice(0, 3);
    }

    console.log(`[Resources] AI Engine returned no resources for: ${cleanTopic}, trying web search`);
    // If no curated resources, try web search endpoint
    const webSearchResponse = await axios.get(`${AI_ENGINE_URL}/recommend/resources`, {
      params: {
        topic: cleanTopic,
        difficulty: difficulty
      },
      timeout: 8000
    });

    const webResources = webSearchResponse.data?.resources || [];
    if (webResources.length > 0) {
      console.log(`[Resources] Web search found ${webResources.length} resources`);
      return webResources.slice(0, 3);
    }

    console.log(`[Resources] AI Engine web search also failed, returning fallback`);
    return [];

  } catch (error) {
    console.warn(`[Resources] AI Engine error (${error.message}). AI Engine may not be running at ${AI_ENGINE_URL}`);
    console.warn(`[Resources] Make sure to run: cd ai_engine && python -m uvicorn main:app --host 0.0.0.0 --port 8000`);
    return [];
  }
}

/**
 * Generate motivational feedback by calling AI Engine
 * The AI Engine uses OpenAI to generate PERSONALIZED, EMOTIONAL feedback based on:
 * - Student's score and performance level
 * - Student's weak areas
 * - Real-time emotion-aware messaging (not pre-written templates)
 */
function generateMotivationalFeedback(score, performanceLabel, weakAreas) {
  // Return a placeholder that tells the analyzer to call AI Engine for real feedback
  // The actual AI-generated feedback will come from ai_engine/main.py
  return {
    opening: 'AI is generating personalized feedback...',
    body: 'Your AI coach is analyzing your performance to create a personalized message.',
    closing: 'Check back in a moment for your unique encouragement.',
    overallMessage: 'AI is generating personalized feedback based on your performance.',
    _useAIEngine: true  // Flag for analyzer.js to know this is pending AI Engine call
  };
}

module.exports = {
  getResourcesForTopic,
  generateMotivationalFeedback,
  AI_ENGINE_URL
};

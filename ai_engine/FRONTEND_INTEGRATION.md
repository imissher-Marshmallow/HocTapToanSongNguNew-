# Frontend Integration Guide

Your React app can now call the AI Engine API running on `http://localhost:8000`

## Basic Fetch Examples

### 1. Get Health Status

```javascript
const checkHealth = async () => {
  try {
    const response = await fetch('http://localhost:8000/health');
    const data = await response.json();
    console.log('API Status:', data);
    // Output: { status: "healthy", service: "AI Engine - Deep Learning With Love", ... }
  } catch (error) {
    console.error('API Error:', error);
  }
};
```

### 2. Get Personalized Resources

```javascript
const getRecommendations = async (topic = 'algebra', difficulty = 'medium') => {
  try {
    const response = await fetch(
      `http://localhost:8000/recommend/resources?topic=${topic}&difficulty=${difficulty}`
    );
    const data = await response.json();
    console.log('Recommended Resources:', data.resources);
    console.log('Learning Path:', data.learning_path);
    return data;
  } catch (error) {
    console.error('Failed to get recommendations:', error);
  }
};
```

### 3. Submit Quiz Session

```javascript
const submitQuizSession = async (sessionData) => {
  try {
    const response = await fetch('http://localhost:8000/quiz-sessions/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quiz_id: sessionData.quizId,
        score: sessionData.score,
        answers: sessionData.answers,
        time_per_question: sessionData.timePerQuestion,
      }),
    });
    const data = await response.json();
    console.log('Quiz Session Recorded:', data);
    return data;
  } catch (error) {
    console.error('Failed to submit quiz:', error);
  }
};
```

### 4. List Learning Resources

```javascript
const listResources = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.topic) params.append('topic', filters.topic);
  if (filters.difficulty) params.append('difficulty', filters.difficulty);
  if (filters.type) params.append('type', filters.type);

  try {
    const response = await fetch(`http://localhost:8000/resources/?${params}`);
    const data = await response.json();
    return data.resources;
  } catch (error) {
    console.error('Failed to list resources:', error);
  }
};
```

## React Hook Example

Create a custom hook for cleaner component code:

```javascript
// hooks/useAIEngine.js
import { useState, useEffect } from 'react';

export function useAIEngine(endpoint, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:8000${endpoint}`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...options.headers,
            },
            ...options,
          }
        );

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err.message);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, options]);

  return { data, loading, error };
}
```

### Using the Hook

```javascript
// components/RecommendationsPanel.jsx
import { useAIEngine } from '../hooks/useAIEngine';

export function RecommendationsPanel({ topic }) {
  const { data: recommendations, loading, error } = useAIEngine(
    `/recommend/resources?topic=${topic}`
  );

  if (loading) return <div>Loading recommendations...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Recommended Resources for {topic}</h2>
      {recommendations?.resources?.map((resource) => (
        <div key={resource.id} className="resource-card">
          <h3>{resource.title}</h3>
          <p>Source: {resource.source}</p>
          <p>Difficulty: {resource.difficulty}</p>
          <a href={resource.url} target="_blank" rel="noopener noreferrer">
            View Resource
          </a>
        </div>
      ))}
      
      {recommendations?.learning_path && (
        <div className="learning-path">
          <h3>Suggested Learning Path:</h3>
          <ol>
            {recommendations.learning_path.map((step, i) => (
              <li key={i}>
                <strong>Step {step.step}:</strong> {step.activity}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
```

## Integration with QuizPage

Update your `QuizPage.jsx` to also save quiz data to AI Engine:

```javascript
// In QuizPage.jsx
const submitQuiz = async () => {
  // ... existing submit logic ...

  try {
    // Send to AI Engine for analysis
    const aiResponse = await fetch('http://localhost:8000/quiz-sessions/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quiz_id: selectedContestKey,
        score: Math.round((correctCount / questions.length) * 10),
        answers: answers,
        time_per_question: timingData,
        performance_metrics: {
          accuracy: correctCount / questions.length,
          avgTimePerQuestion: avgTime,
        },
      }),
    });
    
    const sessionData = await aiResponse.json();
    console.log('Session saved to AI Engine:', sessionData);
  } catch (error) {
    console.error('Failed to save to AI Engine:', error);
  }
};
```

## Error Handling

Always wrap API calls in try-catch and provide fallback behavior:

```javascript
const safeAPICall = async (endpoint) => {
  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    if (!response.ok) {
      console.error(`API returned ${response.status}`);
      // Return default/cached data
      return null;
    }
    
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('API request timed out');
    } else {
      console.error('API Error:', error);
    }
    // Return fallback data
    return null;
  }
};
```

## Production Deployment

When deploying to production:

1. **Update API URL** based on environment:
   ```javascript
   const API_BASE_URL = process.env.REACT_APP_AI_ENGINE_URL || 'http://localhost:8000';
   
   const getRecommendations = async (topic) => {
     const response = await fetch(`${API_BASE_URL}/recommend/resources?topic=${topic}`);
     return response.json();
   };
   ```

2. **Set environment variables** in `.env`:
   ```
   REACT_APP_AI_ENGINE_URL=https://api.yourapp.com
   ```

3. **Update CORS origins** in `ai_engine/main.py`:
   ```python
   origins = [
       "http://localhost:3000",  # dev
       "https://yourapp.vercel.app",  # production
       "https://api.yourapp.com",
   ]
   ```

## Testing

Use the interactive API docs to test endpoints:

1. Open http://localhost:8000/docs in browser
2. Try out each endpoint with the "Try it out" button
3. Copy curl commands for integration tests

Or use curl/Postman:

```bash
# Get health status
curl http://localhost:8000/health

# Get recommendations
curl "http://localhost:8000/recommend/resources?topic=algebra&difficulty=medium"

# Submit quiz session
curl -X POST http://localhost:8000/quiz-sessions/ \
  -H "Content-Type: application/json" \
  -d '{
    "quiz_id": "contest1",
    "score": 85,
    "answers": {}
  }'
```

---

Your React app is now ready to leverage AI-powered personalized learning! 🚀
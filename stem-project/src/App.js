import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import QuizList from './pages/QuizList';
import QuizPage from './pages/QuizPage';
import ResultPage from './pages/ResultPage';
import LearningProfile from './pages/LearningProfile';
import AdaptiveQuiz from './pages/AdaptiveQuiz';
import './styles.css';
import './styles/LearningProfile.css';
import './styles/AdaptiveQuiz.css';

function App() {
  // Get userId from localStorage or auth context
  // This should be replaced with your actual auth system
  const [userId] = useState(() => {
    return localStorage.getItem('userId') || 'user123';
  });

  const handleQuizComplete = (results) => {
    console.log('Quiz completed with results:', results);
    // You can add logic here to update state or redirect
  };

  return (
    <LanguageProvider>
      <Router>
        <div className="app">
          <NavBar />
          <main>
            <Routes>
              {/* Original Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/quizzes" element={<QuizList />} />
              <Route path="/quiz/:id" element={<QuizPage />} />
              <Route path="/result" element={<ResultPage />} />
              
              {/* Adaptive Learning Routes */}
              <Route 
                path="/adaptive/profile/:userId" 
                element={<LearningProfile userId={userId} />} 
              />
              <Route 
                path="/adaptive/profile" 
                element={<LearningProfile userId={userId} />} 
              />
              <Route 
                path="/adaptive/quiz" 
                element={<AdaptiveQuiz userId={userId} onComplete={handleQuizComplete} />} 
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;

// Comments for next files:
// - Create data/quizzes.js for quiz data
// - Create api/ai.js for AI API calls
// - Implement detailed QuizList.jsx with quiz cards
// - Implement QuizPage.jsx with questions loading from API
// - Implement ResultPage.jsx with Chart.js and AICoach integration
// - Create components/AICoach.jsx for AI interaction

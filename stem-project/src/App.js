import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import QuizList from './pages/QuizList';
import QuizPage from './pages/QuizPage';
import ResultPage from './pages/ResultPage';
import './styles.css';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="app">
          <NavBar />
          <main>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/quizzes" element={<QuizList />} />
              <Route path="/quiz/:id" element={<QuizPage />} />
              <Route path="/result" element={<ResultPage />} />
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

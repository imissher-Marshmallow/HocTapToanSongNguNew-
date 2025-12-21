import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import QuizList from './pages/QuizList';
import QuizPage from './pages/QuizPage';
import ResultPage from './pages/ResultPage';
import LearningHome from './pages/LearningHome';
import Study from './pages/Study';
import Resources from './pages/Resources';
import History from './pages/History';
import Signup from './components/Signup';
import Signin from './components/Signin';
import ProtectedRoute from './components/ProtectedRoute';
import './styles.css';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <div className="app">
            <NavBar />
            <main>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/quizzes" element={<QuizList />} />
                <Route
                  path="/study"
                  element={
                    <ProtectedRoute>
                      <LearningHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/study-mode"
                  element={
                    <ProtectedRoute>
                      <Study />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/resources"
                  element={
                    <ProtectedRoute>
                      <Resources />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/history"
                  element={
                    <ProtectedRoute>
                      <History />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/quiz/:id"
                  element={
                    <ProtectedRoute>
                      <QuizPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/result"
                  element={
                    <ProtectedRoute>
                      <ResultPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/signup" element={<Signup />} />
                <Route path="/signin" element={<Signin />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </AuthProvider>
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

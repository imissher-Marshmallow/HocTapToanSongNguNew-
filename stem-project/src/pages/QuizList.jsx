import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { quizListTranslations } from '../translations/quizListTranslations';

export default function QuizList() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = quizListTranslations[language];

  const quizzes = t.quizzes.map(quiz => ({
    ...quiz,
    attempts: Math.floor(Math.random() * 3) // Simulated attempts, replace with real data later
  }));

  return (
    <div className="quiz-list container mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-center mb-8">{t.title}</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="quiz-card bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold mb-2">{quiz.title}</h2>
            <p className="text-gray-600 mb-4">{quiz.description}</p>
            <div className="text-sm text-gray-500 mb-4">
              <p>{t.time}: {quiz.time}</p>
              <p>{t.attempts}: {quiz.attempts} {language === 'vi' ? 'lần' : ''}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/quiz/${quiz.id}`)}
                className="btn-primary bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                {t.details}
              </button>
              <button
                onClick={() => navigate(`/quiz/${quiz.id}`)}
                className="btn-secondary bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                {t.start}
              </button>
            </div>
          </div>
        ))}
      </div>


    </div>
  );
}

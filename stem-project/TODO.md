# TODO: Implement Quiz Analysis System

## Backend Changes
- [ ] Modify analyzer.js to output exact JSON structure (score out of 10, simplified weakAreas, feedback only for wrong answers, recommendations with topic and nextQuestions)
- [ ] Add GET /questions/:quizId route in quiz.js

## Frontend Changes
- [ ] Update QuizPage.jsx to fetch questions, render quiz with time tracking, collect answers with timeTakenSec, submit to analysis, navigate to result
- [ ] Update ResultPage.jsx to display analysis result (score, weakAreas with pie chart, feedback, recommendations, AICoach)

## Testing
- [ ] Run backend server
- [ ] Run frontend
- [ ] Test full flow: fetch questions, take quiz, submit, view results

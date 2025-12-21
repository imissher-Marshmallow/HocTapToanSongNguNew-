<<<<<<< HEAD
# Adaptive Learning System - Quick Reference Guide

## 🚀 Quick Start

### For Frontend Developers
```javascript
// 1. Import the components
import LearningProfile from './pages/LearningProfile';
import AdaptiveQuiz from './pages/AdaptiveQuiz';

// 2. Use in your app
<LearningProfile userId="user123" />
<AdaptiveQuiz userId="user123" onComplete={handleComplete} />

// 3. The components automatically:
//    - Fetch data from /api/adaptive/* endpoints
//    - Display beautiful, responsive UI
//    - Handle errors gracefully
//    - Show loading states
```

### For Backend Developers
```javascript
// The adaptive system is already implemented in:
// /backend/ai/adaptiveEngine.js - Core algorithms
// /backend/routes/adaptive.js - 6 API endpoints
// /backend/server.js - Server configuration

// Key classes in adaptiveEngine.js:
const engine = new AssessmentEngine();
const scores = engine.assessPerformance(questions, answers);

const selector = new AdaptiveQuestionSelector();
const quiz = selector.generatePersonalizedQuiz(profile, allQuestions, 20);

const manager = new LearningProfileManager();
const profile = manager.createProfile(userId, assessment);
=======
# 🎯 Quick Reference Card

Print this or keep it handy while developing!

---

## Start Anywhere - Pick Your Command

```
┌─────────────────────────────────────────────────────────────┐
│                   STARTUP COMMANDS                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🚀 Full Stack (All Services)                               │
│     npm run dev                                              │
│     Ports: 3000, 5000, 8000                                 │
│                                                               │
│  📱 Frontend Only                                            │
│     npm run dev:frontend                                    │
│     Port: 3000                                              │
│                                                               │
│  🔌 Backend Only                                            │
│     npm run dev:backend                                     │
│     Port: 5000                                              │
│                                                               │
│  🤖 AI Engine Only                                          │
│     npm run dev:ai                                          │
│     Port: 8000 → http://localhost:8000/docs                │
│                                                               │
│  📦 Production Mode                                         │
│     npm run build && npm start                              │
│     Ports: 3000, 5000                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
>>>>>>> 9209e6538097f1c6690eead18706ec11b9c6b048
```

---

<<<<<<< HEAD
## 📚 API Reference (6 Endpoints)

### 1️⃣ Get Learning Profile
```
GET /api/adaptive/profile/:userId

Response:
{
  scores: { level1: 85, level2: 68, level3: 52, level4: 35 },
  proficiency: { level1: 'MASTERED', level2: 'DEVELOPING', ... },
  weakAreas: [ { level: 2, score: 68, priority: 32, ... } ],
  strongAreas: [ { level: 1, score: 85 } ],
  recommendations: [ { priority: 1, title: '...', description: '...' } ],
  learningPath: { weeks: [ { week: 1, goal: '...', topics: [...] } ] },
  quizzesTaken: 5
}
```

### 2️⃣ Get Personalized Quiz
```
GET /api/adaptive/quiz/personalized

Response:
{
  questions: [
    {
      id: 'q1',
      question: '...',
      options: ['opt1', 'opt2', 'opt3', 'opt4'],
      cognitiveLevel: 1,
      topic: '...'
    },
    ...
  ]
}
```

### 3️⃣ Analyze Quiz Answers
```
POST /api/adaptive/analyze

Request:
{
  userId: 'user123',
  quizId: 'personalized',
  answers: [ { questionId: 'q1', answer: 'opt2' }, ... ],
  timeSpent: 45
}

Response:
{
  overallScore: 75,
  cognitiveAnalysis: {
    levels: [
      { name: 'Knowledge', score: 85, status: 'MASTERED', correct: 8, total: 10 },
      { name: 'Comprehension', score: 68, status: 'DEVELOPING', correct: 7, total: 10 },
      ...
    ]
  },
  strengths: [ 'Strong at basic calculations', ... ],
  areasToImprove: [ 'Complex problem solving', ... ],
  nextSteps: 'Focus on application level problems...',
  recommendations: [ { title: '...', description: '...' } ]
}
```

### 4️⃣ Get Recommendations
```
GET /api/adaptive/recommendations/:userId

Response:
{
  recommendations: [
    {
      priority: 1,
      title: 'Focus on Comprehension',
      description: 'Your weakest area is understanding concepts...',
      action: 'Take 5 comprehension-focused quizzes',
      expectedBenefit: '+15% comprehension score'
    },
    ...
  ]
}
```

### 5️⃣ Get Progress
```
GET /api/adaptive/progress/:userId

Response:
{
  trends: {
    level1: { status: 'IMPROVING', increase: 5, estimatedMastery: '2 weeks' },
    level2: { status: 'STABLE', increase: 0, estimatedMastery: '4 weeks' },
    ...
  },
  milestones: [ 'Mastered Knowledge Level', 'Reached 70% Overall Score' ],
  timeTracking: { totalMinutes: 245, averagePerQuiz: 12.3 }
}
```

### 6️⃣ Legacy Routes (Preserved)
```
GET /api/questions/:quizId
POST /api/analyze-quiz
=======
## Service Ports & URLs

```
┌──────────────┬──────────┬─────────────────────────────────┐
│ Service      │ Port     │ URL                             │
├──────────────┼──────────┼─────────────────────────────────┤
│ Frontend     │ 3000     │ http://localhost:3000           │
│ Backend      │ 5000     │ http://localhost:5000           │
│ AI Engine    │ 8000     │ http://localhost:8000           │
│ AI Docs      │ 8000     │ http://localhost:8000/docs      │
└──────────────┴──────────┴─────────────────────────────────┘
>>>>>>> 9209e6538097f1c6690eead18706ec11b9c6b048
```

---

<<<<<<< HEAD
## 🧠 4 Cognitive Levels Explained

```
Level 1: Knowledge (Recognition)
- Students remember facts and basic concepts
- Example: "What is 2+2?"
- Difficulty: Basic
- Icon: 📚

Level 2: Comprehension (Understanding)
- Students explain ideas in their own words
- Example: "Why is 2+2=4?"
- Difficulty: Intermediate
- Icon: 💡

Level 3: Application (Low-level)
- Students apply concepts to new situations
- Example: "Use 2+2 to solve this problem..."
- Difficulty: Advanced
- Icon: 🔧

Level 4: Analysis (High-level)
- Students justify, analyze, and create
- Example: "Prove this mathematical principle..."
- Difficulty: Expert
- Icon: 🧠
```

**Key Point:** The system tracks students independently on each level!

---

## 📊 Component Architecture

```
LearningProfile Component
├── Header (Title + Stats)
├── Cognitive Levels Overview (4 Cards)
├── Weak Areas Section (Red cards with priorities)
├── Strong Areas Section (Green cards with mastery badges)
├── Personalized Recommendations (Numbered cards)
├── 4-Week Learning Path (Week cards with goals)
└── Statistics Section (Journey tracking)

AdaptiveQuiz Component
├── Header (Timer + Question Count)
├── Progress Bar (Visual progress)
├── Question Display
│   ├── Cognitive Level Badge
│   ├── Question Text
│   └── Multiple Choice Options
├── Question Info (Difficulty, Topic)
├── Navigation Buttons
├── Question Indicators (Click to jump)
└── Results Page (On completion)
    ├── Overall Score Circle
    ├── Cognitive Analysis Grid
    ├── Strengths Section
    ├── Areas to Improve
    ├── Next Steps
    └── Recommendations
=======
## Common npm Commands

```
Development
  npm run dev              All services
  npm run dev:frontend     React only
  npm run dev:backend      Node only
  npm run dev:ai           Python only

Building
  npm run build            Build for production
  npm run vercel-build     CI/CD build

Setup
  npm install              Install all dependencies
  npm run ai:setup         Setup Python venv
  npm run ai:init          Initialize database
  npm run check            Verify setup

Cleanup
  npm run clean            Remove builds & node_modules
>>>>>>> 9209e6538097f1c6690eead18706ec11b9c6b048
```

---

<<<<<<< HEAD
## 🔄 User Journey

```
1. User Visits Learning Profile
   ↓
2. System fetches GET /api/adaptive/profile/:userId
   ↓
3. Dashboard displays:
   - Cognitive level scores (4 levels)
   - Proficiency status
   - Weak and strong areas
   - Personalized recommendations
   - 4-week learning path
   ↓
4. User Clicks "Start Personalized Quiz"
   ↓
5. System fetches GET /api/adaptive/quiz/personalized
   ↓
6. Quiz has 20 questions distributed based on proficiency:
   - 7 from weak areas (basic level)
   - 5 from developing areas (intermediate)
   - 3 from mastered areas (advanced)
   - 2 from not ready areas (explore)
   ↓
7. User Answers Questions (timer running)
   ↓
8. User Submits Quiz
   ↓
9. System POST /api/adaptive/analyze with answers
   ↓
10. Results Show:
    - Score breakdown per cognitive level
    - Which areas improved/declined
    - Personalized next steps
    - Updated recommendations
    ↓
11. User Returns to Learning Profile
    ↓
12. Profile Updated with new data
    ↓
13. Repeat Cycle (continuous improvement)
```

---

## 🛠️ Common Tasks

### Display a User's Learning Profile
```javascript
import LearningProfile from './pages/LearningProfile';

// In your component:
<LearningProfile userId={currentUser.id} />

// Component handles:
// - Loading state
// - Fetching data from /api/adaptive/profile/:userId
// - Displaying all sections
// - Error handling
```

### Take a Personalized Quiz
```javascript
import AdaptiveQuiz from './pages/AdaptiveQuiz';

// In your component:
const handleQuizComplete = (results) => {
  console.log('Quiz Results:', results);
  // Do something with results
};

<AdaptiveQuiz userId={currentUser.id} onComplete={handleQuizComplete} />
```

### Connect to Your Auth System
```javascript
// Replace this (temporary):
const [userId] = useState('user123');

// With this (real auth):
import { useContext } from 'react';
import AuthContext from './contexts/AuthContext';

const { user } = useContext(AuthContext);
const userId = user?.id;

// Or from React Router:
import { useParams } from 'react-router-dom';

const { userId } = useParams();
```

### Add Links to Navigation Bar
```javascript
// In NavBar.jsx:
<nav>
  <Link to="/adaptive/profile">My Learning Profile</Link>
  <Link to="/adaptive/quiz">Take Quiz</Link>
</nav>
```

---

## 🎨 Customization

### Change Primary Colors
```css
/* In LearningProfile.css and AdaptiveQuiz.css */
:root {
  --primary: #667eea;      /* Main accent - change to your color */
  --secondary: #764ba2;    /* Secondary accent */
  --success: #10b981;      /* Positive (green) */
  --warning: #f59e0b;      /* Warning (orange) */
  --danger: #ef4444;       /* Danger (red) */
}
```

### Change Question Distribution
```javascript
// In adaptiveEngine.js, AdaptiveQuestionSelector.generatePersonalizedQuiz()
// Currently: 7-5-3-2 distribution
// Change to your preference:
const distribution = {
  weak: 10,        // 10 questions from weak areas
  developing: 5,   // 5 from developing
  mastered: 3,     // 3 from mastered
  notReady: 2      // 2 from not ready
};
```

### Change Learning Path Length
```javascript
// In adaptiveEngine.js, LearningProfileManager.createProfile()
// Currently: 4 weeks
// Change to:
const weeks = 6;  // or 8, or 12, etc.
```

---

## ⚠️ Common Issues & Solutions

### Issue: "Cannot find module LearningProfile"
**Solution:** Ensure file is at `src/pages/LearningProfile.jsx` and import statement is correct

### Issue: API calls return 404
**Solution:** 
1. Verify backend server is running on port 5000
2. Check that adaptive.js is loaded in server.js
3. Verify routes are registered at `/api/adaptive`

### Issue: Quiz doesn't save answers
**Solution:**
1. Check browser console for errors
2. Verify userId is not null/undefined
3. Ensure quiz questions have id field

### Issue: Styles not loading
**Solution:**
1. Verify CSS files are imported in App.js
2. Check CSS file paths
3. Clear browser cache and reload

### Issue: Mobile layout broken
**Solution:**
1. Styles have mobile breakpoints (768px, 480px)
2. Check device-width in HTML meta tag
3. Test with browser DevTools mobile mode

---

## 📈 Performance Tips

### For Better Performance:
✅ Lazy load components if app gets large
✅ Cache profile data for repeated views
✅ Optimize images and icons
✅ Minimize CSS bundle size
✅ Use React.memo for result components

### Current Optimizations:
✓ CSS Grid used instead of flexbox for complex layouts
✓ Framer Motion optimized animations
✓ No unnecessary re-renders
✓ Efficient state management
✓ Minimal API calls

---

## 🔐 Security Notes

### Already Implemented:
✓ Input validation on backend (whitelist quiz IDs)
✓ Rate limiting (100 req/15 min)
✓ CORS configured for specific origins
✓ Helmet.js security headers
✓ Parameterized queries (prevent SQL injection)

### To Add:
- [ ] User authentication validation (Supabase Auth)
- [ ] Row-Level Security (RLS) on database
- [ ] HTTPS in production
- [ ] API key rotation
- [ ] Regular security audits

---

## 📚 File Reference

```
Backend
├── adaptiveEngine.js (531 lines)
│   ├── AssessmentEngine
│   ├── AdaptiveQuestionSelector
│   └── LearningProfileManager
└── adaptive.js (392 lines)
    ├── 6 API endpoints
    └── Legacy route compatibility

Frontend
├── LearningProfile.jsx (400+ lines)
│   └── Dashboard with 4 cognitive levels
├── AdaptiveQuiz.jsx (500+ lines)
│   ├── Quiz component
│   └── Results component
├── LearningProfile.css (800+ lines)
│   └── Responsive, modern design
└── AdaptiveQuiz.css (900+ lines)
    └── Quiz styling + animations

Documentation
├── ADAPTIVE_FRONTEND_INTEGRATION.md
├── ADAPTIVE_IMPLEMENTATION_PLAN.md
├── ADAPTIVE_IMPLEMENTATION_CHECKLIST.md
└── QUICK_REFERENCE.md (this file)

Configuration
└── App.js (updated with routes)
=======
## File Locations

```
Project Files
  stem-project/            Frontend (React)
  stem-project/backend/    Backend (Node.js)
  ai_engine/               AI Engine (Python)
  package.json             Root npm configuration

Config Files
  .env.example             Environment template
  ai_engine/.env           AI engine secrets
  vercel.json              Deployment config

Documentation
  README_STARTUP.md        Overview
  STARTUP_GUIDE.md         Detailed guide
  STARTUP_HANDBOOK.md      Complete reference
  SETUP_SUMMARY.md         This summary
>>>>>>> 9209e6538097f1c6690eead18706ec11b9c6b048
```

---

<<<<<<< HEAD
## 🎯 Success Criteria

The adaptive system is working correctly when:

✅ User can view learning profile with 4 cognitive levels
✅ Each level shows scores 0-100 with proficiency status
✅ Weak/strong areas are identified and displayed
✅ Personalized recommendations are shown
✅ 4-week learning path is visible
✅ User can start a personalized quiz
✅ Quiz has 20 questions with mixed difficulty
✅ Questions are adapted to user's proficiency
✅ Timer tracks quiz duration
✅ User can navigate between questions
✅ Quiz can be submitted when complete
✅ Results show cognitive analysis (4 levels)
✅ Recommendations are displayed
✅ Mobile layout is responsive
✅ All API calls complete successfully
✅ No console errors

---

## 🆘 Need Help?

1. **Component Issues?** → Check `ADAPTIVE_FRONTEND_INTEGRATION.md`
2. **Backend Issues?** → Review `ADAPTIVE_IMPLEMENTATION_PLAN.md`
3. **Setup Issues?** → Follow `ADAPTIVE_IMPLEMENTATION_CHECKLIST.md`
4. **Code Questions?** → Check comments in `.js` files
5. **API Issues?** → Review backend logs and network tab

---

## 📞 Contact & Support

For questions or bugs, check:
- Component inline comments
- Documentation files above
- Backend error logs
- Browser console for errors
- Network tab for API failures

---

**Quick Reference Version:** 1.0
**Last Updated:** 2025
**Ready for:** Testing & Integration
=======
## Environment Variables Checklist

```
Frontend (stem-project/.env)
  [ ] REACT_APP_API_URL=http://localhost:5000
  [ ] REACT_APP_AI_ENGINE_URL=http://localhost:8000

Backend (stem-project/backend/.env)
  [ ] PORT=5000
  [ ] NODE_ENV=development
  [ ] OPENAI_API_KEY=sk-...

AI Engine (ai_engine/.env)
  [ ] DATABASE_URL=postgresql://...
  [ ] OPENAI_API_KEY=sk-...
```

---

## Troubleshooting Quick Fixes

```
Problem: Port already in use
Fix: PORT=3001 npm run dev:frontend

Problem: Module not found
Fix: npm install

Problem: Python error
Fix: npm run ai:setup

Problem: Database connection error
Fix: Check ai_engine/.env file

Problem: Services won't start together
Fix: Start in 3 separate terminals with individual commands
```

---

## Development Workflow

```
Step 1: npm run dev              Start everything
Step 2: Open http://localhost:3000   Use the app
Step 3: Edit code               Changes auto-reload
Step 4: Check logs              See output in terminal
Step 5: Test API                Use http://localhost:8000/docs
Step 6: Ctrl+C when done        Stop all services
```

---

## Testing the Stack

```javascript
// In browser console:

// Test backend
fetch('http://localhost:5000/api/questions')
  .then(r => r.json())
  .then(d => console.log(d))

// Test AI engine  
fetch('http://localhost:8000/health')
  .then(r => r.json())
  .then(d => console.log(d))
```

---

## Deploy Commands

```
Frontend
  npm run vercel-build && git push

Backend  
  Deploy stem-project/backend/ to Railway/Render
  Start: npm start
  Port: 5000

AI Engine
  Deploy ai_engine/ to Railway/Python
  Start: uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## Important Folders

```
stem-project/           ← Frontend React app
├── src/
│   ├── pages/         Quiz, Landing, Results
│   ├── components/    UI components
│   └── translations/  i18n files
├── public/            Static files
└── build/             Production build

stem-project/backend/   ← Node.js API
├── server.js          Express server
├── routes/            API endpoints
└── ai/                AI integration

ai_engine/              ← Python AI
├── main.py            FastAPI app
├── models.py          Database models
├── ml.py              ML functions
└── .env               Database URL
```

---

## Database

```
Type: PostgreSQL (via Supabase)
Tables:
  - users
  - quiz_sessions
  - user_progress
  - learning_preferences
  - learning_resources

Connection: ai_engine/.env → DATABASE_URL
Command: npm run ai:init
```

---

## Key Hotkeys

```
Dev Server:
  Ctrl+C              Stop services
  Ctrl+Shift+R        Hard refresh browser (clear cache)
  F12                 Open DevTools
  Ctrl+Shift+I        Open DevTools (Windows)

Recommended Setup:
  Terminal 1: npm run dev:frontend
  Terminal 2: npm run dev:backend
  Terminal 3: npm run dev:ai
  Browser:   http://localhost:3000
```

---

## Memory

```
Port 3000  → Frontend (React)
Port 5000  → Backend (Node)
Port 8000  → AI Engine (Python)

Dev        → npm run dev
Build      → npm run build
Start      → npm start
Check      → npm run check
```

---

**Bookmark this file! Print it! Share it!** 📌

For full details, see: `STARTUP_HANDBOOK.md`
>>>>>>> 9209e6538097f1c6690eead18706ec11b9c6b048

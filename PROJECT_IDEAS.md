# STEM Project - Comprehensive Overview

## 📚 Project Purpose
An intelligent STEM learning platform that uses AI to analyze student quiz performance and provide personalized educational feedback and guidance.

---

## 🎯 Core Features

### 1. **Interactive Quiz System**
- Multiple quiz contests (5 contests currently: contest1-5)
- Bilingual support (English/Vietnamese via Language Context)
- Questions organized by difficulty and topic
- Real-time quiz submission and analysis

### 2. **AI-Powered Analysis (OpenAI Integration)**
- Analyzes student answers against quiz questions
- Generates personalized feedback
- Identifies knowledge gaps
- Provides learning recommendations

### 3. **AI Coach Component**
- Interactive chat interface for students
- Real-time learning assistance
- Personalized guidance based on quiz results
- Multi-language support

### 4. **Performance Analytics**
- Visual charts using Chart.js/react-chartjs-2
- Performance metrics display
- Progress tracking across quizzes
- Comparative analysis features

### 5. **Language Localization**
- Support for multiple languages (English/Vietnamese)
- Context-based translation
- Dynamic language switching without page reload

---

## 🔄 How It Works (User Journey)

### Step 1: Landing Page
```
User visits → LandingPage
  ├─ See project overview
  ├─ Language selector (EN/VI)
  └─ Navigation to quizzes
```

### Step 2: Browse Quizzes
```
User clicks "Quizzes" → QuizList
  ├─ View available contests (contest1-5)
  ├─ See quiz descriptions/metadata
  └─ Select quiz to start
```

### Step 3: Take Quiz
```
User starts quiz → QuizPage
  ├─ Load questions from API (/api/questions/:quizId)
  ├─ Display 20+ questions (4 multiple choice options each)
  ├─ Track user answers
  └─ Submit answers when done
```

### Step 4: AI Analysis
```
Backend processes → /api/analyze-quiz (POST)
  ├─ Validate answers
  ├─ Call OpenAI API
  ├─ Generate detailed feedback
  ├─ Create performance metrics
  └─ Return analysis result
```

### Step 5: View Results
```
User sees results → ResultPage
  ├─ Performance charts (Chart.js)
  ├─ Score breakdown
  ├─ AI-generated feedback
  ├─ Learning recommendations
  └─ AI Coach available for questions
```

### Step 6: AI Coaching
```
User asks questions → AICoach
  ├─ Sends message to backend
  ├─ Backend queries OpenAI
  ├─ Returns personalized advice
  └─ Multi-turn conversation
```

---

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework**: React 19.2.0
- **Routing**: React Router v7
- **State Management**: React Context API (Language Context)
- **UI Components**: Custom + Lucide React icons
- **Animations**: Framer Motion
- **Charts**: Chart.js + react-chartjs-2
- **Styling**: CSS3 (BEM methodology)

### Backend Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **API**: RESTful
- **AI Integration**: OpenAI API (ChatGPT)
- **Hosting**: Vercel (serverless)
- **Database**: Supabase (PostgreSQL)

### Deployment
- **Frontend**: Vercel (auto-deploy from git)
- **Backend**: Node.js on Vercel
- **Database**: Supabase Cloud
- **Environment Variables**: Managed via Vercel Dashboard

---

## 📊 Data Flow Architecture

```
┌─────────────────────┐
│   User Browser      │
├─────────────────────┤
│  React App          │
│ - Pages             │
│ - Components        │
│ - Context (i18n)    │
└──────────┬──────────┘
           │ HTTP/REST
           ▼
┌─────────────────────┐
│  Vercel Backend     │
├─────────────────────┤
│  Express.js         │
│  /api/questions     │ ──┐
│  /api/analyze-quiz  │   │
│  /api/quizzes       │   │
└──────────┬──────────┘   │
           │              │
      ┌────┴─────┐        │
      ▼          ▼        │
  ┌────────┐  ┌────────┐  │
  │Supabase│  │OpenAI  │  │
  │ (Data) │  │ (AI)   │  │
  └────────┘  └────────┘  │
      ▲                    │
      │    Loads from     │
      └────────────────────┘
         JSON Files
```

---

## 🔐 Current Security Status

### Fixed Issues ✅
- Input validation with whitelist
- Rate limiting (10 requests/minute)
- SQL injection protection
- CORS properly configured
- Security headers (via Helmet)

### Protected Endpoints
- All quiz routes protected by validation
- POST endpoint rate-limited
- Error messages don't leak database info

---

## 📈 Key Metrics & Features

| Feature | Status | Technology |
|---------|--------|------------|
| Multi-language support | ✅ Active | React Context |
| Quiz system | ✅ Active | REST API |
| AI analysis | ✅ Active | OpenAI |
| Performance charts | ✅ Active | Chart.js |
| AI Coach | ✅ Active | OpenAI |
| Database | ✅ Active | Supabase |
| Authentication | ⏳ Planned | Supabase Auth |
| User profiles | ⏳ Planned | Supabase |
| Progress tracking | ⏳ Planned | Database |

---

## 🚀 Current API Endpoints

### GET Endpoints
```
GET  /api/questions/:quizId
     → Returns questions for specific quiz
     
GET  /api/questions/random
     → Returns random quiz questions
     
GET  /api/questions/:quizId/grouped
     → Returns questions grouped by topic
```

### POST Endpoints
```
POST /api/analyze-quiz
     Body: { quizId, answers }
     → Analyzes answers with OpenAI
     → Returns score + feedback
```

---

## 💡 How AI Integration Works

### OpenAI Analyzer Flow
```javascript
1. User submits answers
   └─> answers = [0, 1, 2, 3, ...] (0-3 for 4 options)

2. Backend loads corresponding questions
   └─> question_text, correct_answer, options

3. Create prompt for OpenAI
   └─> "Student answered X on question Y. Correct is Z. 
       Provide feedback on why..."

4. Call OpenAI API
   └─> Generate detailed explanation
   └─> Identify weak areas
   └─> Suggest resources

5. Return analysis to frontend
   └─> Display in ResultPage
   └─> Make available to AICoach
```

---

## 🎨 User Experience Flow

```
Landing Page (Hero)
    ↓ [Language selector visible]
    ↓ [Browse Quizzes button]
    ↓
Quiz List (Browse)
    ├─ Contest 1 - Math Fundamentals
    ├─ Contest 2 - Physics Basics
    ├─ Contest 3 - Chemistry Intro
    ├─ Contest 4 - Biology Essentials
    └─ Contest 5 - Advanced Topics
    ↓ [Click one]
    ↓
Quiz Page (Take Test)
    ├─ Question: "What is 2+2?"
    ├─ Options: A) 3  B) 4  C) 5  D) 6
    ├─ [Select answer]
    ├─ [Next question]
    └─ [Submit quiz]
    ↓ [AI analyzes]
    ↓
Result Page (Feedback)
    ├─ Score: 18/20
    ├─ Chart: Performance visualization
    ├─ Feedback: AI-generated insights
    ├─ Areas to improve
    └─ [Ask AI Coach]
    ↓
AI Coach (Help)
    ├─ "Explain why X is wrong"
    ├─ "How do I improve on Y?"
    └─ [Chat interface]
```

---

## 📦 Data Structure

### Quiz Questions
```json
{
  "contest1": [
    {
      "id": 1,
      "question": "What is the capital of France?",
      "options": ["London", "Berlin", "Paris", "Madrid"],
      "correct": 2,
      "explanation": "Paris is the capital of France..."
    }
  ]
}
```

### Analysis Result
```json
{
  "score": 18,
  "total": 20,
  "percentage": 90,
  "feedback": "Great job! You scored well...",
  "areas": ["Weak in calculus", "Good at geometry"],
  "recommendations": ["Study calculus chapter 3", "Practice integration"]
}
```

---

## 🔧 Environment Configuration

### Required Environment Variables
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key
CORS_ORIGIN=https://mathz-jett-8a2.vercel.app
PORT=5000
NODE_ENV=production
```

---

## 🌐 Deployment Pipeline

```
1. Developer pushes to GitHub (main branch)
         ↓
2. Vercel detects changes
         ↓
3. Auto-build frontend (React)
         ↓
4. Auto-build backend (Express)
         ↓
5. Deploy to Vercel Edge Network
         ↓
6. Connect to Supabase (persistent data)
         ↓
7. Live at: https://mathz-jett-8a2.vercel.app
```

---

## 📱 Responsive Design

- **Mobile**: Full responsive using CSS Grid/Flexbox
- **Tablet**: Optimized layout
- **Desktop**: Full feature experience
- **Accessibility**: ARIA labels, keyboard navigation

---

## 🎓 Learning Path

1. **Student takes quiz** (5-10 minutes)
2. **AI analyzes performance** (instant)
3. **View personalized feedback** (immediate)
4. **Ask AI Coach questions** (real-time)
5. **Review weak areas** (self-paced)
6. **Retake quiz after studying** (optional)
7. **Track progress over time** (planned)

---

## 🔮 Future Enhancements

### Phase 2 - User Management
- Student registration/login
- User profiles with avatar
- Quiz history tracking
- Progress analytics over time

### Phase 3 - Gamification
- Achievement badges
- Leaderboard
- Daily challenges
- Streak tracking

### Phase 4 - Advanced Features
- Adaptive difficulty (adjusts based on performance)
- Peer comparison (anonymized)
- Custom quiz creation for teachers
- API for schools/institutions

### Phase 5 - Mobile App
- React Native version
- Offline support
- Push notifications
- Better mobile UX

---

## 📞 Support & Documentation

- **Bugs/Issues**: Check GitHub issues
- **Questions**: See PROJECT_STRUCTURE.md for detailed setup
- **Improvements**: Refer to IMPROVEMENTS.md

---

## ✨ Project Statistics

| Metric | Value |
|--------|-------|
| Frontend Components | 4 pages + 4 components |
| Quiz Contests | 5 |
| Questions per quiz | 20+ |
| Supported Languages | 2 (EN/VI) |
| API Endpoints | 4 |
| Lines of Code | ~5000+ |
| Deployment Platforms | 3 (Vercel, Supabase, OpenAI) |

---

**Last Updated**: December 2025
**Status**: Production Ready (with recent security hardening)
**Next Review**: January 2025

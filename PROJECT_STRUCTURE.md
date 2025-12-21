# STEM Project - Complete Structure & Setup Guide

## 📂 Project Directory Structure

```
STEMProjectReal/
├── stem-project/                    # Main React application
│   ├── public/                      # Static public files
│   │   ├── index.html              # HTML entry point
│   │   ├── manifest.json           # PWA manifest
│   │   └── robots.txt              # SEO
│   │
│   ├── src/                        # React source code
│   │   ├── index.js                # React DOM render
│   │   ├── index.css               # Global styles
│   │   ├── styles.css              # Additional global styles
│   │   ├── App.js                  # Main App component & routing
│   │   │
│   │   ├── components/             # Reusable components
│   │   │   ├── NavBar.jsx          # Navigation bar (links + language selector)
│   │   │   ├── Footer.jsx          # Footer component
│   │   │   ├── LanguageSelector.jsx # Language switcher (EN/VI)
│   │   │   └── AICoach.jsx         # AI chatbot interface
│   │   │
│   │   ├── pages/                  # Page components (routes)
│   │   │   ├── LandingPage.jsx     # Home page (hero section)
│   │   │   ├── QuizList.jsx        # Browse quizzes (contest1-5)
│   │   │   ├── QuizPage.jsx        # Take quiz (display questions)
│   │   │   └── ResultPage.jsx      # Results + charts + AI feedback
│   │   │
│   │   ├── contexts/               # React Context (state management)
│   │   │   └── LanguageContext.js  # Multi-language state (EN/VI)
│   │   │
│   │   ├── styles/                 # Component-specific CSS
│   │   │   ├── NavBar.css
│   │   │   ├── footer.css
│   │   │   ├── LandingPage.css
│   │   │   ├── QuizPage.css
│   │   │   ├── ResultPage.css
│   │   │   └── AzotaQuiz.css
│   │   │
│   │   └── translations/           # i18n translations
│   │       ├── navTranslations.js       # Nav text (EN/VI)
│   │       ├── landingTranslations.js   # Landing text (EN/VI)
│   │       ├── quizTranslations.js      # Quiz text (EN/VI)
│   │       └── quizListTranslations.js  # List text (EN/VI)
│   │
│   ├── backend/                    # Express.js backend
│   │   ├── server.js               # Express app setup & middleware
│   │   ├── package.json            # Backend dependencies
│   │   │
│   │   ├── routes/                 # API endpoint handlers
│   │   │   └── quiz.js             # Quiz API routes
│   │   │                           #   - GET /api/questions/:quizId
│   │   │                           #   - GET /api/questions/random
│   │   │                           #   - GET /api/questions/:quizId/grouped
│   │   │                           #   - POST /api/analyze-quiz
│   │   │
│   │   ├── ai/                     # AI/ML logic
│   │   │   ├── analyzer.js         # OpenAI integration
│   │   │   │                       # - analyzeQuiz(answers)
│   │   │   │                       # - generates feedback
│   │   │   └── analyzer.js.bak     # Backup
│   │   │
│   │   ├── data/                   # Quiz data (JSON)
│   │   │   ├── questions_updated.json  # All quiz questions
│   │   │   └── feedback.json           # Feedback templates
│   │   │
│   │   └── netlify.toml            # Netlify deployment config (optional)
│   │
│   ├── build/                      # Production build output
│   │   ├── index.html              # Minified HTML
│   │   ├── manifest.json
│   │   ├── robots.txt
│   │   └── static/                 # Bundled JS/CSS
│   │       ├── css/
│   │       │   └── main.dc68f3f8.css
│   │       └── js/
│   │           └── main.28d41e1e.js
│   │
│   ├── scripts/                    # Build/run scripts
│   ├── package.json                # Frontend dependencies
│   ├── package-lock.json           # Dependency lock file
│   ├── netlify.toml                # Netlify config
│   ├── README.md                   # Frontend README
│   └── TODO.md                     # Frontend tasks
│
├── api/                            # Vercel serverless functions (optional)
│   ├── analyze-quiz.js             # Alternative API handler
│   └── questions.js                # Alternative questions handler
│
├── DEPLOYMENT.md                   # Deployment guide
├── netlify.toml                    # Root Netlify config
├── vercel.json                     # Vercel deployment config
├── package.json                    # Root package.json
├── README.md                       # Project README
├── summary.md                      # Project summary
├── TODO.md                         # Project tasks
│
├── URGENT_SECURITY_FIX.md          # Security patches (created)
├── VERCEL_PENETRATION_TEST.py      # Security testing tool (created)
├── SUPABASE_SQL_INJECTION_TEST.py  # SQL injection test (created)
├── SQL_INJECTION_FIXES.md          # SQL injection remediation (created)
│
├── PROJECT_IDEAS.md                # How project works (this file series)
└── PROJECT_STRUCTURE.md            # Folder structure (this file)
```

---

## 🎯 Quick Navigation

| Folder | Purpose | Key Files |
|--------|---------|-----------|
| `src/pages/` | User-facing screens | LandingPage, QuizPage, ResultPage |
| `src/components/` | Reusable UI parts | NavBar, AICoach, Footer |
| `src/contexts/` | State management | LanguageContext (i18n) |
| `src/translations/` | Multi-language text | EN/VI translations |
| `backend/routes/` | API handlers | quiz.js routes |
| `backend/ai/` | AI logic | OpenAI integration |
| `backend/data/` | Question data | JSON quiz data |
| `build/` | Production output | Deploy this to Vercel |

---

## 🚀 Frontend (React) Explained

### What is the Frontend?
The frontend is the user interface - everything the student sees in their browser.

### Tech Stack
```
React 19.2.0          → Interactive UI components
React Router 7.9.5    → Page navigation
React Context API     → State management (language)
Chart.js 4.5.1        → Performance charts
Framer Motion 12.23   → Smooth animations
Lucide React 0.55     → Beautiful icons
```

### Key Components

#### **App.js** - Main Router
```javascript
// Routes all pages
/ → LandingPage
/quizzes → QuizList
/quiz/:id → QuizPage
/result → ResultPage
```

#### **Components/NavBar.jsx**
- Navigation links
- Language selector dropdown (EN/VI)
- Responsive menu (mobile/desktop)

#### **Components/AICoach.jsx**
- Chat interface for students
- Sends questions to backend AI
- Shows real-time responses
- Stores conversation history

#### **Pages/LandingPage.jsx**
- Hero section with welcome
- Project description
- Call-to-action buttons
- Mobile responsive

#### **Pages/QuizList.jsx**
- Display 5 quiz contests
- Quiz cards with descriptions
- Link to start quiz
- Filter/search (optional)

#### **Pages/QuizPage.jsx**
```
1. Load questions from /api/questions/:quizId
2. Display current question + 4 options
3. Track user selections
4. Show progress (Question 5/20)
5. Submit when done → calls /api/analyze-quiz
```

#### **Pages/ResultPage.jsx**
```
1. Display score (18/20)
2. Show Chart.js performance graph
3. Display AI-generated feedback
4. List weak areas + recommendations
5. Provide AICoach button
```

#### **Contexts/LanguageContext.js**
```javascript
// Global state for language
const [language, setLanguage] = useState('en')
// Available: 'en' (English) or 'vi' (Vietnamese)
// All text uses: translations[language].text
```

### Styling Architecture
- **Global**: `index.css` + `styles.css`
- **Per-component**: `styles/ComponentName.css`
- **BEM Methodology**: `.component__element--modifier`
- **Responsive**: Mobile-first with media queries

### How Language Switching Works
```
1. User clicks language dropdown
2. LanguageSelector updates LanguageContext
3. All pages re-render with new language
4. Text comes from translations/xxTranslations.js
```

---

## 🖥️ Backend (Express.js) Explained

### What is the Backend?
The backend handles API requests - processing quizzes and AI analysis. Runs on Node.js.

### Server Setup (server.js)

```javascript
require('dotenv').config()              // Load environment variables
const express = require('express')
const cors = require('cors')            // Allow cross-origin requests
const app = express()

// Middleware
app.use(cors())                         // Enable browser requests
app.use(express.json())                 // Parse JSON bodies

// Routes
app.use('/api', quizRoutes)            // All /api/* requests

// Health check
app.get('/health', ...)                 // Monitoring endpoint

app.listen(PORT)                        // Start server
```

### API Routes (backend/routes/quiz.js)

#### 1. GET /api/questions/:quizId
```
Input: quizId = "contest1"
Processing: Load from data/questions_updated.json
Output: Array of 20 questions
Example:
{
  "id": 1,
  "question": "What is 2+2?",
  "options": ["3", "4", "5", "6"],
  "correct": 1  // Index of correct answer
}
```

#### 2. GET /api/questions/random
```
Input: None
Processing: Randomly select from any contest
Output: Shuffled 20 questions
Use case: Random quiz mode
```

#### 3. GET /api/questions/:quizId/grouped
```
Input: quizId = "contest1"
Processing: Load questions and group by topic
Output: Grouped questions by category
Example:
{
  "Algebra": [q1, q2, q3],
  "Geometry": [q4, q5, q6],
  "Calculus": [q7, q8, q9]
}
```

#### 4. POST /api/analyze-quiz
```
Input Body:
{
  "quizId": "contest1",
  "answers": [0, 1, 2, 3, 1, 0, ...]  // User's selections
}

Processing:
1. Validate quizId (whitelist check)
2. Load correct answers from database
3. Calculate score (18/20)
4. Build AI prompt with questions + answers
5. Call OpenAI API
6. Generate detailed feedback

Output:
{
  "score": 18,
  "total": 20,
  "percentage": 90,
  "feedback": "Great job! You scored well in...",
  "weakAreas": ["Calculus", "Word problems"],
  "recommendations": ["Review calculus chapter 3", "Practice word problems"]
}
```

### AI Integration (backend/ai/analyzer.js)

#### How analyzeQuiz() works:
```javascript
1. Receive user answers
   answers = [0, 1, 2, 3, ...]  // Indices

2. Load quiz questions
   questions = [{ id, question, options, correct }, ...]

3. Calculate correct responses
   score = count(answers[i] === questions[i].correct)

4. Build OpenAI prompt:
   "Student answered 'Paris' for 'Capital of France': CORRECT ✓
    Student answered 'London' for 'Capital of UK': CORRECT ✓
    Student answered 'Madrid' for 'Largest EU city': WRONG ✗
    
    Provide feedback on weak areas and improvement suggestions."

5. Call OpenAI:
   response = await openai.chat.completions.create({
     model: 'gpt-4',
     messages: [{ role: 'user', content: prompt }],
     temperature: 0.7
   })

6. Parse response and return analysis
```

### Data Structure (backend/data/questions_updated.json)

```json
{
  "contest1": [
    {
      "id": 1,
      "question": "What is the capital of France?",
      "options": ["London", "Berlin", "Paris", "Madrid"],
      "correct": 2,  // Index of correct answer (0-3)
      "topic": "Geography",
      "difficulty": "easy",
      "explanation": "Paris is the capital and largest city of France..."
    }
  ],
  "contest2": [...],
  "contest3": [...],
  "contest4": [...],
  "contest5": [...]
}
```

### Environment Variables (backend/server.js uses)

```env
# Supabase (Database)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# OpenAI (AI Analysis)
OPENAI_API_KEY=sk-...

# Deployment
PORT=5000
NODE_ENV=production

# CORS
CORS_ORIGIN=https://mathz-jett-8a2.vercel.app
```

---

## 🗄️ Database (Supabase) Explained

### What is Supabase?
A PostgreSQL database hosted in the cloud. Stores quiz data and user progress.

### Database Tables (Planned)

#### 1. questions table
```sql
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  quiz_id VARCHAR(50),
  question_text TEXT,
  options JSON,
  correct_answer INT,
  difficulty VARCHAR(20),
  topic VARCHAR(100),
  created_at TIMESTAMP
);
```

#### 2. user_progress table
```sql
CREATE TABLE user_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  quiz_id VARCHAR(50),
  score INT,
  total_questions INT,
  answers JSON,
  feedback TEXT,
  created_at TIMESTAMP
);
```

#### 3. users table (Future)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255),
  password_hash VARCHAR(255),
  name VARCHAR(255),
  avatar_url VARCHAR(255),
  created_at TIMESTAMP
);
```

### Row-Level Security (RLS) Policies

```sql
-- Public can read questions
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read questions" ON questions
  FOR SELECT USING (true);

-- Users can only see their own progress
CREATE POLICY "Users own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);
```

---

## 🚀 Deployment Architecture

### Deployment Platforms

#### 1. **Vercel** (Frontend + Backend)
```
GitHub → Vercel Webhook
  ↓
Auto-detect changes
  ↓
Build React app
  ↓
Bundle Express.js
  ↓
Deploy to Edge Network
  ↓
Live: https://mathz-jett-8a2.vercel.app
```

**Vercel Config** (vercel.json):
```json
{
  "functions": {
    "backend/server.js": {
      "runtime": "nodejs18.x"
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/backend/server.js" }
  ]
}
```

#### 2. **Supabase** (Database)
```
Your App → HTTPS → Supabase API
  ↓
PostgreSQL Database
  ↓
Data stored in cloud
```

**Connection** (backend uses):
```javascript
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
```

#### 3. **OpenAI** (AI Service)
```
Backend → API Call → OpenAI
  ↓
GPT-4 Analysis
  ↓
Return feedback
```

### Deployment Flow

```
Step 1: Developer commits to GitHub
        ↓ git push origin main

Step 2: Vercel detects change
        ↓ Webhook triggered

Step 3: Install dependencies
        ↓ npm install

Step 4: Build frontend
        ↓ npm run build → /build folder

Step 5: Bundle backend
        ↓ Node.js runtime prepared

Step 6: Deploy to production
        ↓ Available globally

Step 7: Connect to services
        ↓ Supabase + OpenAI keys from env vars

Step 8: Live at https://mathz-jett-8a2.vercel.app
        ↓ Ready for users
```

### Environment Setup on Vercel Dashboard

Go to: Project Settings → Environment Variables

Add:
```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_ANON_KEY = your-key-here
OPENAI_API_KEY = sk-your-key-here
CORS_ORIGIN = https://mathz-jett-8a2.vercel.app
NODE_ENV = production
```

---

## 🔧 Development Setup

### Local Development

#### Prerequisites
```bash
Node.js 18+ installed
npm or yarn
```

#### 1. Clone Repository
```bash
git clone <your-repo-url>
cd STEMProjectReal
```

#### 2. Install Frontend Dependencies
```bash
cd stem-project
npm install
```

#### 3. Install Backend Dependencies
```bash
cd backend
npm install
```

#### 4. Setup Environment Variables
Create `.env` in `stem-project/backend/`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-key
OPENAI_API_KEY=sk-your-key
CORS_ORIGIN=http://localhost:3000
PORT=5000
```

#### 5. Start Backend (Terminal 1)
```bash
cd stem-project/backend
npm start
# Runs on http://localhost:5000
```

#### 6. Start Frontend (Terminal 2)
```bash
cd stem-project
npm start
# Opens http://localhost:3000
```

#### 7. Test the App
- Go to http://localhost:3000
- Click "Quizzes"
- Start a quiz
- Submit answers
- See AI-generated feedback

---

## 🐛 Troubleshooting

### Frontend won't start
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm start
```

### Backend API calls fail
```bash
# Check backend is running on port 5000
# Check CORS is enabled in server.js
# Check environment variables are set
# Check firewall allows localhost:5000
```

### OpenAI errors
```bash
# Verify API key is correct
# Check API key has balance/credits
# Verify KEY is in environment variables
# Check internet connection
```

### Database connection fails
```bash
# Verify Supabase URL and key
# Check Supabase project is active
# Verify RLS policies are correct
# Check database hasn't hit query limits
```

---

## 📊 File Sizes

| Item | Size |
|------|------|
| React bundle (minified) | ~150 KB |
| CSS bundle | ~50 KB |
| Backend code | ~5 KB |
| Build folder | ~200 KB |
| Total deployment | ~250 KB |

---

## 🔐 Security Checklist

✅ **Implemented:**
- Input validation (whitelist)
- SQL injection prevention
- CORS configured
- Rate limiting
- Security headers
- Environment variables

⏳ **Planned:**
- User authentication (Supabase Auth)
- HTTPS only
- DDoS protection (Vercel)
- API key rotation
- Audit logging

---

## 📚 Additional Resources

### Learning More
- React docs: https://react.dev
- Express.js: https://expressjs.com
- Supabase: https://supabase.io/docs
- OpenAI API: https://platform.openai.com/docs

### Useful Commands

```bash
# Frontend
npm start           # Dev server
npm run build       # Production build
npm test            # Run tests

# Backend
npm start           # Start server
npm install package # Add dependency
npm audit fix       # Security fixes

# Git
git status          # See changes
git add .           # Stage files
git commit -m "msg" # Commit
git push            # Deploy
```

---

## 🎯 Next Steps

1. **Review** PROJECT_IDEAS.md for feature overview
2. **Setup** local environment following Development Setup
3. **Test** all API endpoints using Postman/Insomnia
4. **Deploy** to Vercel when ready
5. **Monitor** using Vercel Analytics + Supabase Logs

---

**Last Updated**: December 2025
**Version**: 1.0
**Audience**: Developers, Project Managers, Assistants

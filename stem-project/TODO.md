Create a personalized AI Learning Home page shown before the student starts any quiz.
This page should feel like a friendly AI tutor greeting the student, tracking progress, and recommending what to practice next.

The design must follow the themes:

Deep Learning → analytics, charts, insights

With Love → supportive tone, gentle colors, friendly micro-copy

📌 Page Features (Detailed)
1. AI Greeting Section (“Daily Welcome”)

A friendly AI message generated dynamically based on:

user’s last login

streak

yesterday’s performance

weak topics

upcoming recommendations

Example greeting:

"Good morning, Minh! 🌞
You improved a lot in Algebra yesterday. Today focus on 'Hằng đẳng thức' — only 2 more steps to master it. Let’s keep the streak going!"

This section includes:

student’s avatar

streak indicator 🔥

Must in Vietnam lauguage first, English we will develop later

learning level badge (“New Learner”, “Consistent”, “Fast Improver”)

2. Progress Summary Chart

Show analytics of student performance:

score trend (line chart, last 7 days)

accuracy by topic (radar chart / bar chart)

total quizzes completed

AI-predicted mastery level (0–100%)

Backend must store:

daily quiz scores

timestamps

per-topic correctness

streak days

3. Weak Areas + Priority List

AI extracts weak topics from the ML model:

sorted by severity

each topic card shows:

weakness level

reason

recent mistakes

“Practice Now” button

4. Recommended Learning Path (AI-Generated)

AI suggests:

next topics to learn

next 3–5 suggested questions

curated links scraped from VietJack, Hoc247, etc.

difficulty progression (easy → medium → harder)


There will have specific web for choose quiz:
Show all quiz like in the current web click to start do now then redirect to quiz list, there will have specific link to it

Card example:

📘 Recommended Today:
Topic: Hằng đẳng thức
Resources:
• VietJack: https://.../dang-1
• Hoc247: https://.../vd-2
Practice: 5 questions

5. Learning History Timeline

A timeline showing all previous activities:

quiz name

score

duration

improvement compared to previous attempt

key mistake areas

Example entry:

📅 Jan 12
Quiz: Phương trình bậc nhất
Score: 7.5 → ↑ +1.0
Weakness: Sai ở bước chuyển vế
Time: 4m 21s

6. Quick Actions Section

Buttons:

Start a new quiz

Continue where you left off

Review mistakes

View all quizzes

Study mode (no timer)

7. AI Motivation Card (“With Love”)

Small, soft-toned message generated based on mood/inference.
Not cringe, just gentle encouragement.

Example:

“Every small step counts. You’re doing great — keep going.” ❤️

🏗 Technical Requirements (Backend + Frontend)
Database Tables Required (PostgreSQL/Supabase)
users
user_profiles
quiz_attempts
quiz_answers
daily_stats
ai_recommendations
ai_greetings
progress_cache
resources_cache

Endpoints Needed
GET /api/user/profile
GET /api/user/progress
GET /api/user/weak-areas
GET /api/user/recommendations
GET /api/user/history
POST /api/ai/generate-greeting
POST /api/ai/generate-recommendations

🎨 UI/UX Layout Recommendation
Hero Section
AI Avatar	Greeting	Streak
Analytics Area

7-day line chart

mastery radar chart

topic accuracy bars

Weak Areas Cards

3–5 cards, clickable

Recommendations

Resource list + practice buttons

History Timeline

Scrollable, animated

Quick Action Buttons

Bottom or side panel

📝 Your Todo List (Copy & Use)
Backend

 Add PostgreSQL tables for progress tracking

 Add APIs to fetch user history + weak areas

 Add AI endpoints for greeting + recommendations

 Add resource scraping (VietJack / Hoc247)

 Add ML model (simple Bayes / rule-based first)

 Cache user progress daily

Frontend

 Create new LearningHome.jsx page

 Add charts (recharts.js or Chart.js)

 Implement greeting card

 Progress analytics section

 Weak areas section

 Timeline UI

 Responsive design

 Connect Backend APIs

AI Logic

 Personalized greeting generator

 Weak area detector from attempt logs

 Recommendation engine

 Resource scraper → summarizer

 Predict mastery via simple ML
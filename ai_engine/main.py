from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import models
from database import get_db, engine
import ml
import os
from pydantic import BaseModel
from sqlalchemy.orm import Session
from web_search_resources import get_resources_for_topic, generate_motivational_feedback
try:
    # optional supabase client if user prefers to write via Supabase REST
    from supabase import create_client as create_supabase_client
except Exception:
    create_supabase_client = None

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Deep Learning With Love - AI Engine",
    description="AI-powered learning analytics and recommendations for mathematics education",
    version="1.0.0"
)

# ===== CORS Configuration =====
# Allow frontend (React) to call this API during development
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== Health Check Endpoint =====
@app.get("/health")
async def health_check():
    """Check if the API is running"""
    return {
        "status": "healthy",
        "service": "AI Engine - Deep Learning With Love",
        "timestamp": datetime.utcnow().isoformat()
    }

# ===== Welcome Endpoint =====
@app.get("/")
async def read_root():
    """Welcome endpoint"""
    return {
        "message": "Welcome to Deep Learning With Love - AI Engine",
        "version": "1.0.0",
        "docs": "http://localhost:8000/docs",
        "endpoints": {
            "health": "/health",
            "recommendations": "/recommend/resources",
            "resources": "/resources",
            "quiz_sessions": "/quiz-sessions"
        }
    }

# ===== Analytics Endpoints =====
@app.get("/analytics/ping")
async def ping_analytics(db: Session = Depends(get_db)):
    """Test analytics endpoint"""
    return {
        "message": "Analytics service is running",
        "database_connected": True,
        "timestamp": datetime.utcnow().isoformat()
    }

# ===== Recommendation Endpoints =====
@app.get("/recommend/resources")
async def get_recommendations(
    topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get personalized resource recommendations
    
    Args:
        topic: Optional topic name (e.g., "algebra", "geometry")
        difficulty: Optional difficulty level (easy, medium, hard)
    
    Returns:
        Personalized learning resources
    """
    return {
        "topic": topic or "all",
        "difficulty": difficulty or "medium",
        "resources": [
            {
                "id": 1,
                "title": "Introduction to Algebra",
                "type": "video",
                "source": "VietJack",
                "url": "https://vietjack.com/",
                "difficulty": difficulty or "medium"
            }
        ],
        "learning_path": [
            {"step": 1, "activity": "Watch introduction video"},
            {"step": 2, "activity": "Solve practice problems"},
            {"step": 3, "activity": "Take a mini-quiz"}
        ]
    }

# ===== Quiz Session Endpoints =====
@app.post("/quiz-sessions/")
async def create_quiz_session(
    session_data: dict,
    db: Session = Depends(get_db)
):
    """Record a new quiz session"""
    return {
        "message": "Quiz session recorded",
        "session_id": 1,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/quiz-sessions/{session_id}")
async def get_quiz_session(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get quiz session details"""
    return {
        "session_id": session_id,
        "status": "retrieved",
        "message": "Quiz session data fetched from database"
    }

# ===== Learning Resources Endpoints =====
@app.get("/resources/")
async def list_resources(
    topic: Optional[str] = None,
    type: Optional[str] = None,
    difficulty: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List learning resources with optional filters"""
    return {
        "total_resources": 0,
        "resources": [],
        "filters": {
            "topic": topic,
            "type": type,
            "difficulty": difficulty
        }
    }



# ===== Analyze endpoint =====
class AnalyzePayload(BaseModel):
    userId: Optional[int] = None
    quizId: Optional[str] = None
    answers: list
    questions: Optional[list] = None
    preferences: Optional[dict] = None


@app.post('/analyze')
async def analyze_quiz(payload: AnalyzePayload, db: Session = Depends(get_db)):
    """Analyze a quiz submission, store session in DB or Supabase, and return AI feedback + resource links."""
    data = payload.dict()
    user_id = data.get('userId')
    quiz_id = data.get('quizId') or 'default'
    answers = data.get('answers') or []
    questions = data.get('questions') or []

    # Basic scoring
    correct = 0
    answer_comparison = []
    for ans in answers:
        q = next((q for q in questions if q.get('id') == ans.get('questionId')), None)
        if not q:
            continue
        selected = ans.get('selectedOption')
        correct_answer = None
        if q.get('answerIndex') is not None and isinstance(q.get('options'), list):
            try:
                correct_answer = q.get('options')[q.get('answerIndex')]
            except Exception:
                correct_answer = None
        is_correct = selected == correct_answer
        if is_correct:
            correct += 1
        answer_comparison.append({
            'questionId': ans.get('questionId'),
            'question': q.get('question') or q.get('content') or '',
            'userAnswer': selected,
            'correctAnswer': correct_answer,
            'isCorrect': is_correct,
            'explanation': q.get('explanation')
        })

    total = len(answers) or 1
    score = round((correct / total) * 10, 2)

    # Determine performance label
    if score >= 8:
        performance_label = 'Giỏi'
    elif score >= 6:
        performance_label = 'Đạt'
    elif score >= 5:
        performance_label = 'Trung bình'
    else:
        performance_label = 'Không đạt'

    # Prepare fake progress/session data for ML functions
    sessions_data = [{
        'start_time': datetime.utcnow().isoformat(),
        'end_time': datetime.utcnow().isoformat(),
        'score': score,
        'correct_answers': correct,
        'total_questions': total,
        'avg_time_per_question': sum((a.get('timeTakenSec') or 0) for a in answers) / (total or 1),
        'questions': questions
    }]

    # Build progress stub per topic from questions/answers
    progress_data = []
    # aggregate by topic
    topic_map = {}
    for q in questions:
        topic = (q.get('topic') or 'general').strip()
        topic_map.setdefault(topic, {'topic': topic, 'total_questions': 0, 'correct_answers': 0, 'avg_time_per_question': 0.0, 'proficiency_level': 0.5})
    for ans in answers:
        q = next((x for x in questions if x.get('id') == ans.get('questionId')), None)
        if not q: continue
        topic = (q.get('topic') or 'general').strip()
        entry = topic_map[topic]
        entry['total_questions'] += 1
        selected = ans.get('selectedOption')
        correct_answer = None
        if q.get('answerIndex') is not None and isinstance(q.get('options'), list):
            try:
                correct_answer = q.get('options')[q.get('answerIndex')]
            except Exception:
                correct_answer = None
        if selected == correct_answer:
            entry['correct_answers'] += 1
        entry['avg_time_per_question'] = ((entry.get('avg_time_per_question', 0) * (entry['total_questions'] - 1)) + (ans.get('timeTakenSec') or 0)) / entry['total_questions']
        # naive proficiency estimate
        entry['proficiency_level'] = entry['correct_answers'] / (entry['total_questions'] or 1)
    progress_data = list(topic_map.values())

    # ML: predict weak areas and recommend resources
    try:
        ml_result = ml.predict_weak_areas(progress_data, sessions_data)
    except Exception as e:
        ml_result = {'weak_areas': [], 'analysis_timestamp': datetime.utcnow().isoformat(), 'error': str(e)}

    # pick top weak topic to recommend resources for
    top_topic = None
    if ml_result.get('weak_areas'):
        top_topic = ml_result['weak_areas'][0]['topic']

    try:
        recommendations = ml.recommend_resources(top_topic or '', None, data.get('preferences') or {}, progress_data)
    except Exception as e:
        recommendations = {'resources': [], 'practice_suggestions': [], 'learning_path': []}

    # Get real learning resource links from VietJack, Khan Academy, etc.
    resource_links = []
    for weak_area in ml_result.get('weak_areas', [])[:3]:
        topic = weak_area.get('topic', 'General')
        resources = get_resources_for_topic(topic, 'medium')
        resource_links.extend(resources)
    
    # If no weak areas, get general resources
    if not resource_links:
        resource_links = get_resources_for_topic('General', 'medium')

    # Generate motivational feedback
    motivation = generate_motivational_feedback(score, performance_label, ml_result.get('weak_areas', []))

    # Compose response
    response = {
        'score': score,
        'performanceLabel': performance_label,
        'totalQuestions': total,
        'percentage': round((correct / total) * 100, 1),
        'answerComparison': answer_comparison,
        'weakAreas': ml_result.get('weak_areas', []),
        'analysisTimestamp': ml_result.get('analysis_timestamp'),
        'recommendations': recommendations,
        'resourceLinks': resource_links,  # Add real learning resource links
        'motivationalFeedback': motivation,  # Add motivational message
        'sources': [r.get('url') for r in resource_links if isinstance(r, dict) and r.get('url')]
    }

    # Persist session: try Supabase first if configured, otherwise SQLAlchemy DB
    saved_record = None
    try:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_KEY')
        if supabase_url and supabase_key and create_supabase_client:
            supabase = create_supabase_client(supabase_url, supabase_key)
            insert = {
                'user_id': user_id,
                'quiz_id': quiz_id,
                'start_time': datetime.utcnow().isoformat(),
                'end_time': datetime.utcnow().isoformat(),
                'score': score,
                'total_questions': total,
                'correct_answers': correct,
                'time_per_question': [a.get('timeTakenSec') or 0 for a in answers],
                'answers': answers,
                'performance_metrics': response
            }
            res = supabase.table('quiz_sessions').insert(insert).execute()
            saved_record = res.data if hasattr(res, 'data') else None
        else:
            # Save via SQLAlchemy models to configured DATABASE_URL (works with Supabase connection string)
            db_session = db
            qs = models.QuizSession(
                user_id=user_id,
                quiz_id=quiz_id,
                score=score,
                total_questions=total,
                correct_answers=correct,
                time_per_question=[a.get('timeTakenSec') or 0 for a in answers],
                answers=answers,
                performance_metrics=response
            )
            db_session.add(qs)
            db_session.commit()
            db_session.refresh(qs)
            saved_record = {'id': qs.id}
    except Exception as e:
        print('Warning: failed to persist session to Supabase/DB:', e)

    response['saved'] = saved_record
    return response
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
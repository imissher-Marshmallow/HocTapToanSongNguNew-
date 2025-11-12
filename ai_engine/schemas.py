from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from datetime import datetime

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int
    created_at: datetime
    is_active: bool

    class Config:
        orm_mode = True

# Quiz session schemas
class QuizSessionBase(BaseModel):
    quiz_id: str
    total_questions: int
    answers: Dict
    time_per_question: Dict

class QuizSessionCreate(QuizSessionBase):
    pass

class QuizSessionRead(QuizSessionBase):
    id: int
    user_id: int
    start_time: datetime
    end_time: Optional[datetime]
    score: float
    correct_answers: int
    performance_metrics: Dict

    class Config:
        orm_mode = True

# User progress schemas
class UserProgressBase(BaseModel):
    topic: str
    proficiency_level: float
    total_questions: int
    correct_answers: int
    avg_time_per_question: float
    weak_areas: List[Dict]
    strong_areas: List[Dict]

class UserProgressCreate(UserProgressBase):
    pass

class UserProgressRead(UserProgressBase):
    id: int
    user_id: int
    last_updated: datetime

    class Config:
        orm_mode = True

# Learning preferences schemas
class LearningPreferencesBase(BaseModel):
    preferred_difficulty: str
    preferred_topics: List[str]
    learning_style: str
    daily_goal_minutes: int
    preferred_resources: List[str]

class LearningPreferencesCreate(LearningPreferencesBase):
    pass

class LearningPreferencesRead(LearningPreferencesBase):
    id: int
    user_id: int

    class Config:
        orm_mode = True

# Learning resource schemas
class LearningResourceBase(BaseModel):
    title: str
    description: str
    url: str
    type: str
    topic: str
    difficulty_level: str
    source: str
    resource_metadata: Dict

class LearningResourceCreate(LearningResourceBase):
    pass

class LearningResourceRead(LearningResourceBase):
    id: int
    created_at: datetime
    verified: bool

    class Config:
        orm_mode = True
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    quiz_sessions = relationship("QuizSession", back_populates="user")
    progress_stats = relationship("UserProgress", back_populates="user")
    learning_preferences = relationship("LearningPreferences", back_populates="user")

class QuizSession(Base):
    __tablename__ = "quiz_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    quiz_id = Column(String)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    score = Column(Float)
    total_questions = Column(Integer)
    correct_answers = Column(Integer)
    time_per_question = Column(JSON)  # Store time spent on each question
    answers = Column(JSON)  # Store user's answers and correctness
    performance_metrics = Column(JSON)  # Store detailed metrics (speed, accuracy per topic)
    
    # Relationships
    user = relationship("User", back_populates="quiz_sessions")

class UserProgress(Base):
    __tablename__ = "user_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic = Column(String)
    proficiency_level = Column(Float)  # 0-1 scale
    total_questions = Column(Integer)
    correct_answers = Column(Integer)
    avg_time_per_question = Column(Float)
    last_updated = Column(DateTime, default=datetime.utcnow)
    weak_areas = Column(JSON)  # Store identified weak areas
    strong_areas = Column(JSON)  # Store strong areas
    
    # Relationships
    user = relationship("User", back_populates="progress_stats")

class LearningPreferences(Base):
    __tablename__ = "learning_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    preferred_difficulty = Column(String)  # easy, medium, hard
    preferred_topics = Column(JSON)  # List of preferred topics
    learning_style = Column(String)  # visual, auditory, reading/writing, kinesthetic
    daily_goal_minutes = Column(Integer)
    preferred_resources = Column(JSON)  # Preferred learning resource types
    
    # Relationships
    user = relationship("User", back_populates="learning_preferences")

class LearningResource(Base):
    __tablename__ = "learning_resources"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)
    url = Column(String)
    type = Column(String)  # video, article, exercise, etc.
    topic = Column(String)
    difficulty_level = Column(String)
    source = Column(String)  # e.g., "VietJack", "Khan Academy"
    created_at = Column(DateTime, default=datetime.utcnow)
    resource_metadata = Column(JSON)  # Store additional metadata
    verified = Column(Boolean, default=False)  # Whether content has been verified
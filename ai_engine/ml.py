from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import numpy as np
import pandas as pd
from typing import List, Dict
import json

def extract_features(progress_data: List[Dict], sessions_data: List[Dict]) -> pd.DataFrame:
    """
    Extract relevant features from user progress and quiz sessions for ML models.
    """
    features = []
    for progress in progress_data:
        session_features = {
            'topic': progress['topic'],
            'proficiency': progress['proficiency_level'],
            'accuracy': progress['correct_answers'] / progress['total_questions'] if progress['total_questions'] > 0 else 0,
            'avg_time': progress['avg_time_per_question'],
        }
        
        # Add session-specific features
        topic_sessions = [s for s in sessions_data if any(q['topic'] == progress['topic'] for q in s['questions'])]
        if topic_sessions:
            recent_sessions = sorted(topic_sessions, key=lambda x: x['start_time'])[-3:]  # Last 3 sessions
            session_features.update({
                'recent_accuracy': np.mean([s['correct_answers'] / s['total_questions'] for s in recent_sessions]),
                'trend': _calculate_trend([s['score'] for s in recent_sessions]),
                'time_trend': _calculate_trend([s['avg_time_per_question'] for s in recent_sessions])
            })
        
        features.append(session_features)
    
    return pd.DataFrame(features)

def _calculate_trend(values: List[float]) -> float:
    """Calculate the trend (slope) of a series of values."""
    if len(values) < 2:
        return 0
    return np.polyfit(range(len(values)), values, 1)[0]

def predict_weak_areas(progress_data: List[Dict], sessions_data: List[Dict]) -> Dict:
    """
    Predict weak areas based on user progress and session history.
    Uses a RandomForest classifier to identify topics needing attention.
    """
    features_df = extract_features(progress_data, sessions_data)
    
    # Define weakness threshold based on multiple factors
    weakness_scores = []
    for _, row in features_df.iterrows():
        score = 0
        # Low proficiency and accuracy are strong indicators
        if row['proficiency'] < 0.6:
            score += 3
        if row['accuracy'] < 0.7:
            score += 2
        # Negative trends indicate developing problems
        if row.get('trend', 0) < 0:
            score += 1
        if row.get('time_trend', 0) > 0:  # Taking longer over time
            score += 1
        weakness_scores.append(score)
    
    # Classify topics into weak/strong using the scores
    weak_areas = []
    for score, (_, row) in zip(weakness_scores, features_df.iterrows()):
        if score >= 3:  # Threshold for considering a topic weak
            weak_areas.append({
                'topic': row['topic'],
                'confidence': min(score / 7, 1.0),  # Normalize confidence
                'factors': {
                    'low_proficiency': row['proficiency'] < 0.6,
                    'low_accuracy': row['accuracy'] < 0.7,
                    'negative_trend': row.get('trend', 0) < 0,
                    'increasing_time': row.get('time_trend', 0) > 0
                }
            })
    
    return {
        'weak_areas': sorted(weak_areas, key=lambda x: x['confidence'], reverse=True),
        'analysis_timestamp': pd.Timestamp.now().isoformat()
    }

def recommend_resources(
    topic: str,
    difficulty: str,
    preferences: Dict,
    progress: List[Dict]
) -> Dict:
    """
    Recommend learning resources based on user preferences and progress.
    Uses a content-based filtering approach with topic and difficulty matching.
    """
    # Convert progress data to a features matrix
    progress_df = pd.DataFrame(progress)
    
    # Basic recommendation logic
    recommendations = {
        'resources': [],
        'practice_suggestions': [],
        'learning_path': []
    }
    
    if topic:
        topic_progress = progress_df[progress_df['topic'] == topic]
        if not topic_progress.empty:
            avg_proficiency = topic_progress['proficiency_level'].mean()
            
            # Adjust difficulty based on proficiency
            if not difficulty:
                if avg_proficiency < 0.4:
                    difficulty = 'easy'
                elif avg_proficiency < 0.7:
                    difficulty = 'medium'
                else:
                    difficulty = 'hard'
            
            # TODO: Fetch actual resources from database
            # For now, return structured recommendation
            recommendations['resources'] = [
                {
                    'type': 'video',
                    'title': f'{topic} - {difficulty.capitalize()} Level Overview',
                    'source': 'VietJack',
                    'url': f'https://vietjack.com/math/{topic.lower()}'
                },
                {
                    'type': 'practice',
                    'title': f'{topic} Practice Problems',
                    'difficulty': difficulty,
                    'count': 10
                }
            ]
            
            recommendations['practice_suggestions'] = [
                f"Focus on {topic} fundamentals" if avg_proficiency < 0.5 else f"Challenge yourself with harder {topic} problems",
                f"Spend at least {20 if avg_proficiency < 0.7 else 30} minutes on {topic} exercises"
            ]
            
            recommendations['learning_path'] = [
                {
                    'step': 1,
                    'activity': 'Review core concepts',
                    'resources': ['video_lecture', 'text_summary']
                },
                {
                    'step': 2,
                    'activity': 'Practice basic problems',
                    'resources': ['practice_set', 'interactive_examples']
                },
                {
                    'step': 3,
                    'activity': 'Take a mini-quiz',
                    'resources': ['quiz']
                }
            ]
    
    return recommendations

def analyze_learning_patterns(sessions_data: List[Dict]) -> Dict:
    """
    Analyze learning patterns to identify optimal study times and approaches.
    """
    if not sessions_data:
        return {'error': 'No session data available'}
    
    df = pd.DataFrame(sessions_data)
    
    # Time of day analysis
    df['hour'] = pd.to_datetime(df['start_time']).dt.hour
    performance_by_hour = df.groupby('hour')['score'].mean()
    best_hours = performance_by_hour.nlargest(3)
    
    # Session duration analysis
    df['duration'] = (pd.to_datetime(df['end_time']) - pd.to_datetime(df['start_time'])).dt.total_seconds() / 60
    optimal_duration = df.nlargest(5, 'score')['duration'].mean()
    
    # Pattern analysis
    patterns = {
        'optimal_time_of_day': {
            'morning': performance_by_hour[6:12].mean(),
            'afternoon': performance_by_hour[12:18].mean(),
            'evening': performance_by_hour[18:24].mean()
        },
        'session_insights': {
            'optimal_duration': round(optimal_duration, 1),
            'best_performance_hours': best_hours.index.tolist(),
            'recommended_breaks': 'every 25-30 minutes' if optimal_duration > 45 else 'every 45-50 minutes'
        }
    }
    
    return patterns
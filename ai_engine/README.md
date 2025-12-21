# Deep Learning With Love - AI Engine

An intelligent learning analytics and recommendation system for mathematics education.

## Features

1. 📊 Student Progress Tracking
   - Track accuracy, time spent, and problem-solving patterns
   - Analyze learning curves and identify optimal study times
   - Store detailed session data for personalized insights

2. 🤖 Machine Learning Features
   - Predict weak areas using RandomForest classifiers
   - Recommend personalized exercises and resources
   - Adapt difficulty based on performance

3. 🔍 Resource Aggregation
   - Scrape and validate content from trusted sources (VietJack, Hoc247)
   - Filter and rank resources by relevance
   - Cache and serve optimized content

4. 👤 User Management
   - Secure authentication system
   - Learning preferences and goals tracking
   - Progress history and analytics

## Quick Start

1. Create a virtual environment and install dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. Set up environment variables:
```bash
# Create .env file
cp .env.example .env

# Edit .env with your settings
DATABASE_URL=postgresql://user:password@localhost/dbname
OPENAI_API_KEY=your_key_here  # Optional, for enhanced feedback
```

3. Initialize the database:
```bash
python init_db.py
```

4. Start the FastAPI server:
```bash
uvicorn main:app --reload
```

5. Visit API documentation:
- OpenAPI docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Authentication
- POST `/token` - Get access token
- POST `/users/` - Create new user
- GET `/users/me` - Get current user

### Analytics
- GET `/analytics/progress` - Get user progress stats
- GET `/analytics/weak-areas` - Analyze weak areas
- POST `/quiz-sessions/` - Record new quiz session

### Recommendations
- GET `/recommend/resources` - Get personalized resource recommendations
- GET `/resources/` - List learning resources
- POST `/preferences/` - Update learning preferences

## Project Structure

```
ai_engine/
├── main.py           # FastAPI application
├── models.py         # SQLAlchemy models
├── schemas.py        # Pydantic schemas
├── database.py       # Database configuration
├── ml.py            # Machine learning models
├── scraper.py       # Web scraping utilities
└── requirements.txt  # Python dependencies
```

## Database Schema

The system uses SQLAlchemy with support for PostgreSQL/SQLite and includes tables for:
- Users and authentication
- Quiz sessions and answers
- Learning progress and statistics
- Resource management
- User preferences

## Development

### Adding New Features

1. Create new models in `models.py`
2. Add corresponding schemas in `schemas.py`
3. Implement endpoints in `main.py`
4. Add ML functions in `ml.py` if needed

### Running Tests

```bash
pytest tests/
```

### Code Style

```bash
# Install dev dependencies
pip install -r requirements-dev.txt

# Run linters
flake8 .
black .
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details
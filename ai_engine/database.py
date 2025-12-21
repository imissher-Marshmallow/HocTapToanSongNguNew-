from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment variable or use SQLite as default
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    # For PostgreSQL with SSL:
    # connect_args={"sslmode": "require"} if DATABASE_URL.startswith("postgresql") else {}
    
    # For SQLite:
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
#!/usr/bin/env python
"""
Quick setup script for Supabase + FastAPI AI Engine
Run this after updating .env with your Supabase credentials
"""

import os
import sys
from pathlib import Path

def check_env_file():
    """Check if .env file exists and has required variables"""
    env_path = Path('.env')
    
    if not env_path.exists():
        print("❌ .env file not found!")
        print("Create .env with:")
        print("  DATABASE_URL=postgresql://...")
        print("  OPENAI_API_KEY=sk-...")
        return False
    
    with open(env_path) as f:
        content = f.read()
        
    has_db_url = 'DATABASE_URL=' in content and 'postgresql://' in content
    has_api_key = 'OPENAI_API_KEY=' in content
    
    if not has_db_url:
        print("  DATABASE_URL not found or invalid in .env")
    else:
        print(" DATABASE_URL configured")
        
    if not has_api_key:
        print("  OPENAI_API_KEY not found in .env (optional, needed for AI features)")
    else:
        print(" OPENAI_API_KEY configured")
    
    return has_db_url

def check_venv():
    """Check if virtual environment exists"""
    venv_path = Path('venv')
    if venv_path.exists():
        print("✓ Virtual environment found")
        return True
    else:
        print("⚠️  No virtual environment. Run: python -m venv venv")
        return False

def check_requirements():
    """Check if packages are installed"""
    try:
        import sqlalchemy
        import fastapi
        import pydantic
        print("✓ Required packages installed")
        return True
    except ImportError as e:
        print(f"❌ Missing package: {e}")
        return False

def main():
    print("=" * 50)
    print("AI Engine Setup Checker")
    print("=" * 50)
    
    steps = [
        ("Environment file", check_env_file),
        ("Virtual environment", check_venv),
        ("Python packages", check_requirements),
    ]
    
    results = []
    for step_name, check_func in steps:
        print(f"\nChecking {step_name}...")
        results.append(check_func())
    
    print("\n" + "=" * 50)
    if all(results):
        print("✓ Setup looks good! Run:")
        print("  python init_db.py")
        print("  uvicorn main:app --reload")
    else:
        print("❌ Please complete the setup steps above")
        sys.exit(1)

if __name__ == "__main__":
    main()
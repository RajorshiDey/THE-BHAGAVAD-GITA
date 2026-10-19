import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Explicitly load the .env file if present
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Bhagavad Gita AI Learning Platform"
    API_V1_STR: str = "/api/v1"
    DATA_PATH: str = os.path.join(os.path.dirname(__file__), "../../data/gita.json")
    
    # LLM & RAG Configuration
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    
    class Config:
        env_file = ".env"

settings = Settings()
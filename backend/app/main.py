from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import chapters, verses, search
from app.services.data_loader import gita_repo
from app.api.v1 import ai
import os

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Configure explicit origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base & Health Endpoints
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "total_verses": len(gita_repo.verses),
        "total_chapters": len(gita_repo.chapters)
    }

# Include Routers
app.include_router(chapters.router, prefix=f"{settings.API_V1_STR}/chapters", tags=["Chapters"])
app.include_router(verses.router, prefix=f"{settings.API_V1_STR}/verses", tags=["Verses"])
app.include_router(search.router, prefix=f"{settings.API_V1_STR}/search", tags=["Search"])
app.include_router(ai.router, prefix=f"{settings.API_V1_STR}/ai", tags=["AI"])

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
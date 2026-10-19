from fastapi import APIRouter, Query
from typing import List
from app.schemas.gita import SearchResultSchema
from app.services.data_loader import gita_repo

router = APIRouter()

@router.get("", response_model=List[SearchResultSchema])
def search_verses(
    q: str = Query(..., min_length=2, description="Search query string"),
    limit: int = Query(10, le=50)
):
    query = q.lower()
    results = []

    for v in gita_repo.verses.values():
        if (query in v.translation.lower() or 
            query in v.transliteration.lower() or 
            query in v.explanation.lower()):
            
            snippet = v.translation if query in v.translation.lower() else v.explanation
            results.append(
                SearchResultSchema(
                    verse_id=v.id,
                    chapter=v.chapter,
                    verse=v.verse,
                    snippet=snippet[:150] + "..." if len(snippet) > 150 else snippet
                )
            )
            if len(results) >= limit:
                break

    return results
from fastapi import APIRouter, HTTPException
from app.schemas.gita import VerseSchema
from app.services.data_loader import gita_repo

router = APIRouter()

@router.get("/{chapter}/{verse}", response_model=VerseSchema)
def get_single_verse(chapter: int, verse: int):
    verse_obj = gita_repo.get_verse(chapter, verse)
    if not verse_obj:
        raise HTTPException(status_code=404, detail="Verse not found")
    return verse_obj
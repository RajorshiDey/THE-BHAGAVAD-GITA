from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas.gita import ChapterSummarySchema, VerseSchema
from app.services.data_loader import gita_repo

router = APIRouter()

@router.get("", response_model=List[ChapterSummarySchema])
def list_chapters():
    return gita_repo.get_all_chapters()

@router.get("/{chapter_num}", response_model=ChapterSummarySchema)
def get_chapter(chapter_num: int):
    chapter = gita_repo.get_chapter(chapter_num)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return chapter

@router.get("/{chapter_num}/verses", response_model=List[VerseSchema])
def get_chapter_verses(chapter_num: int):
    verses = gita_repo.get_verses_by_chapter(chapter_num)
    if not verses:
        raise HTTPException(status_code=404, detail="No verses found for this chapter")
    return verses
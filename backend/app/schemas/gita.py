from pydantic import BaseModel, Field
from typing import Optional, List, Dict

class VerseSchema(BaseModel):
    id: str
    chapter: int
    verse: int
    sanskrit: str
    transliteration: str
    chapterName: str
    chapterNameTranslation: str
    chapterVerseCount: int
    translation: str
    explanation: Optional[str] = ""
    wordMeanings: Optional[str] = ""
    videoUrl: Optional[str] = None
    videoUrlHindi: Optional[str] = None

class ChapterSummarySchema(BaseModel):
    chapter_number: int
    chapter_name: str
    chapter_name_translation: str
    verse_count: int

class SearchResultSchema(BaseModel):
    verse_id: str
    chapter: int
    verse: int
    snippet: str
    score: Optional[float] = None

class AIAskRequest(BaseModel):
    question: str
    current_verse_id: Optional[str] = None
    language: str = "en"

class AIReference(BaseModel):
    chapter: int
    verse: int
    reason: str

class AIAskResponse(BaseModel):
    answer: str
    references: List[AIReference]
    used_context: bool
    disclaimer: str = "Interpretation is AI-generated; consult the cited source text."
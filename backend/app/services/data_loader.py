import json
from typing import Dict, List, Optional
from app.schemas.gita import VerseSchema, ChapterSummarySchema
from app.core.config import settings

class GitaRepository:
    def __init__(self, json_path: str):
        self.json_path = json_path
        self.verses: Dict[str, VerseSchema] = {}
        self.chapters: Dict[int, ChapterSummarySchema] = {}
        self._load_data()

    def _load_data(self):
        with open(self.json_path, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        for key, raw_verse in raw_data.items():
            verse = VerseSchema(
                id=key,
                chapter=raw_verse["chapter"],
                verse=raw_verse["verse"],
                sanskrit=raw_verse.get("sanskrit", ""),
                transliteration=raw_verse.get("transliteration", ""),
                chapterName=raw_verse.get("chapterName", ""),
                chapterNameTranslation=raw_verse.get("chapterNameTranslation", ""),
                chapterVerseCount=raw_verse.get("chapterVerseCount", 0),
                translation=raw_verse.get("translation", ""),
                explanation=raw_verse.get("explanation", ""),
                wordMeanings=raw_verse.get("wordMeanings", ""),
                videoUrl=raw_verse.get("videoUrl"),
                videoUrlHindi=raw_verse.get("videoUrlHindi")
            )
            self.verses[key] = verse

            ch_num = verse.chapter
            if ch_num not in self.chapters:
                self.chapters[ch_num] = ChapterSummarySchema(
                    chapter_number=ch_num,
                    chapter_name=verse.chapterName,
                    chapter_name_translation=verse.chapterNameTranslation,
                    verse_count=verse.chapterVerseCount
                )

    def get_all_chapters(self) -> List[ChapterSummarySchema]:
        return sorted(self.chapters.values(), key=lambda c: c.chapter_number)

    def get_chapter(self, chapter_num: int) -> Optional[ChapterSummarySchema]:
        return self.chapters.get(chapter_num)

    def get_verse(self, chapter: int, verse: int) -> Optional[VerseSchema]:
        key = f"{chapter}-{verse}"
        return self.verses.get(key)

    def get_verses_by_chapter(self, chapter: int) -> List[VerseSchema]:
        return [v for v in self.verses.values() if v.chapter == chapter]

# Global Instance
gita_repo = GitaRepository(settings.DATA_PATH)
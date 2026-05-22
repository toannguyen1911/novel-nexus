from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# --- Chapter Schemas ---
class ChapterBase(BaseModel):
    title: str
    order_index: int

class ChapterCreate(ChapterBase):
    content: str

class ChapterResponse(ChapterBase):
    id: int
    story_id: int

    class Config:
        from_attributes = True

class ChapterDetailResponse(ChapterResponse):
    content: str


# --- Story Schemas ---
class StoryBase(BaseModel):
    title: str
    file_type: str

class StoryCreate(StoryBase):
    file_path: str
    cover_path: Optional[str] = None

class StoryUpdate(BaseModel):
    title: str

class StoryResponse(StoryBase):
    id: int
    cover_path: Optional[str] = None
    created_at: datetime
    chapter_count: Optional[int] = 0

    class Config:
        from_attributes = True


# --- Reading Progress Schemas ---
class ReadingProgressBase(BaseModel):
    current_chapter_id: Optional[int] = None
    scroll_ratio: float = 0.0

class ReadingProgressUpdate(ReadingProgressBase):
    pass

class ReadingProgressResponse(ReadingProgressBase):
    id: int
    story_id: int
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Full Story Details (with Chapters & Progress) ---
class StoryDetailResponse(StoryResponse):
    chapters: List[ChapterResponse] = []
    progress: Optional[ReadingProgressResponse] = None

    class Config:
        from_attributes = True

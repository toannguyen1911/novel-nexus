from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Story(Base):
    __tablename__ = "stories"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # 'txt' or 'epub'
    cover_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    chapters = relationship("Chapter", back_populates="story", cascade="all, delete-orphan")
    progress = relationship("ReadingProgress", back_populates="story", cascade="all, delete-orphan", uselist=False)


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(Integer, ForeignKey("stories.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)  # Raw text for TXT, HTML/clean text for EPUB
    order_index = Column(Integer, nullable=False)

    # Relationships
    story = relationship("Story", back_populates="chapters")


class ReadingProgress(Base):
    __tablename__ = "reading_progress"

    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(Integer, ForeignKey("stories.id", ondelete="CASCADE"), unique=True, nullable=False)
    current_chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="SET NULL"), nullable=True)
    scroll_ratio = Column(Float, default=0.0)  # For TXT scroll position, or EPUB page progress
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    story = relationship("Story", back_populates="progress")
    current_chapter = relationship("Chapter")

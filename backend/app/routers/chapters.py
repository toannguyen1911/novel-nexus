from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/chapters", tags=["Chapters"])

@router.get("/{chapter_id}", response_model=schemas.ChapterDetailResponse)
def get_chapter_detail(chapter_id: int, db: Session = Depends(get_db)):
    chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Requested chapter not found")
    return chapter

@router.delete("/{chapter_id}")
def delete_chapter(chapter_id: int, db: Session = Depends(get_db)):
    chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found to delete")
        
    story_id = chapter.story_id
    
    # Check if this chapter is currently selected in reading progress
    progress = db.query(models.ReadingProgress).filter(
        models.ReadingProgress.story_id == story_id,
        models.ReadingProgress.current_chapter_id == chapter_id
    ).first()
    
    db.delete(chapter)
    db.commit()
    
    # Reorder remaining chapters
    from .stories import reorder_chapters
    reorder_chapters(story_id, db)
    
    # Reset progress if it was pointing to the deleted chapter
    if progress:
        first_chap = db.query(models.Chapter).filter(
            models.Chapter.story_id == story_id
        ).order_by(models.Chapter.order_index.asc()).first()
        progress.current_chapter_id = first_chap.id if first_chap else None
        progress.scroll_ratio = 0.0
        db.commit()
        
    return {"message": "Chapter deleted successfully"}

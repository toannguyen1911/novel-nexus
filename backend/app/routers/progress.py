from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/progress", tags=["Progress"])

@router.get("/{story_id}", response_model=schemas.ReadingProgressResponse)
def get_progress(story_id: int, db: Session = Depends(get_db)):
    progress = db.query(models.ReadingProgress).filter(models.ReadingProgress.story_id == story_id).first()
    if not progress:
        raise HTTPException(status_code=404, detail="Reading progress not found for this story")
    return progress

@router.put("/{story_id}", response_model=schemas.ReadingProgressResponse)
def update_progress(
    story_id: int,
    progress_update: schemas.ReadingProgressUpdate,
    db: Session = Depends(get_db)
):
    progress = db.query(models.ReadingProgress).filter(models.ReadingProgress.story_id == story_id).first()
    if not progress:
        # Create progress record if not exists
        progress = models.ReadingProgress(story_id=story_id)
        db.add(progress)
        
    if progress_update.current_chapter_id is not None:
        # Verify chapter exists and belongs to the same story
        chapter = db.query(models.Chapter).filter(
            models.Chapter.id == progress_update.current_chapter_id,
            models.Chapter.story_id == story_id
        ).first()
        if not chapter:
            raise HTTPException(status_code=400, detail="Chapter does not exist or does not belong to this story")
        progress.current_chapter_id = progress_update.current_chapter_id
        
    progress.scroll_ratio = progress_update.scroll_ratio
    db.commit()
    db.refresh(progress)
    return progress

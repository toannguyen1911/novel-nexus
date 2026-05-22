import os
import shutil
import re
import time
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import models, schemas
from ..core.parser_txt import parse_txt, decode_bytes
from ..core.parser_epub import parse_epub

router = APIRouter(prefix="/api/stories", tags=["Stories"])

UPLOAD_DIR = "uploads"
COVERS_DIR = os.path.join(UPLOAD_DIR, "covers")

# Ensure upload directories exist
os.makedirs(COVERS_DIR, exist_ok=True)

def reorder_chapters(story_id: int, db: Session):
    chapters = db.query(models.Chapter).filter(models.Chapter.story_id == story_id).all()
    
    def get_sort_key(chapter):
        title = chapter.title or ""
        title_lower = title.lower()
        # Check for intro patterns to place them at the start
        is_intro = any(word in title_lower for word in ["mở đầu", "giới thiệu", "tiền truyện", "văn án", "intro", "prologue"])
        
        parts = [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', title)]
        return (0 if is_intro else 1, parts)
        
    chapters_sorted = sorted(chapters, key=get_sort_key)
    
    for index, chap in enumerate(chapters_sorted):
        chap.order_index = index
        
    db.commit()

@router.post("/upload", response_model=schemas.StoryDetailResponse)
def upload_story(
    file: UploadFile = File(...),
    title: str = Form(None),
    story_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in [".txt", ".epub"]:
        raise HTTPException(status_code=400, detail="Only .txt and .epub file formats are supported")
        
    # Get or create story
    db_story = None
    if story_id is not None:
        db_story = db.query(models.Story).filter(models.Story.id == story_id).first()
        if not db_story:
            raise HTTPException(status_code=404, detail="Story not found to add chapters")
            
    # Save the original file
    file_type = "txt" if ext == ".txt" else "epub"
    if story_id is not None:
        base, extension = os.path.splitext(filename)
        saved_file_name = f"{base}_append_{int(time.time())}{extension}"
    else:
        saved_file_name = filename
        
    saved_file_path = os.path.join(UPLOAD_DIR, saved_file_name)
    with open(saved_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    chapters_data = []
    inferred_title = title or os.path.splitext(filename)[0]
    cover_path = None
    
    try:
        if file_type == "txt":
            # Read and parse TXT
            with open(saved_file_path, "rb") as f:
                content_bytes = f.read()
            content_str = decode_bytes(content_bytes)
            chapters_data = parse_txt(content_str)
            
        elif file_type == "epub":
            # Parse EPUB
            parsed_title, chapters_data, cover_bytes = parse_epub(saved_file_path)
            if not title:
                inferred_title = parsed_title
            
            # Save cover if found
            if cover_bytes:
                cover_filename = f"{inferred_title.replace(' ', '_')}_cover.png"
                cover_filepath = os.path.join(COVERS_DIR, cover_filename)
                with open(cover_filepath, "wb") as f_cover:
                    f_cover.write(cover_bytes)
                # Static path relative to static mount
                cover_path = f"/static/covers/{cover_filename}"
    except Exception as e:
        # Cleanup file if error occurs
        if os.path.exists(saved_file_path):
            os.remove(saved_file_path)
        raise HTTPException(status_code=500, detail=f"Error parsing file: {str(e)}")
        
    if db_story is None:
        # Write to database (new story)
        db_story = models.Story(
            title=inferred_title,
            file_path=saved_file_path,
            file_type=file_type,
            cover_path=cover_path
        )
        db.add(db_story)
        db.commit()
        db.refresh(db_story)
        
    # Save Chapters
    for chap in chapters_data:
        title_clean = chap["title"].strip()
        existing_chaps = db.query(models.Chapter).filter(
            models.Chapter.story_id == db_story.id
        ).all()
        
        found_existing = None
        for ec in existing_chaps:
            if ec.title.strip().lower() == title_clean.lower():
                found_existing = ec
                break
                
        if found_existing:
            found_existing.content = chap["content"]
        else:
            db_chap = models.Chapter(
                story_id=db_story.id,
                title=title_clean,
                content=chap["content"],
                order_index=999999
            )
            db.add(db_chap)
            
    db.commit()
    
    # Reorder all chapters of the story
    reorder_chapters(db_story.id, db)
    
    # Check if ReadingProgress already exists for this story
    existing_progress = db.query(models.ReadingProgress).filter(
        models.ReadingProgress.story_id == db_story.id
    ).first()
    
    if not existing_progress:
        first_chap = db.query(models.Chapter).filter(
            models.Chapter.story_id == db_story.id
        ).order_by(models.Chapter.order_index.asc()).first()
        
        first_chapter_id = first_chap.id if first_chap else None
        db_progress = models.ReadingProgress(
            story_id=db_story.id,
            current_chapter_id=first_chapter_id,
            scroll_ratio=0.0
        )
        db.add(db_progress)
        db.commit()
        
    db.refresh(db_story)
    return db_story

@router.get("/", response_model=List[schemas.StoryResponse])
def get_stories(db: Session = Depends(get_db)):
    stories = db.query(models.Story).all()
    # Populate chapter count
    for story in stories:
        story.chapter_count = db.query(models.Chapter).filter(models.Chapter.story_id == story.id).count()
    return stories

@router.get("/{story_id}", response_model=schemas.StoryDetailResponse)
def get_story_details(story_id: int, db: Session = Depends(get_db)):
    story = db.query(models.Story).filter(models.Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Requested book/story not found")
    story.chapter_count = len(story.chapters)
    return story

@router.put("/{story_id}", response_model=schemas.StoryResponse)
def update_story(story_id: int, story_update: schemas.StoryUpdate, db: Session = Depends(get_db)):
    story = db.query(models.Story).filter(models.Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Requested book/story not found")
    story.title = story_update.title.strip()
    db.commit()
    db.refresh(story)
    return story

@router.delete("/{story_id}")
def delete_story(story_id: int, db: Session = Depends(get_db)):
    story = db.query(models.Story).filter(models.Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Book/story not found to delete")
        
    # Delete local files
    if os.path.exists(story.file_path):
        try:
            os.remove(story.file_path)
        except OSError:
            pass
            
    if story.cover_path:
        # Convert static URL back to local path
        local_cover_path = os.path.join(UPLOAD_DIR, story.cover_path.replace("/static/", ""))
        if os.path.exists(local_cover_path):
            try:
                os.remove(local_cover_path)
            except OSError:
                pass
                
    db.delete(story)
    db.commit()
    return {"message": f"Successfully deleted story '{story.title}'"}

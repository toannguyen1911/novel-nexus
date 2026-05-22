import re
from typing import List, Dict

# Regex to detect chapter headings (e.g., "Chương 1: Khởi đầu", "Chapter 12", "Quyển 2 - Chương 5")
CHAPTER_PATTERN = re.compile(
    r'^\s*(chương\s+\d+|chapter\s+\d+|quyển\s+\d+\s+chương\s+\d+|tập\s+\d+|bài\s+\d+|tiết\s+\d+).*$',
    re.IGNORECASE
)

def decode_bytes(content_bytes: bytes) -> str:
    """Attempts to decode bytes into a string using common encodings."""
    for encoding in ('utf-8', 'utf-16', 'utf-8-sig', 'utf-16-le', 'utf-16-be', 'latin-1'):
        try:
            return content_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("Could not decode the file. Please use UTF-8 encoding.")

def parse_txt(content_str: str) -> List[Dict[str, str]]:
    """
    Parses TXT content and splits it into chapters based on headings.
    Returns a list of dicts: [{"title": "Chương...", "content": "Nội dung..."}]
    """
    lines = content_str.splitlines()
    chapters = []
    
    current_chapter_title = "Introduction / Prologue"
    current_chapter_lines = []
    
    for line in lines:
        stripped_line = line.strip()
        if not stripped_line:
            # Add empty lines for spacing
            current_chapter_lines.append("")
            continue
            
        # Check if the line matches a chapter header
        if CHAPTER_PATTERN.match(stripped_line):
            # If we accumulated content, save the previous chapter
            if current_chapter_lines:
                content = "\n".join(current_chapter_lines).strip()
                if content:
                    chapters.append({
                        "title": current_chapter_title,
                        "content": content
                    })
            
            # Start new chapter
            current_chapter_title = stripped_line
            current_chapter_lines = []
        else:
            current_chapter_lines.append(line)
            
    # Add the last chapter
    if current_chapter_lines:
        content = "\n".join(current_chapter_lines).strip()
        if content or len(chapters) == 0:
            chapters.append({
                "title": current_chapter_title,
                "content": content or "No content."
            })
            
    # If the first chapter is empty/intro and we have subsequent chapters, clean up
    if len(chapters) > 1 and chapters[0]["title"] == "Introduction / Prologue" and not chapters[0]["content"].strip():
        chapters.pop(0)
        
    return chapters

import os
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
from typing import List, Dict, Tuple, Optional

def parse_epub(epub_path: str) -> Tuple[str, List[Dict[str, str]], Optional[bytes]]:
    """
    Parses an EPUB file and returns:
    - title: Title of the book
    - chapters: List of dicts [{"title": str, "content": HTML_str}]
    - cover_image: Bytes of the cover image (if found)
    """
    # Open EPUB file
    # ebooklib might raise warnings, we can suppress or just read
    book = epub.read_epub(epub_path)
    
    # Get Title
    titles = book.get_metadata('DC', 'title')
    title_str = "Untitled Story"
    if titles and len(titles) > 0:
        # DC metadata is usually a tuple (value, dict_attributes)
        title_str = titles[0][0]
        
    # Get Cover Image
    cover_bytes = None
    # Method 1: Look for items with cover role or cover type
    for item in book.get_items():
        if item.get_type() == ebooklib.ITEM_IMAGE:
            # Check if name contains 'cover'
            if 'cover' in item.get_name().lower():
                cover_bytes = item.get_content()
                break

    # Extract spine documents
    chapters = []
    order = 1
    
    # Read book in order of spine
    for item_ref in book.spine:
        # book.spine contains tuples of (idref, linear)
        idref = item_ref[0]
        item = book.get_item_with_id(idref)
        
        if item and item.get_type() == ebooklib.ITEM_DOCUMENT:
            html_content = item.get_content().decode('utf-8', errors='ignore')
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Extract heading as title
            chapter_title = ""
            heading = soup.find(['h1', 'h2', 'h3'])
            if heading:
                chapter_title = heading.get_text().strip()
                
            if not chapter_title and soup.title:
                chapter_title = soup.title.get_text().strip()
                
            if not chapter_title or chapter_title == "None":
                chapter_title = f"Chapter {order}"
                
            # Clean body
            for tag in soup(["script", "style"]):
                tag.decompose()
                
            body = soup.find('body')
            # Extract HTML inside body, or fallback to full soup
            if body:
                content_html = "".join([str(child) for child in body.children]).strip()
            else:
                content_html = str(soup).strip()
                
            # Skip empty sections (e.g. some internal page stubs)
            text_only = soup.get_text().strip()
            if not text_only and not soup.find('img'):
                continue
                
            chapters.append({
                "title": chapter_title,
                "content": content_html
            })
            order += 1
            
    # Fallback if no chapters parsed
    if not chapters:
        chapters.append({
            "title": "Chapter 1",
            "content": "<p>No content found in this book.</p>"
        })
        
    return title_str, chapters, cover_bytes

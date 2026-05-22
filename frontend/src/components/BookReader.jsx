import React, { useEffect, useRef, useState } from 'react';
import { Menu, Settings, ChevronLeft, ChevronRight, ArrowLeft, Trash2 } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { API_BASE } from '../config';

export default function BookReader({ 
  story, 
  chapters, 
  activeChapterId,
  initialChapterId, 
  initialScrollRatio, 
  onSaveProgress, 
  onBack, 
  onNavigate,
  onOpenSettings,
  onDeleteChapter
}) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [showToc, setShowToc] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [chapterContent, setChapterContent] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);
  
  const containerRef = useRef(null);
  const currentChapter = chapters[currentChapterIndex];

  // Fetch chapter content dynamically
  useEffect(() => {
    const activeChapter = chapters[currentChapterIndex];
    if (!activeChapter) return;

    if (activeChapter.content) {
      setChapterContent(activeChapter.content);
      return;
    }

    let isMounted = true;
    setLoadingContent(true);

    fetch(`${API_BASE}/api/chapters/${activeChapter.id}`)
      .then(res => {
        if (!res.ok) throw new Error("Không thể tải nội dung chương");
        return res.json();
      })
      .then(data => {
        if (isMounted) {
          setChapterContent(data.content);
          setLoadingContent(false);
        }
      })
      .catch(err => {
        console.error(err);
        if (isMounted) {
          setLoadingContent(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentChapterIndex, chapters]);

  // Initialize chapter from props
  useEffect(() => {
    if (initialChapterId && chapters.length > 0) {
      const idx = chapters.findIndex(c => c.id === initialChapterId);
      if (idx !== -1) {
        setCurrentChapterIndex(idx);
      }
    }
  }, [initialChapterId, chapters]);

  // Sync active chapter from props (URL route changes)
  useEffect(() => {
    if (activeChapterId && chapters.length > 0) {
      const idx = chapters.findIndex(c => c.id === activeChapterId);
      if (idx !== -1) {
        setCurrentChapterIndex(idx);
      }
    }
  }, [activeChapterId, chapters]);

  // Sync currentChapterIndex if chapters list changes (e.g. deletion, appending)
  const prevChaptersRef = useRef(chapters);
  useEffect(() => {
    if (prevChaptersRef.current !== chapters) {
      const lastActiveChapter = prevChaptersRef.current[currentChapterIndex];
      if (lastActiveChapter) {
        const newIdx = chapters.findIndex(c => c.id === lastActiveChapter.id);
        if (newIdx !== -1) {
          if (newIdx !== currentChapterIndex) {
            setCurrentChapterIndex(newIdx);
          }
        } else {
          // Active chapter was deleted, fall back to index 0 (first chapter)
          setCurrentChapterIndex(0);
        }
      }
      prevChaptersRef.current = chapters;
    }
  }, [chapters, currentChapterIndex]);

  const handleDeleteChapterClick = (chapId, chapTitle, e) => {
    e.stopPropagation();
    if (confirm(`Bạn có chắc chắn muốn xóa chương "${chapTitle}"?`)) {
      onDeleteChapter(chapId);
    }
  };

  // Recalculate pages when chapter, window size or styling changes
  const calculatePages = () => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    
    if (clientWidth > 0) {
      const calculatedPages = Math.max(1, Math.ceil(scrollWidth / clientWidth));
      setTotalPages(calculatedPages);
      
      // Keep within bounds
      if (currentPage >= calculatedPages) {
        setCurrentPage(calculatedPages - 1);
      }
    }
  };

  useEffect(() => {
    // Run after DOM rendering updates
    const timer = setTimeout(calculatePages, 200);
    window.addEventListener('resize', calculatePages);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculatePages);
    };
  }, [currentChapterIndex, chapterContent]);

  // Handle restoring progress ratio on initial load
  useEffect(() => {
    if (containerRef.current && currentChapter && currentChapter.id === initialChapterId && initialScrollRatio > 0) {
      setTimeout(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const clientWidth = container.clientWidth;
        
        // Calculate which page correspond to the scroll ratio
        const pageIdx = Math.min(
          totalPages - 1,
          Math.round(initialScrollRatio * (totalPages - 1))
        );
        
        setCurrentPage(pageIdx);
        container.scrollLeft = pageIdx * clientWidth;
      }, 300);
    } else {
      // For new chapters, start at page 0
      setCurrentPage(0);
      if (containerRef.current) {
        containerRef.current.scrollLeft = 0;
      }
    }
  }, [currentChapterIndex, initialChapterId, totalPages]);

  // Debounced API progress saving
  const debouncedSaveProgress = useDebounce((chapId, ratio) => {
    onSaveProgress(chapId, ratio);
  }, 1000);

  const updatePageProgress = (pageIndex) => {
    setCurrentPage(pageIndex);
    if (!currentChapter) return;
    
    // Save progress based on page index
    const ratio = totalPages > 1 ? pageIndex / (totalPages - 1) : 0;
    debouncedSaveProgress(currentChapter.id, parseFloat(ratio.toFixed(4)));
  };

  const handleNextPage = () => {
    if (!containerRef.current) return;
    
    if (currentPage < totalPages - 1) {
      const container = containerRef.current;
      const nextPage = currentPage + 1;
      container.scrollLeft = nextPage * container.clientWidth;
      updatePageProgress(nextPage);
    } else {
      // If last page of the chapter, go to next chapter
      handleNextChapter();
    }
  };

  const handlePrevPage = () => {
    if (!containerRef.current) return;
    
    if (currentPage > 0) {
      const container = containerRef.current;
      const prevPage = currentPage - 1;
      container.scrollLeft = prevPage * container.clientWidth;
      updatePageProgress(prevPage);
    } else {
      // If first page of the chapter, go to previous chapter (and last page of it)
      handlePrevChapter();
    }
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      const nextIdx = currentChapterIndex + 1;
      onNavigate(`/${story.id}/${chapters[nextIdx].id}`);
      onSaveProgress(chapters[nextIdx].id, 0.0);
    }
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      const prevIdx = currentChapterIndex - 1;
      onNavigate(`/${story.id}/${chapters[prevIdx].id}`);
      onSaveProgress(chapters[prevIdx].id, 0.0);
    }
  };

  const handleSelectChapter = (index) => {
    onNavigate(`/${story.id}/${chapters[index].id}`);
    setShowToc(false);
    onSaveProgress(chapters[index].id, 0.0);
  };

  // Keyboard navigation setup
  const nextPageRef = useRef(handleNextPage);
  const prevPageRef = useRef(handlePrevPage);
  useEffect(() => {
    nextPageRef.current = handleNextPage;
    prevPageRef.current = handlePrevPage;
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') {
        nextPageRef.current();
      } else if (e.key === 'ArrowLeft') {
        prevPageRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!currentChapter) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-400">
        <p>Đang tải nội dung sách...</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen flex flex-col bg-inherit text-inherit overflow-hidden">
      
      {/* Top Header */}
      <header className={`absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 z-20 transition-all duration-300 transform ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Quay lại tủ sách"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-semibold truncate max-w-[180px] sm:max-w-[320px] text-zinc-100">
              {story.title}
            </h1>
            <p className="text-[10px] text-zinc-400 truncate max-w-[180px]">
              {currentChapter.title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowToc(true)}
            className="p-2 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Mục lục"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Cài đặt hiển thị"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Reader Body - Paginated columns */}
      <main 
        onClick={() => setShowControls(p => !p)}
        className="flex-1 relative w-full flex items-center justify-center overflow-hidden px-4 pt-16 pb-16 sm:px-12 cursor-pointer"
      >
        
        {/* Left Side Trigger / Button */}
        <button
          onClick={(e) => { e.stopPropagation(); handlePrevPage(); }}
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[75%] w-12 sm:w-16 flex items-center justify-center bg-transparent hover:bg-black/5 text-zinc-600/30 hover:text-zinc-400 hover:scale-105 rounded-r-xl transition-all duration-200 z-10"
          title="Trang trước"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        {/* CSS Multi-Column Scrollable Container */}
        <div 
          ref={containerRef}
          onClick={(e) => {
            // Let the toggle controls bubble up, but if they are selecting text it is fine.
          }}
          className={`w-full h-full max-w-4xl overflow-x-hidden overflow-y-hidden scroll-smooth select-text break-words cursor-auto ${
            (loadingContent || chapterContent === null) ? "flex items-center justify-center" : ""
          }`}
          style={(loadingContent || chapterContent === null) ? {} : {
            columnWidth: '100%',
            columnGap: '40px',
            columnFill: 'auto',
          }}
          dangerouslySetInnerHTML={(loadingContent || chapterContent === null) ? undefined : { __html: chapterContent }}
        >
          {(loadingContent || chapterContent === null) && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
              <p className="text-sm text-zinc-500">Đang tải trang...</p>
            </div>
          )}
        </div>

        {/* Right Side Trigger / Button */}
        <button
          onClick={(e) => { e.stopPropagation(); handleNextPage(); }}
          className="absolute right-0 top-1/2 -translate-y-1/2 h-[75%] w-12 sm:w-16 flex items-center justify-center bg-transparent hover:bg-black/5 text-zinc-600/30 hover:text-zinc-400 hover:scale-105 rounded-l-xl transition-all duration-200 z-10"
          title="Trang sau"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </main>

      {/* Footer Progress Indicators */}
      <footer className={`absolute bottom-0 left-0 right-0 px-6 py-3 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-900/80 text-center flex justify-between items-center text-xs text-zinc-500 z-20 transition-all duration-300 transform ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
        <div>{currentChapter.title}</div>
        <div>
          Trang {currentPage + 1} / {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handlePrevChapter(); }}
            disabled={currentChapterIndex === 0}
            className="hover:text-amber-500 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            Chương trước
          </button>
          <span>|</span>
          <button
            onClick={(e) => { e.stopPropagation(); handleNextChapter(); }}
            disabled={currentChapterIndex === chapters.length - 1}
            className="hover:text-amber-500 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            Chương sau
          </button>
        </div>
      </footer>

      {/* Table of Contents Drawer */}
      {showToc && (
        <div className="fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowToc(false)} />
          <div className="relative w-80 max-w-[85vw] h-full bg-zinc-900 border-r border-zinc-800 flex flex-col z-10 animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <h3 className="font-semibold text-zinc-200">Mục lục</h3>
              <button 
                onClick={() => setShowToc(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {chapters.map((chap, idx) => (
                <div
                  key={chap.id}
                  className={`group flex items-center justify-between px-3 py-1 rounded-lg text-sm transition-all duration-200 ${
                    idx === currentChapterIndex 
                      ? 'bg-amber-500/15 text-amber-400 font-medium' 
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <button
                    onClick={() => handleSelectChapter(idx)}
                    className="flex-1 text-left truncate py-1.5 pr-2"
                  >
                    {idx + 1}. {chap.title}
                  </button>
                  
                  <button
                    onClick={(e) => handleDeleteChapterClick(chap.id, chap.title, e)}
                    className="p-1.5 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 opacity-60 sm:opacity-0 group-hover:opacity-100 transition-all duration-150 flex-shrink-0"
                    title="Xóa chương"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Simple X component import logic if needed
function X({ className, ...props }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

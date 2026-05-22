import React, { useEffect, useRef, useState } from 'react';
import { Menu, Settings, ChevronLeft, ChevronRight, ArrowLeft, Trash2 } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { API_BASE } from '../config';
export default function NovelReader({
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
  const [chapterContent, setChapterContent] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const containerRef = useRef(null);

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

  const currentChapter = chapters[currentChapterIndex];

  const [scrollPercent, setScrollPercent] = useState(0);

  // Restore scroll position when chapter changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setScrollPercent(0);

      // If it's the initial chapter, try to restore scroll ratio
      if (currentChapter && currentChapter.id === initialChapterId && initialScrollRatio > 0) {
        setTimeout(() => {
          if (containerRef.current) {
            const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight;
            containerRef.current.scrollTop = maxScroll * initialScrollRatio;
            setScrollPercent(Math.round(initialScrollRatio * 100));
          }
        }, 100);
      }
    }
  }, [currentChapterIndex, initialChapterId]);

  // Debounced API progress saving
  const debouncedSaveProgress = useDebounce((chapId, ratio) => {
    onSaveProgress(chapId, ratio);
  }, 1000);

  // Handle scroll events to calculate ratio and update progress
  const handleScroll = () => {
    if (!containerRef.current || !currentChapter) return;

    const scrollTop = containerRef.current.scrollTop;
    const scrollHeight = containerRef.current.scrollHeight;
    const clientHeight = containerRef.current.clientHeight;

    const maxScroll = scrollHeight - clientHeight;
    const ratio = maxScroll > 0 ? scrollTop / maxScroll : 0;

    // Update scroll percentage
    setScrollPercent(Math.round(ratio * 100));

    // Save progress with a debounced callback
    debouncedSaveProgress(currentChapter.id, parseFloat(ratio.toFixed(4)));
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
  const nextChapterRef = useRef(handleNextChapter);
  const prevChapterRef = useRef(handlePrevChapter);
  useEffect(() => {
    nextChapterRef.current = handleNextChapter;
    prevChapterRef.current = handlePrevChapter;
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') {
        nextChapterRef.current();
      } else if (e.key === 'ArrowLeft') {
        prevChapterRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!currentChapter) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-400">
        <p>Đang tải nội dung chương...</p>
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

      {/* Reader Body - scrollable */}
      <main
        ref={containerRef}
        onScroll={handleScroll}
        onClick={() => setShowControls(p => !p)}
        className="flex-1 overflow-y-auto px-6 pt-20 pb-28 sm:px-12 md:px-24 max-w-4xl mx-auto w-full select-text cursor-pointer"
      >
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-8 text-center text-amber-500/90 leading-tight">
          {currentChapter.title}
        </h2>

        {/* Render paragraphs cleanly */}
        <div className="space-y-6 leading-relaxed text-justify tracking-wide break-words">
          {loadingContent || chapterContent === null ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-4 bg-zinc-800/40 rounded w-full" />
              <div className="h-4 bg-zinc-800/40 rounded w-[96%]" />
              <div className="h-4 bg-zinc-800/40 rounded w-[92%]" />
              <div className="h-4 bg-zinc-800/40 rounded w-[98%]" />
              <div className="h-4 bg-zinc-800/40 rounded w-[89%]" />
              <div className="h-4 bg-zinc-800/40 rounded w-[95%]" />
            </div>
          ) : (
            chapterContent.split('\n').map((para, i) => {
              const cleanPara = para.trim();
              if (!cleanPara) return null;
              return (
                <p key={i} className="text-inherit cursor-auto">
                  {cleanPara}
                </p>
              );
            })
          )}
        </div>

        {/* Spacer at the bottom */}
        <div className="h-24" />
      </main>

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
                  className={`group flex items-center justify-between px-3 py-1 rounded-lg text-sm transition-all duration-200 ${idx === currentChapterIndex
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

      {/* Floating Glassmorphic Bottom Navigation Bar */}
      <div
        style={{
          transform: showControls ? 'translate(-50%, 0)' : 'translate(-50%, 80px)',
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none'
        }}
        className="fixed bottom-6 left-1/2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-zinc-900/95 backdrop-blur-md border border-zinc-800/80 shadow-2xl text-zinc-300 transition-all duration-300"
      >
        <button
          onClick={handlePrevChapter}
          disabled={currentChapterIndex === 0}
          className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Chương trước (Mũi tên Trái)"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="px-2 text-xs font-semibold text-zinc-300 min-w-[120px] text-center select-none">
          Chương {currentChapterIndex + 1}/{chapters.length} ({scrollPercent}%)
        </div>

        <button
          onClick={handleNextChapter}
          disabled={currentChapterIndex === chapters.length - 1}
          className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Chương sau (Mũi tên Phải)"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

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

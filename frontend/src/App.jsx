import React, { useState, useEffect, useRef } from 'react';
import { Plus, BookOpen, Trash2, Library, BookCheck, ArrowRight, Settings, UploadCloud, AlertCircle, Edit } from 'lucide-react';
import NovelReader from './components/NovelReader';
import BookReader from './components/BookReader';
import SettingsModal from './components/SettingsModal';
import { API_BASE } from './config';


export default function App() {
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [selectedStoryDetails, setSelectedStoryDetails] = useState(null);
  const [view, setView] = useState(() => {
    const path = window.location.pathname;
    const storyChapterRegex = /^\/(\d+)\/(\d+)$/;
    const storyRegex = /^\/(\d+)$/;
    if (path.match(storyChapterRegex) || path.match(storyRegex)) {
      return 'reader';
    }
    return 'library';
  });
  const [activeChapterId, setActiveChapterId] = useState(null);

  // Settings State
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('novel-nexus-settings');
    return saved ? JSON.parse(saved) : {
      fontSize: 18,
      fontFamily: 'serif',
      theme: 'dark'
    };
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Sync settings to localstorage
  useEffect(() => {
    localStorage.setItem('novel-nexus-settings', JSON.stringify(settings));
  }, [settings]);

  // Fetch stories list on mount
  useEffect(() => {
    fetchStories();
  }, []);

  const selectedStoryDetailsRef = useRef(selectedStoryDetails);
  useEffect(() => {
    selectedStoryDetailsRef.current = selectedStoryDetails;
  }, [selectedStoryDetails]);

  const handleRouteUpdate = async () => {
    const path = window.location.pathname;
    
    let storyId = null;
    let chapterId = null;
    
    const storyChapterRegex = /^\/(\d+)\/(\d+)$/;
    const storyRegex = /^\/(\d+)$/;
    
    const scMatch = path.match(storyChapterRegex);
    if (scMatch) {
      storyId = parseInt(scMatch[1], 10);
      chapterId = parseInt(scMatch[2], 10);
    } else {
      const sMatch = path.match(storyRegex);
      if (sMatch) {
        storyId = parseInt(sMatch[1], 10);
      }
    }
    
    const currentDetails = selectedStoryDetailsRef.current;
    
    if (storyId) {
      try {
        if (!currentDetails || currentDetails.id !== storyId) {
          const res = await fetch(`${API_BASE}/api/stories/${storyId}`);
          if (res.ok) {
            const details = await res.json();
            setSelectedStory(details);
            setSelectedStoryDetails(details);
            setView('reader');
            
            const targetChapterId = chapterId || details.progress?.current_chapter_id || details.chapters[0]?.id;
            if (targetChapterId) {
              setActiveChapterId(targetChapterId);
              if (!chapterId) {
                window.history.replaceState(null, '', `/${storyId}/${targetChapterId}`);
              }
            }
          } else {
            window.history.replaceState(null, '', '/');
            setView('library');
            setSelectedStory(null);
            setSelectedStoryDetails(null);
            setActiveChapterId(null);
          }
        } else {
          setView('reader');
          if (chapterId) {
            setActiveChapterId(chapterId);
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải chi tiết truyện từ path:", err);
        window.history.replaceState(null, '', '/');
        setView('library');
        setSelectedStory(null);
        setSelectedStoryDetails(null);
        setActiveChapterId(null);
      }
    } else {
      setView('library');
      setSelectedStory(null);
      setSelectedStoryDetails(null);
      setActiveChapterId(null);
    }
  };

  const navigate = (path, replace = false) => {
    if (replace) {
      window.history.replaceState(null, '', path);
    } else {
      window.history.pushState(null, '', path);
    }
    handleRouteUpdate();
  };

  // Handle router path navigation
  useEffect(() => {
    window.addEventListener('popstate', handleRouteUpdate);
    handleRouteUpdate(); // Run on mount to check initial URL

    return () => window.removeEventListener('popstate', handleRouteUpdate);
  }, []);

  const fetchStories = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stories/`);
      if (res.ok) {
        const data = await res.json();
        setStories(data);
      } else {
        console.error("Lỗi khi tải danh sách truyện");
      }
    } catch (err) {
      console.error("Lỗi kết nối API:", err);
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;

    const customTitle = prompt("Nhập tên hiển thị của truyện mới (Để trống để lấy tên mặc định từ file):");
    if (customTitle === null) return; // Hủy upload

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (customTitle.trim()) {
      formData.append('title', customTitle.trim());
    }

    try {
      const res = await fetch(`${API_BASE}/api/stories/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        await fetchStories();
        // Automatically open the uploaded story
        handleOpenStory(data);
      } else {
        const errData = await res.json();
        setError(errData.detail || "Không thể tải lên file. Kiểm tra định dạng.");
      }
    } catch (err) {
      setError("Lỗi kết nối tới máy chủ khi tải lên file.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await uploadFile(file);
    }
    e.target.value = ''; // Reset input
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await uploadFile(file);
    }
  };
  const handleAppendUpload = async (storyId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('story_id', storyId);

    try {
      const res = await fetch(`${API_BASE}/api/stories/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        await fetchStories();
        // Automatically open the updated story
        handleOpenStory(data);
      } else {
        const errData = await res.json();
        setError(errData.detail || "Không thể thêm chương vào truyện này.");
      }
    } catch (err) {
      setError("Lỗi kết nối tới máy chủ khi gộp file.");
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };
  const handleDelete = async (storyId, e) => {
    e.stopPropagation(); // Avoid opening the story card
    if (!confirm("Bạn có chắc chắn muốn xóa sách/truyện này khỏi thư viện?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/stories/${storyId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStories(prev => prev.filter(s => s.id !== storyId));
        if (selectedStory && selectedStory.id === storyId) {
          navigate('/', true);
        }
      }
    } catch (err) {
      console.error("Không thể xóa:", err);
    }
  };

  const handleRename = async (storyId, currentTitle, e) => {
    e.stopPropagation(); // Do not open story reader interface
    const newTitle = prompt("Nhập tên mới cho truyện/sách:", currentTitle);
    if (newTitle === null) return; // Cancel

    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      alert("Tên truyện không được để trống!");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/stories/${storyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: trimmedTitle })
      });

      if (res.ok) {
        // Update displayed stories list
        setStories(prev => prev.map(s => s.id === storyId ? { ...s, title: trimmedTitle } : s));

        // If this story is open, update the displayed title
        if (selectedStory && selectedStory.id === storyId) {
          setSelectedStory(prev => ({ ...prev, title: trimmedTitle }));
        }
      } else {
        const errData = await res.json();
        alert(errData.detail || "Không thể đổi tên truyện");
      }
    } catch (err) {
      console.error("Lỗi khi đổi tên:", err);
      alert("Lỗi kết nối tới máy chủ.");
    }
  };

  const handleDeleteChapter = async (chapterId) => {
    if (!selectedStory) return;
    try {
      const res = await fetch(`${API_BASE}/api/chapters/${chapterId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        // Reload story details to update chapter list and progress
        const updatedRes = await fetch(`${API_BASE}/api/stories/${selectedStory.id}`);
        if (updatedRes.ok) {
          const details = await updatedRes.json();
          setSelectedStoryDetails(details);

          // Update chapter count in the library list
          setStories(prev => prev.map(s => s.id === selectedStory.id ? { ...s, chapter_count: details.chapters.length } : s));
        }
      } else {
        const errData = await res.json();
        alert(errData.detail || "Không thể xóa chương này.");
      }
    } catch (err) {
      console.error("Lỗi khi xóa chương:", err);
      alert("Lỗi kết nối tới máy chủ.");
    }
  };

  const handleOpenStory = (story) => {
    const targetChapterId = story.progress?.current_chapter_id;
    if (targetChapterId) {
      navigate(`/${story.id}/${targetChapterId}`);
    } else {
      navigate(`/${story.id}`);
    }
  };

  const handleSaveProgress = async (chapterId, scrollRatio) => {
    if (!selectedStory) return;
    try {
      await fetch(`${API_BASE}/api/progress/${selectedStory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_chapter_id: chapterId,
          scroll_ratio: scrollRatio
        })
      });

      // Update local state details to remember the progress if user backs out
      setSelectedStoryDetails(prev => {
        if (!prev) return null;
        return {
          ...prev,
          progress: {
            ...prev.progress,
            current_chapter_id: chapterId,
            scroll_ratio: scrollRatio
          }
        };
      });
    } catch (err) {
      console.error("Lỗi lưu tiến độ:", err);
    }
  };

  const handleUpdateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Theme Class Mapping
  const themeClasses = {
    light: 'bg-zinc-50 text-zinc-900',
    sepia: 'bg-[#f4ebd0] text-[#5b4636]',
    slate: 'bg-zinc-800 text-zinc-100',
    dark: 'bg-zinc-950 text-zinc-300'
  };

  const fontClasses = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono'
  };

  return (
    <div
      onDragOver={(e) => {
        if (view === 'library') {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }
      }}
      className={`w-full overflow-x-hidden min-h-screen transition-colors duration-300 relative ${view === 'reader' ? themeClasses[settings.theme] : 'bg-zinc-950 text-zinc-100'}`}
    >

      {/* Full-screen Drag Overlay */}
      {isDragging && view === 'library' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md border-4 border-dashed border-amber-500/40 m-6 rounded-3xl animate-in fade-in duration-200"
        >
          <div className="flex flex-col items-center justify-center p-8 text-center pointer-events-none">
            <UploadCloud className="w-16 h-16 text-amber-500 animate-bounce mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Thả file truyện tại đây</h3>
            <p className="text-sm text-zinc-400 max-w-xs">Hỗ trợ định dạng file .txt hoặc .epub</p>
          </div>
        </div>
      )}

      {/* Library View */}
      {view === 'library' && (
        <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">

          {/* Header */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12 border-b border-zinc-850 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-lg shadow-amber-500/5">
                <Library className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white font-display">Novel-Nexus</h1>
                <p className="text-xs text-zinc-400">Tủ sách cá nhân & Trình đọc thông minh di động</p>
              </div>
            </div>

            {/* Upload Button */}
            <label className="relative cursor-pointer overflow-hidden flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-semibold text-sm shadow-xl shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-98 transition-all duration-200">
              <Plus className="w-4 h-4" />
              <span>Thêm sách (.txt, .epub)</span>
              <input
                type="file"
                accept=".txt,.epub"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </header>

          {/* Error Alert */}
          {error && (
            <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <span className="font-semibold">Lỗi tải lên: </span>
                {error}
              </div>
            </div>
          )}

          {/* Empty State */}
          {stories.length === 0 && !uploading && (
            <label className="group relative cursor-pointer flex flex-col items-center justify-center text-center py-20 px-4 border border-dashed border-zinc-800 hover:border-amber-500/40 rounded-3xl bg-zinc-900/20 hover:bg-zinc-900/40 transition-all duration-300">
              <UploadCloud className="w-12 h-12 text-zinc-600 group-hover:text-amber-500 mb-4 transition-colors duration-300" />
              <h2 className="text-lg font-semibold text-zinc-300 mb-1">Thư viện trống</h2>
              <p className="text-sm text-zinc-500 max-w-sm mb-6">Hãy kéo thả hoặc click chọn file EPUB hoặc TXT để tải lên và trải nghiệm giao diện đọc cao cấp.</p>
              <input
                type="file"
                accept=".txt,.epub"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}

          {/* Uploading Placeholder Card */}
          {uploading && (
            <div className="mb-8 p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-16 rounded-lg bg-zinc-800" />
                <div>
                  <div className="h-4 w-32 bg-zinc-800 rounded-md mb-2" />
                  <div className="h-3 w-20 bg-zinc-800 rounded-md" />
                </div>
              </div>
              <span className="text-xs text-amber-500">Đang xử lý tách chương...</span>
            </div>
          )}

          {/* Books Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {stories.map((story) => (
              <div
                key={story.id}
                onClick={() => handleOpenStory(story)}
                className="group relative flex gap-4 p-5 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-850 hover:border-zinc-800 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
              >
                {/* Book Cover */}
                <div className="relative w-16 h-22 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700/50 flex-shrink-0 shadow-sm flex items-center justify-center">
                  {story.cover_path ? (
                    <img
                      src={story.cover_path.startsWith('http') ? story.cover_path : `${API_BASE}${story.cover_path}`}
                      alt={story.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <BookOpen className="w-6 h-6 text-zinc-500" />
                      <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest">{story.file_type}</span>
                    </div>
                  )}
                </div>

                {/* Book Meta */}
                <div className="flex-1 flex flex-col justify-between overflow-hidden">
                  <div>
                    <h3 className="text-zinc-100 font-semibold text-base group-hover:text-amber-400 transition-colors duration-250 truncate mb-1" title={story.title}>
                      {story.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-750">
                        {story.file_type}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {story.chapter_count} chương
                      </span>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDelete(story.id, e)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                        title="Xóa truyện"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => handleRename(story.id, story.title, e)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-500 hover:bg-amber-500/10 transition-all duration-200"
                        title="Đổi tên truyện"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-500 hover:bg-amber-500/10 transition-all duration-200 cursor-pointer"
                        title="Thêm/gộp chương mới (.txt, .epub)"
                      >
                        <Plus className="w-4 h-4" />
                        <input
                          type="file"
                          accept=".txt,.epub"
                          onChange={(e) => handleAppendUpload(story.id, e)}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                    </div>

                    <span className="text-xs font-semibold text-amber-500 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all duration-200">
                      Đọc tiếp <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Reader View */}
      {view === 'reader' && selectedStoryDetails && (
        <div className={`w-full h-screen overflow-hidden break-words ${fontClasses[settings.fontFamily]}`} style={{ fontSize: `${settings.fontSize}px` }}>
          {selectedStory.file_type === 'txt' ? (
            <NovelReader
              story={selectedStory}
              chapters={selectedStoryDetails.chapters}
              activeChapterId={activeChapterId}
              initialChapterId={selectedStoryDetails.progress?.current_chapter_id || (selectedStoryDetails.chapters[0]?.id)}
              initialScrollRatio={selectedStoryDetails.progress?.scroll_ratio || 0}
              onSaveProgress={handleSaveProgress}
              onBack={() => navigate('/')}
              onNavigate={navigate}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onDeleteChapter={handleDeleteChapter}
            />
          ) : (
            <BookReader
              story={selectedStory}
              chapters={selectedStoryDetails.chapters}
              activeChapterId={activeChapterId}
              initialChapterId={selectedStoryDetails.progress?.current_chapter_id || (selectedStoryDetails.chapters[0]?.id)}
              initialScrollRatio={selectedStoryDetails.progress?.scroll_ratio || 0}
              onSaveProgress={handleSaveProgress}
              onBack={() => navigate('/')}
              onNavigate={navigate}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onDeleteChapter={handleDeleteChapter}
            />
          )}
        </div>
      )}

      {/* Reader View Loading State */}
      {view === 'reader' && !selectedStoryDetails && (
        <div className="flex flex-col items-center justify-center h-screen bg-zinc-950 text-zinc-400">
          <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium">Đang tải nội dung sách...</p>
        </div>
      )}

      {/* Shared Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, Loader2, Files, BookOpen, ChevronRight, UploadCloud, AlertCircle } from 'lucide-react';
import { API_BASE } from '../config';

export default function BulkUploadModal({ isOpen, onClose, files, onUploadComplete }) {
  if (!isOpen || !files || files.length === 0) return null;

  const [uploadMode, setUploadMode] = useState('separate'); // 'separate' or 'merged'
  const [mergedTitle, setMergedTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [filesProgress, setFilesProgress] = useState([]);
  const [uploadCompleted, setUploadCompleted] = useState(false);
  const [lastStory, setLastStory] = useState(null);

  // Initialize sorted files and default title
  useEffect(() => {
    // Sort files naturally by name
    const sorted = [...files].sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
    
    // Set default title for merged mode based on first file name (without ext)
    if (sorted.length > 0) {
      const firstFileName = sorted[0].name;
      const cleanName = firstFileName.substring(0, firstFileName.lastIndexOf('.')) || firstFileName;
      setMergedTitle(cleanName);
    }

    setFilesProgress(sorted.map(file => ({
      file,
      status: 'pending', // 'pending' | 'uploading' | 'success' | 'error'
      errorMsg: ''
    })));
    
    setIsUploading(false);
    setUploadCompleted(false);
    setLastStory(null);
  }, [files, isOpen]);

  const handleStartUpload = async () => {
    setIsUploading(true);
    
    const sortedFilesProgress = [...filesProgress];
    let createdStoryId = null;
    let finalStoryData = null;

    if (uploadMode === 'separate') {
      // Separate Upload Mode
      for (let i = 0; i < sortedFilesProgress.length; i++) {
        const current = sortedFilesProgress[i];
        
        // Update state to uploading
        setFilesProgress(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'uploading' } : item
        ));

        const formData = new FormData();
        formData.append('file', current.file);
        
        try {
          const res = await fetch(`${API_BASE}/api/stories/upload`, {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            finalStoryData = data;
            setFilesProgress(prev => prev.map((item, idx) => 
              idx === i ? { ...item, status: 'success' } : item
            ));
          } else {
            const errData = await res.json();
            const msg = errData.detail || "Không thể tải lên.";
            setFilesProgress(prev => prev.map((item, idx) => 
              idx === i ? { ...item, status: 'error', errorMsg: msg } : item
            ));
          }
        } catch (err) {
          setFilesProgress(prev => prev.map((item, idx) => 
            idx === i ? { ...item, status: 'error', errorMsg: "Lỗi kết nối." } : item
          ));
        }
      }
    } else {
      // Merged Upload Mode
      const finalTitle = mergedTitle.trim() || "Truyện gộp";
      
      // Step 1: Upload the first file to create the story
      const firstItem = sortedFilesProgress[0];
      setFilesProgress(prev => prev.map((item, idx) => 
        idx === 0 ? { ...item, status: 'uploading' } : item
      ));

      const formData = new FormData();
      formData.append('file', firstItem.file);
      formData.append('title', finalTitle);

      try {
        const res = await fetch(`${API_BASE}/api/stories/upload`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          createdStoryId = data.id;
          finalStoryData = data;
          
          setFilesProgress(prev => prev.map((item, idx) => 
            idx === 0 ? { ...item, status: 'success' } : item
          ));

          // Step 2: Sequentially append the rest of the files
          for (let i = 1; i < sortedFilesProgress.length; i++) {
            const current = sortedFilesProgress[i];
            setFilesProgress(prev => prev.map((item, idx) => 
              idx === i ? { ...item, status: 'uploading' } : item
            ));

            const appendFormData = new FormData();
            appendFormData.append('file', current.file);
            appendFormData.append('story_id', createdStoryId);

            try {
              const appendRes = await fetch(`${API_BASE}/api/stories/upload`, {
                method: 'POST',
                body: appendFormData,
              });

              if (appendRes.ok) {
                const appendData = await appendRes.json();
                finalStoryData = appendData;
                setFilesProgress(prev => prev.map((item, idx) => 
                  idx === i ? { ...item, status: 'success' } : item
                ));
              } else {
                const errData = await appendRes.json();
                const msg = errData.detail || "Không thể gộp chương.";
                setFilesProgress(prev => prev.map((item, idx) => 
                  idx === i ? { ...item, status: 'error', errorMsg: msg } : item
                ));
              }
            } catch (err) {
              setFilesProgress(prev => prev.map((item, idx) => 
                idx === i ? { ...item, status: 'error', errorMsg: "Lỗi kết nối." } : item
              ));
            }
          }
        } else {
          const errData = await res.json();
          const msg = errData.detail || "Không thể tạo truyện ban đầu.";
          
          // If first fails, we cannot proceed with the rest. Mark all as error.
          setFilesProgress(prev => prev.map((item, idx) => ({
            ...item,
            status: 'error',
            errorMsg: idx === 0 ? msg : "Bị hủy do không tạo được truyện chính."
          })));
        }
      } catch (err) {
        setFilesProgress(prev => prev.map((item, idx) => ({
          ...item,
          status: 'error',
          errorMsg: idx === 0 ? "Lỗi kết nối." : "Bị hủy do lỗi kết nối truyện chính."
        })));
      }
    }

    setLastStory(finalStoryData);
    setUploadCompleted(true);
  };

  const handleFinish = () => {
    if (onUploadComplete) {
      onUploadComplete(lastStory);
    }
    onClose();
  };

  const successCount = filesProgress.filter(f => f.status === 'success').length;
  const errorCount = filesProgress.filter(f => f.status === 'error').length;
  const isFormValid = uploadMode !== 'merged' || mergedTitle.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <header className="px-6 py-5 border-b border-zinc-850 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Files className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Tải lên hàng loạt</h3>
              <p className="text-xs text-zinc-400">Đã chọn {files.length} file .txt</p>
            </div>
          </div>
          {!isUploading && (
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </header>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!isUploading ? (
            // Phase 1: Mode Selection
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Separate Stories Card */}
                <button
                  type="button"
                  onClick={() => setUploadMode('separate')}
                  className={`flex flex-col items-start text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
                    uploadMode === 'separate'
                      ? 'bg-amber-500/5 border-amber-500 text-white shadow-lg shadow-amber-500/5'
                      : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl mb-3 ${uploadMode === 'separate' ? 'bg-amber-500/10 text-amber-500' : 'bg-zinc-800 text-zinc-500'}`}>
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm mb-1">Tạo truyện riêng biệt</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">Mỗi file sẽ được import thành một cuốn truyện riêng biệt.</p>
                </button>

                {/* Merged Story Card */}
                <button
                  type="button"
                  onClick={() => setUploadMode('merged')}
                  className={`flex flex-col items-start text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
                    uploadMode === 'merged'
                      ? 'bg-amber-500/5 border-amber-500 text-white shadow-lg shadow-amber-500/5'
                      : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl mb-3 ${uploadMode === 'merged' ? 'bg-amber-500/10 text-amber-500' : 'bg-zinc-800 text-zinc-500'}`}>
                    <Files className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm mb-1">Gộp thành một truyện</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">Tất cả các file sẽ được gộp thành các chương của một truyện.</p>
                </button>
              </div>

              {/* Merged Mode Title Input */}
              {uploadMode === 'merged' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label htmlFor="merged-title" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Tên truyện gộp
                  </label>
                  <input
                    id="merged-title"
                    type="text"
                    value={mergedTitle}
                    onChange={(e) => setMergedTitle(e.target.value)}
                    placeholder="Ví dụ: Cuốn sách của tôi"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-650 focus:border-amber-500 focus:outline-none transition-all duration-200 text-sm"
                  />
                  <p className="text-[11px] text-zinc-500">Các file sẽ được gộp theo thứ tự chữ cái của tên file.</p>
                </div>
              )}

              {/* Files preview list */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Danh sách file sẽ xử lý ({files.length})
                </label>
                <div className="max-h-40 overflow-y-auto border border-zinc-850 rounded-xl divide-y divide-zinc-850/50 bg-zinc-950/40">
                  {filesProgress.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-2.5 text-xs">
                      <span className="text-zinc-300 truncate font-medium max-w-[80%]">{item.file.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{(item.file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Phase 2: Progress & Uploading Status
            <div className="space-y-6">
              {/* Overall Progress status */}
              <div className="p-4 rounded-2xl bg-zinc-950/50 border border-zinc-850 flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-zinc-200">
                    {uploadCompleted ? "Đã hoàn thành xử lý!" : "Đang tiến hành tải lên..."}
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Thành công: <span className="text-emerald-400 font-semibold">{successCount}</span>
                    {errorCount > 0 && (
                      <>
                        {" | "}Thất bại: <span className="text-red-400 font-semibold">{errorCount}</span>
                      </>
                    )}
                    {" / "}{filesProgress.length} file
                  </p>
                </div>
                {!uploadCompleted ? (
                  <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                ) : errorCount === 0 ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                )}
              </div>

              {/* Progress Detail list */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Tiến độ chi tiết
                </label>
                <div className="max-h-60 overflow-y-auto border border-zinc-850 rounded-xl divide-y divide-zinc-850/50 bg-zinc-950/40">
                  {filesProgress.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-3 text-xs">
                      <div className="flex flex-col min-w-0 max-w-[75%]">
                        <span className="text-zinc-200 truncate font-medium">{item.file.name}</span>
                        {item.errorMsg && (
                          <span className="text-[10px] text-red-400 mt-0.5 truncate">{item.errorMsg}</span>
                        )}
                      </div>
                      
                      {/* Status Indicator */}
                      <div className="flex-shrink-0 ml-2">
                        {item.status === 'pending' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-500">
                            Chờ...
                          </span>
                        )}
                        {item.status === 'uploading' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-500">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            Đang xử lý
                          </span>
                        )}
                        {item.status === 'success' && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Thành công
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400">
                            <XCircle className="w-2.5 h-2.5" />
                            Thất bại
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 bg-zinc-950/40 border-t border-zinc-850 flex justify-end gap-3">
          {!isUploading ? (
            // Phase 1 buttons
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-sm font-semibold transition-all duration-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleStartUpload}
                disabled={!isFormValid}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:pointer-events-none text-zinc-950 text-sm font-bold shadow-xl shadow-amber-500/10 transition-all duration-200"
              >
                Bắt đầu tải lên
              </button>
            </>
          ) : (
            // Phase 2 buttons (only close when completed)
            <button
              type="button"
              onClick={handleFinish}
              disabled={!uploadCompleted}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:pointer-events-none text-zinc-950 text-sm font-bold shadow-xl shadow-amber-500/10 transition-all duration-200"
            >
              Hoàn thành
            </button>
          )}
        </footer>

      </div>
    </div>
  );
}

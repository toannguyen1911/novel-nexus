import React from 'react';
import { X, Type, Sun, Moon, Compass, Layout } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings, onUpdateSettings }) {
  if (!isOpen) return null;

  const fontFamilies = [
    { id: 'sans', name: 'Không chân (Outfit)', class: 'font-sans' },
    { id: 'serif', name: 'Có chân (Lora)', class: 'font-serif' },
    { id: 'mono', name: 'Mã nguồn (Mono)', class: 'font-mono' },
  ];

  const themes = [
    { id: 'light', name: 'Sáng', bg: 'bg-white', text: 'text-zinc-900', border: 'border-zinc-300' },
    { id: 'sepia', name: 'Giấy cũ', bg: 'bg-[#f4ebd0]', text: 'text-[#5b4636]', border: 'border-[#d6c59d]' },
    { id: 'slate', name: 'Bóng đêm', bg: 'bg-zinc-800', text: 'text-zinc-100', border: 'border-zinc-700' },
    { id: 'dark', name: 'Tối đen', bg: 'bg-black', text: 'text-zinc-300', border: 'border-zinc-800' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-300">
      <div 
        className="w-full sm:max-w-md bg-zinc-900/95 border-t sm:border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 overflow-hidden animate-in slide-in-from-bottom duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Layout className="w-5 h-5 text-amber-500" />
            Cài đặt trình đọc
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Font Family Selection */}
        <div className="mb-6">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-3">
            Kiểu chữ (Font)
          </label>
          <div className="grid grid-cols-1 gap-2">
            {fontFamilies.map((font) => (
              <button
                key={font.id}
                onClick={() => onUpdateSettings({ fontFamily: font.id })}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-200 flex items-center justify-between ${
                  settings.fontFamily === font.id
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-medium'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                } ${font.class}`}
              >
                <span>{font.name}</span>
                <span className="text-xs opacity-60">Aa</span>
              </button>
            ))}
          </div>
        </div>

        {/* Font Size Adjuster */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Kích thước chữ
            </label>
            <span className="text-sm font-semibold text-amber-400">{settings.fontSize}px</span>
          </div>
          <div className="flex items-center gap-4 bg-zinc-950 px-4 py-3 rounded-xl border border-zinc-800">
            <button
              onClick={() => onUpdateSettings({ fontSize: Math.max(14, settings.fontSize - 1) })}
              disabled={settings.fontSize <= 14}
              className="text-lg font-bold text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center transition-colors"
            >
              A-
            </button>
            <input
              type="range"
              min="14"
              max="28"
              value={settings.fontSize}
              onChange={(e) => onUpdateSettings({ fontSize: parseInt(e.target.value) })}
              className="flex-1 accent-amber-500 cursor-pointer h-1 bg-zinc-800 rounded-lg appearance-none"
            />
            <button
              onClick={() => onUpdateSettings({ fontSize: Math.min(28, settings.fontSize + 1) })}
              disabled={settings.fontSize >= 28}
              className="text-lg font-bold text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center transition-colors"
            >
              A+
            </button>
          </div>
        </div>

        {/* Background Themes */}
        <div className="mb-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-3">
            Giao diện đọc (Màu nền)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => onUpdateSettings({ theme: theme.id })}
                className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all duration-200 ${theme.bg} ${theme.border} ${
                  settings.theme === theme.id
                    ? 'ring-2 ring-amber-500 border-amber-500 scale-105'
                    : 'opacity-80 hover:opacity-100 hover:scale-102'
                }`}
                title={theme.name}
              >
                <span className={`text-xs font-bold ${theme.text}`}>Aa</span>
                <span className={`text-[10px] ${theme.text} opacity-80`}>{theme.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

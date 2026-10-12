import React, { useRef } from 'react';
import { BookOpen, Settings, Database, Sparkles, FileText, UploadCloud, LogIn, LogOut, User as UserIcon } from 'lucide-react';

export default function Navbar({
  documents,
  activeDoc,
  onSelectDoc,
  health,
  user,
  onOpenSettings,
  onOpenAuth,
  onLogout,
  onQuickUpload,
}) {
  const quickFileInputRef = useRef(null);

  const handleQuickFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      if (onQuickUpload) {
        onQuickUpload(e.target.files[0]);
      }
      e.target.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">AI Study Assistant</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                RAG + Gemini
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              PDF-grounded study companion with citations
            </p>
          </div>
        </div>

        {/* Center: Active Document Selector & Quick Upload */}
        <div className="hidden md:flex items-center gap-2">
          {documents && documents.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-slate-400">Material:</span>
              <select
                value={activeDoc?.doc_id || ''}
                onChange={(e) => {
                  const doc = documents.find((d) => d.doc_id === e.target.value);
                  if (doc) onSelectDoc(doc);
                }}
                className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer max-w-xs truncate"
              >
                {documents.map((d) => (
                  <option key={d.doc_id} value={d.doc_id} className="bg-slate-900 text-slate-200">
                    {d.filename} ({d.total_pages} pgs)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Upload Button in Nav */}
          <input
            ref={quickFileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleQuickFileChange}
          />
          <button
            onClick={() => quickFileInputRef.current?.click()}
            className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Upload new PDF document"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload PDF</span>
          </button>
        </div>

        {/* Right Actions: Auth, Status Badges & Settings */}
        <div className="flex items-center gap-2.5">
          {/* Gemini Status */}
          <div
            onClick={onOpenSettings}
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
              health?.gemini_configured
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/40'
                : 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/40'
            }`}
            title={health?.gemini_configured ? "Gemini API Active" : "Click to configure Gemini API Key"}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{health?.gemini_configured ? 'Gemini Active' : 'Add Gemini Key'}</span>
          </div>

          {/* User Auth Section */}
          {user ? (
            <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-slate-200 hidden sm:inline">
                {user.username}
              </span>
              <button
                onClick={onLogout}
                className="text-slate-400 hover:text-rose-400 p-1 rounded-lg transition-colors cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sign In</span>
            </button>
          )}

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800/80 cursor-pointer"
            title="Settings (API Key & MongoDB)"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

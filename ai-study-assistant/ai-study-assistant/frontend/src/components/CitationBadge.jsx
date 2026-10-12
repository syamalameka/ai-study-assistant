import React, { useState } from 'react';
import { BookOpen, X, Sparkles } from 'lucide-react';

export default function CitationBadge({ citation }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-950/70 text-indigo-300 border border-indigo-700/50 hover:bg-indigo-900/60 transition-colors shadow-sm cursor-pointer"
        title="Click to view verified source excerpt"
      >
        <BookOpen className="w-3 h-3 text-indigo-400" />
        <span>Page {citation.page_num}</span>
        {citation.score > 0 && (
          <span className="text-[10px] text-indigo-400/80 font-mono">
            ({Math.round(citation.score * 100)}%)
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400">
                <Sparkles className="w-4 h-4" />
                <h3 className="font-semibold text-slate-100">
                  Verified PDF Source Excerpt &bull; Page {citation.page_num}
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 max-h-72 overflow-y-auto pr-2">
              <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {citation.snippet}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>RAG Chunk ID: {citation.chunk_id || 'Extracted Segment'}</span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

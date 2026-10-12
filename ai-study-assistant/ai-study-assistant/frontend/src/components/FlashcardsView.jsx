import React, { useState, useEffect } from 'react';
import { RotateCw, ChevronLeft, ChevronRight, Sparkles, Lightbulb, CheckCircle2, RefreshCw, Loader2, BookOpen } from 'lucide-react';
import { api } from '../services/api';

export default function FlashcardsView({ activeDoc }) {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [mastered, setMastered] = useState(new Set());

  useEffect(() => {
    if (!activeDoc) return;
    loadFlashcards();
  }, [activeDoc?.doc_id]);

  const loadFlashcards = async () => {
    setLoading(true);
    setIsFlipped(false);
    setShowHint(false);
    setCurrentIndex(0);
    try {
      const res = await api.getFlashcards(activeDoc.doc_id);
      setCards(res.flashcards || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setIsFlipped(false);
    setShowHint(false);
    try {
      const res = await api.regenerateFlashcards(activeDoc.doc_id);
      setCards(res.flashcards || []);
      setCurrentIndex(0);
      setMastered(new Set());
    } catch (err) {
      console.error(err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setShowHint(false);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setShowHint(false);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const toggleMastered = (idx) => {
    setMastered((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  if (!activeDoc) {
    return (
      <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400">
        <BookOpen className="w-12 h-12 mx-auto text-indigo-400 mb-3 opacity-60" />
        <h3 className="text-base font-semibold text-slate-200">No Document Selected</h3>
        <p className="text-xs text-slate-500 mt-1">Select a document from the vault to review flashcards.</p>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const isMastered = mastered.has(currentIndex);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Active Recall Flashcards
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Document: {activeDoc.filename} &bull; {cards.length} Cards Generated
          </p>
        </div>

        <button
          onClick={handleRegenerate}
          disabled={regenerating || loading}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
        >
          {regenerating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Regenerate with Gemini
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-2" />
          <p className="text-sm">Synthesizing flashcards from document passages...</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-500">
          No flashcards available. Click Regenerate to build study cards.
        </div>
      ) : (
        <>
          {/* Card Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Card {currentIndex + 1} of {cards.length}</span>
              <span>{mastered.size} Mastered ({Math.round((mastered.size / cards.length) * 100)}%)</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
              />
            </div>
          </div>

          {/* 3D Flip Card Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="perspective-1000 h-80 w-full cursor-pointer select-none"
          >
            <div
              className={`relative w-full h-full rounded-3xl transition-transform duration-500 transform-style-3d shadow-2xl ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* Front of Card (Question) */}
              <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-700/80 rounded-3xl p-8 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-indigo-400 font-medium">
                  <span className="px-2.5 py-1 rounded-full bg-indigo-950/80 border border-indigo-800/60">
                    Question
                  </span>
                  {currentCard.page_ref && (
                    <span className="text-slate-400">Source: Page {currentCard.page_ref}</span>
                  )}
                </div>

                <div className="my-auto text-center px-4">
                  <h4 className="text-lg md:text-xl font-bold text-slate-100 leading-snug">
                    {currentCard.question}
                  </h4>
                </div>

                <div className="flex items-center justify-center text-xs text-slate-500 gap-1.5">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Click anywhere to flip and check answer</span>
                </div>
              </div>

              {/* Back of Card (Answer) */}
              <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/50 rounded-3xl p-8 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-300">
                    Answer & Explanation
                  </span>
                  {currentCard.page_ref && (
                    <span className="text-slate-400">Page {currentCard.page_ref}</span>
                  )}
                </div>

                <div className="my-auto overflow-y-auto max-h-48 px-2 pr-1 text-slate-200 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                  {currentCard.answer}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  {currentCard.hint ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHint(!showHint);
                      }}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      {showHint ? `Hint: ${currentCard.hint}` : 'Show Hint'}
                    </button>
                  ) : (
                    <span />
                  )}
                  <span className="text-slate-500 flex items-center gap-1">
                    <RotateCw className="w-3 h-3" /> Flip back
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action & Nav Controls */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleMastered(currentIndex)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isMastered
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${isMastered ? 'text-emerald-400' : 'text-slate-500'}`} />
                {isMastered ? 'Marked Mastered' : 'Mark as Mastered'}
              </button>
            </div>

            <button
              onClick={handleNext}
              disabled={currentIndex === cards.length - 1}
              className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

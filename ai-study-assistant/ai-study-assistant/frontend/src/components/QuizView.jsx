import React, { useState, useEffect } from 'react';
import { HelpCircle, CheckCircle2, XCircle, RotateCcw, RefreshCw, Sparkles, Loader2, Award, BookOpen } from 'lucide-react';
import { api } from '../services/api';

export default function QuizView({ activeDoc }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionIndex: optionIndex }
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => {
    if (!activeDoc) return;
    loadQuiz();
  }, [activeDoc?.doc_id]);

  const loadQuiz = async () => {
    setLoading(true);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setQuizFinished(false);
    try {
      const res = await api.getQuiz(activeDoc.doc_id);
      setQuestions(res.questions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setQuizFinished(false);
    try {
      const res = await api.regenerateQuiz(activeDoc.doc_id);
      setQuestions(res.questions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleSelectOption = (qIdx, optIdx) => {
    if (selectedAnswers[qIdx] !== undefined) return; // Already answered
    setSelectedAnswers((prev) => ({
      ...prev,
      [qIdx]: optIdx,
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setCurrentIndex(0);
    setQuizFinished(false);
  };

  if (!activeDoc) {
    return (
      <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400">
        <BookOpen className="w-12 h-12 mx-auto text-indigo-400 mb-3 opacity-60" />
        <h3 className="text-base font-semibold text-slate-200">No Document Selected</h3>
        <p className="text-xs text-slate-500 mt-1">Select a document to take a comprehension quiz.</p>
      </div>
    );
  }

  // Calculate score
  const totalQuestions = questions.length;
  const correctCount = questions.reduce((acc, q, idx) => {
    return acc + (selectedAnswers[idx] === q.correct_index ? 1 : 0);
  }, 0);
  const answeredCount = Object.keys(selectedAnswers).length;

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-2" />
        <p className="text-sm">Synthesizing multiple choice quiz questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-500">
        No quiz available for this document. Click Regenerate to build questions.
      </div>
    );
  }

  if (quizFinished) {
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    return (
      <div className="max-w-xl mx-auto p-8 bg-slate-900/80 border border-slate-800 rounded-3xl text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
          <Award className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-xl font-bold text-slate-100">Quiz Completed!</h3>
          <p className="text-xs text-slate-400 mt-1">
            Review of: {activeDoc.filename}
          </p>
        </div>

        <div className="p-6 bg-slate-950 border border-slate-800/80 rounded-2xl">
          <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
            {correctCount} / {totalQuestions}
          </div>
          <p className="text-sm font-semibold text-slate-300 mt-1">
            Mastery Score: {percentage}%
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {percentage >= 80
              ? '🌟 Outstanding! You have mastered the key concepts in this material.'
              : percentage >= 50
              ? '👍 Good progress! Review the flashcards and try once more.'
              : '💡 Keep practicing! Review the notes or chat with the AI tutor for deeper explanations.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={handleRetake}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Retake Quiz
          </button>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Generate New Questions
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const currentAnswer = selectedAnswers[currentIndex];
  const hasAnswered = currentAnswer !== undefined;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            Comprehension Practice Quiz
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Test your grasp of {activeDoc.filename}
          </p>
        </div>

        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
        >
          {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          New Questions
        </button>
      </div>

      {/* Progress & Current Score */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Question {currentIndex + 1} of {totalQuestions}</span>
          <span>Score: {correctCount} / {answeredCount} Answered</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="p-6 md:p-8 bg-slate-900/90 border border-slate-800 rounded-3xl space-y-6 shadow-xl">
        <div className="flex items-center justify-between text-xs text-indigo-400">
          <span className="font-semibold">Question #{currentIndex + 1}</span>
          {currentQ.page_ref && (
            <span className="text-slate-400">Referenced from Page {currentQ.page_ref}</span>
          )}
        </div>

        <h4 className="text-lg font-bold text-slate-100 leading-snug">
          {currentQ.question}
        </h4>

        {/* Options */}
        <div className="space-y-3">
          {currentQ.options.map((opt, optIdx) => {
            let optionStyles = 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900';

            if (hasAnswered) {
              if (optIdx === currentQ.correct_index) {
                // Correct option
                optionStyles = 'bg-emerald-950/70 border-emerald-600 text-emerald-200 shadow-md shadow-emerald-950/40';
              } else if (optIdx === currentAnswer) {
                // Wrong option picked
                optionStyles = 'bg-rose-950/70 border-rose-600 text-rose-200';
              } else {
                optionStyles = 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60';
              }
            }

            return (
              <button
                key={optIdx}
                onClick={() => handleSelectOption(currentIndex, optIdx)}
                disabled={hasAnswered}
                className={`w-full p-4 rounded-2xl border text-left text-sm font-medium transition-all flex items-start gap-3 cursor-pointer ${optionStyles}`}
              >
                <span className="w-6 h-6 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0 mt-0.5">
                  {String.fromCharCode(65 + optIdx)}
                </span>
                <span className="flex-1">{opt}</span>
                {hasAnswered && optIdx === currentQ.correct_index && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                {hasAnswered && optIdx === currentAnswer && optIdx !== currentQ.correct_index && (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation revealed when answered */}
        {hasAnswered && (
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-1 animate-fadeIn">
            <span className="font-semibold text-indigo-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Explanation:
            </span>
            <p className="text-slate-300 leading-relaxed font-sans">{currentQ.explanation}</p>
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-800 disabled:opacity-30 transition-colors cursor-pointer"
        >
          Previous
        </button>

        <button
          onClick={handleNext}
          disabled={!hasAnswered}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
        >
          {currentIndex === totalQuestions - 1 ? 'Finish Quiz' : 'Next Question'}
        </button>
      </div>
    </div>
  );
}

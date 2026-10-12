import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2, Bookmark, Lightbulb, Copy, Check, Loader2, BookOpen } from 'lucide-react';
import { api } from '../services/api';

export default function SummaryView({ activeDoc }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!activeDoc) return;
    loadSummary();
  }, [activeDoc?.doc_id]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await api.getSummary(activeDoc.doc_id);
      setSummary(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    const textToCopy = `STUDY GUIDE: ${summary.filename}
    
OVERVIEW:
${summary.overview}

KEY TAKEAWAYS:
${summary.key_takeaways?.map((t) => `• ${t}`).join('\n')}

IMPORTANT TERMS:
${summary.important_terms?.map((i) => `• ${i.term}: ${i.definition}`).join('\n')}

EXAM TIPS:
${summary.study_tips?.map((tip) => `• ${tip}`).join('\n')}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activeDoc) {
    return (
      <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400">
        <BookOpen className="w-12 h-12 mx-auto text-indigo-400 mb-3 opacity-60" />
        <h3 className="text-base font-semibold text-slate-200">No Document Selected</h3>
        <p className="text-xs text-slate-500 mt-1">Select a document from the vault to generate study summaries.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-2" />
        <p className="text-sm">Synthesizing comprehensive study guide summary...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-500">
        Could not load summary. Try refreshing or re-selecting the document.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Study Guide & Summary
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Structured analysis of {summary.filename}
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied Guide!' : 'Copy Summary'}
        </button>
      </div>

      {/* Overview Block */}
      <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2.5 shadow-lg">
        <h4 className="text-sm font-bold text-indigo-300 uppercase tracking-wider">
          Executive Overview
        </h4>
        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
          {summary.overview}
        </p>
      </div>

      {/* Key Takeaways */}
      {summary.key_takeaways && summary.key_takeaways.length > 0 && (
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3 shadow-lg">
          <h4 className="text-sm font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Key Concepts & Takeaways
          </h4>
          <div className="space-y-2">
            {summary.key_takeaways.map((takeaway, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-sm text-slate-300">
                <span className="w-5 h-5 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{takeaway}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Important Terms Glossary */}
      {summary.important_terms && summary.important_terms.length > 0 && (
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3 shadow-lg">
          <h4 className="text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-purple-400" />
            Core Terms & Definitions
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.important_terms.map((item, idx) => (
              <div key={idx} className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
                <h5 className="text-xs font-bold text-purple-300">{item.term}</h5>
                <p className="text-xs text-slate-400 leading-relaxed">{item.definition}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Study Tips */}
      {summary.study_tips && summary.study_tips.length > 0 && (
        <div className="p-6 bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-900 border border-amber-900/40 rounded-2xl space-y-3 shadow-lg">
          <h4 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            Actionable Exam & Study Tips
          </h4>
          <div className="space-y-2">
            {summary.study_tips.map((tip, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-amber-200/90 leading-relaxed">
                <span className="text-amber-400 font-bold">•</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

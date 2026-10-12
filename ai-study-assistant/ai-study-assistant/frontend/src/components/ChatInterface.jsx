import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Trash2, Sparkles, BookOpen, Loader2, ArrowRight } from 'lucide-react';
import CitationBadge from './CitationBadge';
import { api } from '../services/api';

const QUICK_PROMPTS = [
  "What is the difference between Supervised and Unsupervised learning?",
  "How does the Self-Attention formula work in Transformers?",
  "What is Retrieval-Augmented Generation (RAG) and why is it useful?",
  "Explain Backpropagation step-by-step.",
  "Give me a study summary of Chapter 1."
];

export default function ChatInterface({ activeDoc, health }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef(null);

  const sessionId = activeDoc ? `session_${activeDoc.doc_id}` : 'default_session';

  // Load chat history when active document changes
  useEffect(() => {
    if (!activeDoc) {
      setMessages([]);
      return;
    }

    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const history = await api.getChatHistory(sessionId);
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          // Initial greeting
          setMessages([
            {
              role: 'assistant',
              content: `👋 Hello! I am your AI Study Assistant. I've analyzed **${activeDoc.filename}** (${activeDoc.total_pages} pages, ${activeDoc.chunk_count} chunks).\n\nAsk me any concept, formula, or exam review question from your notes, and I'll explain it with direct page citations!`,
              citations: [],
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } catch (err) {
        console.error('History load error:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, [activeDoc?.doc_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText = input) => {
    const textToSend = queryText.trim();
    if (!textToSend || !activeDoc || loading) return;

    setInput('');
    const userMsg = {
      role: 'user',
      content: textToSend,
      citations: [],
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await api.sendQuery(activeDoc.doc_id, textToSend, sessionId);
      const assistantMsg = {
        role: 'assistant',
        content: response.answer,
        citations: response.citations || [],
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ **Error:** ${err.message || 'Failed to generate response. Check your network or Gemini API key.'}`,
          citations: [],
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear conversation history for this document?')) return;
    try {
      await api.clearChatHistory(sessionId);
      setMessages([
        {
          role: 'assistant',
          content: `Conversation reset. Ready for your questions on **${activeDoc.filename}**!`,
          citations: [],
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  if (!activeDoc) {
    return (
      <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400">
        <BookOpen className="w-12 h-12 mx-auto text-indigo-400 mb-3 opacity-60" />
        <h3 className="text-base font-semibold text-slate-200">No Document Selected</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Please upload a study PDF or select one from the Document Vault to start asking questions.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[75vh] bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Chat Header */}
      <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              Study QA &bull; {activeDoc.filename}
            </h4>
            <span className="text-[11px] text-slate-400">
              RAG mode: Grounded on {activeDoc.chunk_count} verified excerpts across {activeDoc.total_pages} pages
            </span>
          </div>
        </div>

        <button
          onClick={handleClearHistory}
          className="text-xs text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
          title="Clear chat history"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear Chat</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading study history...
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold ${
                    isUser
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 border border-slate-700 text-indigo-400'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'bg-slate-950 border border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                  {/* Citation pills */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                      <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-400" /> Grounded Source Citations:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((cite, cIdx) => (
                          <CitationBadge key={cIdx} citation={cite} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {loading && (
          <div className="flex gap-3 max-w-xl mr-auto">
            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Retrieving relevant PDF excerpts & generating answer...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-5 py-2 bg-slate-950/80 border-t border-slate-800/80 overflow-x-auto flex items-center gap-2 text-xs">
        <span className="text-slate-500 font-medium shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" /> Suggested:
        </span>
        {QUICK_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/40 text-slate-400 hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask a question about ${activeDoc.filename}...`}
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </form>
      </div>
    </div>
  );
}

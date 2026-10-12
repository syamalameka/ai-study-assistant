import React, { useState } from 'react';
import { X, Key, Database, Cpu, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { api } from '../services/api';

export default function SettingsModal({ isOpen, onClose, health, onUpdated }) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(health?.gemini_model || 'gemini-1.5-flash');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = { gemini_model: model };
      if (apiKey.trim()) {
        payload.gemini_api_key = apiKey.trim();
      }
      const res = await api.updateSettings(payload);
      setMessage({ type: 'success', text: 'Settings updated successfully!' });
      if (onUpdated) onUpdated();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update settings' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-100">AI & Database Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {message && (
          <div
            className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm ${
              message.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-800 text-rose-300'
            }`}
          >
            {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {/* Gemini API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-400" />
                Gemini API Key
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                Get Free API Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              placeholder={health?.gemini_configured ? "•••••••••••••••••••••••• (Configured)" : "Paste AI Studio Gemini Key..."}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
            />
            <p className="mt-1 text-xs text-slate-400">
              {health?.gemini_configured
                ? "Key is actively configured. Enter a new key only if you wish to change it."
                : "Free key from Google AI Studio powers generation of answers, flashcards, & quizzes."}
            </p>
          </div>

          {/* Model selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Gemini LLM Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
            >
              <option value="gemini-1.5-flash">gemini-1.5-flash (Fast, Recommended for Study)</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro (High Reasoning, In-depth)</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash (Next Gen Flash)</option>
            </select>
          </div>

          {/* MongoDB Status Info */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                MongoDB Status
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  health?.mongodb?.connected
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}
              >
                {health?.mongodb?.connected ? 'Online (MongoDB)' : 'In-Memory Resilient Mode'}
              </span>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <div><strong className="text-slate-300">Target URI:</strong> {health?.mongodb?.uri || 'mongodb://localhost:27017'}</div>
              <div><strong className="text-slate-300">Database:</strong> {health?.mongodb?.database || 'ai_study_assistant'}</div>
              <div><strong className="text-slate-300">Documents in Store:</strong> {health?.mongodb?.total_documents ?? 0}</div>
              {!health?.mongodb?.connected && (
                <div className="text-amber-400/90 text-[11px] pt-1">
                  Notice: Local MongoDB is not running, so the app is safely using active in-memory storage. To persist across restarts, start MongoDB or set a MongoDB Atlas URI in <code>backend/.env</code>.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

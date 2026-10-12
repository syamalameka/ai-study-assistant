import React, { useState, useEffect } from 'react';
import { MessageSquare, Layers, HelpCircle, FileText, UploadCloud, AlertTriangle, Key, Sparkles, CheckCircle2 } from 'lucide-react';
import Navbar from './components/Navbar';
import ChatInterface from './components/ChatInterface';
import FlashcardsView from './components/FlashcardsView';
import QuizView from './components/QuizView';
import SummaryView from './components/SummaryView';
import DocumentUpload from './components/DocumentUpload';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [documents, setDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [health, setHealth] = useState(null);
  const [user, setUser] = useState(() => api.getStoredUser());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const fetchHealthAndDocs = async () => {
    try {
      const [h, docs] = await Promise.all([
        api.getHealth().catch(() => null),
        api.getDocuments().catch(() => []),
      ]);
      setHealth(h);
      setDocuments(docs);
      if (docs.length > 0 && !activeDoc) {
        setActiveDoc(docs[0]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  useEffect(() => {
    fetchHealthAndDocs();
    // Validate session token with backend
    api.getMe().then((u) => {
      if (u) setUser(u);
    });
  }, []);

  const handleSelectDoc = (doc) => {
    setActiveDoc(doc);
  };

  const handleUploadSuccess = (newDoc) => {
    setActiveDoc(newDoc);
    setActiveTab('chat');
    showToast(`PDF "${newDoc.filename}" uploaded successfully! Now ready for study QA.`);
  };

  const handleQuickUpload = async (file) => {
    if (!file) return;
    try {
      showToast(`Uploading "${file.name}"... Generating vector chunks.`, 'info');
      const doc = await api.uploadPdf(file);
      await fetchHealthAndDocs();
      setActiveDoc(doc);
      setActiveTab('chat');
      showToast(`"${file.name}" uploaded and active! (${doc.total_pages} pages, ${doc.chunk_count} chunks)`);
    } catch (err) {
      showToast(err.message || 'Failed to upload PDF.', 'error');
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    fetchHealthAndDocs();
    showToast('Logged out successfully.');
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    fetchHealthAndDocs();
    showToast(`Welcome back, ${loggedInUser.username}!`);
  };

  const tabs = [
    { id: 'chat', label: 'RAG Chat QA', icon: MessageSquare, badge: activeDoc ? `${activeDoc.chunk_count} chunks` : null },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'quiz', label: 'Practice Quiz', icon: HelpCircle },
    { id: 'summary', label: 'Study Summary', icon: FileText },
    { id: 'vault', label: 'Document Vault', icon: UploadCloud, badge: `${documents.length} docs` },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        documents={documents}
        activeDoc={activeDoc}
        onSelectDoc={handleSelectDoc}
        health={health}
        user={user}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onQuickUpload={handleQuickUpload}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-medium ${
              toast.type === 'error'
                ? 'bg-rose-950 border-rose-700 text-rose-200'
                : toast.type === 'info'
                ? 'bg-indigo-950 border-indigo-700 text-indigo-200'
                : 'bg-emerald-950 border-emerald-700 text-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Gemini API Key Banner if unconfigured */}
      {health && !health.gemini_configured && (
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-indigo-950/80 border-b border-amber-800/60 px-4 py-2.5 text-xs text-amber-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Gemini API Key Required for AI Generation:</strong> Add your free key to unlock instant generative answers, AI flashcards, and quizzes.
              </span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg shrink-0 transition-colors cursor-pointer"
            >
              Add Key Now
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                      isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Views */}
        <div className="flex-1">
          {activeTab === 'chat' && (
            <ChatInterface activeDoc={activeDoc} health={health} />
          )}

          {activeTab === 'flashcards' && (
            <FlashcardsView activeDoc={activeDoc} />
          )}

          {activeTab === 'quiz' && (
            <QuizView activeDoc={activeDoc} />
          )}

          {activeTab === 'summary' && (
            <SummaryView activeDoc={activeDoc} />
          )}

          {activeTab === 'vault' && (
            <DocumentUpload
              documents={documents}
              activeDoc={activeDoc}
              onSelectDoc={handleSelectDoc}
              onRefreshDocs={fetchHealthAndDocs}
              onUploadSuccess={handleUploadSuccess}
            />
          )}
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        health={health}
        onUpdated={fetchHealthAndDocs}
      />

      {/* Authentication Modal (Login / Register) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}

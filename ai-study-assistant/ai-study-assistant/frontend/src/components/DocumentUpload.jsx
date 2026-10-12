import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, Trash2, Layers, BookMarked, Sparkles, Loader2, Info, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export default function DocumentUpload({
  documents,
  activeDoc,
  onSelectDoc,
  onRefreshDocs,
  onUploadSuccess,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [loadingSample, setLoadingSample] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [inspectChunksDoc, setInspectChunksDoc] = useState(null);
  const [chunksData, setChunksData] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF document (.pdf format).');
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setUploading(true);
    setUploadStage('Uploading & extracting pages...');

    try {
      setUploadStage('Generating semantic vector embeddings...');
      const doc = await api.uploadPdf(file);
      
      setSuccessMsg(`"${file.name}" uploaded & indexed (${doc.total_pages} pages, ${doc.chunk_count} RAG chunks)!`);
      
      // Refresh documents list
      await onRefreshDocs();
      // Select new doc
      onSelectDoc(doc);
      
      if (onUploadSuccess) {
        onUploadSuccess(doc);
      }
    } catch (err) {
      setError(err.message || 'Error uploading file. Make sure backend is running on http://localhost:8000.');
    } finally {
      setUploading(false);
      setUploadStage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset input to allow re-uploading
      }
    }
  };

  const handleLoadSample = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoadingSample(true);
    try {
      const doc = await api.loadSampleDocument();
      await onRefreshDocs();
      onSelectDoc(doc);
      setSuccessMsg('Loaded sample AI & Machine Learning study guide notes!');
      if (onUploadSuccess) {
        onUploadSuccess(doc);
      }
    } catch (err) {
      setError(err.message || 'Error loading sample notes.');
    } finally {
      setLoadingSample(false);
    }
  };

  const handleDelete = async (docId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this study document?')) return;
    try {
      await api.deleteDocument(docId);
      await onRefreshDocs();
      setSuccessMsg('Document deleted successfully.');
    } catch (err) {
      setError(err.message || 'Could not delete document.');
    }
  };

  const handleInspectChunks = async (doc, e) => {
    e.stopPropagation();
    setInspectChunksDoc(doc);
    try {
      const data = await api.getDocumentChunks(doc.doc_id);
      setChunksData(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-950/30 shadow-2xl shadow-indigo-500/20'
            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleUpload(e.target.files[0]);
            }
          }}
        />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-100">
              {uploading ? uploadStage : 'Upload Study Material or PDF Notes'}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Extracts text page-by-page, partitions into semantic RAG chunks, and builds embeddings for citations and search.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Select PDF File</span>
            </button>
            <button
              onClick={handleLoadSample}
              disabled={loadingSample || uploading}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-xs font-semibold transition-all border border-slate-700 flex items-center gap-2 cursor-pointer"
            >
              {loadingSample ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-400" />
              )}
              <span>Load Pre-built ML Study Notes (Sample)</span>
            </button>
          </div>

          {error && (
            <p className="text-xs text-rose-300 bg-rose-950/60 p-3 rounded-xl border border-rose-800/80">
              {error}
            </p>
          )}

          {successMsg && (
            <p className="text-xs text-emerald-300 bg-emerald-950/60 p-3 rounded-xl border border-emerald-800/80 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </p>
          )}
        </div>
      </div>

      {/* Document Library */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-indigo-400" />
            Document Vault ({documents.length})
          </h4>
          <span className="text-xs text-slate-500">
            Click any card to study it with RAG Chat, Flashcards & Quizzes
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/30 rounded-3xl border border-slate-800/80 text-slate-500 text-sm">
            No study materials loaded yet. Upload your PDF notes or load the sample above to start!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => {
              const isActive = activeDoc?.doc_id === doc.doc_id;
              return (
                <div
                  key={doc.doc_id}
                  onClick={() => onSelectDoc(doc)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
                    isActive
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-xl shadow-indigo-500/10'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-slate-200 truncate" title={doc.filename}>
                            {doc.filename}
                          </h5>
                          {isActive && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                          {doc.summary || 'PDF Study Material'}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                          <span>{doc.total_pages} Pages</span>
                          <span>&bull;</span>
                          <span>{doc.chunk_count} RAG Chunks</span>
                          <span>&bull;</span>
                          <span>{doc.uploaded_at || 'Indexed'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleInspectChunks(doc, e)}
                        className="p-2 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-xl transition-colors"
                        title="Inspect RAG Chunks & Citations"
                      >
                        <Layers className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(doc.doc_id, e)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inspect Chunks Modal */}
      {inspectChunksDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  RAG Vector Chunks: {inspectChunksDoc.filename}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Indexed segments with exact page markers and vector representations.
                </p>
              </div>
              <button
                onClick={() => {
                  setInspectChunksDoc(null);
                  setChunksData(null);
                }}
                className="text-slate-400 hover:text-slate-200 px-3 py-1 bg-slate-800 rounded-xl text-xs"
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-2">
              {!chunksData ? (
                <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading vector chunks...
                </div>
              ) : chunksData.chunks?.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">No chunks found.</div>
              ) : (
                chunksData.chunks.map((c, idx) => (
                  <div
                    key={c.chunk_id || idx}
                    className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-mono text-indigo-400 font-semibold">
                        Chunk #{c.chunk_index + 1}
                      </span>
                      <span className="px-2.5 py-0.5 bg-indigo-950/80 text-indigo-300 rounded-md border border-indigo-800/60 font-semibold">
                        Page {c.page_num}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                      {c.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

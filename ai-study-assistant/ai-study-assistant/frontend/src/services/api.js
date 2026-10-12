const API_BASE = '/api';

const getAuthHeaders = (isFormData = false) => {
  const token = localStorage.getItem('study_token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

export const api = {
  // Auth
  async register(data) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Registration failed');
    }
    const result = await res.json();
    if (result.token) {
      localStorage.setItem('study_token', result.token);
      localStorage.setItem('study_user', JSON.stringify(result.user));
    }
    return result;
  },

  async login(data) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Invalid email/username or password');
    }
    const result = await res.json();
    if (result.token) {
      localStorage.setItem('study_token', result.token);
      localStorage.setItem('study_user', JSON.stringify(result.user));
    }
    return result;
  },

  async getMe() {
    const token = localStorage.getItem('study_token');
    if (!token) return null;
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      localStorage.removeItem('study_token');
      localStorage.removeItem('study_user');
      return null;
    }
    return res.json();
  },

  logout() {
    localStorage.removeItem('study_token');
    localStorage.removeItem('study_user');
  },

  getStoredUser() {
    try {
      const u = localStorage.getItem('study_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  // System Health & Settings
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to fetch system health');
    return res.json();
  },

  async updateSettings(data) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  // Documents
  async getDocuments() {
    const res = await fetch(`${API_BASE}/documents`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async uploadPdf(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload PDF. Ensure backend is running.');
    }
    return res.json();
  },

  async loadSampleDocument() {
    const res = await fetch(`${API_BASE}/documents/sample`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load sample document');
    return res.json();
  },

  async deleteDocument(docId) {
    const res = await fetch(`${API_BASE}/documents/${docId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },

  async getDocumentChunks(docId) {
    const res = await fetch(`${API_BASE}/documents/${docId}/chunks`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch document chunks');
    return res.json();
  },

  // RAG Chat
  async sendQuery(docId, query, sessionId = 'default_session', topK = 4) {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        doc_id: docId,
        query,
        session_id: sessionId,
        top_k: topK,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to send query');
    }
    return res.json();
  },

  async getChatHistory(sessionId = 'default_session') {
    const res = await fetch(`${API_BASE}/chat/history/${sessionId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch chat history');
    return res.json();
  },

  async clearChatHistory(sessionId = 'default_session') {
    const res = await fetch(`${API_BASE}/chat/history/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to clear chat history');
    return res.json();
  },

  // Study Tools
  async getFlashcards(docId) {
    const res = await fetch(`${API_BASE}/study-tools/flashcards/${docId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load flashcards');
    return res.json();
  },

  async regenerateFlashcards(docId) {
    const res = await fetch(`${API_BASE}/study-tools/flashcards/${docId}/regenerate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to regenerate flashcards');
    return res.json();
  },

  async getQuiz(docId) {
    const res = await fetch(`${API_BASE}/study-tools/quiz/${docId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load quiz');
    return res.json();
  },

  async regenerateQuiz(docId) {
    const res = await fetch(`${API_BASE}/study-tools/quiz/${docId}/regenerate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to regenerate quiz');
    return res.json();
  },

  async getSummary(docId) {
    const res = await fetch(`${API_BASE}/study-tools/summary/${docId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load summary');
    return res.json();
  },
};

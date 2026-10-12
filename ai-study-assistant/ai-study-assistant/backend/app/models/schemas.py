from typing import List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field

# --- Auth Schemas ---
class UserRegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = None

class UserLoginRequest(BaseModel):
    email_or_username: str
    password: str

class UserResponse(BaseModel):
    user_id: str
    username: str
    email: str
    full_name: Optional[str] = None
    created_at: str

class AuthResponse(BaseModel):
    token: str
    user: UserResponse
    message: str = "Authenticated successfully"

# --- RAG & Study Schemas ---
class Citation(BaseModel):
    page_num: int
    snippet: str
    score: float = 0.0
    chunk_id: Optional[str] = None

class QueryRequest(BaseModel):
    doc_id: str
    query: str
    session_id: Optional[str] = "default_session"
    top_k: Optional[int] = 4

class QueryResponse(BaseModel):
    answer: str
    citations: List[Citation] = []
    doc_id: str
    session_id: str
    model_used: str

class ChatMessage(BaseModel):
    session_id: str
    doc_id: str
    role: str
    content: str
    citations: List[Citation] = []
    timestamp: str

class DocumentSummary(BaseModel):
    doc_id: str
    filename: str
    file_size: int
    total_pages: int
    chunk_count: int
    uploaded_at: str
    uploaded_by: Optional[str] = "Guest"
    summary: Optional[str] = None

class FlashcardItem(BaseModel):
    question: str
    answer: str
    hint: Optional[str] = None
    page_ref: Optional[int] = None

class FlashcardsResponse(BaseModel):
    doc_id: str
    flashcards: List[FlashcardItem]

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_index: int
    explanation: str
    page_ref: Optional[int] = None

class QuizResponse(BaseModel):
    doc_id: str
    questions: List[QuizQuestion]

class SummaryResponse(BaseModel):
    doc_id: str
    filename: str
    overview: str
    key_takeaways: List[str]
    important_terms: List[Dict[str, str]]
    study_tips: List[str]

class SettingsUpdate(BaseModel):
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    gemini_configured: bool
    gemini_model: str
    mongodb: Dict[str, Any]

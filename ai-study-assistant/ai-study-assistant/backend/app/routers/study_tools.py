import logging
from fastapi import APIRouter, HTTPException
from app.database import db_manager
from app.rag.rag_engine import rag_engine
from app.models.schemas import FlashcardsResponse, QuizResponse, SummaryResponse, FlashcardItem, QuizQuestion

router = APIRouter(prefix="/api/study-tools", tags=["study-tools"])
logger = logging.getLogger("ai_study_assistant.study_tools")

@router.get("/flashcards/{doc_id}", response_model=FlashcardsResponse)
def get_flashcards(doc_id: str):
    """Retrieves or auto-generates exam flashcards from PDF content."""
    doc = db_manager.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    cached = db_manager.get_study_set(doc_id, "flashcards")
    if cached and cached.get("data"):
        return FlashcardsResponse(doc_id=doc_id, flashcards=[FlashcardItem(**item) for item in cached["data"]])

    cards_data = rag_engine.generate_flashcards(doc_id, count=6)
    db_manager.save_study_set(doc_id, "flashcards", cards_data)
    return FlashcardsResponse(doc_id=doc_id, flashcards=[FlashcardItem(**item) for item in cards_data])

@router.post("/flashcards/{doc_id}/regenerate", response_model=FlashcardsResponse)
def regenerate_flashcards(doc_id: str):
    """Forces fresh regeneration of study flashcards using Gemini."""
    doc = db_manager.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    cards_data = rag_engine.generate_flashcards(doc_id, count=6)
    db_manager.save_study_set(doc_id, "flashcards", cards_data)
    return FlashcardsResponse(doc_id=doc_id, flashcards=[FlashcardItem(**item) for item in cards_data])

@router.get("/quiz/{doc_id}", response_model=QuizResponse)
def get_quiz(doc_id: str):
    """Retrieves or auto-generates interactive practice quiz with explanations."""
    doc = db_manager.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    cached = db_manager.get_study_set(doc_id, "quiz")
    if cached and cached.get("data"):
        return QuizResponse(doc_id=doc_id, questions=[QuizQuestion(**item) for item in cached["data"]])

    quiz_data = rag_engine.generate_quiz(doc_id, count=5)
    db_manager.save_study_set(doc_id, "quiz", quiz_data)
    return QuizResponse(doc_id=doc_id, questions=[QuizQuestion(**item) for item in quiz_data])

@router.post("/quiz/{doc_id}/regenerate", response_model=QuizResponse)
def regenerate_quiz(doc_id: str):
    """Forces fresh regeneration of multiple-choice quiz questions."""
    doc = db_manager.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    quiz_data = rag_engine.generate_quiz(doc_id, count=5)
    db_manager.save_study_set(doc_id, "quiz", quiz_data)
    return QuizResponse(doc_id=doc_id, questions=[QuizQuestion(**item) for item in quiz_data])

@router.get("/summary/{doc_id}", response_model=SummaryResponse)
def get_summary(doc_id: str):
    """Generates comprehensive study guide summary, terms, and exam tips."""
    doc = db_manager.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    cached = db_manager.get_study_set(doc_id, "summary")
    if cached and cached.get("data"):
        return SummaryResponse(**cached["data"])

    summary_data = rag_engine.generate_summary(doc_id, doc.get("filename", "Document"))
    db_manager.save_study_set(doc_id, "summary", summary_data)
    return SummaryResponse(**summary_data)

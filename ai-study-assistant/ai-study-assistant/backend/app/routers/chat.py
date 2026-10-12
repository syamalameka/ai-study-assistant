import logging
from typing import List
from fastapi import APIRouter, HTTPException
from app.database import db_manager
from app.rag.rag_engine import rag_engine
from app.models.schemas import QueryRequest, QueryResponse, ChatMessage

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = logging.getLogger("ai_study_assistant.chat_router")

@router.post("", response_model=QueryResponse)
def ask_question(request: QueryRequest):
    """
    RAG Endpoint: Retrieves relevant PDF chunks, assembles prompt,
    generates answer via Gemini API, and persists the conversation to MongoDB.
    """
    doc = db_manager.get_document(request.doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Selected study document not found.")

    # Save user message to chat history
    db_manager.save_chat_message(
        session_id=request.session_id,
        doc_id=request.doc_id,
        role="user",
        content=request.query
    )

    # Perform RAG retrieval and generation
    result = rag_engine.query(
        doc_id=request.doc_id,
        query_text=request.query,
        top_k=request.top_k or 4
    )

    # Save assistant message with citations to chat history
    db_manager.save_chat_message(
        session_id=request.session_id,
        doc_id=request.doc_id,
        role="assistant",
        content=result["answer"],
        citations=result.get("citations", [])
    )

    return QueryResponse(
        answer=result["answer"],
        citations=result.get("citations", []),
        doc_id=request.doc_id,
        session_id=request.session_id,
        model_used=result.get("model_used", "Gemini")
    )

@router.get("/history/{session_id}", response_model=List[ChatMessage])
def get_chat_history(session_id: str):
    """Retrieves conversation history for a specific session."""
    history = db_manager.get_chat_history(session_id)
    return [ChatMessage(**m) for m in history]

@router.delete("/history/{session_id}")
def clear_chat_history(session_id: str):
    """Clears conversation history for a specific session."""
    db_manager.clear_chat_history(session_id)
    return {"status": "success", "message": f"Chat history cleared for session {session_id}."}

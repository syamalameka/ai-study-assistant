import uuid
import shutil
import logging
import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from app.config import settings
from app.database import db_manager
from app.rag.pdf_processor import pdf_processor
from app.rag.vector_store import vector_store
from app.models.schemas import DocumentSummary
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/documents", tags=["documents"])
logger = logging.getLogger("ai_study_assistant.documents_router")

@router.post("/upload", response_model=DocumentSummary)
async def upload_document(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None)
):
    """Uploads a PDF, extracts text by page, computes embeddings, and stores in MongoDB."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF documents (.pdf) are supported.")

    user = get_current_user(authorization)
    user_id = user["user_id"] if user else "public"
    username = user["username"] if user else "Guest"

    doc_id = str(uuid.uuid4())
    safe_filename = f"{doc_id}_{file.filename}"
    file_path = settings.UPLOAD_DIR / safe_filename

    try:
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = file_path.stat().st_size
        logger.info(f"Uploaded file saved: {safe_filename} ({file_size} bytes)")

        # Extract text page by page
        pages_data = pdf_processor.extract_text_by_pages(file_path)
        if not pages_data:
            pages_data = [{"page_num": 1, "text": f"Document: {file.filename}"}]

        # Chunk pages
        chunks = pdf_processor.split_into_chunks(doc_id, pages_data)

        # Index chunks with embeddings
        vector_store.index_document_chunks(doc_id, chunks)

        # Create document record
        total_pages = len(pages_data)
        now_str = datetime.datetime.utcnow().strftime("%b %d, %Y %I:%M %p")
        
        doc_record = {
            "doc_id": doc_id,
            "filename": file.filename,
            "file_size": file_size,
            "total_pages": total_pages,
            "chunk_count": len(chunks),
            "uploaded_at": now_str,
            "uploaded_by": username,
            "user_id": user_id,
            "file_path": str(file_path),
            "summary": f"Study document with {total_pages} pages and {len(chunks)} indexed segments."
        }
        db_manager.save_document(doc_record)
        logger.info(f"Document {doc_id} successfully indexed with {len(chunks)} chunks.")

        return DocumentSummary(**doc_record)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process document upload: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

@router.post("/sample", response_model=DocumentSummary)
def load_sample_document():
    """Generates and indexes a comprehensive sample AI Study Guide PDF for testing."""
    doc_id = "sample_ai_study_guide"
    existing = db_manager.get_document(doc_id)
    if existing:
        return DocumentSummary(**existing)

    sample_pdf_path = settings.SAMPLE_DIR / "AI_Study_Guide_Notes.pdf"
    
    if not sample_pdf_path.exists():
        from sample_data.create_sample_pdf import generate_study_notes_pdf
        generate_study_notes_pdf(sample_pdf_path)

    pages_data = pdf_processor.extract_text_by_pages(sample_pdf_path)
    chunks = pdf_processor.split_into_chunks(doc_id, pages_data)
    vector_store.index_document_chunks(doc_id, chunks)

    doc_record = {
        "doc_id": doc_id,
        "filename": "AI_Study_Guide_Notes.pdf",
        "file_size": sample_pdf_path.stat().st_size,
        "total_pages": len(pages_data),
        "chunk_count": len(chunks),
        "uploaded_at": "Pre-loaded Sample",
        "uploaded_by": "System",
        "user_id": "public",
        "file_path": str(sample_pdf_path),
        "summary": "Comprehensive Machine Learning & AI Study Notes with Supervised Learning, Deep Neural Networks, and RAG architectures."
    }
    db_manager.save_document(doc_record)
    return DocumentSummary(**doc_record)

@router.get("", response_model=List[DocumentSummary])
def list_documents(authorization: Optional[str] = Header(None)):
    """Returns list of all study materials accessible to the user."""
    user = get_current_user(authorization)
    user_id = user["user_id"] if user else None
    docs = db_manager.list_documents(user_id=user_id)
    return [DocumentSummary(**d) for d in docs]

@router.get("/{doc_id}")
def get_document(doc_id: str):
    """Returns details for a specific document."""
    doc = db_manager.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc

@router.get("/{doc_id}/chunks")
def get_document_chunks(doc_id: str):
    """Returns chunks and extracted pages for a document."""
    chunks = db_manager.get_chunks(doc_id)
    clean_chunks = [
        {
            "chunk_id": c.get("chunk_id"),
            "page_num": c.get("page_num"),
            "text": c.get("text"),
            "chunk_index": c.get("chunk_index")
        }
        for c in chunks
    ]
    return {"doc_id": doc_id, "total_chunks": len(clean_chunks), "chunks": clean_chunks}

@router.delete("/{doc_id}")
def delete_document(doc_id: str):
    """Deletes a document and its associated chunks from the database."""
    success = db_manager.delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document could not be deleted.")
    return {"status": "success", "message": f"Document {doc_id} deleted."}

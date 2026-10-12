import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import db_manager
from app.routers.auth import router as auth_router
from app.routers.documents import router as documents_router, load_sample_document
from app.routers.chat import router as chat_router
from app.routers.study_tools import router as study_tools_router
from app.routers.health import router as health_router
from app.rag.pdf_processor import pdf_processor
from app.rag.vector_store import vector_store

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ai_study_assistant")

app = FastAPI(
    title="AI Study Assistant API",
    description="Full-stack AI Study Assistant backend powered by FastAPI, Google Gemini API, RAG, and MongoDB",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(chat_router)
app.include_router(study_tools_router)

@app.on_event("startup")
async def on_startup():
    logger.info("Initializing AI Study Assistant backend...")
    status = db_manager.get_status()
    logger.info(f"Database Engine: {status['engine']} (Connected: {status['connected']})")
    
    # 1. Recover any PDFs already present in uploads folder
    try:
        existing_doc_ids = {d["doc_id"] for d in db_manager.list_documents()}
        if settings.UPLOAD_DIR.exists():
            for pdf_file in settings.UPLOAD_DIR.glob("*.pdf"):
                # File format: {doc_id}_{filename}.pdf
                name_parts = pdf_file.name.split("_", 1)
                if len(name_parts) == 2:
                    doc_id, original_name = name_parts
                else:
                    doc_id = pdf_file.stem
                    original_name = pdf_file.name

                if doc_id not in existing_doc_ids:
                    logger.info(f"Restoring previously uploaded PDF: {original_name}...")
                    pages_data = pdf_processor.extract_text_by_pages(pdf_file)
                    chunks = pdf_processor.split_into_chunks(doc_id, pages_data)
                    vector_store.index_document_chunks(doc_id, chunks)

                    db_manager.save_document({
                        "doc_id": doc_id,
                        "filename": original_name,
                        "file_size": pdf_file.stat().st_size,
                        "total_pages": len(pages_data),
                        "chunk_count": len(chunks),
                        "uploaded_at": "Restored from Vault",
                        "uploaded_by": "System",
                        "user_id": "public",
                        "file_path": str(pdf_file),
                        "summary": f"Study notes with {len(pages_data)} pages and {len(chunks)} indexed segments."
                    })
                    existing_doc_ids.add(doc_id)
    except Exception as e:
        logger.warning(f"Error restoring uploads: {e}")

    # 2. Seed initial sample study document if empty
    try:
        if len(db_manager.list_documents()) == 0:
            logger.info("Seeding initial sample study guide document...")
            load_sample_document()
    except Exception as e:
        logger.warning(f"Could not seed sample document on startup: {e}")

@app.get("/")
def root():
    return {
        "app": "AI Study Assistant API",
        "status": "online",
        "documentation": "/docs",
        "version": "1.0.0"
    }

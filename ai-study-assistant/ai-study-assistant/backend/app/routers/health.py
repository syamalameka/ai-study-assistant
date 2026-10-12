import logging
from fastapi import APIRouter
from app.config import settings
from app.database import db_manager
from app.models.schemas import HealthResponse, SettingsUpdate

router = APIRouter(prefix="/api", tags=["system"])
logger = logging.getLogger("ai_study_assistant.health_router")

@router.get("/health", response_model=HealthResponse)
def health_check():
    """Returns system status, MongoDB connectivity, and Gemini API configuration."""
    db_status = db_manager.get_status()
    has_gemini = bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY.strip()) > 5)

    return HealthResponse(
        status="healthy",
        gemini_configured=has_gemini,
        gemini_model=settings.GEMINI_MODEL,
        mongodb=db_status
    )

@router.post("/settings")
def update_settings(update: SettingsUpdate):
    """Allows user to set their Gemini API key or model dynamically from UI."""
    if update.gemini_api_key is not None:
        settings.update_gemini_key(update.gemini_api_key)
        logger.info("Updated Gemini API key from settings.")

    if update.gemini_model:
        settings.GEMINI_MODEL = update.gemini_model.strip()

    return {
        "status": "success",
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "gemini_model": settings.GEMINI_MODEL,
        "message": "Settings updated successfully."
    }

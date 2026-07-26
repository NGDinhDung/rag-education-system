import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import dotenv

from app.core.dependencies import get_admin_user
from app.models.user import User
from app.config import settings
from app.services.llm_service import llm_service


router = APIRouter(
    prefix="/admin/settings",
    tags=["Admin Settings"],
)

class SettingsUpdate(BaseModel):
    rag_min_score: float
    rag_top_k: int
    ollama_temperature: float


@router.get("/config")
def get_current_settings(
    admin_user: User = Depends(get_admin_user),
):
    return {
        "rag_min_score": settings.rag_min_score,
        "rag_top_k": settings.rag_top_k,
        "ollama_temperature": llm_service.temperature,
    }


@router.put("/config")
def update_settings(
    update_data: SettingsUpdate,
    admin_user: User = Depends(get_admin_user),
):
    env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
    
    # Đảm bảo file .env tồn tại
    if not os.path.exists(env_file):
        open(env_file, 'a').close()

    try:
        # Ghi vào file .env
        dotenv.set_key(env_file, "RAG_MIN_SCORE", str(update_data.rag_min_score))
        dotenv.set_key(env_file, "RAG_TOP_K", str(update_data.rag_top_k))
        dotenv.set_key(env_file, "OLLAMA_TEMPERATURE", str(update_data.ollama_temperature))
        
        # Cập nhật object settings trong bộ nhớ
        settings.rag_min_score = update_data.rag_min_score
        settings.rag_top_k = update_data.rag_top_k
        
        # Cập nhật service LLM
        llm_service.temperature = update_data.ollama_temperature
        
        return {"message": "Cập nhật cấu hình thành công."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu cấu hình: {str(e)}")

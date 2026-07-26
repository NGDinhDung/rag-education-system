from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.dependencies import get_admin_user
from app.database import get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User


router = APIRouter(
    prefix="/admin/audit",
    tags=["Admin Audit"],
)


@router.get("/conversations")
def get_all_conversations(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
) -> Any:
    """Lấy danh sách toàn bộ các cuộc trò chuyện trong hệ thống (dành cho Admin)."""
    conversations = (
        db.query(Conversation)
        .order_by(desc(Conversation.updated_at))
        .limit(100)
        .all()
    )
    
    result = []
    for conv in conversations:
        # Lấy thông tin user
        user = conv.user
        
        # Đếm số tin nhắn
        message_count = len(conv.messages)
        
        result.append({
            "id": conv.id,
            "title": conv.title,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at,
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
            },
            "message_count": message_count
        })
        
    return result


@router.get("/conversations/{conversation_id}/messages")
def get_conversation_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
) -> Any:
    """Lấy chi tiết tin nhắn của một cuộc trò chuyện bất kỳ."""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc trò chuyện.")
        
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    
    result = []
    for msg in messages:
        sources = []
        for src in msg.message_sources:
            sources.append({
                "id": src.id,
                "source_number": src.source_number,
                "vector_id": src.vector_id,
                "score": src.score,
                "document_id": src.document_id,
            })
            
        result.append({
            "id": msg.id,
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at,
            "sources": sources
        })
        
    return result

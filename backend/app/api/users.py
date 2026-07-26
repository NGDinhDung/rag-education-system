from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, func
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.dependencies import get_current_user, get_admin_user
from app.crud.user import get_user_by_id
from app.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.user import UserResponse, UserActivityResponse


router = APIRouter(
    prefix="/users",
    tags=["Users"],
)

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserRoleUpdate(BaseModel):
    role: str

@router.get(
    "/me",
    response_model=UserResponse,
)
def get_my_profile(
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user

@router.get(
    "",
    response_model=List[UserResponse],
)
def get_all_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return users

@router.patch("/{user_id}/status")
def update_user_status(
    user_id: int,
    status_update: UserStatusUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    if user_id == admin_user.id:
        raise HTTPException(status_code=400, detail="Không thể tự khoá tài khoản của mình.")
        
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        
    user.is_active = status_update.is_active
    db.commit()
    return {"message": "Cập nhật trạng thái thành công."}

@router.patch("/{user_id}/role")
def update_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    if user_id == admin_user.id:
        raise HTTPException(status_code=400, detail="Không thể tự đổi quyền của mình.")
        
    if role_update.role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Quyền không hợp lệ.")
        
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        
    user.role = role_update.role
    db.commit()
    return {"message": "Cập nhật quyền thành công."}

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    if user_id == admin_user.id:
        raise HTTPException(status_code=400, detail="Không thể tự xoá tài khoản của mình.")
        
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        
    db.delete(user)
    db.commit()
    return {"message": "Đã xoá người dùng."}

@router.get("/{user_id}/activity", response_model=UserActivityResponse)
def get_user_activity(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    total_documents = db.query(func.count(Document.id)).filter(Document.user_id == user_id).scalar() or 0
    total_conversations = db.query(func.count(Conversation.id)).filter(Conversation.user_id == user_id).scalar() or 0
    
    conversation_ids_query = db.query(Conversation.id).filter(Conversation.user_id == user_id)
    
    total_questions = (
        db.query(func.count(Message.id))
        .filter(Message.conversation_id.in_(conversation_ids_query), Message.role == "user")
        .scalar() or 0
    )

    recent_documents = (
        db.query(Document)
        .filter(Document.user_id == user_id)
        .order_by(desc(Document.created_at))
        .limit(5)
        .all()
    )

    recent_questions = (
        db.query(Message)
        .filter(Message.conversation_id.in_(conversation_ids_query), Message.role == "user")
        .order_by(desc(Message.created_at))
        .limit(10)
        .all()
    )

    return {
        "total_documents": total_documents,
        "total_conversations": total_conversations,
        "total_questions": total_questions,
        "recent_documents": [
            {
                "id": doc.id,
                "title": doc.title or doc.original_file_name or f"Tài liệu {doc.id}",
                "file_size_bytes": doc.file_size,
                "created_at": doc.created_at
            } for doc in recent_documents
        ],
        "recent_questions": [
            {
                "id": msg.id,
                "content": msg.content,
                "conversation_id": msg.conversation_id,
                "created_at": msg.created_at
            } for msg in recent_questions
        ]
    }
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RecentDocumentSchema(BaseModel):
    id: int
    title: str
    file_size_bytes: int | None = None
    created_at: datetime

class RecentQuestionSchema(BaseModel):
    id: int
    content: str
    conversation_id: int
    created_at: datetime

class UserActivityResponse(BaseModel):
    total_documents: int
    total_conversations: int
    total_questions: int
    recent_documents: list[RecentDocumentSchema]
    recent_questions: list[RecentQuestionSchema]
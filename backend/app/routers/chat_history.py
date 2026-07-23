from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.message_source import MessageSource
from app.models.user import User


router = APIRouter(
    prefix="/chat/sessions",
    tags=["Chat History"],
)


# =========================================================
# SCHEMAS RIÊNG CHO CHAT HISTORY
# =========================================================


class ChatSessionCreate(BaseModel):
    title: str | None = Field(
        default=None,
        max_length=255,
    )


class ChatSessionUpdate(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=255,
    )


class SourceHistoryResponse(BaseModel):
    source_number: int
    vector_id: str | None = None
    document_id: int | None = None
    chunk_id: int | None = None
    chunk_index: int | None = None
    page_number: int | None = None
    score: float | None = None
    content: str = ""


class MessageHistoryResponse(BaseModel):
    id: int
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime | None = None
    sources: list[SourceHistoryResponse] = []


class ChatSessionResponse(BaseModel):
    id: int
    title: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ChatSessionDetailResponse(ChatSessionResponse):
    messages: list[MessageHistoryResponse] = []


# =========================================================
# HÀM HỖ TRỢ
# =========================================================


def clean_title(title: str | None) -> str:
    """
    Chuẩn hóa tiêu đề cuộc trò chuyện.
    """
    if title is None:
        return "Cuộc trò chuyện mới"

    cleaned_title = " ".join(title.strip().split())

    if not cleaned_title:
        return "Cuộc trò chuyện mới"

    return cleaned_title[:255]


def get_user_conversation(
    db: Session,
    conversation_id: int,
    user_id: int,
) -> Conversation:
    """
    Lấy cuộc trò chuyện và kiểm tra quyền sở hữu.
    """
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
        .first()
    )

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Không tìm thấy cuộc trò chuyện hoặc "
                "bạn không có quyền truy cập."
            ),
        )

    return conversation


def serialize_session(
    conversation: Conversation,
) -> dict:
    """
    Chuyển Conversation thành dữ liệu trả về API.
    """
    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": getattr(
            conversation,
            "created_at",
            None,
        ),
        "updated_at": getattr(
            conversation,
            "updated_at",
            None,
        ),
    }


# =========================================================
# TẠO CUỘC TRÒ CHUYỆN
# =========================================================


@router.post(
    "",
    response_model=ChatSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_session(
    data: ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Tạo một cuộc trò chuyện trống.

    API /chat vẫn có thể tự tạo cuộc trò chuyện khi
    conversation_id là null.
    """
    conversation = Conversation(
        user_id=current_user.id,
        title=clean_title(data.title),
    )

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    return serialize_session(conversation)


# =========================================================
# DANH SÁCH CUỘC TRÒ CHUYỆN
# =========================================================


@router.get(
    "",
    response_model=list[ChatSessionResponse],
)
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lấy danh sách cuộc trò chuyện của người dùng hiện tại.

    Cuộc trò chuyện mới hoạt động gần đây nhất nằm phía trên.
    """
    conversations = (
        db.query(Conversation)
        .filter(
            Conversation.user_id == current_user.id,
        )
        .order_by(
            Conversation.updated_at.desc(),
            Conversation.id.desc(),
        )
        .all()
    )

    return [
        serialize_session(conversation)
        for conversation in conversations
    ]


# =========================================================
# CHI TIẾT CUỘC TRÒ CHUYỆN
# =========================================================


@router.get(
    "/{session_id}",
    response_model=ChatSessionDetailResponse,
)
def get_session_detail(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lấy toàn bộ tin nhắn và nguồn của một cuộc trò chuyện.
    """
    conversation = get_user_conversation(
        db=db,
        conversation_id=session_id,
        user_id=current_user.id,
    )

    messages = (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation.id,
        )
        .order_by(
            Message.id.asc(),
        )
        .all()
    )

    message_ids = [
        message.id
        for message in messages
    ]

    sources_by_message: dict[int, list[dict]] = {}

    if message_ids:
        sources = (
            db.query(MessageSource)
            .filter(
                MessageSource.message_id.in_(message_ids),
            )
            .order_by(
                MessageSource.message_id.asc(),
                MessageSource.source_number.asc(),
            )
            .all()
        )

        for source in sources:
            sources_by_message.setdefault(
                source.message_id,
                [],
            ).append(
                {
                    "source_number": source.source_number,
                    "vector_id": source.vector_id,
                    "document_id": source.document_id,
                    "chunk_id": source.chunk_id,
                    "chunk_index": source.chunk_index,
                    "page_number": source.page_number,
                    "score": source.score,
                    "content": source.content or "",
                }
            )

    serialized_messages = []

    for message in messages:
        serialized_messages.append(
            {
                "id": message.id,
                "role": message.role,
                "content": message.content,
                "created_at": getattr(
                    message,
                    "created_at",
                    None,
                ),
                "sources": sources_by_message.get(
                    message.id,
                    [],
                ),
            }
        )

    return {
        **serialize_session(conversation),
        "messages": serialized_messages,
    }


# =========================================================
# ĐỔI TÊN CUỘC TRÒ CHUYỆN
# =========================================================


@router.patch(
    "/{session_id}",
    response_model=ChatSessionResponse,
)
def update_session_title(
    session_id: int,
    data: ChatSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Đổi tên một cuộc trò chuyện.
    """
    conversation = get_user_conversation(
        db=db,
        conversation_id=session_id,
        user_id=current_user.id,
    )

    conversation.title = clean_title(data.title)
    conversation.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(conversation)

    return serialize_session(conversation)


# =========================================================
# XÓA CUỘC TRÒ CHUYỆN
# =========================================================


@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Xóa cuộc trò chuyện, các tin nhắn và nguồn liên quan.
    """
    conversation = get_user_conversation(
        db=db,
        conversation_id=session_id,
        user_id=current_user.id,
    )

    try:
        message_ids = list(
            db.scalars(
                select(Message.id).where(
                    Message.conversation_id
                    == conversation.id
                )
            ).all()
        )

        # Xóa nguồn trước để tránh lỗi khóa ngoại.
        if message_ids:
            db.execute(
                delete(MessageSource).where(
                    MessageSource.message_id.in_(
                        message_ids
                    )
                )
            )

        # Xóa tin nhắn.
        db.execute(
            delete(Message).where(
                Message.conversation_id
                == conversation.id
            )
        )

        # Xóa cuộc trò chuyện.
        db.delete(conversation)

        db.commit()

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể xóa cuộc trò chuyện.",
        ) from error

    return None
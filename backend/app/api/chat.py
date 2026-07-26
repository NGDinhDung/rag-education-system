from datetime import datetime, timezone
from typing import Any

from app.config import settings

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.chunk import DocumentChunk
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.message import Message
from app.models.message_source import MessageSource
from app.models.user import User
from app.rag.pipeline import rag_pipeline
from app.schemas.chat import ChatRequest, ChatResponse
from time import perf_counter
from app.services.llm_service import llm_service

router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)


def create_conversation_title(question: str) -> str:
    """
    Tạo tiêu đề ngắn từ câu hỏi đầu tiên.
    """
    cleaned_question = " ".join(
        question.strip().split()
    )

    if len(cleaned_question) <= 60:
        return cleaned_question

    return f"{cleaned_question[:57]}..."


def get_user_conversation(
    db: Session,
    conversation_id: int,
    user_id: int,
) -> Conversation:
    """
    Lấy cuộc trò chuyện thuộc người dùng hiện tại.
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
            status_code=404,
            detail=(
                "Không tìm thấy cuộc trò chuyện hoặc "
                "bạn không có quyền truy cập."
            ),
        )

    return conversation


def get_user_document(
    db: Session,
    document_id: int,
    user_id: int,
) -> Document:
    """
    Lấy tài liệu thuộc người dùng hiện tại.
    """
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.user_id == user_id,
        )
        .first()
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Không tìm thấy tài liệu hoặc "
                "bạn không có quyền sử dụng tài liệu này."
            ),
        )

    return document


def get_document_display_name(
    document: Document,
) -> str:
    """
    Lấy tên tài liệu để hiển thị.
    """
    title = getattr(document, "title", None)
    filename = getattr(document, "filename", None)
    original_filename = getattr(
        document,
        "original_filename",
        None,
    )

    for value in (
        title,
        filename,
        original_filename,
    ):
        if value and str(value).strip():
            return str(value).strip()

    return f"Tài liệu {document.id}"


def filter_valid_sources(
    db: Session,
    retrieved_sources: list[dict[str, Any]],
    user_id: int,
) -> list[dict[str, Any]]:
    """
    Lọc nguồn hợp lệ và bổ sung tên tài liệu.

    Nguồn hợp lệ khi:
    - tài liệu còn tồn tại;
    - tài liệu thuộc người dùng;
    - chunk còn tồn tại;
    - chunk thuộc đúng tài liệu.
    """
    if not retrieved_sources:
        return []

    document_ids = {
        source.get("document_id")
        for source in retrieved_sources
        if source.get("document_id") is not None
    }

    chunk_ids = {
        source.get("chunk_id")
        for source in retrieved_sources
        if source.get("chunk_id") is not None
    }

    if not document_ids or not chunk_ids:
        return []

    documents = db.execute(
        select(Document).where(
            Document.id.in_(document_ids),
            Document.user_id == user_id,
        )
    ).scalars().all()

    document_map = {
        document.id: document
        for document in documents
    }

    valid_document_ids = set(
        document_map.keys()
    )

    if not valid_document_ids:
        return []

    valid_chunks = db.execute(
        select(
            DocumentChunk.id,
            DocumentChunk.document_id,
        ).where(
            DocumentChunk.id.in_(chunk_ids),
            DocumentChunk.document_id.in_(
                valid_document_ids
            ),
        )
    ).all()

    chunk_document_map = {
        chunk_id: document_id
        for chunk_id, document_id in valid_chunks
    }

    valid_sources: list[dict[str, Any]] = []

    for source in retrieved_sources:
        document_id = source.get("document_id")
        chunk_id = source.get("chunk_id")

        # Cho phép nguồn từ Web Search (không có document_id)
        if document_id is None and str(source.get("vector_id", "")).startswith("web-"):
            valid_source = source.copy()
            valid_source["document_title"] = source.get("document_filename") or "Kết quả Web"
            valid_source["document_filename"] = source.get("document_filename") or "Kết quả Web"
            valid_sources.append(valid_source)
            continue

        if document_id not in document_map:
            continue

        if chunk_id not in chunk_document_map:
            continue

        if (
            chunk_document_map[chunk_id]
            != document_id
        ):
            continue

        document = document_map[document_id]

        valid_source = source.copy()

        valid_source["document_title"] = (
            get_document_display_name(document)
        )

        valid_source["document_filename"] = (
            getattr(document, "filename", None)
            or getattr(
                document,
                "original_filename",
                None,
            )
        )

        valid_sources.append(valid_source)

    for source_number, source in enumerate(
        valid_sources,
        start=1,
    ):
        source["source_number"] = source_number

    return valid_sources


from fastapi.responses import StreamingResponse
import json

@router.post("")
def ask_question(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request_started_at = perf_counter()
    question = " ".join(request.question.strip().split())

    if not question:
        raise HTTPException(status_code=400, detail="Câu hỏi không được để trống.")

    if request.limit <= 0:
        raise HTTPException(status_code=400, detail="limit phải lớn hơn 0.")

    if request.document_id is not None:
        get_user_document(db=db, document_id=request.document_id, user_id=current_user.id)

    # 1. Conversation
    if request.conversation_id is None:
        conversation = Conversation(
            user_id=current_user.id,
            title=create_conversation_title(question),
        )
        db.add(conversation)
        db.flush()
    else:
        conversation = get_user_conversation(db=db, conversation_id=request.conversation_id, user_id=current_user.id)

    # 2. User Message
    user_message = Message(conversation_id=conversation.id, role="user", content=question)
    db.add(user_message)
    db.flush()

    # 2.5 History
    conversation_history = ""
    if request.conversation_id is not None:
        recent_messages = db.query(Message).filter(Message.conversation_id == conversation.id).order_by(Message.created_at.desc()).limit(settings.max_conversation_history).all()
        recent_messages.reverse()
        if recent_messages:
            history_parts = []
            for msg in recent_messages:
                role_label = "Người dùng" if msg.role == "user" else "Trợ lý"
                history_parts.append(f"{role_label}: {msg.content}")
            conversation_history = "\n".join(history_parts)

    # Prepare Assistant Message (empty content initially)
    assistant_message = Message(conversation_id=conversation.id, role="assistant", content="")
    db.add(assistant_message)
    db.flush()
    db.commit() # commit to get IDs safely for frontend
    
    def event_generator():
        full_answer = []
        final_sources = []
        
        try:
            for item in rag_pipeline.answer_stream(
                question=question,
                document_id=request.document_id,
                limit=request.limit,
                conversation_history=conversation_history
            ):
                if item["type"] == "metadata":
                    raw_sources = item.get("sources", [])
                    valid_sources = filter_valid_sources(db=db, retrieved_sources=raw_sources, user_id=current_user.id)
                    final_sources = valid_sources
                    
                    # Trả về metadata cho frontend
                    meta_payload = {
                        "type": "metadata",
                        "conversation_id": conversation.id,
                        "message_id": assistant_message.id,
                        "sources": valid_sources,
                        "model": llm_service.model
                    }
                    yield f"data: {json.dumps(meta_payload)}\n\n"
                    
                elif item["type"] == "chunk":
                    chunk_content = item.get("content", "")
                    full_answer.append(chunk_content)
                    
                    chunk_payload = {
                        "type": "chunk",
                        "content": chunk_content
                    }
                    yield f"data: {json.dumps(chunk_payload)}\n\n"
            
            # Kết thúc stream, lưu vào DB
            final_text = "".join(full_answer).strip()
            
            # Re-fetch objects to avoid detached instance errors
            db_msg = db.query(Message).filter(Message.id == assistant_message.id).first()
            if db_msg:
                db_msg.content = final_text
                
                for index, source in enumerate(final_sources, start=1):
                    msg_source = MessageSource(
                        message_id=db_msg.id,
                        source_number=source.get("source_number", index),
                        vector_id=source.get("vector_id"),
                        document_id=source.get("document_id"),
                        chunk_id=source.get("chunk_id"),
                        chunk_index=source.get("chunk_index"),
                        page_number=source.get("page_number"),
                        score=source.get("score"),
                        content=source.get("content", "")
                    )
                    db.add(msg_source)
                
            db_conv = db.query(Conversation).filter(Conversation.id == conversation.id).first()
            if db_conv:
                db_conv.updated_at = datetime.now(timezone.utc)
                
            db.commit()
            
        except Exception as e:
            print(f"Streaming error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': 'Lỗi server'})}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")
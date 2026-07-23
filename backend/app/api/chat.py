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


@router.post(
    "",
    response_model=ChatResponse,
)
def ask_question(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
) -> ChatResponse:
    """
    Nhận câu hỏi, gọi RAG, lưu lịch sử và trả về
    thông tin thống kê phục vụ giao diện Chat Pro.
    """

    request_started_at = perf_counter()

    question = " ".join(
        request.question.strip().split()
    )

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Câu hỏi không được để trống.",
        )

    if request.limit <= 0:
        raise HTTPException(
            status_code=400,
            detail="limit phải lớn hơn 0.",
        )

    if request.document_id is not None:
        get_user_document(
            db=db,
            document_id=request.document_id,
            user_id=current_user.id,
        )

    try:
        # =================================================
        # 1. Tạo hoặc lấy cuộc trò chuyện
        # =================================================

        if request.conversation_id is None:
            conversation = Conversation(
                user_id=current_user.id,
                title=create_conversation_title(
                    question
                ),
            )

            db.add(conversation)
            db.flush()

        else:
            conversation = get_user_conversation(
                db=db,
                conversation_id=(
                    request.conversation_id
                ),
                user_id=current_user.id,
            )

        # =================================================
        # 2. Lưu câu hỏi người dùng
        # =================================================

        user_message = Message(
            conversation_id=conversation.id,
            role="user",
            content=question,
        )

        db.add(user_message)
        db.flush()

        # =================================================
        # 2.5 Lấy lịch sử hội thoại gần đây
        # =================================================

        conversation_history = ""
        if request.conversation_id is not None:
            recent_messages = (
                db.query(Message)
                .filter(
                    Message.conversation_id
                    == conversation.id,
                )
                .order_by(
                    Message.created_at.desc()
                )
                .limit(
                    settings.max_conversation_history
                )
                .all()
            )

            recent_messages.reverse()

            if recent_messages:
                history_parts = []
                for msg in recent_messages:
                    role_label = (
                        "Người dùng"
                        if msg.role == "user"
                        else "Trợ lý"
                    )
                    history_parts.append(
                        f"{role_label}: {msg.content}"
                    )
                conversation_history = (
                    "\n".join(history_parts)
                )

        # =================================================
        # 3. Chạy RAG Pipeline
        # =================================================

        result = rag_pipeline.answer(
            question=question,
            document_id=request.document_id,
            limit=request.limit,
            conversation_history=conversation_history,
        )

        if not isinstance(result, dict):
            raise RuntimeError(
                "RAG Pipeline trả về dữ liệu "
                "không hợp lệ."
            )

        answer_text = str(
            result.get(
                "answer",
                "",
            )
        ).strip()

        retrieved_sources = result.get(
            "sources",
            [],
        )

        if not isinstance(
            retrieved_sources,
            list,
        ):
            retrieved_sources = []

        # =================================================
        # 4. Lọc nguồn hợp lệ theo người dùng
        # =================================================

        sources = filter_valid_sources(
            db=db,
            retrieved_sources=retrieved_sources,
            user_id=current_user.id,
        )

        if retrieved_sources and not sources:
            answer_text = (
                "Tài liệu hiện tại chưa cung cấp "
                "đủ thông tin để trả lời câu hỏi này."
            )

        if not answer_text:
            answer_text = (
                "Tài liệu hiện tại chưa cung cấp "
                "đủ thông tin để trả lời câu hỏi này."
            )

        # =================================================
        # 5. Lưu câu trả lời của AI
        # =================================================

        assistant_message = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=answer_text,
        )

        db.add(assistant_message)
        db.flush()

        # =================================================
        # 6. Lưu nguồn tham khảo
        # =================================================

        for index, source in enumerate(
            sources,
            start=1,
        ):
            message_source = MessageSource(
                message_id=assistant_message.id,
                source_number=source.get(
                    "source_number",
                    index,
                ),
                vector_id=source.get(
                    "vector_id"
                ),
                document_id=source.get(
                    "document_id"
                ),
                chunk_id=source.get(
                    "chunk_id"
                ),
                chunk_index=source.get(
                    "chunk_index"
                ),
                page_number=source.get(
                    "page_number"
                ),
                score=source.get("score"),
                content=source.get(
                    "content",
                    "",
                ),
            )

            db.add(message_source)

        # =================================================
        # 7. Cập nhật cuộc trò chuyện
        # =================================================

        conversation.updated_at = datetime.now(
            timezone.utc
        )

        db.commit()

        db.refresh(conversation)
        db.refresh(assistant_message)

        # =================================================
        # 8. Tính thống kê thật
        # =================================================

        response_time_seconds = round(
            perf_counter() - request_started_at,
            2,
        )

        chunk_count = len(sources)

        used_document_ids = {
            source.get("document_id")
            for source in sources
            if source.get("document_id")
            is not None
        }

        document_count = len(
            used_document_ids
        )

        # =================================================
        # 9. Trả dữ liệu cho frontend
        # =================================================

        return ChatResponse(
            conversation_id=conversation.id,
            message_id=assistant_message.id,
            answer=answer_text,
            sources=sources,
            response_time_seconds=(
                response_time_seconds
            ),
            chunk_count=chunk_count,
            document_count=document_count,
            model=llm_service.model,
            temperature=(
                llm_service.temperature
            ),
        )

    except HTTPException:
        db.rollback()
        raise

    except ValueError as error:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except RuntimeError as error:
        db.rollback()

        raise HTTPException(
            status_code=503,
            detail=str(error),
        ) from error

    except Exception as error:
        db.rollback()

        print(
            "Lỗi Chat API: "
            f"{type(error).__name__}: {error}"
        )

        raise HTTPException(
            status_code=500,
            detail="Không thể xử lý câu hỏi.",
        ) from error
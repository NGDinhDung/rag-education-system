from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.core.dependencies import get_admin_user
from app.database import get_db
from app.models.chunk import DocumentChunk
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.message import Message
from app.models.message_source import MessageSource
from app.models.user import User
from app.services.llm_service import llm_service


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    """
    Trả về số liệu Dashboard toàn hệ thống cho Admin.
    """

    # =====================================================
    # 1. Tổng số tài liệu
    # =====================================================

    total_documents = (
        db.query(func.count(Document.id))
        .scalar()
        or 0
    )

    # =====================================================
    # 2. Tổng số chunk
    # =====================================================

    total_chunks = (
        db.query(func.count(DocumentChunk.id))
        .scalar()
        or 0
    )

    # =====================================================
    # 3. Tổng số cuộc trò chuyện
    # =====================================================

    total_conversations = (
        db.query(func.count(Conversation.id))
        .scalar()
        or 0
    )

    # =====================================================
    # 4. Tổng số câu hỏi của người dùng
    # =====================================================

    total_questions = (
        db.query(func.count(Message.id))
        .filter(Message.role == "user")
        .scalar()
        or 0
    )

    # =====================================================
    # 5. Thống kê câu hỏi trong 7 ngày gần nhất
    # =====================================================

    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=6)

    start_datetime = datetime.combine(
        start_date,
        datetime.min.time(),
        tzinfo=timezone.utc,
    )

    daily_rows = (
        db.query(
            func.date(Message.created_at).label("day"),
            func.count(Message.id).label("total"),
        )
        .filter(
            Message.role == "user",
            Message.created_at >= start_datetime,
        )
        .group_by(func.date(Message.created_at))
        .order_by(func.date(Message.created_at))
        .all()
    )

    daily_map: dict[date, int] = {}

    for row in daily_rows:
        row_day = row.day

        if isinstance(row_day, datetime):
            row_day = row_day.date()

        elif isinstance(row_day, str):
            row_day = date.fromisoformat(row_day)

        daily_map[row_day] = int(row.total)

    questions_by_day = []

    for offset in range(7):
        day = start_date + timedelta(days=offset)

        questions_by_day.append(
            {
                "date": day.isoformat(),
                "label": day.strftime("%d/%m"),
                "count": daily_map.get(day, 0),
            }
        )

    # =====================================================
    # 6. Top tài liệu được AI sử dụng làm nguồn
    # =====================================================

    top_document_rows = (
        db.query(
            Document.id.label("document_id"),
            Document.title.label("title"),
            Document.original_file_name.label("original_file_name"),
            func.count(MessageSource.id).label("source_count"),
        )
        .join(
            MessageSource,
            MessageSource.document_id == Document.id,
        )
        .group_by(
            Document.id,
            Document.title,
            Document.original_file_name,
        )
        .order_by(desc("source_count"))
        .limit(5)
        .all()
    )

    top_documents = [
        {
            "document_id": row.document_id,
            "title": (
                row.title
                or row.original_file_name
                or f"Tài liệu {row.document_id}"
            ),
            "count": int(row.source_count),
        }
        for row in top_document_rows
    ]

    # =====================================================
    # 7. Trả kết quả
    # =====================================================

    return {
        "documents": int(total_documents),
        "chunks": int(total_chunks),
        "conversations": int(total_conversations),
        "questions": int(total_questions),
        "model": llm_service.model,
        "temperature": llm_service.temperature,
        "questions_by_day": questions_by_day,
        "top_documents": top_documents,
    }
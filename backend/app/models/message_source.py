from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


if TYPE_CHECKING:
    from app.models.message import Message


class MessageSource(Base):
    __tablename__ = "message_sources"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    message_id: Mapped[int] = mapped_column(
        ForeignKey(
            "messages.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    source_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    vector_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    document_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "documents.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    chunk_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "document_chunks.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    chunk_index: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    page_number: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    score: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    message: Mapped["Message"] = relationship(
        back_populates="message_sources",
    )
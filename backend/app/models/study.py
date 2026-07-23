from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship, backref

from app.database import Base

if TYPE_CHECKING:
    from app.models.document import Document

class FlashcardSet(Base):
    __tablename__ = "flashcard_sets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    document = relationship("Document", backref=backref("flashcard_sets", cascade="all, delete-orphan", passive_deletes=True))
    flashcards: Mapped[List["Flashcard"]] = relationship(
        back_populates="flashcard_set", cascade="all, delete-orphan", passive_deletes=True
    )


class Flashcard(Base):
    __tablename__ = "flashcards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    set_id: Mapped[int] = mapped_column(
        ForeignKey("flashcard_sets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    front: Mapped[str] = mapped_column(Text, nullable=False)
    back: Mapped[str] = mapped_column(Text, nullable=False)

    flashcard_set: Mapped["FlashcardSet"] = relationship(back_populates="flashcards")


class QuizSet(Base):
    __tablename__ = "quiz_sets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    document = relationship("Document", backref=backref("quiz_sets", cascade="all, delete-orphan", passive_deletes=True))
    questions: Mapped[List["QuizQuestion"]] = relationship(
        back_populates="quiz_set", cascade="all, delete-orphan", passive_deletes=True
    )


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    set_id: Mapped[int] = mapped_column(
        ForeignKey("quiz_sets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=True)

    quiz_set: Mapped["QuizSet"] = relationship(back_populates="questions")
    options: Mapped[List["QuizOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", passive_deletes=True
    )


class QuizOption(Base):
    __tablename__ = "quiz_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    question: Mapped["QuizQuestion"] = relationship(back_populates="options")

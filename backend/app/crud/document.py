from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import Document


def create_document(
    db: Session,
    *,
    title: str,
    original_file_name: str,
    stored_file_name: str,
    file_type: str,
    file_path: str,
    file_size: int,
    user_id: int,
) -> Document:
    document = Document(
        title=title,
        original_file_name=original_file_name,
        stored_file_name=stored_file_name,
        file_type=file_type,
        file_path=file_path,
        file_size=file_size,
        processing_status="uploaded",
        user_id=user_id,
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return document


def get_documents_by_user(
    db: Session,
    *,
    user_id: int,
) -> list[Document]:
    statement = (
        select(Document)
        .where(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
    )

    return list(db.scalars(statement).all())


def get_document_by_id(
    db: Session,
    *,
    document_id: int,
    user_id: int,
) -> Document | None:
    statement = select(Document).where(
        Document.id == document_id,
        Document.user_id == user_id,
    )

    return db.scalar(statement)


def delete_document(
    db: Session,
    *,
    document: Document,
) -> None:
    db.delete(document)
    db.commit()
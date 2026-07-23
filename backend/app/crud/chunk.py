from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.chunk import DocumentChunk


def create_document_chunks(
    db: Session,
    document_id: int,
    chunks: list[str],
    page_numbers: list[int | None] | None = None,
) -> list[DocumentChunk]:
    """
    Lưu toàn bộ chunks của một tài liệu vào PostgreSQL.
    """

    chunk_objects = [
        DocumentChunk(
            document_id=document_id,
            chunk_index=index,
            content=content,
            page_number=page_numbers[index] if page_numbers else None,
        )
        for index, content in enumerate(chunks)
    ]

    db.add_all(chunk_objects)
    db.commit()

    for chunk in chunk_objects:
        db.refresh(chunk)

    return chunk_objects


def get_chunks_by_document(
    db: Session,
    document_id: int,
) -> list[DocumentChunk]:
    """
    Lấy danh sách chunks theo document_id.
    """

    statement = (
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
    )

    return list(db.scalars(statement).all())


def update_chunk_vector_ids(
    db: Session,
    chunks: list[DocumentChunk],
    vector_ids: list[str],
) -> list[DocumentChunk]:
    """
    Lưu vector_id của ChromaDB vào các chunk trong PostgreSQL.
    """

    if len(chunks) != len(vector_ids):
        raise ValueError(
            "Số lượng chunks và vector_ids phải bằng nhau."
        )

    for chunk, vector_id in zip(chunks, vector_ids):
        chunk.vector_id = vector_id

    db.commit()

    for chunk in chunks:
        db.refresh(chunk)

    return chunks


def delete_chunks_by_document(
    db: Session,
    document_id: int,
) -> int:
    """
    Xóa toàn bộ chunks của một tài liệu.
    """

    statement = delete(DocumentChunk).where(
        DocumentChunk.document_id == document_id
    )

    result = db.execute(statement)
    db.commit()

    return result.rowcount or 0
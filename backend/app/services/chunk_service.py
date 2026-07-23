from sqlalchemy.orm import Session

from app.crud.chunk import (
    create_document_chunks,
    update_chunk_vector_ids,
)
from app.rag.chunker import split_document
from app.rag.loader import load_document
from app.rag.vectordb import vector_db


def process_document(
    db: Session,
    document_id: int,
    file_path: str,
) -> int:
    """
    Quy trình xử lý tài liệu:

    1. Đọc file
    2. Chia chunk
    3. Lưu PostgreSQL
    4. Sinh Embedding
    5. Lưu ChromaDB
    6. Update vector_id
    """

    # Đọc tài liệu
    text = load_document(file_path)

    # Chia chunk (trả về list[dict] với content và page_number)
    chunk_data = split_document(text)

    contents = [
        chunk["content"] for chunk in chunk_data
    ]
    page_numbers = [
        chunk["page_number"] for chunk in chunk_data
    ]

    # Lưu PostgreSQL
    chunks = create_document_chunks(
        db=db,
        document_id=document_id,
        chunks=contents,
        page_numbers=page_numbers,
    )

    # Chuẩn bị dữ liệu cho ChromaDB
    chunk_ids = [chunk.id for chunk in chunks]
    chunk_indexes = [chunk.chunk_index for chunk in chunks]
    db_page_numbers = [chunk.page_number for chunk in chunks]

    # Lưu ChromaDB
    vector_ids = vector_db.add_chunks(
        document_id=document_id,
        chunk_ids=chunk_ids,
        contents=contents,
        chunk_indexes=chunk_indexes,
        page_numbers=db_page_numbers,
    )

    # Update vector_id
    update_chunk_vector_ids(
        db=db,
        chunks=chunks,
        vector_ids=vector_ids,
    )

    return len(chunks)
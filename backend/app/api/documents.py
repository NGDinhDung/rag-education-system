from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.crud.document import (
    create_document,
    delete_document,
    get_document_by_id,
    get_documents_by_user,
)
from app.database import get_db
from app.models.user import User
from app.schemas.document import DocumentListResponse, DocumentResponse
from app.services.document_service import save_uploaded_file

router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=201,
)
def upload_document(
    title: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saved_file = save_uploaded_file(file)

    try:
        document = create_document(
            db,
            title=title,
            original_file_name=saved_file["original_file_name"],
            stored_file_name=saved_file["stored_file_name"],
            file_type=saved_file["file_type"],
            file_path=saved_file["file_path"],
            file_size=saved_file["file_size"],
            user_id=current_user.id,
        )

        return document

    except Exception:
        Path(saved_file["file_path"]).unlink(missing_ok=True)
        raise


@router.get(
    "",
    response_model=DocumentListResponse,
)
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    documents = get_documents_by_user(
        db,
        user_id=current_user.id,
    )

    return {
        "documents": documents,
    }


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = get_document_by_id(
        db,
        document_id=document_id,
        user_id=current_user.id,
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy tài liệu.",
        )

    return document


@router.delete(
    "/{document_id}",
)
def remove_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = get_document_by_id(
        db,
        document_id=document_id,
        user_id=current_user.id,
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy tài liệu.",
        )

    file_path = Path(document.file_path)

    delete_document(
        db,
        document=document,
    )

    file_path.unlink(missing_ok=True)

    return {
        "message": "Xóa tài liệu thành công.",
    }
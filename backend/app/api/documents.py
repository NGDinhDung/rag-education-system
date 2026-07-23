from pathlib import Path

from app.rag.vectordb import vector_db

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.crud.document import (
    create_document,
    delete_document,
    get_document_by_id,
    get_documents_by_user,
)
from app.database import get_db
from app.models.document import Document
from app.models.user import User
from app.schemas.document import (
    DocumentListResponse,
    DocumentResponse,
)
from app.services.chunk_service import process_document
from app.services.document_service import save_uploaded_file


router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


# =========================================================
# HÀM HỖ TRỢ: XÁC ĐỊNH ĐƯỜNG DẪN FILE
# =========================================================

def resolve_document_file_path(
    stored_path: str,
) -> Path:
    """
    Chuyển đường dẫn lưu trong database thành đường dẫn tuyệt đối.

    Hỗ trợ:
    - Đường dẫn tuyệt đối
    - Đường dẫn tương đối tính từ thư mục backend
    - Đường dẫn tương đối tính từ thư mục đang chạy ứng dụng
    """

    raw_path = Path(stored_path)

    # Trường hợp database đã lưu đường dẫn tuyệt đối
    if raw_path.is_absolute():
        return raw_path.resolve()

    # documents.py nằm tại backend/app/api/documents.py
    # parents[2] chính là thư mục backend
    backend_root = Path(__file__).resolve().parents[2]

    candidate_paths = [
        backend_root / raw_path,
        Path.cwd() / raw_path,
    ]

    for candidate in candidate_paths:
        resolved_candidate = candidate.resolve()

        if resolved_candidate.exists():
            return resolved_candidate

    # Nếu chưa tìm thấy, trả về đường dẫn dự kiến từ backend
    # để endpoint phía sau thông báo lỗi rõ ràng.
    return (backend_root / raw_path).resolve()


# =========================================================
# TẢI TÀI LIỆU LÊN
# =========================================================

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
    document = None

    try:
        # Bước 1: Lưu thông tin tài liệu vào database
        document = create_document(
            db,
            title=title,
            original_file_name=(
                saved_file["original_file_name"]
            ),
            stored_file_name=(
                saved_file["stored_file_name"]
            ),
            file_type=saved_file["file_type"],
            file_path=saved_file["file_path"],
            file_size=saved_file["file_size"],
            user_id=current_user.id,
        )

        # Bước 2: Đọc nội dung, chia chunk và lưu database
        chunk_count = process_document(
            db=db,
            document_id=document.id,
            file_path=document.file_path,
        )

        print(
            f"Đã xử lý tài liệu ID={document.id}, "
            f"số chunk={chunk_count}"
        )

        return document

    except Exception as error:
        # Xóa bản ghi tài liệu nếu đã được tạo
        if document is not None:
            try:
                delete_document(
                    db,
                    document=document,
                )
            except Exception as delete_error:
                db.rollback()

                print(
                    "Không thể xóa bản ghi tài liệu "
                    f"sau khi xử lý thất bại: {delete_error}"
                )

        # Xóa file vật lý nếu quá trình xử lý thất bại
        saved_path = saved_file.get("file_path")

        if saved_path:
            try:
                Path(saved_path).unlink(
                    missing_ok=True
                )
            except OSError as file_error:
                print(
                    "Không thể xóa file sau khi xử lý "
                    f"thất bại: {file_error}"
                )

        print(
            f"Lỗi xử lý tài liệu: "
            f"{type(error).__name__}: {error}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Không thể xử lý tài liệu: "
                f"{str(error)}"
            ),
        ) from error


# =========================================================
# DANH SÁCH TÀI LIỆU
# =========================================================

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


# =========================================================
# MỞ FILE TÀI LIỆU
# Phải đặt trước /{document_id} để route rõ ràng hơn
# =========================================================

@router.get(
    "/{document_id}/file",
    response_class=FileResponse,
)
def get_document_file(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trả file tài liệu thuộc quyền sở hữu của người dùng.

    PDF:
        Mở trực tiếp trong PDF Viewer.

    DOCX, DOC, TXT và định dạng khác:
        Trình duyệt tải file xuống.
    """

    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
        .first()
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy tài liệu.",
        )

    stored_path = document.file_path

    if not stored_path:
        raise HTTPException(
            status_code=404,
            detail=(
                "Tài liệu không có đường dẫn file "
                "trong cơ sở dữ liệu."
            ),
        )

    file_path = resolve_document_file_path(
        stored_path
    )

    if not file_path.exists():
        print(
            "Không tìm thấy file tài liệu: "
            f"{file_path}"
        )

        raise HTTPException(
            status_code=404,
            detail=(
                "File tài liệu không tồn tại trên máy chủ. "
                f"Đường dẫn: {file_path}"
            ),
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=400,
            detail=(
                "Đường dẫn tài liệu không phải là một file."
            ),
        )

    filename = (
        getattr(
            document,
            "original_file_name",
            None,
        )
        or getattr(
            document,
            "stored_file_name",
            None,
        )
        or document.title
        or file_path.name
    )

    suffix = file_path.suffix.lower()

    media_type_map = {
        ".pdf": "application/pdf",
        ".txt": "text/plain; charset=utf-8",
        ".doc": "application/msword",
        ".docx": (
            "application/vnd.openxmlformats-officedocument."
            "wordprocessingml.document"
        ),
        ".ppt": "application/vnd.ms-powerpoint",
        ".pptx": (
            "application/vnd.openxmlformats-officedocument."
            "presentationml.presentation"
        ),
        ".xls": "application/vnd.ms-excel",
        ".xlsx": (
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
    }

    media_type = media_type_map.get(
        suffix,
        "application/octet-stream",
    )

    # PDF được hiển thị trực tiếp.
    # Những file khác được tải xuống.
    content_disposition_type = (
        "inline"
        if suffix == ".pdf"
        else "attachment"
    )

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=str(filename),
        content_disposition_type=(
            content_disposition_type
        ),
    )


# =========================================================
# CHI TIẾT TÀI LIỆU
# =========================================================

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


# =========================================================
# XÓA TÀI LIỆU
# =========================================================

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

    stored_path = document.file_path

    file_path = (
        resolve_document_file_path(stored_path)
        if stored_path
        else None
    )

    # Xoá vectors trong ChromaDB trước khi xoá bản ghi
    try:
        vector_db.delete_document_vectors(document_id)
    except Exception as vector_error:
        print(
            f"Cảnh báo: Không thể xoá vectors trong ChromaDB: {vector_error}"
        )

    delete_document(
        db,
        document=document,
    )

    if file_path is not None:
        try:
            file_path.unlink(
                missing_ok=True
            )
        except OSError as error:
            print(
                "Đã xóa bản ghi nhưng không thể xóa "
                f"file vật lý: {error}"
            )

    return {
        "message": "Xóa tài liệu thành công.",
    }
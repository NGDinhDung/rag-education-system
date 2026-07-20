import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from app.config import settings

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".txt",
}

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB


def save_uploaded_file(file: UploadFile):
    extension = Path(file.filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Chỉ hỗ trợ PDF, DOCX và TXT.",
        )

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    stored_name = f"{uuid4()}{extension}"

    file_path = upload_dir / stored_name

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = file_path.stat().st_size

    if file_size > MAX_FILE_SIZE:
        file_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=400,
            detail="File vượt quá 20MB.",
        )

    return {
        "original_file_name": file.filename,
        "stored_file_name": stored_name,
        "file_path": str(file_path),
        "file_size": file_size,
        "file_type": extension.replace(".", ""),
    }
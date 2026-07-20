from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    id: int
    title: str
    original_file_name: str
    stored_file_name: str
    file_type: str
    file_path: str
    file_size: int
    processing_status: str
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
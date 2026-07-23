from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ChatSourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_number: int
    vector_id: str | None = None
    document_id: int | None = None
    chunk_id: int | None = None
    chunk_index: int | None = None
    page_number: int | None = None
    score: float | None = None
    content: str


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    content: str
    document_id: int | None = None
    created_at: datetime

    sources: list[ChatSourceResponse] = Field(
        default_factory=list,
    )


class ChatSessionCreate(BaseModel):
    title: str | None = None


class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: datetime
    updated_at: datetime
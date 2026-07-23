from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Câu hỏi của người dùng",
    )

    document_id: int | None = Field(
        default=None,
        description="ID tài liệu cần hỏi",
    )

    conversation_id: int | None = Field(
        default=None,
        description="ID cuộc trò chuyện đang tiếp tục",
    )

    limit: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Số lượng chunk được truy xuất",
    )


class ChatSource(BaseModel):
    source_number: int = Field(
        description="Số thứ tự nguồn tham khảo",
    )

    vector_id: str | None = Field(
        default=None,
        description="ID vector trong ChromaDB",
    )

    document_id: int | None = Field(
        default=None,
        description="ID tài liệu",
    )

    document_title: str | None = Field(
        default=None,
        description="Tên hiển thị của tài liệu",
    )

    document_filename: str | None = Field(
        default=None,
        description="Tên file tài liệu",
    )

    chunk_id: int | None = Field(
        default=None,
        description="ID đoạn văn bản",
    )

    chunk_index: int | None = Field(
        default=None,
        description="Vị trí chunk trong tài liệu",
    )

    page_number: int | None = Field(
        default=None,
        description="Số trang trong tài liệu",
    )

    score: float | None = Field(
        default=None,
        description="Điểm tương đồng của nguồn",
    )

    content: str = Field(
        default="",
        description="Nội dung nguồn tham khảo",
    )


class ChatResponse(BaseModel):
    conversation_id: int = Field(
        description="ID cuộc trò chuyện",
    )

    message_id: int = Field(
        description="ID tin nhắn trả lời của AI",
    )

    answer: str = Field(
        description="Câu trả lời do AI tạo",
    )

    sources: list[ChatSource] = Field(
        default_factory=list,
        description="Danh sách nguồn tham khảo",
    )

    response_time_seconds: float = Field(
        default=0.0,
        description="Tổng thời gian xử lý câu hỏi, tính bằng giây",
    )

    chunk_count: int = Field(
        default=0,
        description="Số chunk hợp lệ được sử dụng",
    )

    document_count: int = Field(
        default=0,
        description="Số tài liệu khác nhau được sử dụng",
    )

    model: str = Field(
        default="",
        description="Tên mô hình LLM đang sử dụng",
    )

    temperature: float = Field(
        default=0.0,
        description="Temperature của mô hình",
    )
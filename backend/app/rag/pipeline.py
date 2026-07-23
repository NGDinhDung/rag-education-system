import re
from typing import Any

from app.rag.retriever import retriever
from app.services.llm_service import llm_service


INSUFFICIENT_INFORMATION_MESSAGE = (
    "Tài liệu hiện tại chưa cung cấp đủ "
    "thông tin để trả lời câu hỏi này."
)


class RAGPipeline:
    def retrieve_context(
        self,
        question: str,
        document_id: int | None = None,
        limit: int = 5,
        min_score: float = 0.40,
    ) -> dict[str, Any]:
        """
        Tìm các đoạn tài liệu liên quan và tạo context cho LLM.

        Các chunk có score thấp hơn min_score sẽ bị loại
        trong retriever.

        Mỗi chunk được đánh số theo dạng:
        [Nguồn 1], [Nguồn 2], ...
        """
        question = " ".join(
            question.strip().split()
        )

        if not question:
            raise ValueError(
                "Câu hỏi không được để trống."
            )

        if limit <= 0:
            raise ValueError(
                "limit phải lớn hơn 0."
            )

        if not 0.0 <= min_score <= 1.0:
            raise ValueError(
                "min_score phải nằm trong khoảng "
                "từ 0 đến 1."
            )

        chunks = retriever.retrieve(
            query=question,
            document_id=document_id,
            limit=limit,
            min_score=min_score,
        )

        if not isinstance(chunks, list):
            chunks = []

        context_parts: list[str] = []
        sources: list[dict[str, Any]] = []

        for chunk in chunks:
            content = str(
                chunk.get("content", "")
            ).strip()

            if not content:
                continue

            document_value = chunk.get(
                "document_id"
            )

            chunk_id = chunk.get(
                "chunk_id"
            )

            chunk_index = chunk.get(
                "chunk_index"
            )

            page_number = chunk.get(
                "page_number"
            )

            vector_id = chunk.get(
                "vector_id"
            )

            raw_score = chunk.get(
                "score",
                0.0,
            )

            try:
                score = float(raw_score)
            except (
                TypeError,
                ValueError,
            ):
                score = 0.0

            # Đánh số sau khi đã loại chunk rỗng.
            source_number = (
                len(sources) + 1
            )

            metadata_parts = [
                f"Nguồn {source_number}",
                f"document_id={document_value}",
                f"chunk_index={chunk_index}",
                f"score={score:.4f}",
            ]

            if page_number is not None:
                metadata_parts.append(
                    f"page={page_number}"
                )

            source_title = (
                "["
                + " | ".join(metadata_parts)
                + "]"
            )

            context_parts.append(
                f"{source_title}\n{content}"
            )

            sources.append(
                {
                    "source_number": (
                        source_number
                    ),
                    "vector_id": vector_id,
                    "document_id": (
                        document_value
                    ),
                    "chunk_id": chunk_id,
                    "chunk_index": (
                        chunk_index
                    ),
                    "page_number": (
                        page_number
                    ),
                    "score": score,
                    "content": content,
                }
            )

        context = "\n\n".join(
            context_parts
        )

        return {
            "question": question,
            "context": context,
            "sources": sources,
        }

    def build_prompt(
        self,
        question: str,
        context: str,
        conversation_history: str = "",
    ) -> str:
        """
        Tạo prompt hoàn chỉnh để gửi cho LLM.

        Prompt yêu cầu AI:
        - chỉ dùng dữ liệu truy xuất;
        - chèn trích dẫn [Nguồn n];
        - đặt trích dẫn ngay sau nội dung được hỗ trợ;
        - không tạo nguồn không tồn tại.
        """
        question = question.strip()
        context = context.strip()

        return f"""
Bạn là trợ lý học tập thông minh sử dụng hệ thống
Retrieval-Augmented Generation (RAG).

Nhiệm vụ của bạn là trả lời câu hỏi CHỈ dựa trên
NỘI DUNG TÀI LIỆU được cung cấp bên dưới.

QUY TẮC BẮT BUỘC:

1. Trả lời bằng tiếng Việt.

2. Trình bày rõ ràng, tự nhiên, dễ hiểu và đúng
   trọng tâm câu hỏi.

3. Chỉ sử dụng thông tin có trong phần
   NỘI DUNG TÀI LIỆU.

4. Không sử dụng kiến thức bên ngoài tài liệu.

5. Không tự suy đoán, không bịa thêm và không đưa
   ra thông tin không được các nguồn hỗ trợ.

6. Mỗi nhận định quan trọng phải có trích dẫn ngay
   sau nhận định đó.

7. Trích dẫn phải có đúng định dạng:
   [Nguồn 1]
   [Nguồn 2]
   [Nguồn 3]

8. Khi một nhận định được hỗ trợ bởi nhiều nguồn,
   có thể ghi:
   [Nguồn 1][Nguồn 2]

9. Chỉ sử dụng số nguồn thực sự xuất hiện trong
   phần NỘI DUNG TÀI LIỆU.

10. Không tự tạo thêm số nguồn không tồn tại.

11. Chỉ trích dẫn những nguồn thực sự hỗ trợ cho
    nội dung câu trả lời.

12. Không bắt buộc sử dụng tất cả các nguồn.

13. Nếu nhiều nguồn có nội dung giống nhau, hãy
    tổng hợp nội dung và tránh lặp lại máy móc.

14. Không tạo mục "Nguồn tham khảo" ở cuối câu trả
    lời vì giao diện sẽ tự hiển thị danh sách nguồn.

15. Không ghi document_id, chunk_index, score hoặc
    page trong phần trả lời, trừ khi câu hỏi yêu cầu.

16. Có thể sử dụng Markdown để trình bày:
    - tiêu đề;
    - danh sách;
    - chữ đậm;
    - đoạn văn.

17. Nếu tài liệu không chứa câu trả lời hoặc thông
    tin không đủ, chỉ trả lời chính xác câu sau:

"{INSUFFICIENT_INFORMATION_MESSAGE}"

18. Nếu có LỊCH SỬ HỘI THOẠI, hãy sử dụng ngữ cảnh
    đó để hiểu câu hỏi follow-up. Ví dụ nếu người
    dùng hỏi "giải thích rõ hơn", hãy dựa vào câu
    trả lời trước đó trong lịch sử.

VÍ DỤ CÁCH TRÍCH DẪN ĐÚNG:

Trí tuệ kinh doanh giúp tổ chức thu thập và phân
tích dữ liệu để hỗ trợ việc ra quyết định
[Nguồn 1].

BI cũng có thể được sử dụng để dự đoán xu hướng
và hành vi của khách hàng [Nguồn 2][Nguồn 3].

{f"LỊCH SỬ HỘI THOẠI GẦN ĐÂY:" + chr(10) + chr(10) + conversation_history + chr(10) if conversation_history else ""}
NỘI DUNG TÀI LIỆU:

{context}

CÂU HỎI:

{question}

TRẢ LỜI:
""".strip()

    def prepare(
        self,
        question: str,
        document_id: int | None = None,
        limit: int = 5,
        min_score: float = 0.40,
        conversation_history: str = "",
    ) -> dict[str, Any]:
        """
        Thực hiện retrieval và tạo prompt cho LLM.
        """
        retrieval_result = (
            self.retrieve_context(
                question=question,
                document_id=document_id,
                limit=limit,
                min_score=min_score,
            )
        )

        context = str(
            retrieval_result.get(
                "context",
                "",
            )
        ).strip()

        sources = retrieval_result.get(
            "sources",
            [],
        )

        if not isinstance(sources, list):
            sources = []

        prompt = ""

        if context and sources:
            prompt = self.build_prompt(
                question=retrieval_result[
                    "question"
                ],
                context=context,
                conversation_history=conversation_history,
            )

        return {
            "question": retrieval_result[
                "question"
            ],
            "document_id": document_id,
            "context": context,
            "prompt": prompt,
            "sources": sources,
        }

    def extract_citation_numbers(
        self,
        answer_text: str,
    ) -> set[int]:
        """
        Lấy các số nguồn xuất hiện trong câu trả lời.

        Ví dụ:
        [Nguồn 1], [Nguồn 3]
        -> {1, 3}
        """
        citation_matches = re.findall(
            r"\[Nguồn\s+(\d+)\]",
            answer_text,
            flags=re.IGNORECASE,
        )

        return {
            int(number)
            for number in citation_matches
        }

    def normalize_citations(
        self,
        answer_text: str,
    ) -> str:
        """
        Chuẩn hóa định dạng trích dẫn.

        Ví dụ:
        [nguồn 1] -> [Nguồn 1]
        [Nguồn   2] -> [Nguồn 2]
        """
        return re.sub(
            r"\[Nguồn\s+(\d+)\]",
            lambda match: (
                f"[Nguồn {match.group(1)}]"
            ),
            answer_text,
            flags=re.IGNORECASE,
        )

    def remove_invalid_citations(
        self,
        answer_text: str,
        valid_source_numbers: set[int],
    ) -> str:
        """
        Xóa các trích dẫn không tồn tại.

        Ví dụ nguồn chỉ có 1 đến 5 nhưng LLM tạo
        [Nguồn 8], thì [Nguồn 8] sẽ bị loại.
        """

        def replace_citation(
            match: re.Match[str],
        ) -> str:
            source_number = int(
                match.group(1)
            )

            if (
                source_number
                in valid_source_numbers
            ):
                return (
                    f"[Nguồn {source_number}]"
                )

            return ""

        cleaned_answer = re.sub(
            r"\[Nguồn\s+(\d+)\]",
            replace_citation,
            answer_text,
            flags=re.IGNORECASE,
        )

        # Xóa khoảng trắng dư trước dấu câu.
        cleaned_answer = re.sub(
            r"\s+([.,;:!?])",
            r"\1",
            cleaned_answer,
        )

        # Thu gọn nhiều khoảng trắng.
        cleaned_answer = re.sub(
            r"[ \t]{2,}",
            " ",
            cleaned_answer,
        )

        return cleaned_answer.strip()

    def validate_answer_citations(
        self,
        answer_text: str,
        sources: list[dict[str, Any]],
    ) -> str:
        """
        Chuẩn hóa và kiểm tra trích dẫn AI sinh ra.

        Hàm này không tự gắn nguồn ngẫu nhiên.
        Nó chỉ:
        - chuẩn hóa [Nguồn n];
        - xóa nguồn không tồn tại;
        - giữ nguyên câu trả lời nếu nguồn hợp lệ.
        """
        answer_text = str(
            answer_text
        ).strip()

        if not answer_text:
            return (
                INSUFFICIENT_INFORMATION_MESSAGE
            )

        if (
            answer_text
            == INSUFFICIENT_INFORMATION_MESSAGE
        ):
            return answer_text

        valid_source_numbers = {
            int(
                source.get(
                    "source_number",
                    index,
                )
            )
            for index, source in enumerate(
                sources,
                start=1,
            )
        }

        answer_text = (
            self.normalize_citations(
                answer_text
            )
        )

        answer_text = (
            self.remove_invalid_citations(
                answer_text=answer_text,
                valid_source_numbers=(
                    valid_source_numbers
                ),
            )
        )

        if not answer_text:
            return (
                INSUFFICIENT_INFORMATION_MESSAGE
            )

        return answer_text

    def answer(
        self,
        question: str,
        document_id: int | None = None,
        limit: int = 5,
        min_score: float = 0.40,
        conversation_history: str = "",
    ) -> dict[str, Any]:
        """
        Thực hiện toàn bộ quy trình RAG:

        1. Nhận câu hỏi.
        2. Tìm các chunk liên quan trong ChromaDB.
        3. Loại các chunk có score thấp.
        4. Đánh số nguồn.
        5. Ghép các chunk thành context.
        6. Tạo prompt yêu cầu trích dẫn.
        7. Gửi prompt đến LLM.
        8. Kiểm tra trích dẫn.
        9. Trả câu trả lời và nguồn.
        """
        result = self.prepare(
            question=question,
            document_id=document_id,
            limit=limit,
            min_score=min_score,
            conversation_history=conversation_history,
        )

        sources = result.get(
            "sources",
            [],
        )

        context = str(
            result.get(
                "context",
                "",
            )
        ).strip()

        prompt = str(
            result.get(
                "prompt",
                "",
            )
        ).strip()

        if (
            not sources
            or not context
            or not prompt
        ):
            return {
                "question": result[
                    "question"
                ],
                "document_id": document_id,
                "answer": (
                    INSUFFICIENT_INFORMATION_MESSAGE
                ),
                "sources": [],
            }

        answer_text = (
            llm_service.generate_answer(
                prompt=prompt,
            )
        )

        answer_text = (
            self.validate_answer_citations(
                answer_text=answer_text,
                sources=sources,
            )
        )

        return {
            "question": result["question"],
            "document_id": document_id,
            "answer": answer_text,
            "sources": sources,
        }


rag_pipeline = RAGPipeline()
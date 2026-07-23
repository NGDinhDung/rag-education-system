from typing import Any

from app.rag.vectordb import vector_db


class DocumentRetriever:
    def retrieve(
        self,
        query: str,
        document_id: int | None = None,
        limit: int = 5,
        min_score: float = 0.40,
        candidate_multiplier: int = 3,
    ) -> list[dict[str, Any]]:
        """
        Tìm các chunk liên quan nhất với câu hỏi.

        Quy trình:
        1. Lấy nhiều chunk ứng viên từ ChromaDB.
        2. Chuyển cosine distance thành relevance score.
        3. Loại chunk có score thấp hơn min_score.
        4. Sắp xếp theo score giảm dần.
        5. Trả về tối đa số lượng chunk theo limit.
        """
        query = " ".join(query.strip().split())

        if not query:
            raise ValueError("Câu hỏi không được để trống.")

        if limit <= 0:
            raise ValueError("limit phải lớn hơn 0.")

        if candidate_multiplier <= 0:
            raise ValueError(
                "candidate_multiplier phải lớn hơn 0."
            )

        if not 0.0 <= min_score <= 1.0:
            raise ValueError(
                "min_score phải nằm trong khoảng từ 0 đến 1."
            )

        candidate_limit = max(
            limit,
            limit * candidate_multiplier,
        )

        results = vector_db.search(
            query=query,
            document_id=document_id,
            limit=candidate_limit,
        )

        ids = results.get("ids") or [[]]
        documents = results.get("documents") or [[]]
        metadatas = results.get("metadatas") or [[]]
        distances = results.get("distances") or [[]]

        ids_list = ids[0] if ids else []
        documents_list = documents[0] if documents else []
        metadatas_list = metadatas[0] if metadatas else []
        distances_list = distances[0] if distances else []

        retrieved_chunks: list[dict[str, Any]] = []

        print("\n========== KẾT QUẢ RETRIEVER ==========")
        print(f"Câu hỏi: {query}")
        print(f"document_id: {document_id}")
        print(f"min_score: {min_score}")
        print(f"Số ứng viên Chroma trả về: {len(ids_list)}")

        for vector_id, content, metadata, distance in zip(
            ids_list,
            documents_list,
            metadatas_list,
            distances_list,
        ):
            metadata = metadata or {}
            content = str(content or "").strip()

            if not content:
                continue

            distance_value = float(distance)

            # Collection ChromaDB đang dùng cosine distance.
            # Cosine distance càng nhỏ thì nội dung càng liên quan.
            score = 1.0 - distance_value
            score = max(0.0, min(1.0, score))

            print(
                f"score={score:.4f} | "
                f"distance={distance_value:.4f} | "
                f"document_id={metadata.get('document_id')} | "
                f"chunk_id={metadata.get('chunk_id')} | "
                f"chunk_index={metadata.get('chunk_index')}"
            )

            if score < min_score:
                continue

            retrieved_chunks.append(
                {
                    "vector_id": str(vector_id),
                    "content": content,
                    "document_id": metadata.get("document_id"),
                    "chunk_id": metadata.get("chunk_id"),
                    "chunk_index": metadata.get("chunk_index"),
                    "page_number": metadata.get("page_number"),
                    "distance": distance_value,
                    "score": score,
                }
            )

        retrieved_chunks.sort(
            key=lambda chunk: chunk["score"],
            reverse=True,
        )

        selected_chunks = retrieved_chunks[:limit]

        print(
            f"Số chunk đạt ngưỡng: {len(retrieved_chunks)}"
        )
        print(
            f"Số chunk được chọn: {len(selected_chunks)}"
        )
        print("========================================\n")

        return selected_chunks

    def build_context(
        self,
        query: str,
        document_id: int | None = None,
        limit: int = 5,
        min_score: float = 0.40,
    ) -> str:
        """
        Tìm kiếm và ghép các chunk thành context cho LLM.
        """
        chunks = self.retrieve(
            query=query,
            document_id=document_id,
            limit=limit,
            min_score=min_score,
        )

        if not chunks:
            return ""

        context_parts: list[str] = []

        for index, chunk in enumerate(
            chunks,
            start=1,
        ):
            source_info = (
                f"[Nguồn {index} | "
                f"document_id={chunk['document_id']} | "
                f"chunk_index={chunk['chunk_index']} | "
                f"score={chunk['score']:.4f}"
            )

            if chunk["page_number"] is not None:
                source_info += (
                    f" | page={chunk['page_number']}"
                )

            source_info += "]"

            context_parts.append(
                f"{source_info}\n{chunk['content']}"
            )

        return "\n\n".join(context_parts)


retriever = DocumentRetriever()
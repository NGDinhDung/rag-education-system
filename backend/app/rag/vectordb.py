import uuid
from pathlib import Path
from typing import Any

import chromadb
from chromadb.api.models.Collection import Collection

from app.config import settings
from app.rag.embedding import embedding_model


CHROMA_PATH = Path(settings.chroma_data_dir)
COLLECTION_NAME = "document_chunks"


class VectorDatabase:
    def __init__(self) -> None:
        """
        Khởi tạo ChromaDB dạng persistent.

        Dữ liệu vector được lưu tại:
        backend/chroma_data/
        """
        CHROMA_PATH.mkdir(
            parents=True,
            exist_ok=True,
        )

        self.client = chromadb.PersistentClient(
            path=str(CHROMA_PATH),
        )

        self.collection: Collection = self._get_or_create_collection()

    def _get_or_create_collection(self) -> Collection:
        """
        Lấy collection đã tồn tại hoặc tạo collection mới.

        Collection sử dụng cosine distance:
        - distance càng nhỏ thì nội dung càng giống nhau;
        - relevance score có thể tính bằng 1 - distance.
        """
        return self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={
                "description": "Vector embeddings của document chunks",
                "hnsw:space": "cosine",
            },
        )

    @staticmethod
    def _empty_query_result() -> dict[str, Any]:
        """
        Trả về cấu trúc kết quả rỗng tương thích với ChromaDB query.
        """
        return {
            "ids": [[]],
            "documents": [[]],
            "metadatas": [[]],
            "distances": [[]],
        }

    def add_chunks(
        self,
        document_id: int,
        chunk_ids: list[int],
        contents: list[str],
        chunk_indexes: list[int],
        page_numbers: list[int | None] | None = None,
    ) -> list[str]:
        """
        Tạo embedding và lưu các chunk vào ChromaDB.

        Trả về danh sách vector_id để lưu vào cột vector_id
        trong bảng document_chunks.
        """
        if document_id <= 0:
            raise ValueError("document_id phải lớn hơn 0.")

        if not contents:
            return []

        if not (
            len(chunk_ids)
            == len(contents)
            == len(chunk_indexes)
        ):
            raise ValueError(
                "chunk_ids, contents và chunk_indexes "
                "phải có cùng số phần tử."
            )

        if page_numbers is None:
            page_numbers = [None] * len(contents)

        if len(page_numbers) != len(contents):
            raise ValueError(
                "page_numbers phải có cùng số phần tử với contents."
            )

        cleaned_contents: list[str] = []

        for index, content in enumerate(contents):
            cleaned_content = content.strip()

            if not cleaned_content:
                raise ValueError(
                    f"Nội dung chunk tại vị trí {index} không được để trống."
                )

            cleaned_contents.append(cleaned_content)

        vector_ids = [
            str(uuid.uuid4())
            for _ in chunk_ids
        ]

        embeddings = embedding_model.embed_texts(cleaned_contents)

        if len(embeddings) != len(cleaned_contents):
            raise ValueError(
                "Số lượng embedding không khớp với số lượng chunk."
            )

        metadatas: list[dict[str, Any]] = []

        for chunk_id, chunk_index, page_number in zip(
            chunk_ids,
            chunk_indexes,
            page_numbers,
        ):
            metadata: dict[str, Any] = {
                "document_id": document_id,
                "chunk_id": chunk_id,
                "chunk_index": chunk_index,
            }

            # ChromaDB không nên nhận metadata có giá trị None.
            if page_number is not None:
                metadata["page_number"] = page_number

            metadatas.append(metadata)

        self.collection.upsert(
            ids=vector_ids,
            documents=cleaned_contents,
            embeddings=embeddings,
            metadatas=metadatas,
        )

        return vector_ids

    def search(
        self,
        query: str,
        document_id: int | None = None,
        limit: int = 5,
    ) -> dict[str, Any]:
        """
        Tìm các chunk liên quan nhất với câu hỏi.

        Có thể giới hạn kết quả theo document_id.
        """
        query = query.strip()

        if not query:
            raise ValueError("Câu hỏi không được để trống.")

        if limit <= 0:
            raise ValueError("limit phải lớn hơn 0.")

        if document_id is not None and document_id <= 0:
            raise ValueError("document_id phải lớn hơn 0.")

        where: dict[str, Any] | None = None

        if document_id is not None:
            where = {
                "document_id": document_id,
            }

        if where is not None:
            filtered_data = self.collection.get(
                where=where,
                include=[],
            )

            available_vectors = len(
                filtered_data.get("ids", [])
            )
        else:
            available_vectors = self.count()

        if available_vectors == 0:
            return self._empty_query_result()

        query_embedding = embedding_model.embed_text(query)

        return self.collection.query(
            query_embeddings=[query_embedding],
            n_results=min(limit, available_vectors),
            where=where,
            include=[
                "documents",
                "metadatas",
                "distances",
            ],
        )

    def get_by_vector_id(
        self,
        vector_id: str,
    ) -> dict[str, Any]:
        """
        Lấy dữ liệu vector theo vector_id.
        """
        vector_id = vector_id.strip()

        if not vector_id:
            raise ValueError("vector_id không được để trống.")

        return self.collection.get(
            ids=[vector_id],
            include=[
                "documents",
                "metadatas",
                "embeddings",
            ],
        )

    def get_document_vectors(
        self,
        document_id: int,
    ) -> dict[str, Any]:
        """
        Lấy toàn bộ vector thuộc một tài liệu.
        """
        if document_id <= 0:
            raise ValueError("document_id phải lớn hơn 0.")

        return self.collection.get(
            where={
                "document_id": document_id,
            },
            include=[
                "documents",
                "metadatas",
            ],
        )

    def delete_vectors(
        self,
        vector_ids: list[str],
    ) -> None:
        """
        Xóa các vector theo danh sách vector_id.
        """
        cleaned_vector_ids = [
            vector_id.strip()
            for vector_id in vector_ids
            if vector_id and vector_id.strip()
        ]

        if not cleaned_vector_ids:
            return

        self.collection.delete(
            ids=cleaned_vector_ids,
        )

    def delete_document_vectors(
        self,
        document_id: int,
    ) -> None:
        """
        Xóa toàn bộ vector thuộc một tài liệu.
        """
        if document_id <= 0:
            raise ValueError("document_id phải lớn hơn 0.")

        self.collection.delete(
            where={
                "document_id": document_id,
            },
        )

    def count(
        self,
        document_id: int | None = None,
    ) -> int:
        """
        Đếm vector trong collection.

        Nếu truyền document_id, chỉ đếm vector thuộc tài liệu đó.
        """
        if document_id is None:
            return self.collection.count()

        if document_id <= 0:
            raise ValueError("document_id phải lớn hơn 0.")

        result = self.collection.get(
            where={
                "document_id": document_id,
            },
            include=[],
        )

        return len(result.get("ids", []))

    def clear(self) -> None:
        """
        Xóa toàn bộ collection và tạo lại collection mới.

        Chỉ nên dùng khi test hoặc khi muốn reset dữ liệu vector.
        """
        try:
            self.client.delete_collection(
                name=COLLECTION_NAME,
            )
        except Exception:
            pass

        self.collection = self._get_or_create_collection()


vector_db = VectorDatabase()
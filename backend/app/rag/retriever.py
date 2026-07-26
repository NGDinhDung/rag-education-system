from typing import Any
import numpy as np
from rank_bm25 import BM25Okapi

from app.rag.vectordb import vector_db


class DocumentRetriever:
    def retrieve(
        self,
        query: str,
        document_id: int | None = None,
        limit: int = 5,
        min_score: float = 0.30,
        candidate_multiplier: int = 3,
    ) -> list[dict[str, Any]]:
        """
        Tìm các chunk liên quan bằng Hybrid Search (Vector + BM25)
        và Reciprocal Rank Fusion (RRF).
        """
        query = " ".join(query.strip().split())

        if not query:
            raise ValueError("Câu hỏi không được để trống.")

        if limit <= 0:
            raise ValueError("limit phải lớn hơn 0.")

        # Lấy tất cả vector của document (hoặc toàn bộ) để rank
        if document_id is not None:
            all_data = vector_db.get_document_vectors(document_id=document_id)
        else:
            all_data = vector_db.collection.get(include=["documents", "metadatas"])
            
        ids = all_data.get("ids", [])
        documents = all_data.get("documents", [])
        metadatas = all_data.get("metadatas", [])
        
        if not ids:
            return []

        # 1. BM25 Ranking
        tokenized_corpus = [doc.lower().split() for doc in documents]
        bm25 = BM25Okapi(tokenized_corpus)
        tokenized_query = query.lower().split()
        bm25_scores = bm25.get_scores(tokenized_query)
        
        # 2. Vector Ranking (Lấy top nhiều ứng viên)
        candidate_limit = max(limit * candidate_multiplier, len(ids))
        vector_results = vector_db.search(
            query=query,
            document_id=document_id,
            limit=candidate_limit,
        )
        
        vector_ids = vector_results.get("ids", [[]])[0]
        vector_distances = vector_results.get("distances", [[]])[0]
        
        vector_score_map = {}
        for vid, dist in zip(vector_ids, vector_distances):
            score = max(0.0, 1.0 - float(dist))
            vector_score_map[vid] = score
            
        # 3. RRF (Reciprocal Rank Fusion)
        k = 60
        bm25_ranked_indices = np.argsort(bm25_scores)[::-1]
        bm25_rank_map = {ids[idx]: rank for rank, idx in enumerate(bm25_ranked_indices)}
        
        vector_ranked_ids = sorted(vector_score_map.keys(), key=lambda x: vector_score_map[x], reverse=True)
        vector_rank_map = {vid: rank for rank, vid in enumerate(vector_ranked_ids)}
        
        hybrid_scores = []
        for i, vid in enumerate(ids):
            bm25_rank = bm25_rank_map.get(vid, len(ids))
            vector_rank = vector_rank_map.get(vid, len(ids))
            
            rrf_score = 1.0 / (k + bm25_rank) + 1.0 / (k + vector_rank)
            v_score = vector_score_map.get(vid, 0.0)
            
            hybrid_scores.append({
                "vector_id": str(vid),
                "content": documents[i],
                "document_id": metadatas[i].get("document_id"),
                "chunk_id": metadatas[i].get("chunk_id"),
                "chunk_index": metadatas[i].get("chunk_index"),
                "page_number": metadatas[i].get("page_number"),
                "vector_score": v_score,
                "rrf_score": rrf_score
            })
            
        # Lọc các chunk có điểm vector quá thấp
        filtered = [x for x in hybrid_scores if x["vector_score"] >= min_score]
        filtered.sort(key=lambda x: x["rrf_score"], reverse=True)
        
        selected = filtered[:limit]
        
        final_results = []
        for x in selected:
            final_results.append({
                "vector_id": x["vector_id"],
                "content": x["content"],
                "document_id": x["document_id"],
                "chunk_id": x["chunk_id"],
                "chunk_index": x["chunk_index"],
                "page_number": x["page_number"],
                "distance": 1.0 - x["vector_score"],
                "score": x["vector_score"]
            })
            
        print("\n========== KẾT QUẢ HYBRID SEARCH ==========")
        print(f"Câu hỏi: {query}")
        print(f"Số ứng viên vượt qua min_score ({min_score}): {len(filtered)}")
        for x in final_results:
            print(f"score={x['score']:.4f} | chunk_index={x['chunk_index']} | document_id={x['document_id']}")
        print("===========================================\n")

        return final_results

    def build_context(
        self,
        query: str,
        document_id: int | None = None,
        limit: int = 5,
        min_score: float = 0.30,
    ) -> str:
        chunks = self.retrieve(
            query=query,
            document_id=document_id,
            limit=limit,
            min_score=min_score,
        )

        if not chunks:
            return ""

        context_parts: list[str] = []
        for index, chunk in enumerate(chunks, start=1):
            source_info = (
                f"[Nguồn {index} | "
                f"document_id={chunk['document_id']} | "
                f"chunk_index={chunk['chunk_index']} | "
                f"score={chunk['score']:.4f}"
            )
            if chunk["page_number"] is not None:
                source_info += f" | page={chunk['page_number']}"
            source_info += "]"
            context_parts.append(f"{source_info}\n{chunk['content']}")

        return "\n\n".join(context_parts)

retriever = DocumentRetriever()
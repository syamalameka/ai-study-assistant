import logging
from typing import List, Dict, Any
from app.database import db_manager
from app.rag.embeddings import embedding_service

logger = logging.getLogger("ai_study_assistant.vector_store")

class VectorStore:
    def __init__(self):
        pass

    def index_document_chunks(self, doc_id: str, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Computes embeddings for each chunk and persists in database."""
        logger.info(f"Computing embeddings for {len(chunks)} chunks of doc {doc_id}...")
        texts = [c["text"] for c in chunks]
        embeddings = embedding_service.get_batch_embeddings(texts)

        for i, chunk in enumerate(chunks):
            chunk["embedding"] = embeddings[i] if i < len(embeddings) else []

        db_manager.save_chunks(doc_id, chunks)
        logger.info(f"Indexed {len(chunks)} chunks into vector store.")
        return chunks

    def search_similar_chunks(self, doc_id: str, query: str, top_k: int = 4) -> List[Dict[str, Any]]:
        """
        Retrieves top_k chunks for doc_id matching the query using hybrid scoring
        (cosine similarity of embeddings + keyword overlap boost).
        """
        all_chunks = db_manager.get_chunks(doc_id)
        if not all_chunks:
            logger.warning(f"No chunks found for doc_id {doc_id}")
            return []

        query_vec = embedding_service.get_query_embedding(query)
        query_words = set(query.lower().split())

        scored_chunks = []
        for chunk in all_chunks:
            embedding = chunk.get("embedding")
            sim = 0.0
            if embedding and len(embedding) == len(query_vec):
                sim = embedding_service.cosine_similarity(query_vec, embedding)

            # Keyword lexical overlap boost
            text_lower = chunk.get("text", "").lower()
            keyword_matches = sum(1 for w in query_words if len(w) > 3 and w in text_lower)
            boost = min(0.2, keyword_matches * 0.05)

            total_score = sim + boost

            scored_chunks.append({
                "chunk_id": chunk.get("chunk_id"),
                "doc_id": doc_id,
                "page_num": chunk.get("page_num", 1),
                "text": chunk.get("text", ""),
                "chunk_index": chunk.get("chunk_index", 0),
                "score": round(float(total_score), 4)
            })

        # Sort descending by score
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:top_k]

vector_store = VectorStore()

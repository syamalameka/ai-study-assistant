import math
import logging
import numpy as np
from typing import List, Optional
from app.config import settings

logger = logging.getLogger("ai_study_assistant.embeddings")

class EmbeddingService:
    def __init__(self):
        self._gemini_initialized = False
        self._check_and_init_gemini()

    def _check_and_init_gemini(self):
        api_key = settings.GEMINI_API_KEY
        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                self._gemini_initialized = True
                logger.info("Gemini API initialized successfully for embeddings.")
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini for embeddings: {e}")
                self._gemini_initialized = False
        else:
            self._gemini_initialized = False

    def get_embedding(self, text: str) -> List[float]:
        """Gets embedding vector for text using Gemini, or fallback TF-IDF vectorizer."""
        self._check_and_init_gemini()
        if self._gemini_initialized:
            try:
                import google.generativeai as genai
                result = genai.embed_content(
                    model=settings.EMBEDDING_MODEL,
                    content=text,
                    task_type="retrieval_document"
                )
                if "embedding" in result:
                    return result["embedding"]
            except Exception as e:
                logger.warning(f"Gemini embedding API call failed ({e}). Falling back to local vectorizer.")

        # Fallback local pseudo-dense TF-IDF hash embedding
        return self._fallback_local_embedding(text)

    def get_query_embedding(self, query: str) -> List[float]:
        """Gets embedding specifically formatted for search queries."""
        self._check_and_init_gemini()
        if self._gemini_initialized:
            try:
                import google.generativeai as genai
                result = genai.embed_content(
                    model=settings.EMBEDDING_MODEL,
                    content=query,
                    task_type="retrieval_query"
                )
                if "embedding" in result:
                    return result["embedding"]
            except Exception as e:
                logger.warning(f"Gemini query embedding failed: {e}")

        return self._fallback_local_embedding(query)

    def get_batch_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Batch embedding generation with resilient fallback."""
        if not texts:
            return []
        
        self._check_and_init_gemini()
        if self._gemini_initialized:
            try:
                import google.generativeai as genai
                # Gemini batch embed
                result = genai.embed_content(
                    model=settings.EMBEDDING_MODEL,
                    content=texts,
                    task_type="retrieval_document"
                )
                if "embedding" in result:
                    return result["embedding"]
            except Exception as e:
                logger.warning(f"Batch embed via Gemini failed: {e}. Using local.")

        return [self._fallback_local_embedding(t) for t in texts]

    def _fallback_local_embedding(self, text: str, dim: int = 128) -> List[float]:
        """Deterministic TF-IDF character & word n-gram projection for offline/fallback mode."""
        tokens = text.lower().split()
        vec = np.zeros(dim, dtype=np.float32)
        if not tokens:
            return vec.tolist()
            
        for i, word in enumerate(tokens):
            # Hash to index
            h = hash(word) % dim
            # Frequency & position weighting
            weight = 1.0 / (1.0 + math.log(i + 1))
            vec[h] += weight
            
            # Character bigram hashes
            for c_idx in range(len(word) - 1):
                bi_h = hash(word[c_idx:c_idx+2]) % dim
                vec[bi_h] += 0.3 * weight

        # Normalize L2
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """Computes cosine similarity between two vectors."""
        a = np.array(vec_a, dtype=np.float32)
        b = np.array(vec_b, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

embedding_service = EmbeddingService()

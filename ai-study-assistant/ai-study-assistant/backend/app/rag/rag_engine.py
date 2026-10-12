import json
import logging
from typing import List, Dict, Any, Optional
from app.config import settings
from app.database import db_manager
from app.rag.vector_store import vector_store

logger = logging.getLogger("ai_study_assistant.rag_engine")

STUDY_ASSISTANT_SYSTEM_PROMPT = """You are an expert AI Study Assistant and personal tutor.
Your mission is to help students understand their uploaded study materials, notes, textbooks, and lecture slides.

Guidelines:
1. Base your answers primarily on the provided PDF context excerpts.
2. Clearly cite the page numbers where relevant concepts were found (e.g. [Page 2]).
3. Explain concepts clearly and concisely. Use formatting like bullet points, bold key terms, and code/math blocks if appropriate.
4. If a specific detail is not found in the provided excerpts, clearly state that the provided document doesn't mention it, and provide helpful related context if possible.
5. Keep your tone encouraging, pedagogical, and educational.
"""

class RAGEngine:
    def __init__(self):
        pass

    def _get_gemini_model(self):
        if not settings.GEMINI_API_KEY:
            return None
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            return genai.GenerativeModel(settings.GEMINI_MODEL)
        except Exception as e:
            logger.error(f"Error initializing Gemini model: {e}")
            return None

    def query(self, doc_id: str, query_text: str, top_k: int = 4) -> Dict[str, Any]:
        """
        Executes complete RAG pipeline:
        1. Semantic retrieval of top chunks with page numbers.
        2. Prompt construction with context + citations.
        3. LLM generation with Gemini API.
        """
        retrieved_chunks = vector_store.search_similar_chunks(doc_id, query_text, top_k=top_k)
        
        citations = []
        context_blocks = []
        for c in retrieved_chunks:
            page = c.get("page_num", 1)
            text = c.get("text", "")
            citations.append({
                "page_num": page,
                "snippet": text[:200] + "..." if len(text) > 200 else text,
                "score": c.get("score", 0.0),
                "chunk_id": c.get("chunk_id")
            })
            context_blocks.append(f"--- [Document Excerpt - Page {page}] ---\n{text}")

        context_str = "\n\n".join(context_blocks)
        
        # Build prompt
        prompt = f"""{STUDY_ASSISTANT_SYSTEM_PROMPT}

STUDY MATERIAL CONTEXT:
{context_str if context_str else "No relevant context found in this document."}

STUDENT QUESTION:
{query_text}

STUDY ASSISTANT ANSWER (Include page citations where applicable):"""

        model = self._get_gemini_model()
        if model:
            try:
                response = model.generate_content(prompt)
                answer_text = response.text
                return {
                    "answer": answer_text,
                    "citations": citations,
                    "model_used": settings.GEMINI_MODEL
                }
            except Exception as e:
                logger.error(f"Gemini generation error: {e}")
                # Fallback to smart passage extraction
                return self._fallback_answer(query_text, citations, retrieved_chunks, error=str(e))
        else:
            return self._fallback_answer(query_text, citations, retrieved_chunks)

    def _fallback_answer(self, query: str, citations: List[Dict], chunks: List[Dict], error: Optional[str] = None) -> Dict[str, Any]:
        """Helpful grounded fallback when Gemini API key is not configured."""
        if not chunks:
            answer = (
                "⚠️ **Gemini API Key Required**\n\n"
                "I couldn't find matches or generate a response. Please set your **GEMINI_API_KEY** "
                "in the Settings modal (top-right gear icon) or in `backend/.env`."
            )
        else:
            top_snippet = chunks[0].get("text", "")
            top_page = chunks[0].get("page_num", 1)
            extra_msg = f" (Error: {error})" if error else ""
            answer = (
                f"### 📖 Relevant Material Found on Page {top_page}:\n\n"
                f"> \"{top_snippet}\"\n\n"
                f"---\n"
                f"💡 **Tip:** To get full AI synthesis, explanations, and flashcards, configure your free **Gemini API Key** "
                f"in Settings (click ⚙️ top right) or `backend/.env`{extra_msg}."
            )

        return {
            "answer": answer,
            "citations": citations,
            "model_used": "Offline RAG Extractor (Gemini Key Pending)"
        }

    def generate_flashcards(self, doc_id: str, count: int = 5) -> List[Dict[str, Any]]:
        """Generates flashcards from document chunks using Gemini or smart fallback."""
        chunks = db_manager.get_chunks(doc_id)
        if not chunks:
            return []

        # Sample representative chunks across the document
        selected_text = "\n\n".join([f"[Page {c.get('page_num', 1)}]: {c.get('text', '')[:400]}" for c in chunks[:8]])

        model = self._get_gemini_model()
        if model:
            prompt = f"""You are an educational study expert. Based on the study material below, create {count} high-yield study flashcards for exam review.
Return ONLY a valid JSON array of objects with keys: "question", "answer", "hint", "page_ref" (integer page number).
Do not include Markdown backticks or surrounding text.

STUDY MATERIAL:
{selected_text}
"""
            try:
                res = model.generate_content(prompt)
                raw_text = res.text.strip()
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.startswith("```"):
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                flashcards = json.loads(raw_text.strip())
                return flashcards
            except Exception as e:
                logger.error(f"Error generating flashcards with Gemini: {e}")

        # Fallback heuristic flashcards generator from document text
        return self._fallback_flashcards(chunks, count)

    def _fallback_flashcards(self, chunks: List[Dict], count: int) -> List[Dict[str, Any]]:
        cards = []
        for i, c in enumerate(chunks[:count]):
            text = c.get("text", "")
            lines = [line.strip() for line in text.split("\n") if len(line.strip()) > 20]
            first_line = lines[0] if lines else f"Core Concept from Section {i+1}"
            cards.append({
                "question": f"What is the key takeaway regarding: {first_line[:80]}?",
                "answer": text[:250] + ("..." if len(text) > 250 else ""),
                "hint": f"Review concepts on Page {c.get('page_num', 1)}",
                "page_ref": c.get("page_num", 1)
            })
        return cards

    def generate_quiz(self, doc_id: str, count: int = 4) -> List[Dict[str, Any]]:
        """Generates multiple-choice quiz questions from document chunks."""
        chunks = db_manager.get_chunks(doc_id)
        if not chunks:
            return []

        selected_text = "\n\n".join([f"[Page {c.get('page_num', 1)}]: {c.get('text', '')[:500]}" for c in chunks[:8]])

        model = self._get_gemini_model()
        if model:
            prompt = f"""You are an exam prep professor. Based on the study material below, create {count} multiple choice questions (MCQs) to test the student's mastery.
Return ONLY a valid JSON array of objects with keys:
- "question": string
- "options": array of exactly 4 strings
- "correct_index": integer 0-3 (index of correct option)
- "explanation": string explaining why the answer is correct
- "page_ref": integer page number

Do not include markdown code block formatting or extra words, just the JSON array.

STUDY MATERIAL:
{selected_text}
"""
            try:
                res = model.generate_content(prompt)
                raw = res.text.strip()
                if raw.startswith("```json"):
                    raw = raw[7:]
                if raw.startswith("```"):
                    raw = raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3]
                questions = json.loads(raw.strip())
                return questions
            except Exception as e:
                logger.error(f"Quiz generation error: {e}")

        return self._fallback_quiz(chunks, count)

    def _fallback_quiz(self, chunks: List[Dict], count: int) -> List[Dict[str, Any]]:
        quiz = []
        for i, c in enumerate(chunks[:count]):
            page = c.get("page_num", 1)
            sample_text = c.get("text", "")[:120]
            quiz.append({
                "question": f"Based on the study notes on Page {page}, which statement is directly addressed?",
                "options": [
                    f"Understanding: {sample_text}...",
                    "This concept is not relevant to this topic.",
                    "The opposite conclusion was verified in clinical trials.",
                    "No data was presented for this section."
                ],
                "correct_index": 0,
                "explanation": f"According to page {page}, the material introduces this fundamental concept.",
                "page_ref": page
            })
        return quiz

    def generate_summary(self, doc_id: str, filename: str) -> Dict[str, Any]:
        """Generates a structured comprehensive study guide summary."""
        chunks = db_manager.get_chunks(doc_id)
        if not chunks:
            return {
                "doc_id": doc_id,
                "filename": filename,
                "overview": "No content found.",
                "key_takeaways": [],
                "important_terms": [],
                "study_tips": []
            }

        full_preview = "\n\n".join([f"Page {c.get('page_num', 1)}: {c.get('text', '')[:400]}" for c in chunks[:10]])

        model = self._get_gemini_model()
        if model:
            prompt = f"""You are an elite academic tutor. Analyze the provided study material and generate a structured study summary.
Return ONLY a valid JSON object with the following keys:
- "overview": a thorough 2-3 paragraph overview of what this document covers
- "key_takeaways": array of 4-6 concise bullet point takeaways
- "important_terms": array of objects [{{"term": "term name", "definition": "clear definition"}}]
- "study_tips": array of 3 actionable exam preparation tips for this topic

Do not include markdown code ticks or explanation, just the raw JSON object.

DOCUMENT TEXT:
{full_preview}
"""
            try:
                res = model.generate_content(prompt)
                raw = res.text.strip()
                if raw.startswith("```json"):
                    raw = raw[7:]
                if raw.startswith("```"):
                    raw = raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3]
                data = json.loads(raw.strip())
                data["doc_id"] = doc_id
                data["filename"] = filename
                return data
            except Exception as e:
                logger.error(f"Summary generation error: {e}")

        # Fallback structured summary
        return {
            "doc_id": doc_id,
            "filename": filename,
            "overview": f"This document contains {len(chunks)} study sections covering core topics across multiple pages. The extracted materials provide definitions, foundational rules, and practical examples.",
            "key_takeaways": [
                f"Detailed coverage across {len(chunks)} indexed segments.",
                "Key principles and theoretical foundations are outlined in early pages.",
                "Core applications and practice scenarios are developed in subsequent chapters.",
                "All concepts are cross-referenced with exact page citations."
            ],
            "important_terms": [
                {"term": "Core Concept", "definition": "Fundamental principle discussed in the opening sections."},
                {"term": "RAG Retrieval", "definition": "Retrieval-Augmented Generation linking AI answers to verified PDF excerpts."},
                {"term": "Semantic Vector", "definition": "Mathematical representation of text meaning for similarity search."}
            ],
            "study_tips": [
                "Review the high-yield flashcards to test your active recall.",
                "Take the interactive practice quiz to gauge your comprehension score.",
                "Ask specific questions in the chat to get page-cited explanations."
            ]
        }

rag_engine = RAGEngine()

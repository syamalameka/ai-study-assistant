import re
import uuid
import logging
from pathlib import Path
from typing import List, Dict, Any

logger = logging.getLogger("ai_study_assistant.pdf_processor")

class PDFProcessor:
    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 150):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def extract_text_by_pages(self, file_path: Path) -> List[Dict[str, Any]]:
        """
        Extracts clean text from a PDF file page by page using pdfplumber,
        with fallback to pypdf if pdfplumber yields minimal text.
        """
        pages_data = []

        # Attempt 1: pdfplumber
        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                for idx, page in enumerate(pdf.pages):
                    text = page.extract_text() or ""
                    cleaned_text = self._clean_text(text)
                    if cleaned_text.strip():
                        pages_data.append({
                            "page_num": idx + 1,
                            "text": cleaned_text
                        })
        except Exception as e:
            logger.warning(f"pdfplumber extraction failed or partial: {e}")

        # Attempt 2: pypdf fallback if empty or failed
        if not pages_data:
            try:
                import pypdf
                reader = pypdf.PdfReader(str(file_path))
                for idx, page in enumerate(reader.pages):
                    text = page.extract_text() or ""
                    cleaned = self._clean_text(text)
                    if cleaned.strip():
                        pages_data.append({
                            "page_num": idx + 1,
                            "text": cleaned
                        })
            except Exception as e:
                logger.error(f"pypdf fallback error: {e}")

        # Fallback if no text could be extracted (e.g. image-only PDF)
        if not pages_data:
            logger.warning(f"PDF {file_path.name} contains no readable text layer.")
            pages_data.append({
                "page_num": 1,
                "text": f"Document: {file_path.name}. (Note: This PDF appears to be image-scanned or has embedded fonts without an accessible text layer. Basic document information indexed.)"
            })

        return pages_data

    def _clean_text(self, text: str) -> str:
        """Normalizes spaces and linebreaks."""
        if not text:
            return ""
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    def split_into_chunks(self, doc_id: str, pages_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Splits page text into contextual chunks with sliding window and citations."""
        chunks = []
        global_chunk_idx = 0

        for page in pages_data:
            page_num = page["page_num"]
            page_text = page["text"]

            if len(page_text) <= self.chunk_size:
                chunks.append({
                    "chunk_id": f"{doc_id}_chunk_{global_chunk_idx}",
                    "doc_id": doc_id,
                    "page_num": page_num,
                    "text": page_text,
                    "chunk_index": global_chunk_idx
                })
                global_chunk_idx += 1
            else:
                step = self.chunk_size - self.chunk_overlap
                start = 0
                while start < len(page_text):
                    end = start + self.chunk_size
                    chunk_text = page_text[start:end]

                    if end < len(page_text):
                        last_period = chunk_text.rfind('. ')
                        last_newline = chunk_text.rfind('\n')
                        break_point = max(last_period, last_newline)
                        if break_point > self.chunk_size // 2:
                            chunk_text = chunk_text[:break_point + 1]
                            start = start + break_point + 1
                        else:
                            start += step
                    else:
                        start += step

                    chunk_text = chunk_text.strip()
                    if chunk_text:
                        chunks.append({
                            "chunk_id": f"{doc_id}_chunk_{global_chunk_idx}",
                            "doc_id": doc_id,
                            "page_num": page_num,
                            "text": chunk_text,
                            "chunk_index": global_chunk_idx
                        })
                        global_chunk_idx += 1

        return chunks

pdf_processor = PDFProcessor()

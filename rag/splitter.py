from __future__ import annotations

import importlib
import re
from typing import Any, ClassVar


class _FallbackSplitter:
    def __init__(
        self, chunk_size: int = 1000, chunk_overlap: int = 200, **_: object
    ) -> None:
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap

    def split_text(self, text: str) -> list[str]:
        cleaned = text.strip()
        if not cleaned:
            return []
        if len(cleaned) <= self._chunk_size:
            return [cleaned]

        chunks: list[str] = []
        step = max(1, self._chunk_size - self._chunk_overlap)
        start = 0
        while start < len(cleaned):
            end = min(start + self._chunk_size, len(cleaned))
            chunks.append(cleaned[start:end].strip())
            if end == len(cleaned):
                break
            start += step
        return [chunk for chunk in chunks if chunk]


def _build_base_splitter(chunk_size: int, chunk_overlap: int) -> Any:
    try:
        module = importlib.import_module("langchain_text_splitters")
        splitter_cls = getattr(module, "RecursiveCharacterTextSplitter")
        return splitter_cls(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    except (ImportError, AttributeError):
        return _FallbackSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)


class LegalTextSplitter:
    HEADER_PATTERN: ClassVar[re.Pattern[str]] = re.compile(
        r"(?im)^\s*(?:"
        r"CHAPTER\s+[IVXLCDM0-9A-Z-]+"
        r"|PART\s+[IVXLCDM0-9A-Z-]+"
        r"|(?:IPC\s+)?Section\s+\d+[A-Z]?(?:\s*[-:]\s*[^\n]*)?"
        r"|Article\s+\d+[A-Z]?(?:\s*[-:]\s*[^\n]*)?"
        r")\s*$"
    )

    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200) -> None:
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap
        self._base_splitter = _build_base_splitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

    def _base_split(self, text: str) -> list[str]:
        pieces = self._base_splitter.split_text(text)
        return [piece.strip() for piece in pieces if piece and piece.strip()]

    def split_text(self, text: str) -> list[str]:
        if not text or not text.strip():
            return []

        header_matches = list(self.HEADER_PATTERN.finditer(text))
        if not header_matches:
            return self._base_split(text)

        chunks: list[str] = []

        first_header_start = header_matches[0].start()
        prefix = text[:first_header_start].strip()
        if prefix:
            chunks.extend(self._base_split(prefix))

        for index, match in enumerate(header_matches):
            start = match.start()
            end = (
                header_matches[index + 1].start()
                if index + 1 < len(header_matches)
                else len(text)
            )
            segment = text[start:end].strip()
            if not segment:
                continue

            if len(segment) <= self._chunk_size:
                chunks.append(segment)
            else:
                chunks.extend(self._base_split(segment))

        return chunks

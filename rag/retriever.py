from __future__ import annotations

import sys
from importlib import util
from pathlib import Path

from langchain_core.tools import tool


def _load_get_vector_store():
    module_path = Path(__file__).resolve().parent / "vectorstore.py"
    spec = util.spec_from_file_location("rag_vectorstore", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load module from {module_path}")
    module = util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module.get_vector_store


@tool
def retrieve_case_evidence(query: str) -> str:
    """Use this to search the uploaded case facts, evidence, and witness statements. Provide a specific search query (for example: 'IPC 302', 'forensic report blood sample', or a witness name)."""

    get_vector_store = _load_get_vector_store()
    vector_store = get_vector_store()
    return retrieve_case_evidence_from_store(query, vector_store)


def retrieve_case_evidence_from_store(query: str, vector_store) -> str:
    cleaned_query = query.strip()
    if not cleaned_query:
        return "No query provided. Please provide a specific legal or factual search query."

    documents = vector_store.similarity_search(cleaned_query, k=4)
    if not documents:
        return "No matching case evidence found for the provided query."

    evidence_blocks: list[str] = []
    citation_lines: list[str] = []
    for index, document in enumerate(documents, start=1):
        source = (
            document.metadata.get("source", "unknown")
            if document.metadata
            else "unknown"
        )
        chunk_index = (
            document.metadata.get("chunk_index", "?") if document.metadata else "?"
        )
        case_id = (
            document.metadata.get("case_id", "uploaded_case")
            if document.metadata
            else "uploaded_case"
        )
        citation_id = f"case:{index}"
        evidence_blocks.append(
            "\n".join(
                [
                    f"Evidence {index} [{citation_id}]",
                    f"Source: {source}",
                    f"Case: {case_id}",
                    f"Chunk: {chunk_index}",
                    f"Excerpt: {document.page_content}",
                ]
            )
        )
        citation_lines.append(
            f"[{citation_id}] {source} (case={case_id}, chunk={chunk_index})"
        )

    return (
        "Retrieved case evidence with citations:\n\n"
        + "\n\n".join(evidence_blocks)
        + "\n\nCitations:\n"
        + "\n".join(citation_lines)
    )

from __future__ import annotations

import os
import uuid
from importlib import util
from pathlib import Path
import sys

from astra_connection import AstraConfigurationError


def _load_module(module_name: str, relative_path: str):
    module_path = Path(__file__).resolve().parent.parent / relative_path
    spec = util.spec_from_file_location(module_name, module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load module from {module_path}")
    module = util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


splitter_module = _load_module("rag_splitter", "rag/splitter.py")
vectorstore_module = _load_module("rag_vectorstore", "rag/vectorstore.py")
LegalTextSplitter = splitter_module.LegalTextSplitter
get_vector_store = vectorstore_module.get_vector_store


REQUIRED_ENV_VARS = (
    "ASTRA_DB_APPLICATION_TOKEN",
    "ASTRA_DB_API_ENDPOINT",
    "GEMINI_API_KEY",
)


def _missing_env_vars() -> list[str]:
    return [name for name in REQUIRED_ENV_VARS if not os.getenv(name)]


def _mock_legal_document() -> str:
    return """
CHAPTER XVI
Of Offences Affecting the Human Body

Section 299: Culpable homicide.
Whoever causes death by doing an act with the intention of causing death,
or with the intention of causing such bodily injury as is likely to cause death,
or with the knowledge that he is likely by such act to cause death, commits
the offence of culpable homicide.

Section 300: Murder.
Culpable homicide is murder if the act by which the death is caused is done
with the intention of causing death, or if it is done with the intention of
causing such bodily injury as the offender knows to be likely to cause the
death of the person to whom the harm is caused.

Section 302: Punishment for murder.
Whoever commits murder shall be punished with death, or imprisonment for life,
and shall also be liable to fine.
""".strip()


def main() -> int:
    missing_env = _missing_env_vars()
    if missing_env:
        print(
            "Skipping embedding/vector-store test. Missing required env var(s): "
            f"{', '.join(missing_env)}"
        )
        print(
            "Set env vars and rerun with: uv run --env-file .env python test_embed.py"
        )
        return 0

    try:
        vector_store = get_vector_store()
    except AstraConfigurationError as exc:
        print(f"Configuration error: {exc}")
        return 1
    except Exception as exc:
        print(f"Failed to initialize vector store: {exc.__class__.__name__}: {exc}")
        return 1

    splitter = LegalTextSplitter(chunk_size=400, chunk_overlap=50)
    chunks = splitter.split_text(_mock_legal_document())
    if not chunks:
        print("No chunks produced by LegalTextSplitter; cannot continue.")
        return 1

    run_id = uuid.uuid4().hex
    ids = [f"test-embed-{run_id}-{index}" for index, _ in enumerate(chunks)]
    metadatas = [
        {
            "source": "test_embed.py",
            "case_id": "mock-case-001",
            "chunk_index": index,
            "run_id": run_id,
        }
        for index in range(len(chunks))
    ]

    try:
        inserted_ids = vector_store.add_texts(chunks, metadatas=metadatas, ids=ids)

        fetched_docs = vector_store.get_by_ids([inserted_ids[0]])
        if fetched_docs:
            fetched_id = fetched_docs[0].id
            print(
                f"Fetch by id succeeded: requested={inserted_ids[0]}, returned={fetched_id}"
            )
        else:
            similar_docs = vector_store.similarity_search(
                "IPC Section 302 punishment", k=1
            )
            if not similar_docs:
                print(
                    "Insertion succeeded, but neither get_by_ids nor similarity_search returned results."
                )
                return 1
            print(
                "Fetch by id returned empty; similarity search succeeded with doc id: "
                f"{similar_docs[0].id}"
            )

        print(
            f"Embedded and inserted {len(inserted_ids)} chunk(s) into collection "
            f"'{vector_store.collection_name}'."
        )
        return 0
    except Exception as exc:
        print(
            f"Embedding/vector-store operation failed: {exc.__class__.__name__}: {exc}"
        )
        return 1
    finally:
        try:
            vector_store.delete(ids=ids)
        except Exception:
            pass


if __name__ == "__main__":
    raise SystemExit(main())

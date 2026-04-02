from __future__ import annotations

import os

from importlib import util
from pathlib import Path
import sys


REQUIRED_ENV_VARS = (
    "ASTRA_DB_APPLICATION_TOKEN",
    "ASTRA_DB_API_ENDPOINT",
    "GEMINI_API_KEY",
)


def _missing_env_vars() -> list[str]:
    return [name for name in REQUIRED_ENV_VARS if not os.getenv(name)]


def _load_module(module_name: str, relative_path: str):
    module_path = Path(__file__).resolve().parent.parent / relative_path
    spec = util.spec_from_file_location(module_name, module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load module from {module_path}")
    module = util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


retriever_module = _load_module("rag_retriever", "rag/retriever.py")


class _MockDocument:
    def __init__(
        self, page_content: str, metadata: dict[str, str] | None = None
    ) -> None:
        self.page_content = page_content
        self.metadata = metadata or {}


class _MockVectorStore:
    def similarity_search(self, query: str, k: int = 4) -> list[_MockDocument]:
        if "302" in query:
            return [
                _MockDocument(
                    "IPC Section 302: Punishment for murder includes death or life imprisonment.",
                    metadata={"source": "mock_case_file.txt"},
                )
            ]
        return []


def _run_mocked_tool_invocation() -> None:
    result = retriever_module.retrieve_case_evidence_from_store(
        "IPC 302", _MockVectorStore()
    )

    assert isinstance(result, str), "Retriever tool result must be a string"
    assert "302" in result, "Retriever tool result should include relevant evidence"


def main() -> int:
    missing_env = _missing_env_vars()
    if missing_env:
        print(
            "Skipping live retriever test. Missing required env var(s): "
            f"{', '.join(missing_env)}"
        )
        print("Running mocked retriever invocation instead.")
        _run_mocked_tool_invocation()
        print("Mocked retriever invocation passed.")
        return 0

    result = retriever_module.retrieve_case_evidence.invoke("IPC 302")
    assert isinstance(result, str), "Retriever tool result must be a string"
    print("Live retriever invocation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

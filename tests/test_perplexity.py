from __future__ import annotations

import os
import sys
from importlib import util
from pathlib import Path


def _load_module(module_name: str, relative_path: str):
    module_path = Path(__file__).resolve().parent.parent / relative_path
    spec = util.spec_from_file_location(module_name, module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load module from {module_path}")
    module = util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


perplexity_module = _load_module("rag_perplexity", "rag/perplexity.py")


def main() -> int:
    if not os.getenv("PERPLEXITY_API_KEY"):
        raise SystemExit("PERPLEXITY_API_KEY is not set")

    query = "What is the 2024 Supreme Court ruling on hearsay?"
    result = perplexity_module.search_indian_legal_precedents.invoke(query)
    assert isinstance(result, str), "Perplexity tool result must be a string"
    print("Perplexity tool invocation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

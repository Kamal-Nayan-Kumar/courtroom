from __future__ import annotations

import os
from importlib import util
from pathlib import Path
import sys

from langchain_google_genai import ChatGoogleGenerativeAI


def _load_module(module_name: str, relative_path: str):
    module_path = Path(__file__).resolve().parent.parent / relative_path
    spec = util.spec_from_file_location(module_name, module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load module from {module_path}")
    module = util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


prosecutor_module = _load_module("agents_prosecutor", "agents/prosecutor.py")
retriever_module = _load_module("rag_retriever", "rag/retriever.py")
get_prosecutor_agent = prosecutor_module.get_prosecutor_agent
retrieve_case_evidence = retriever_module.retrieve_case_evidence


def main() -> int:
    if not os.getenv("GEMINI_API_KEY"):
        print(
            "Skipping prosecutor agent test. Missing required env var: GEMINI_API_KEY"
        )
        print(
            "Set env vars and rerun with: uv run --env-file .env python test_prosecutor.py"
        )
        return 0

    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash")
    prosecutor_agent = get_prosecutor_agent(llm=llm, tools=[retrieve_case_evidence])

    query = "The defendant was near the crime scene"
    result = prosecutor_agent.invoke(
        {
            "messages": [
                (
                    "user",
                    query,
                )
            ]
        }
    )

    messages = result.get("messages", [])
    if not messages:
        print("Prosecutor agent returned no messages.")
        return 1

    final_response = messages[-1].content
    print("Prosecutor response:")
    print(final_response)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

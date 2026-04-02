from __future__ import annotations

import os
import sys
from importlib import util
from pathlib import Path

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


judge_module = _load_module("agents_judge", "agents/judge.py")
retriever_module = _load_module("rag_retriever", "rag/retriever.py")


def main() -> int:
    if not os.getenv("GEMINI_API_KEY"):
        print("Skipping judge agent test. Missing required env var: GEMINI_API_KEY")
        print(
            "Set env vars and rerun with: uv run --env-file .env python test_judge.py"
        )
        return 0

    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0)
    judge_agent = judge_module.get_judge_agent(
        llm=llm,
        tools=[retriever_module.retrieve_case_evidence],
    )

    response = judge_agent.invoke({"input": "Is hearsay allowed?"})
    print(response.content if hasattr(response, "content") else str(response))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

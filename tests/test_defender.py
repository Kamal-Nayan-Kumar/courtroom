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


def main() -> int:
    if not os.getenv("GEMINI_API_KEY"):
        print("Skipping defender test. Missing required env var: GEMINI_API_KEY")
        print(
            "Set env var and rerun with: uv run --env-file .env python test_defender.py"
        )
        return 0

    defender_module = _load_module("agents_defender", "agents/defender.py")
    retriever_module = _load_module("rag_retriever", "rag/retriever.py")

    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
    defender = defender_module.get_defender_agent(
        llm=llm,
        tools=[retriever_module.retrieve_case_evidence],
    )

    result = defender.invoke(
        {"input": "The prosecutor claims the defendant was at the scene."}
    )

    output = result.get("output") if isinstance(result, dict) else str(result)
    print("Defensive Counter-Argument:")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import os
import sys
from importlib import util
from pathlib import Path

from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.errors import GraphRecursionError


def _load_module(module_name: str, relative_path: str):
    module_path = Path(__file__).resolve().parent.parent / relative_path
    spec = util.spec_from_file_location(module_name, module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load module from {module_path}")
    module = util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


builder_module = _load_module("graph_builder", "graph/builder.py")


def main() -> int:
    if not os.getenv("GEMINI_API_KEY"):
        raise SystemExit("GEMINI_API_KEY is not set")

    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0)
    graph = builder_module.build_courtroom_graph(llm=llm)

    initial_state = {
        "case_details": "State vs. Rajesh Kumar under IPC 302.",
        "evidence_list": [
            "Witness says accused was seen near scene at 10:30 PM.",
            "Forensic report notes blood traces on recovered knife.",
        ],
        "transcript": [
            HumanMessage(
                content=(
                    "Trial opening: each role should give one concise turn based only "
                    "on provided case details and evidence. Do not call external tools "
                    "for this smoke test."
                )
            )
        ],
        "current_turn": "prosecutor",
        "active_objection": {},
        "trial_status": "in_progress",
    }

    print("Running courtroom graph stream with recursion_limit=3")
    try:
        for step_index, step in enumerate(
            graph.stream(initial_state, config={"recursion_limit": 3}),
            start=1,
        ):
            node_name = next(iter(step.keys()))
            node_state = step[node_name]
            current_turn = node_state.get("current_turn", "unknown")
            transcript_entries = node_state.get("transcript", [])
            latest_text = ""
            if transcript_entries:
                latest = transcript_entries[-1]
                latest_text = (
                    latest.content if hasattr(latest, "content") else str(latest)
                )

            print(f"Step {step_index}: node={node_name}, next_turn={current_turn}")
            if latest_text:
                print(f"  latest_transcript: {latest_text}")
    except GraphRecursionError:
        print("Graph stopped at recursion_limit=3 as expected for cyclic flow.")

    print("Graph transition smoke test completed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

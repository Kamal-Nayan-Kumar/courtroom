from __future__ import annotations

import os
import sys
from importlib import util
from pathlib import Path

from langchain_core.messages import HumanMessage


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


class _FakeAgent:
    def __init__(self, response_text: str):
        self._response_text = response_text

    def invoke(self, _: dict) -> str:
        return self._response_text


def _collect_steps(graph, initial_state: dict, step_count: int) -> list[dict]:
    steps = []
    for step in graph.stream(initial_state, config={"recursion_limit": 10}):
        steps.append(step)
        if len(steps) == step_count:
            break
    return steps


def main() -> int:
    if not os.getenv("GEMINI_API_KEY"):
        raise SystemExit("GEMINI_API_KEY is not set")

    builder_module.get_prosecutor_agent = (  # type: ignore[assignment]
        lambda llm, tools: _FakeAgent("Prosecutor statement with objection context.")
    )
    builder_module.get_defender_agent = (  # type: ignore[assignment]
        lambda llm, tools: _FakeAgent("Defender response.")
    )
    builder_module.get_judge_agent = (  # type: ignore[assignment]
        lambda llm, tools: _FakeAgent("Ruling: SUSTAINED")
    )

    llm = object()
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
                    "Defense: Counsel is leading the witness and assuming facts not "
                    "in evidence. Objection is pending for judicial ruling."
                )
            )
        ],
        "current_turn": "prosecutor",
        "active_objection": {
            "type": "leading",
            "raised_by": "defender",
            "target": "prosecutor_statement",
            "status": "pending",
        },
        "trial_status": "in_progress",
    }

    steps = _collect_steps(graph, initial_state, step_count=2)
    if len(steps) < 2:
        raise SystemExit("Expected at least 2 graph steps for objection routing check")

    first_node = next(iter(steps[0].keys()))
    second_node = next(iter(steps[1].keys()))

    print(f"Step 1 node: {first_node}")
    print(f"Step 2 node: {second_node}")

    if first_node != "prosecutor_node":
        raise SystemExit(f"Expected first node to be prosecutor_node, got {first_node}")

    if second_node != "judge_node":
        raise SystemExit(
            "Objection routing failed: expected second node judge_node, "
            f"got {second_node}"
        )

    judge_state = steps[1]["judge_node"]
    if judge_state.get("current_turn") != "prosecutor":
        raise SystemExit(
            "Judge should hand control back to prosecutor after ruling. "
            f"Got current_turn={judge_state.get('current_turn')}"
        )

    if judge_state.get("active_objection"):
        raise SystemExit("Judge node should clear active_objection after ruling")

    normal_cycle_state = {
        "case_details": "State vs. Rajesh Kumar under IPC 302.",
        "evidence_list": [
            "Witness says accused was seen near scene at 10:30 PM.",
            "Forensic report notes blood traces on recovered knife.",
        ],
        "transcript": [
            HumanMessage(content="Run one normal cycle without any pending objection.")
        ],
        "current_turn": "prosecutor",
        "active_objection": {},
        "trial_status": "in_progress",
    }
    normal_steps = _collect_steps(graph, normal_cycle_state, step_count=3)
    normal_nodes = [next(iter(step.keys())) for step in normal_steps]
    print(f"Normal cycle nodes: {normal_nodes}")
    if normal_nodes != ["prosecutor_node", "defender_node", "judge_node"]:
        raise SystemExit(
            "Normal cycle routing regression: expected "
            "['prosecutor_node', 'defender_node', 'judge_node'], "
            f"got {normal_nodes}"
        )

    print("Objection routing and normal cycle checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

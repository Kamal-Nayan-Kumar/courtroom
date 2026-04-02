from __future__ import annotations

from importlib import import_module

from langchain_core.messages import HumanMessage

CourtroomState = import_module("graph.state").CourtroomState


def main() -> None:
    state = {
        "case_details": "State vs. Rajesh Kumar under IPC 302.",
        "evidence_list": ["Witness statement", "Forensic report"],
        "transcript": [
            HumanMessage(content="Prosecution submits Exhibit A."),
        ],
        "current_turn": "prosecutor",
        "active_objection": {"type": "hearsay", "status": "pending"},
        "trial_status": "in_progress",
    }
    validated_state = CourtroomState(**state)
    print(validated_state)


if __name__ == "__main__":
    main()

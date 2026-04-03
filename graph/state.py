from __future__ import annotations

from typing import Annotated
from typing_extensions import TypedDict

from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages


class CourtroomState(TypedDict):
    case_details: str
    evidence_list: list[str]
    transcript: Annotated[list[AnyMessage], add_messages]
    current_turn: str
    user_role: str
    active_objection: dict
    trial_status: str

from __future__ import annotations

import os
import re
import time
from importlib import import_module
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.graph import START, StateGraph

CourtroomState = import_module("graph.state").CourtroomState
get_prosecutor_agent = import_module("agents.prosecutor").get_prosecutor_agent
get_defender_agent = import_module("agents.defender").get_defender_agent
get_judge_agent = import_module("agents.judge").get_judge_agent
retrieve_case_evidence = import_module("rag.retriever").retrieve_case_evidence
search_indian_legal_precedents = import_module(
    "rag.perplexity"
).search_indian_legal_precedents


RETRYABLE_STATUS_CODES = {429, 502, 503, 504}
DEFAULT_AGENT_MAX_RETRIES = 2
DEFAULT_AGENT_RETRY_DELAY_SECONDS = 0.6
DEFAULT_AGENT_PROMPT_MAX_CHARS = 3500
TURN_TO_NODE: dict[str, str] = {
    "prosecutor": "prosecutor_node",
    "defender": "defender_node",
    "judge": "judge_node",
}


def _to_text(payload: Any) -> str:
    if isinstance(payload, str):
        return payload

    if hasattr(payload, "content"):
        content = getattr(payload, "content")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            chunks: list[str] = []
            for item in content:
                text = getattr(item, "text", None)
                if isinstance(text, str):
                    chunks.append(text)
                elif isinstance(item, dict) and isinstance(item.get("text"), str):
                    chunks.append(item["text"])
                elif isinstance(item, str):
                    chunks.append(item)
            if chunks:
                return "\n".join(chunks)

    if isinstance(payload, dict):
        output = payload.get("output")
        if isinstance(output, str):
            return output

        messages = payload.get("messages")
        if isinstance(messages, list) and messages:
            last_message = messages[-1]
            if hasattr(last_message, "content"):
                last_content = getattr(last_message, "content")
                if isinstance(last_content, str):
                    return last_content
                if isinstance(last_content, list):
                    chunks: list[str] = []
                    for item in last_content:
                        text = getattr(item, "text", None)
                        if isinstance(text, str):
                            chunks.append(text)
                        elif isinstance(item, dict) and isinstance(
                            item.get("text"), str
                        ):
                            chunks.append(item["text"])
                        elif isinstance(item, str):
                            chunks.append(item)
                    if chunks:
                        return "\n".join(chunks)
            if isinstance(last_message, str):
                return last_message

    return str(payload)


def _latest_user_prompt(state) -> str:
    transcript = state.get("transcript", [])
    for message in reversed(transcript):
        if isinstance(message, HumanMessage):
            return _to_text(message)

    case_details = state.get("case_details", "").strip()
    if case_details:
        raw_prompt = f"Case details: {case_details}"
    else:
        raw_prompt = "Proceed with your courtroom role based on available context."

    limit_raw = os.getenv("TRIAL_AGENT_PROMPT_MAX_CHARS", "").strip()
    try:
        prompt_limit = int(limit_raw) if limit_raw else DEFAULT_AGENT_PROMPT_MAX_CHARS
    except ValueError:
        prompt_limit = DEFAULT_AGENT_PROMPT_MAX_CHARS

    prompt_limit = max(300, min(20_000, prompt_limit))
    if len(raw_prompt) <= prompt_limit:
        return raw_prompt

    suffix = "\n...[truncated for model limits]"
    truncated = raw_prompt[: max(0, prompt_limit - len(suffix))].rstrip()
    return f"{truncated}{suffix}"


def _extract_status_code(exc: Exception) -> int | None:
    response = getattr(exc, "response", None)
    status_code = getattr(response, "status_code", None)
    if isinstance(status_code, int):
        return status_code

    status_code = getattr(exc, "status_code", None)
    if isinstance(status_code, int):
        return status_code

    match = re.search(r"\b(429|502|503|504)\b", str(exc))
    if match:
        return int(match.group(1))
    return None


def _retryable_error(exc: Exception) -> bool:
    code = _extract_status_code(exc)
    if code in RETRYABLE_STATUS_CODES:
        return True
    exc_name = exc.__class__.__name__.lower()
    return "timeout" in exc_name or "connection" in exc_name


def _invoke_agent_with_resilience(
    agent: Any, payload: dict[str, Any], role: str
) -> Any:
    max_retries_raw = os.getenv("TRIAL_AGENT_MAX_RETRIES", "").strip()
    retry_delay_raw = os.getenv("TRIAL_AGENT_RETRY_DELAY_MS", "").strip()

    try:
        max_retries = (
            int(max_retries_raw) if max_retries_raw else DEFAULT_AGENT_MAX_RETRIES
        )
    except ValueError:
        max_retries = DEFAULT_AGENT_MAX_RETRIES

    try:
        retry_delay_ms = (
            int(retry_delay_raw)
            if retry_delay_raw
            else int(DEFAULT_AGENT_RETRY_DELAY_SECONDS * 1000)
        )
    except ValueError:
        retry_delay_ms = int(DEFAULT_AGENT_RETRY_DELAY_SECONDS * 1000)

    max_retries = max(1, min(6, max_retries))
    retry_delay_seconds = max(0.1, min(8.0, retry_delay_ms / 1000))

    last_error: Exception | None = None
    for attempt in range(1, max_retries + 1):
        try:
            return agent.invoke(payload)
        except Exception as exc:
            last_error = exc
            if not _retryable_error(exc) or attempt >= max_retries:
                break
            time.sleep(retry_delay_seconds * attempt)

    if role == "judge":
        return (
            "The court notes a temporary upstream service disruption. "
            "Proceedings are briefly paused; counsel may repeat the last submission "
            "while the court restores service continuity."
        )
    if role == "prosecutor":
        return (
            "Prosecution notes a temporary service interruption and requests a brief "
            "continuance, preserving our submissions on record."
        )
    return (
        "Defense notes a temporary service interruption and requests a brief pause, "
        "without prejudice to prior submissions."
    )


def build_courtroom_graph(llm, checkpointer=None):
    enable_external_tools = os.getenv("TRIAL_ENABLE_EXTERNAL_TOOLS", "0").strip()
    tools_enabled = enable_external_tools in {"1", "true", "yes", "on"}

    tools = []
    if tools_enabled:
        tools = [
            retrieve_case_evidence,
            search_indian_legal_precedents,
        ]

    prosecutor_agent = get_prosecutor_agent(llm=llm, tools=tools)
    defender_agent = get_defender_agent(llm=llm, tools=tools)
    judge_agent = get_judge_agent(llm=llm, tools=tools)

    def _invoke_prosecutor(state) -> Any:
        prompt = _latest_user_prompt(state)
        return _invoke_agent_with_resilience(
            prosecutor_agent,
            {"messages": [("user", prompt)]},
            role="prosecutor",
        )

    def _invoke_defender(state) -> Any:
        prompt = _latest_user_prompt(state)
        return _invoke_agent_with_resilience(
            defender_agent,
            {"input": prompt},
            role="defender",
        )

    def _invoke_judge(state) -> Any:
        prompt = _latest_user_prompt(state)
        return _invoke_agent_with_resilience(
            judge_agent,
            {"input": prompt},
            role="judge",
        )

    def _is_user_role(state, role: str) -> bool:
        current_role = str(state.get("user_role", "")).strip().lower()
        return current_role == role

    def _normalize_turn(value: Any) -> str:
        turn = str(value).strip().lower()
        if turn in TURN_TO_NODE:
            return turn
        return ""

    def _node_for_turn(turn: str, default_node: str) -> str:
        return TURN_TO_NODE.get(turn, default_node)

    def _next_turn_after_prosecutor(state) -> str:
        if state.get("active_objection"):
            return "judge"
        if _is_user_role(state, "defender"):
            return "judge"
        return "defender"

    def _next_turn_after_defender(_) -> str:
        return "judge"

    def _next_turn_after_user_submission(state) -> str:
        user_role = str(state.get("user_role", "")).strip().lower()
        explicit_turn = _normalize_turn(state.get("current_turn", ""))

        if user_role in {"defender", "prosecutor"}:
            if explicit_turn and explicit_turn != user_role:
                return explicit_turn
            if user_role == "prosecutor":
                return "defender"
            return "prosecutor"

        return explicit_turn or "prosecutor"

    def _next_turn_after_judge(state) -> str:
        user_role = str(state.get("user_role", "")).strip().lower()
        if user_role in {"defender", "prosecutor"}:
            return user_role

        objection = state.get("active_objection")
        if isinstance(objection, dict):
            raised_by = str(objection.get("raised_by", "")).strip().lower()
            if raised_by == "defender":
                return "prosecutor"
            if raised_by == "prosecutor":
                return "defender"

        current_turn = _normalize_turn(state.get("current_turn", ""))
        if current_turn in {"defender", "prosecutor"}:
            return current_turn

        return "defender"

    def prosecutor_node(state):
        if _is_user_role(state, "prosecutor"):
            return {"current_turn": "defender"}
        response = _invoke_prosecutor(state)
        next_turn = _next_turn_after_prosecutor(state)
        return {
            "transcript": [AIMessage(content=_to_text(response), name="prosecutor")],
            "current_turn": next_turn,
        }

    def defender_node(state):
        if _is_user_role(state, "defender"):
            return {"current_turn": "judge"}
        response = _invoke_defender(state)
        next_turn = _next_turn_after_defender(state)
        return {
            "transcript": [AIMessage(content=_to_text(response), name="defender")],
            "current_turn": next_turn,
        }

    def judge_node(state):
        response = _invoke_judge(state)
        next_user_turn = _next_turn_after_judge(state)
        return {
            "transcript": [AIMessage(content=_to_text(response), name="judge")],
            "current_turn": next_user_turn,
            "active_objection": {},
        }

    def _route_after_prosecutor(state):
        turn = _normalize_turn(state.get("current_turn", ""))
        return _node_for_turn(turn, default_node="defender_node")

    def _route_after_defender(state):
        turn = _normalize_turn(state.get("current_turn", ""))
        return _node_for_turn(turn, default_node="judge_node")

    def _route_from_start(state):
        next_turn = _next_turn_after_user_submission(state)
        return _node_for_turn(next_turn, default_node="prosecutor_node")

    builder = StateGraph(CourtroomState)
    builder.add_node("prosecutor_node", prosecutor_node)
    builder.add_node("defender_node", defender_node)
    builder.add_node("judge_node", judge_node)

    builder.add_conditional_edges(
        START,
        _route_from_start,
        {
            "prosecutor_node": "prosecutor_node",
            "defender_node": "defender_node",
            "judge_node": "judge_node",
        },
    )
    builder.add_conditional_edges(
        "prosecutor_node",
        _route_after_prosecutor,
        {
            "prosecutor_node": "prosecutor_node",
            "defender_node": "defender_node",
            "judge_node": "judge_node",
        },
    )
    builder.add_conditional_edges(
        "defender_node",
        _route_after_defender,
        {
            "prosecutor_node": "prosecutor_node",
            "defender_node": "defender_node",
            "judge_node": "judge_node",
        },
    )
    builder.add_edge("judge_node", "prosecutor_node")

    if checkpointer is None:
        return builder.compile()
    return builder.compile(checkpointer=checkpointer)

from __future__ import annotations

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
        return f"Case details: {case_details}"
    return "Proceed with your courtroom role based on available context."


def build_courtroom_graph(llm, checkpointer=None):
    tools = [
        retrieve_case_evidence,
        search_indian_legal_precedents,
    ]

    prosecutor_agent = get_prosecutor_agent(llm=llm, tools=tools)
    defender_agent = get_defender_agent(llm=llm, tools=tools)
    judge_agent = get_judge_agent(llm=llm, tools=tools)

    def _invoke_prosecutor(state) -> Any:
        prompt = _latest_user_prompt(state)
        return prosecutor_agent.invoke({"messages": [("user", prompt)]})

    def _invoke_defender(state) -> Any:
        prompt = _latest_user_prompt(state)
        return defender_agent.invoke({"input": prompt})

    def _invoke_judge(state) -> Any:
        prompt = _latest_user_prompt(state)
        return judge_agent.invoke({"input": prompt})

    def prosecutor_node(state):
        response = _invoke_prosecutor(state)
        next_turn = "judge" if state.get("active_objection") else "defender"
        return {
            "transcript": [AIMessage(content=_to_text(response), name="prosecutor")],
            "current_turn": next_turn,
        }

    def defender_node(state):
        response = _invoke_defender(state)
        return {
            "transcript": [AIMessage(content=_to_text(response), name="defender")],
            "current_turn": "judge",
        }

    def judge_node(state):
        response = _invoke_judge(state)
        return {
            "transcript": [AIMessage(content=_to_text(response), name="judge")],
            "current_turn": "prosecutor",
            "active_objection": {},
        }

    def _route_after_prosecutor(state):
        if state.get("active_objection"):
            return "judge_node"
        return "defender_node"

    def _route_after_defender(state):
        return "judge_node"

    builder = StateGraph(CourtroomState)
    builder.add_node("prosecutor_node", prosecutor_node)
    builder.add_node("defender_node", defender_node)
    builder.add_node("judge_node", judge_node)

    builder.add_edge(START, "prosecutor_node")
    builder.add_conditional_edges(
        "prosecutor_node",
        _route_after_prosecutor,
        {
            "defender_node": "defender_node",
            "judge_node": "judge_node",
        },
    )
    builder.add_conditional_edges(
        "defender_node",
        _route_after_defender,
        {
            "judge_node": "judge_node",
        },
    )
    builder.add_edge("judge_node", "prosecutor_node")

    if checkpointer is None:
        return builder.compile()
    return builder.compile(checkpointer=checkpointer)

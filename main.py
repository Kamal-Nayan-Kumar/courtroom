from __future__ import annotations

import asyncio
import json
import os
from typing import Any

from fastapi import (
    FastAPI,
    File,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
import os

from graph.builder import build_courtroom_graph
from graph.checkpointer import create_astra_checkpointer

app = FastAPI()

GEMINI_MODEL_ENV = "GEMINI_CHAT_MODEL"
GEMINI_MAX_OUTPUT_TOKENS_ENV = "GEMINI_MAX_OUTPUT_TOKENS"
DEFAULT_GEMINI_MODEL = "gpt-4o-mini"
DEFAULT_GEMINI_MAX_OUTPUT_TOKENS = 128


class SuggestResponse(BaseModel):
    suggestions: list[str] = Field(min_length=3, max_length=3)


class SuggestRequest(BaseModel):
    case_details: str = ""
    evidence_list: list[str] = Field(default_factory=list)
    transcript: list[Any] = Field(default_factory=list)
    current_turn: str = ""
    active_objection: dict[str, Any] = Field(default_factory=dict)
    trial_status: str = ""


class ReportRequest(BaseModel):
    case_details: str = ""
    evidence_list: list[str] = Field(default_factory=list)
    transcript: list[Any] = Field(default_factory=list)
    current_turn: str = ""
    active_objection: dict[str, Any] = Field(default_factory=dict)
    trial_status: str = ""


class ReportResponse(BaseModel):
    score: int = Field(ge=0, le=100)
    feedback: str


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
        content = payload.get("content")
        if content is not None:
            return _to_text(content)

    return str(payload)


def _missing_env_vars(required: tuple[str, ...]) -> list[str]:
    return [name for name in required if not os.getenv(name)]


def _build_trial_stream_graph():
    missing = _missing_env_vars(("GITHUB_MODELS_API_KEY",))
    if missing:
        missing_list = ", ".join(missing)
        raise RuntimeError(f"Missing required environment variable(s): {missing_list}")

    configured_model = os.getenv(GEMINI_MODEL_ENV, DEFAULT_GEMINI_MODEL).strip()
    selected_model = configured_model or DEFAULT_GEMINI_MODEL

    raw_max_output_tokens = os.getenv(GEMINI_MAX_OUTPUT_TOKENS_ENV, "").strip()
    if raw_max_output_tokens:
        try:
            max_output_tokens = int(raw_max_output_tokens)
        except ValueError:
            max_output_tokens = DEFAULT_GEMINI_MAX_OUTPUT_TOKENS
    else:
        max_output_tokens = DEFAULT_GEMINI_MAX_OUTPUT_TOKENS

    llm = ChatOpenAI(
        api_key=os.environ.get("GITHUB_MODELS_API_KEY"),
        base_url="https://models.inference.ai.azure.com",
        
        model=selected_model,
        temperature=0,
        max_tokens=max_output_tokens,
    )
    checkpointer = create_astra_checkpointer()
    return build_courtroom_graph(llm=llm, checkpointer=checkpointer)


def _build_suggestion_llm() -> ChatOpenAI:
    missing = _missing_env_vars(("GITHUB_MODELS_API_KEY",))
    if missing:
        missing_list = ", ".join(missing)
        raise RuntimeError(f"Missing required environment variable(s): {missing_list}")

    configured_model = os.getenv(GEMINI_MODEL_ENV, DEFAULT_GEMINI_MODEL).strip()
    selected_model = configured_model or DEFAULT_GEMINI_MODEL

    raw_max_output_tokens = os.getenv(GEMINI_MAX_OUTPUT_TOKENS_ENV, "").strip()
    if raw_max_output_tokens:
        try:
            max_output_tokens = int(raw_max_output_tokens)
        except ValueError:
            max_output_tokens = DEFAULT_GEMINI_MAX_OUTPUT_TOKENS
    else:
        max_output_tokens = DEFAULT_GEMINI_MAX_OUTPUT_TOKENS

    return ChatOpenAI(
        api_key=os.environ.get("GITHUB_MODELS_API_KEY"),
        base_url="https://models.inference.ai.azure.com",
        
        model=selected_model,
        temperature=0,
        max_tokens=max_output_tokens,
    )


def _flatten_transcript(transcript: list[Any]) -> str:
    if not transcript:
        return ""

    chunks: list[str] = []
    for item in transcript:
        text = _to_text(item).strip()
        if text:
            chunks.append(text)
    return "\n".join(chunks)


def _build_suggestion_prompt(state: SuggestRequest) -> str:
    payload = {
        "case_details": state.case_details,
        "evidence_list": state.evidence_list,
        "transcript": _flatten_transcript(state.transcript),
        "current_turn": state.current_turn,
        "active_objection": state.active_objection,
        "trial_status": state.trial_status,
    }
    return (
        "You are a legal co-pilot for an Indian courtroom trial. "
        "Based on this trial state, give exactly 3 strategic suggestions for "
        "the current side (Prosecutor or Defender). Keep each suggestion short, "
        "actionable, and specific to the record. Return only the structured output.\n\n"
        f"Trial state:\n{json.dumps(payload, ensure_ascii=False, indent=2)}"
    )


def _build_report_prompt(state: ReportRequest) -> str:
    payload = {
        "case_details": state.case_details,
        "evidence_list": state.evidence_list,
        "transcript": _flatten_transcript(state.transcript),
        "current_turn": state.current_turn,
        "active_objection": state.active_objection,
        "trial_status": state.trial_status,
    }
    return (
        "You are an impartial courtroom evaluator for an Indian law trial. "
        "Review the complete transcript and state, then score the user's overall "
        "performance from 0 to 100. Return only the structured output with a "
        "numeric score and concise feedback explaining strengths and improvements.\n\n"
        f"Trial state:\n{json.dumps(payload, ensure_ascii=False, indent=2)}"
    )


async def _generate_suggestions(state: SuggestRequest) -> list[str]:
    llm = _build_suggestion_llm().with_structured_output(SuggestResponse)
    prompt = _build_suggestion_prompt(state)
    response = await asyncio.to_thread(llm.invoke, prompt)

    if isinstance(response, SuggestResponse):
        suggestions = response.suggestions
    elif isinstance(response, dict):
        suggestions = response.get("suggestions", [])
    else:
        suggestions = getattr(response, "suggestions", [])

    cleaned = [
        suggestion.strip()
        for suggestion in suggestions
        if isinstance(suggestion, str) and suggestion.strip()
    ]
    if len(cleaned) != 3:
        raise RuntimeError(
            "Gemini suggestion response did not return exactly 3 suggestions."
        )
    return cleaned


async def _generate_report(state: ReportRequest) -> ReportResponse:
    llm = _build_suggestion_llm().with_structured_output(ReportResponse)
    prompt = _build_report_prompt(state)
    response = await asyncio.to_thread(llm.invoke, prompt)

    if isinstance(response, ReportResponse):
        report = response
    elif isinstance(response, dict):
        report = ReportResponse(**response)
    else:
        report = ReportResponse(
            score=getattr(response, "score"),
            feedback=getattr(response, "feedback"),
        )

    return ReportResponse(score=report.score, feedback=report.feedback.strip())


def _extract_turn(node_name: str, node_update: dict[str, Any]) -> str:
    transcript = node_update.get("transcript")
    if isinstance(transcript, list) and transcript:
        latest = transcript[-1]
        speaker_name = getattr(latest, "name", None)
        if isinstance(speaker_name, str) and speaker_name.strip():
            return speaker_name.strip()

    if node_name.endswith("_node"):
        return node_name.removesuffix("_node")
    return node_name


def _extract_content(node_update: dict[str, Any]) -> str:
    transcript = node_update.get("transcript")
    if isinstance(transcript, list) and transcript:
        return _to_text(transcript[-1]).strip()
    return _to_text(node_update).strip()


@app.post("/api/v1/cases/upload")
async def upload_case_file(file: UploadFile = File(...)) -> dict[str, str | int]:
    if file.content_type not in {"text/plain", "application/octet-stream", None}:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type. Please upload a plain text file.",
        )

    raw_bytes = await file.read()
    if not raw_bytes or not raw_bytes.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    try:
        parsed_text = raw_bytes.decode("utf-8").strip()
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file content. Please upload UTF-8 plain text.",
        ) from exc

    if not parsed_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    return {
        "filename": file.filename or "uploaded.txt",
        "content_type": file.content_type or "application/octet-stream",
        "char_count": len(parsed_text),
        "parsed_text": parsed_text,
    }


@app.post("/api/v1/trial/suggest")
async def suggest_trial_moves(request: SuggestRequest) -> dict[str, list[str]]:
    try:
        suggestions = await _generate_suggestions(request)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Suggestion engine failed: {exc.__class__.__name__}: {exc}",
        ) from exc

    return {"suggestions": suggestions}


@app.post("/api/v1/trial/report", response_model=ReportResponse)
async def report_trial_performance(request: ReportRequest) -> ReportResponse:
    try:
        report = await _generate_report(request)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Report engine failed: {exc.__class__.__name__}: {exc}",
        ) from exc

    return report


@app.websocket("/api/v1/trial/stream")
async def trial_stream(websocket: WebSocket) -> None:
    await websocket.accept()

    graph = None

    while True:
        try:
            payload = await websocket.receive_json()
        except WebSocketDisconnect:
            return
        except Exception:
            await websocket.send_json(
                {
                    "error": (
                        "Invalid payload. Expected JSON like "
                        '{"message": "I object!", "thread_id": "123"}.'
                    )
                }
            )
            continue

        if not isinstance(payload, dict):
            await websocket.send_json(
                {
                    "error": (
                        "Invalid payload. Expected JSON object with "
                        "`message` and `thread_id`."
                    )
                }
            )
            continue

        raw_message = payload.get("message")
        raw_thread_id = payload.get("thread_id")

        message = raw_message.strip() if isinstance(raw_message, str) else ""
        thread_id = str(raw_thread_id).strip() if raw_thread_id is not None else ""

        if not message:
            await websocket.send_json(
                {"error": "`message` is required and must be a non-empty string."}
            )
            continue

        if not thread_id:
            await websocket.send_json(
                {"error": "`thread_id` is required and must be non-empty."}
            )
            continue

        if graph is None:
            try:
                graph = await asyncio.to_thread(_build_trial_stream_graph)
            except Exception as exc:
                try:
                    await websocket.send_json(
                        {
                            "error": (
                                "Trial stream unavailable. Failed to initialize "
                                "graph/checkpointer: "
                                f"{exc.__class__.__name__}: {exc}"
                            )
                        }
                    )
                except WebSocketDisconnect:
                    return
                await websocket.close(code=1011)
                return

        try:
            async for event in graph.astream(
                {"transcript": [HumanMessage(content=message)]},
                config={
                    "configurable": {"thread_id": thread_id},
                    "recursion_limit": 20,
                },
                stream_mode="updates",
                interrupt_after=["judge_node"],
            ):
                if not isinstance(event, dict):
                    continue

                for node_name, node_update in event.items():
                    if not isinstance(node_name, str) or node_name.startswith("__"):
                        continue
                    if not isinstance(node_update, dict):
                        continue

                    content = _extract_content(node_update)
                    if not content:
                        continue

                    await websocket.send_json(
                        {
                            "turn": _extract_turn(node_name, node_update),
                            "content": content,
                        }
                    )

            await websocket.send_json({"event": "done", "thread_id": thread_id})
        except WebSocketDisconnect:
            return
        except Exception as exc:
            await websocket.send_json(
                {
                    "error": (
                        "Trial stream execution failed: "
                        f"{exc.__class__.__name__}: {exc}"
                    )
                }
            )

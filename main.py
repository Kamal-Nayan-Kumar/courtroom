from __future__ import annotations

import asyncio
import base64
import json
import os
import re
import uuid
from typing import Any

import httpx
from fastapi import (
    FastAPI,
    Body,
    File,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from pydantic import BaseModel, Field, SecretStr
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI

from graph.builder import build_courtroom_graph
from graph.checkpointer import create_astra_checkpointer

app = FastAPI()

GEMINI_MODEL_ENV = "GEMINI_CHAT_MODEL"
GEMINI_MAX_OUTPUT_TOKENS_ENV = "GEMINI_MAX_OUTPUT_TOKENS"
DEFAULT_GEMINI_MODEL = "gpt-4o"
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



class JudgmentRequest(BaseModel):
    case_details: str = ""
    evidence_list: list[str] = Field(default_factory=list)
    transcript: list[Any] = Field(default_factory=list)
    player_role: str = ""
    timer_minutes: int = 5

class JudgmentResponse(BaseModel):
    judgment: str

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


class TTSRequest(BaseModel):
    text: str = Field(min_length=1)
    voice_gender: str = Field(default="female")
    speaker_role: str = Field(default="")
    language_code: str = Field(default="en-IN")


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


def _ingest_uploaded_case_text(filename: str, parsed_text: str) -> tuple[str, int]:
    from rag.splitter import LegalTextSplitter
    from rag.vectorstore import get_vector_store

    case_id = f"case-{uuid.uuid4().hex[:12]}"
    splitter = LegalTextSplitter(chunk_size=800, chunk_overlap=120)
    chunks = splitter.split_text(parsed_text)
    if not chunks:
        raise RuntimeError("No chunks generated from uploaded case details.")

    metadatas = [
        {
            "source": filename,
            "case_id": case_id,
            "chunk_index": index,
        }
        for index in range(len(chunks))
    ]
    ids = [f"{case_id}-chunk-{index}" for index in range(len(chunks))]

    vector_store = get_vector_store()
    vector_store.add_texts(chunks, metadatas=metadatas, ids=ids)
    return case_id, len(chunks)


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
        api_key=SecretStr(os.environ["GITHUB_MODELS_API_KEY"]),
        base_url="https://models.inference.ai.azure.com",
        model=selected_model,
        temperature=0,
        max_completion_tokens=max_output_tokens,
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
        api_key=SecretStr(os.environ["GITHUB_MODELS_API_KEY"]),
        base_url="https://models.inference.ai.azure.com",
        model=selected_model,
        temperature=0,
        max_completion_tokens=max_output_tokens,
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



def _build_judgment_prompt(state: JudgmentRequest) -> str:
    payload = {
        "case_details": state.case_details,
        "transcript": _flatten_transcript(state.transcript),
        "player_role": state.player_role,
        "timer_minutes": state.timer_minutes,
    }
    import json
    return (
        "You are the Honorable Judge presiding over an Indian court trial. "
        "The allocated time has expired. Review the arguments and provide a decisive, "
        "conclusive, and final judgment on the case in the first person. "
        "Keep it concise (2-3 paragraphs) but authoritative. Return only the structured output with the judgment string.\n\n"
        f"Trial state:\n{json.dumps(payload, ensure_ascii=False, indent=2)}"
    )
async def _generate_judgment(state: JudgmentRequest) -> JudgmentResponse:
    llm = _build_suggestion_llm().with_structured_output(JudgmentResponse)
    prompt = _build_judgment_prompt(state)
    import asyncio
    response = await asyncio.to_thread(llm.invoke, prompt)

    if isinstance(response, JudgmentResponse):
        return response
    elif isinstance(response, dict):
        return JudgmentResponse(**response)
    else:
        return JudgmentResponse(judgment=getattr(response, "judgment", ""))

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
        return _normalize_courtroom_speech(_to_text(transcript[-1]).strip())
    return _normalize_courtroom_speech(_to_text(node_update).strip())


def _has_spoken_turn(node_update: dict[str, Any]) -> bool:
    transcript = node_update.get("transcript")
    if not isinstance(transcript, list) or not transcript:
        return False
    return bool(_to_text(transcript[-1]).strip())


def _normalize_courtroom_speech(text: str) -> str:
    if not text:
        return text

    cleaned = text
    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"^\s*#{1,6}\s*", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"^\s*[-*]\s+", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


_SARVAM_SPEAKERS_BY_GENDER: dict[str, tuple[str, ...]] = {
    "female": ("kavya", "simran", "pavithra", "swara"),
    "male": ("amit", "rohan", "arjun", "raman"),
}

_SPEAKER_BY_ROLE_AND_GENDER: dict[str, dict[str, str]] = {
    "judge": {"female": "kavya", "male": "amit"},
    "prosecutor": {"female": "simran", "male": "rohan"},
    "defender": {"female": "pavithra", "male": "arjun"},
}


def _select_sarvam_speaker(voice_gender: str, speaker_role: str = "") -> str:
    normalized_gender = voice_gender.strip().lower()
    normalized_role = speaker_role.strip().lower()

    if normalized_role in _SPEAKER_BY_ROLE_AND_GENDER:
        role_speakers = _SPEAKER_BY_ROLE_AND_GENDER[normalized_role]
        if normalized_gender in role_speakers:
            return role_speakers[normalized_gender]

    speakers = _SARVAM_SPEAKERS_BY_GENDER.get(normalized_gender)
    if speakers:
        return speakers[0]

    return _SARVAM_SPEAKERS_BY_GENDER["female"][0]


@app.post("/api/v1/cases/upload")
async def upload_case_file(file: UploadFile = File(...)) -> dict[str, str | int]:
    if file.content_type not in {
        "text/plain",
        "application/octet-stream",
        "text/markdown",
        None,
    }:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type. Please upload a plain text or markdown file.",
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

    filename = file.filename or "uploaded.txt"

    try:
        case_id, chunk_count = await asyncio.to_thread(
            _ingest_uploaded_case_text,
            filename,
            parsed_text,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Failed to store uploaded case details for retrieval: "
                f"{exc.__class__.__name__}: {exc}"
            ),
        ) from exc

    return {
        "filename": filename,
        "content_type": file.content_type or "application/octet-stream",
        "char_count": len(parsed_text),
        "parsed_text": parsed_text,
        "case_id": case_id,
        "chunk_count": chunk_count,
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



@app.post("/api/v1/trial/judgment", response_model=JudgmentResponse)
async def generate_final_judgment(request: JudgmentRequest) -> JudgmentResponse:
    try:
        judgment = await _generate_judgment(request)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Judgment engine failed: {exc.__class__.__name__}: {exc}",
        ) from exc
    return judgment

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


@app.post("/api/v1/tts")
async def generate_tts_audio(request: TTSRequest = Body(...)) -> dict[str, str]:
    sarvam_api_key = os.getenv("SARVAM_API_KEY", "").strip()
    if not sarvam_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Sarvam TTS is not configured. Missing SARVAM_API_KEY.",
        )

    request.language_code = "en-IN"

    payload = {
        "inputs": [request.text],
        "target_language_code": request.language_code,
        "speaker": _select_sarvam_speaker(
            request.voice_gender,
            request.speaker_role,
        ),
        "model": "bulbul:v3",
    }
    headers = {
        "api-subscription-key": sarvam_api_key,
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.sarvam.ai/text-to-speech",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Sarvam TTS request failed: {exc.__class__.__name__}: {exc}",
        ) from exc

    audios = data.get("audios") if isinstance(data, dict) else None
    if not isinstance(audios, list) or not audios or not isinstance(audios[0], str):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Sarvam TTS response missing audio payload.",
        )

    try:
        base64.b64decode(audios[0], validate=True)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Sarvam TTS returned invalid audio format: {exc}",
        ) from exc

    return {
        "audio_base64": audios[0],
        "mime_type": "audio/wav",
    }


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
        raw_player_role = payload.get("player_role")
        raw_case_details = payload.get("case_details")

        message = raw_message.strip() if isinstance(raw_message, str) else ""
        thread_id = str(raw_thread_id).strip() if raw_thread_id is not None else ""
        player_role = (
            raw_player_role.strip().lower()
            if isinstance(raw_player_role, str)
            else "defender"
        )
        case_details = (
            raw_case_details.strip() if isinstance(raw_case_details, str) else ""
        )

        if player_role not in {"defender", "prosecutor"}:
            player_role = "defender"

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
                {
                    "transcript": [HumanMessage(content=message)],
                    "user_role": player_role,
                    "case_details": case_details,
                },
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
                    if not _has_spoken_turn(node_update):
                        continue

                    content = _extract_content(node_update)
                    if not content:
                        continue

                    await websocket.send_json(
                        {
                            "event": "turn",
                            "turn": _extract_turn(node_name, node_update),
                            "content": content,
                            "current_turn": str(
                                node_update.get("current_turn", "")
                            ).strip(),
                            "player_role": player_role,
                        }
                    )

            await websocket.send_json(
                {
                    "event": "done",
                    "thread_id": thread_id,
                    "player_role": player_role,
                }
            )
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

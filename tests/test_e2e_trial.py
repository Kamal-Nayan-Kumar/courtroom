from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
from collections.abc import Sequence
from typing import Any

import websockets
from langchain_core.runnables import RunnableConfig

from graph.checkpointer import create_astra_checkpointer

TRIAL_WS_URL = "ws://localhost:8000/api/v1/trial/stream"
DEFAULT_CHECKPOINTER_COLLECTION = "langgraph_checkpoints"
REQUIRED_ENV_VARS = (
    "GITHUB_MODELS_API_KEY",
    "ASTRA_DB_APPLICATION_TOKEN",
    "ASTRA_DB_API_ENDPOINT",
    "ASTRA_DB_NAMESPACE",
)
DEFAULT_TURN_MESSAGES = (
    "Turn 1: Prosecutor, present a concise opening argument. Defender and judge should each respond in one short paragraph. For this E2E test, do not call any external tools.",
    "Turn 2: Defender, challenge one factual gap in the prosecution argument. Prosecutor and judge should respond. For this E2E test, do not call any external tools.",
    "Turn 3: Prosecutor, introduce one forensic point and connect it to intent under IPC 302. Defender and judge should respond. For this E2E test, do not call any external tools.",
    "Turn 4: Defender, raise a procedural objection and ask judge for a ruling. Prosecutor and judge should respond. For this E2E test, do not call any external tools.",
    "Turn 5: Judge, provide an interim summary of strengths and weaknesses for both sides and what should happen next. For this E2E test, do not call any external tools.",
)


def _missing_env_vars() -> list[str]:
    return [name for name in REQUIRED_ENV_VARS if not os.getenv(name)]


def _resolve_turn_count() -> int:
    raw_value = os.getenv("TRIAL_E2E_TURNS", "5").strip()
    try:
        turn_count = int(raw_value)
    except ValueError as exc:
        raise RuntimeError(
            "TRIAL_E2E_TURNS must be an integer between 2 and 5."
        ) from exc

    max_turns = len(DEFAULT_TURN_MESSAGES)
    if turn_count < 2 or turn_count > max_turns:
        raise RuntimeError(f"TRIAL_E2E_TURNS must be between 2 and {max_turns}.")
    return turn_count


def _checkpoint_config(thread_id: str) -> RunnableConfig:
    return {"configurable": {"thread_id": thread_id}}


def _extract_transcript(checkpoint_payload: Any) -> list[Any] | None:
    if isinstance(checkpoint_payload, dict):
        channel_values = checkpoint_payload.get("channel_values")
        if isinstance(channel_values, dict):
            transcript = channel_values.get("transcript")
            if isinstance(transcript, list):
                return transcript

        transcript = checkpoint_payload.get("transcript")
        if isinstance(transcript, list):
            return transcript

    channel_values = getattr(checkpoint_payload, "channel_values", None)
    if isinstance(channel_values, dict):
        transcript = channel_values.get("transcript")
        if isinstance(transcript, list):
            return transcript

    transcript = getattr(checkpoint_payload, "transcript", None)
    if isinstance(transcript, list):
        return transcript

    return None


def _is_user_message(message: Any) -> bool:
    if isinstance(message, dict):
        message_type = message.get("type")
        role = message.get("role")
        if isinstance(message_type, str) and message_type.lower() in {"human", "user"}:
            return True
        if isinstance(role, str) and role.lower() == "user":
            return True

    message_type = getattr(message, "type", None)
    role = getattr(message, "role", None)
    if isinstance(message_type, str) and message_type.lower() in {"human", "user"}:
        return True
    if isinstance(role, str) and role.lower() == "user":
        return True

    return message.__class__.__name__ == "HumanMessage"


def _count_user_messages(transcript: list[Any]) -> int:
    return sum(1 for message in transcript if _is_user_message(message))


async def _send_and_collect(
    websocket: Any,
    *,
    thread_id: str,
    message: str,
) -> list[dict[str, Any]]:
    await websocket.send(
        json.dumps(
            {
                "message": message,
                "thread_id": thread_id,
            }
        )
    )

    updates: list[dict[str, Any]] = []

    while True:
        raw_message = await asyncio.wait_for(websocket.recv(), timeout=120)
        if isinstance(raw_message, bytes):
            raw_message = raw_message.decode("utf-8")

        event = json.loads(raw_message)
        if not isinstance(event, dict):
            raise RuntimeError(f"Unexpected non-object event: {event!r}")

        if "error" in event:
            raise RuntimeError(f"Server returned websocket error: {event['error']}")

        if "turn" in event and "content" in event:
            updates.append(event)

        if event.get("event") == "done":
            done_thread_id = str(event.get("thread_id", "")).strip()
            if done_thread_id != thread_id:
                raise RuntimeError(
                    "Server completed a different thread than requested: "
                    f"expected={thread_id}, got={done_thread_id}"
                )
            break

    return updates


async def _run_websocket_trial(
    *,
    uri: str,
    thread_id: str,
    turn_messages: Sequence[str],
) -> int:
    total_updates = 0
    async with websockets.connect(uri, open_timeout=10, close_timeout=10) as websocket:
        for turn_index, turn_message in enumerate(turn_messages, start=1):
            updates = await _send_and_collect(
                websocket,
                thread_id=thread_id,
                message=turn_message,
            )
            if not updates:
                raise RuntimeError(
                    f"No streamed updates returned for turn {turn_index}."
                )

            total_updates += len(updates)
            print(f"Turn {turn_index} complete")

    return total_updates


def _verify_checkpointer(
    *,
    thread_id: str,
    minimum_user_turns: int,
) -> int:
    collection_name = (
        os.getenv(
            "ASTRA_DB_CHECKPOINTER_COLLECTION", DEFAULT_CHECKPOINTER_COLLECTION
        ).strip()
        or DEFAULT_CHECKPOINTER_COLLECTION
    )
    saver = create_astra_checkpointer(collection_name=collection_name)
    config = _checkpoint_config(thread_id)

    attempts = 6
    for attempt in range(1, attempts + 1):
        latest_tuple = saver.get_tuple(config)
        checkpoint_tuples = list(saver.list(config))
        checkpoint_docs = list(
            saver.collection.find(
                filter={
                    "doc_type": "checkpoint",
                    "thread_id": thread_id,
                }
            )
        )

        transcript: list[Any] | None = None
        if latest_tuple is not None:
            transcript = _extract_transcript(latest_tuple.checkpoint)

        transcript_count = len(transcript) if isinstance(transcript, list) else 0
        user_turn_count = _count_user_messages(transcript or [])

        if (
            latest_tuple is not None
            and checkpoint_tuples
            and checkpoint_docs
            and user_turn_count >= minimum_user_turns
        ):
            print(
                f"Checkpointer verified: {transcript_count} messages found in Astra DB"
            )
            return transcript_count

        if attempt < attempts:
            time.sleep(1)

    raise RuntimeError(
        "Checkpointer verification failed for thread_id="
        f"{thread_id}. Expected at least {minimum_user_turns} persisted user turns."
    )


def main() -> int:
    missing_env_vars = _missing_env_vars()
    if missing_env_vars:
        print(
            "Missing required environment variable(s): "
            f"{', '.join(sorted(missing_env_vars))}"
        )
        print("Fast-failing E2E trial test due to missing credentials/configuration.")
        return 1

    uri = os.getenv("TRIAL_WS_URL", TRIAL_WS_URL)
    thread_id = os.getenv("TRIAL_THREAD_ID", f"e2e-trial-{uuid.uuid4().hex[:10]}")

    try:
        turn_count = _resolve_turn_count()
        turn_messages = list(DEFAULT_TURN_MESSAGES[:turn_count])
        streamed_updates = asyncio.run(
            _run_websocket_trial(
                uri=uri,
                thread_id=thread_id,
                turn_messages=turn_messages,
            )
        )
        print(
            "WebSocket simulation complete: "
            f"{streamed_updates} streamed AI update(s) received."
        )

        _verify_checkpointer(thread_id=thread_id, minimum_user_turns=turn_count)
        print("E2E trial + Astra checkpointer verification passed.")
        return 0
    except Exception as exc:
        print(f"E2E trial verification failed: {exc.__class__.__name__}: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

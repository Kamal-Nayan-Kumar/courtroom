from __future__ import annotations

import asyncio
import json
import os
from typing import Any

import websockets

TRIAL_WS_URL = "ws://localhost:8000/api/v1/trial/stream"
REQUIRED_ENV_VARS = (
    "GEMINI_API_KEY",
    "PERPLEXITY_API_KEY",
    "ASTRA_DB_APPLICATION_TOKEN",
    "ASTRA_DB_API_ENDPOINT",
    "ASTRA_DB_NAMESPACE",
)


def _missing_env_vars() -> list[str]:
    return [name for name in REQUIRED_ENV_VARS if not os.getenv(name)]


async def _run_websocket_smoke_test() -> None:
    uri = os.getenv("TRIAL_WS_URL", TRIAL_WS_URL)
    thread_id = os.getenv("TRIAL_THREAD_ID", "trial-websocket-smoke-thread")

    first_message = os.getenv(
        "TRIAL_MESSAGE_1",
        (
            "Prosecutor and defender, provide one concise turn each; "
            "judge should then summarize the current posture."
        ),
    )
    second_message = os.getenv(
        "TRIAL_MESSAGE_2",
        "Continue the same thread and respond to this follow-up objection.",
    )

    streamed_updates: list[dict[str, Any]] = []

    async def _send_and_collect(websocket, message: str) -> list[dict[str, Any]]:
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
            raw_message = await asyncio.wait_for(websocket.recv(), timeout=90)
            if isinstance(raw_message, bytes):
                raw_message = raw_message.decode("utf-8")

            event = json.loads(raw_message)
            if not isinstance(event, dict):
                raise RuntimeError(f"Unexpected non-object event: {event!r}")

            if "error" in event:
                raise RuntimeError(f"Server returned websocket error: {event['error']}")

            if "turn" in event and "content" in event:
                updates.append(event)
                print(f"[{event['turn']}] {event['content']}")

            if event.get("event") == "done":
                done_thread_id = str(event.get("thread_id", "")).strip()
                if done_thread_id != thread_id:
                    raise RuntimeError(
                        "Server completed a different thread than requested: "
                        f"expected={thread_id}, got={done_thread_id}"
                    )
                break

        return updates

    async with websockets.connect(uri, open_timeout=10, close_timeout=10) as websocket:
        print("Sending first message...")
        first_updates = await _send_and_collect(websocket, first_message)
        if not first_updates:
            raise RuntimeError("No streamed updates for first websocket request.")
        streamed_updates.extend(first_updates)

        print("Sending second message with same thread_id...")
        second_updates = await _send_and_collect(websocket, second_message)
        if not second_updates:
            raise RuntimeError("No streamed updates for second websocket request.")
        streamed_updates.extend(second_updates)

    if not streamed_updates:
        raise RuntimeError("No streamed turn updates received from websocket endpoint.")

    turns = [str(item.get("turn", "")) for item in streamed_updates]
    print(f"Received {len(streamed_updates)} streamed update(s): {', '.join(turns)}")


def main() -> int:
    missing = _missing_env_vars()
    if missing:
        print(f"Missing required environment variable(s): {', '.join(sorted(missing))}")
        print("Fast-failing websocket smoke test due to missing API credentials.")
        return 1

    try:
        asyncio.run(_run_websocket_smoke_test())
        print("WebSocket trial stream smoke test passed.")
        return 0
    except Exception as exc:
        print(f"WebSocket trial stream smoke test failed: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

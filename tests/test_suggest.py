from __future__ import annotations

import asyncio

import httpx

import main


async def _run() -> None:
    async def fake_generate_suggestions(request: main.SuggestRequest) -> list[str]:
        return [
            "Ask about the strongest inconsistent statement in the transcript.",
            "Object to speculative testimony and force the witness to anchor facts.",
            "Point out the missing link between the evidence and intent.",
        ]

    original = main._generate_suggestions
    main._generate_suggestions = fake_generate_suggestions
    try:
        transport = httpx.ASGITransport(app=main.app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/trial/suggest",
                json={
                    "case_details": "State vs. Rajesh Kumar under IPC 302.",
                    "evidence_list": [
                        "Witness says accused was seen near the scene at 10:30 PM.",
                        "Forensic report mentions blood traces on a recovered knife.",
                    ],
                    "transcript": [
                        {"role": "prosecutor", "content": "The accused had motive."}
                    ],
                    "current_turn": "defender",
                    "active_objection": {},
                    "trial_status": "in_progress",
                },
            )

        response.raise_for_status()
        payload = response.json()
        assert isinstance(payload.get("suggestions"), list)
        assert len(payload["suggestions"]) == 3
        print(payload)
    finally:
        main._generate_suggestions = original


def main_cli() -> int:
    asyncio.run(_run())
    return 0


if __name__ == "__main__":
    raise SystemExit(main_cli())

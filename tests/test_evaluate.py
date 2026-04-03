from __future__ import annotations

import asyncio

import httpx

import main


async def _run() -> None:
    async def fake_generate_evaluation(
        request: main.EvaluateRequest,
    ) -> main.EvaluateResponse:
        assert request.player_role in {"defender", "prosecutor"}
        return main.EvaluateResponse(
            win_chance=64,
            rationale="The user's side currently has moderate evidentiary support.",
        )

    original = main._generate_evaluation
    main._generate_evaluation = fake_generate_evaluation
    try:
        transport = httpx.ASGITransport(app=main.app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/trial/evaluate",
                json={
                    "case_details": "State vs. R.",
                    "evidence_list": ["Witness testimony"],
                    "transcript": [{"role": "judge", "content": "Proceed."}],
                    "current_turn": "defender",
                    "player_role": "defender",
                },
            )

        response.raise_for_status()
        payload = response.json()
        assert isinstance(payload.get("win_chance"), int)
        assert 0 <= payload["win_chance"] <= 100
    finally:
        main._generate_evaluation = original


def main_cli() -> int:
    asyncio.run(_run())
    return 0


if __name__ == "__main__":
    raise SystemExit(main_cli())

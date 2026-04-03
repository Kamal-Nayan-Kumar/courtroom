from __future__ import annotations

import asyncio

import httpx

import main


async def _run() -> None:
    async def fake_generate_judgment(
        request: main.JudgmentRequest,
    ) -> main.JudgmentResponse:
        assert request.timer_minutes in {5, 10}
        return main.JudgmentResponse(
            judgment="After hearing both sides, this court records a provisional finding based on available evidence.",
        )

    original = main._generate_judgment
    main._generate_judgment = fake_generate_judgment
    try:
        transport = httpx.ASGITransport(app=main.app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/trial/judgment",
                json={
                    "case_details": "State vs. R.",
                    "evidence_list": ["Exhibit A"],
                    "transcript": [
                        {"role": "prosecutor", "content": "Motive established."}
                    ],
                    "player_role": "prosecutor",
                    "timer_minutes": 5,
                },
            )

        response.raise_for_status()
        payload = response.json()
        assert isinstance(payload.get("judgment"), str)
        assert payload["judgment"].strip()
    finally:
        main._generate_judgment = original


def main_cli() -> int:
    asyncio.run(_run())
    return 0


if __name__ == "__main__":
    raise SystemExit(main_cli())

from __future__ import annotations

import asyncio

import httpx

import main


async def _run() -> None:
    async def fake_generate_report(request: main.ReportRequest) -> main.ReportResponse:
        return main.ReportResponse(
            score=87,
            feedback=(
                "Strong command of the facts and a clear trial narrative, but "
                "tighten objection handling and cite evidence more consistently."
            ),
        )

    original = main._generate_report
    main._generate_report = fake_generate_report
    try:
        transport = httpx.ASGITransport(app=main.app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/trial/report",
                json={
                    "case_details": "State vs. Rajesh Kumar under IPC 302.",
                    "evidence_list": [
                        "Witness says accused was seen near the scene at 10:30 PM.",
                        "Forensic report mentions blood traces on a recovered knife.",
                    ],
                    "transcript": [
                        {"role": "prosecutor", "content": "The accused had motive."},
                        {"role": "judge", "content": "Objection overruled."},
                    ],
                    "current_turn": "defender",
                    "active_objection": {},
                    "trial_status": "completed",
                },
            )

        response.raise_for_status()
        payload = response.json()
        assert isinstance(payload.get("score"), int)
        assert 0 <= payload["score"] <= 100
        assert isinstance(payload.get("feedback"), str)
        assert payload["feedback"].strip()
        print(payload)
    finally:
        main._generate_report = original


def main_cli() -> int:
    asyncio.run(_run())
    return 0


if __name__ == "__main__":
    raise SystemExit(main_cli())

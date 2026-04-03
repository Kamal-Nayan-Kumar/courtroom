# AI Courtroom

AI Courtroom is a role-based courtroom simulation where a user plays as either the **Prosecutor** or **Defender**, and AI agents handle the opposing counsel and judge using a FastAPI + LangGraph backend and a React frontend.

## What this project does

- Real-time courtroom turns over WebSocket (`/api/v1/trial/stream`)
- Case upload endpoint (`/api/v1/cases/upload`)
- AI suggestion endpoint (`/api/v1/trial/suggest`)
- Final evaluation report endpoint (`/api/v1/trial/report`)
- Role-aware courtroom flow (user role affects AI turn orchestration)
- Transcript-driven frontend courtroom UI with 3D scene, dialogue panel, and user controls

## Tech stack

- **Backend:** Python, FastAPI, LangChain, LangGraph, Astra DB checkpointer
- **Model provider:** GitHub Models (`gpt-4o-mini` via Azure inference endpoint)
- **Frontend:** React, Vite, TypeScript, Tailwind, React Three Fiber
- **Voice:** Browser speech recognition + backend TTS proxy (`/api/v1/tts`, Sarvam)

## Repository structure

```
.
├── main.py                  # FastAPI app + REST/WS routes
├── agents/                  # Judge / Prosecutor / Defender agent definitions
├── graph/                   # LangGraph state + builder + checkpointer
├── rag/                     # Retrieval + vector store + legal search helpers
├── tests/                   # Backend API/WS/E2E tests
├── docs/                    # Architecture and implementation docs
├── testing_court/           # Manual testing process/integration docs
└── frontend/                # React application
```

## Environment variables

Set these in `.env` (do not commit secrets):

- `GITHUB_MODELS_API_KEY`
- `GEMINI_CHAT_MODEL` (optional, defaults to `gpt-4o-mini`)
- `GEMINI_MAX_OUTPUT_TOKENS` (optional)
- `ASTRA_DB_APPLICATION_TOKEN`
- `ASTRA_DB_API_ENDPOINT`
- `ASTRA_DB_NAMESPACE`
- `SARVAM_API_KEY` (for `/api/v1/tts`)

## Run locally (separate terminals)

### 1) Backend

```bash
PYTHONPATH=. uv run --env-file .env uvicorn main:app
```

### 2) Frontend

```bash
cd frontend
bun run dev
```

Frontend URL is typically `http://localhost:8080`, backend is `http://localhost:8000`.

## Testing

From repository root:

```bash
PYTHONPATH=. uv run --env-file .env python tests/test_websocket.py
PYTHONPATH=. uv run --env-file .env python tests/test_suggest.py
PYTHONPATH=. uv run --env-file .env python tests/test_report.py
PYTHONPATH=. uv run --env-file .env python tests/test_e2e_trial.py
```

For manual UI testing scenarios, see:

- `testing_court/testing_process.md`
- `testing_court/integration_details.md`

## Current flow summary

1. User selects role and persona.
2. User submits case details (uploaded to `/api/v1/cases/upload`).
3. Trial starts and streams AI responses over WebSocket.
4. User can type, use voice input, raise objection, or request AI suggestion.
5. Final verdict and report are generated and displayed.

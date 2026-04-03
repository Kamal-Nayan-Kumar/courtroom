# AI Courtroom: Backend Architecture & Integration Guide

This document provides a comprehensive overview of the backend architecture, API boundaries, state management, and external integrations to serve as the definitive guide for frontend re-integration and gamified rebuild.

## 1. Core Architecture & Technologies
- **Framework:** FastAPI (Python 3.14 via `uv`)
- **State Orchestration:** LangGraph (State Graph with persistent checkpointer)
- **Database/Vectorstore:** DataStax Astra DB (Checkpointer + Google Embeddings for RAG)
- **Primary LLM:** GitHub Models (`gpt-4o-mini` default, configurable via `GEMINI_CHAT_MODEL`)
- **TTS Provider:** Sarvam AI
- **Web Search (Optional):** Exa API (preferred), Serper API fallback, then DuckDuckGo public fallback

## 2. Global State Management (LangGraph)
The trial is modeled as a cyclic graph. State is persisted in Astra DB per `thread_id`.

**`CourtroomState` Schema:**
```python
{
  "case_details": str,          # Base facts of the case
  "evidence_list": List[str],   # Uploaded evidence documents
  "transcript": List[dict],     # Message history (HumanMessage, AIMessage)
  "current_turn": str,          # Who is speaking: "judge", "prosecutor", "defender", "user"
  "user_role": str,             # "prosecutor" or "defender"
  "active_objection": dict,     # Details of active objection (if any)
  "trial_status": str           # "ongoing", "deliberating", "concluded"
}
```

## 3. Endpoints & Payloads

### 3.1. Case Upload (`POST /api/v1/cases/upload`)
- **Purpose:** Parses text files, chunks them using `LegalTextSplitter`, and embeds them into Astra Vectorstore.
- **Request:** `multipart/form-data` with a `file` field (.txt).
- **Response:**
```json
{
  "filename": "case.txt",
  "content_type": "text/plain",
  "char_count": 1500,
  "parsed_text": "Full text content..."
}
```

### 3.2. Trial WebSocket Stream (`ws /api/v1/trial/stream`)
- **Purpose:** Real-time bidirectional courtroom dialogue orchestration.
- **Client -> Server (JSON):**
```json
{
  "message": "User's argument or initial start message",
  "thread_id": "unique-session-id",
  "player_role": "prosecutor", // or "defender"
  "case_details": "Title and description of the case"
}
```
- **Server -> Client (JSON):**
```json
// During AI thinking/response generation
{
  "event": "turn",
  "turn": "judge",           // "judge", "prosecutor", "defender"
  "content": "AI dialogue text",
  "current_turn": "defender" // Who should speak next
}
// On error
{
  "error": "Error description"
}
// When processing is done for the current graph execution
{
  "event": "done"
}
```

### 3.3. AI Suggestion Engine (`POST /api/v1/trial/suggest`)
- **Purpose:** Provides 3 strategic arguments for the user.
- **Request:**
```json
{
  "case_details": "...",
  "evidence_list": [],
  "transcript": [{"speaker": "prosecutor", "text": "...", "timestamp": "..."}],
  "current_turn": "defender",
  "active_objection": {},
  "trial_status": "in_progress"
}
```
- **Response:**
```json
{
  "suggestions": ["Argue point A", "Raise objection B", "Highlight evidence C"]
}
```

### 3.4. Trial Evaluation (`POST /api/v1/trial/evaluate`)
- **Purpose:** Calculates real-time win chance %.
- **Request:** Same as `/suggest` + `player_role: "prosecutor" | "defender"`.
- **Response:**
```json
{
  "win_chance": 65
}
```

### 3.5. Final Judgment (`POST /api/v1/trial/judgment`)
- **Purpose:** Judge's final ruling and verdict.
- **Request:** `{ transcript: [...], player_role: "...", timer_minutes: 5 }`
- **Response:**
```json
{
  "judgment": "Final verdict text..."
}
```

### 3.6. Performance Report (`POST /api/v1/trial/report`)
- **Purpose:** Detailed user performance breakdown.
- **Request:** `{ transcript: [...], current_turn: "...", trial_status: "completed" }`
- **Response:**
```json
{
  "score": 85,
  "feedback": ["Good points...", "Missed opportunities..."],
  "markdown": "# Detailed Report...",
  "win_chance": 85
}
```

### 3.7. Text-to-Speech (`POST /api/v1/tts`)
- **Purpose:** Proxies requests to Sarvam API.
- **Request:**
```json
{
  "text": "Dialogue to speak",
  "voice_gender": "male", // or "female"
  "language_code": "hi-IN" // Sarvam supported codes
}
```
- **Response:**
```json
{
  "audio_base64": "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
  "mime_type": "audio/wav"
}
```

## 4. API Limits & Edge Cases
- **GitHub Models (`gpt-4o-mini`):** 
  - Subject to strict rate limits. Backend does not implement aggressive auto-retries for 429s.
  - Context window limit is ~128k, but `GEMINI_MAX_OUTPUT_TOKENS` is capped (default ~4096). Extremely long transcripts will cause truncation or 400 errors.
- **Sarvam TTS:**
  - Max text length is typically ~600 characters per request. Long AI responses must be chunked or synthesized carefully.
  - Rate limiting applies. Missing API keys yield 503s.
- **WebSocket Stability:**
  - Reconnections are not inherently state-restoring on the client side. The `thread_id` keeps state in Astra DB, so if a WS disconnects, the client MUST reconnect with the exact same `thread_id` to resume.
  - Concurrent turns (user typing while AI is thinking) can cause LangGraph thread lock contention. The backend drops or queues concurrent requests.

## 5. Security & Environment
Required environment variables:
- `GITHUB_MODELS_API_KEY`
- `ASTRA_DB_APPLICATION_TOKEN`, `ASTRA_DB_API_ENDPOINT`, `ASTRA_DB_NAMESPACE`
- `SARVAM_API_KEY` (Required for TTS)
- `EXA_API_KEY` (Optional, preferred for legal web search with citations)
- `SERPER_API_KEY` (Optional fallback for legal web search with citations)
- `TRIAL_ENABLE_EXTERNAL_TOOLS` (Set to "1" to enable RAG + web search tools for agents)

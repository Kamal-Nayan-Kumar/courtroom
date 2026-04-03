# AI Courtroom: Frontend Gamified Rewrite Guide

The current frontend implements a functional but fragile single-page application using React, Vite, and React Three Fiber. It suffers from connection instability, missing error recovery, unvalidated inputs, and state loss on refresh.

This document serves as the architectural foundation and UI workflow specification for completely rewriting the frontend into a robust, gamified courtroom simulator that perfectly integrates with the backend APIs.

## 1. Goal: The Gamified Simulator
The new frontend must feel like an immersive, high-stakes game.
- **Visuals:** 3D courtroom with characters (Judge, Prosecutor, Defender) or stylized 2D equivalents.
- **HUD (Heads-Up Display):** Live timer, objection buttons, dynamic "win chance" meter, and clear turn indicators.
- **Audio:** High-quality TTS dialogue (Sarvam API) and ambient courtroom sounds.
- **Progression:** Unlockable cases, achievement tracking, and performance reports.

## 2. Current Architecture & Flaws
- **Framework:** React + Vite + TypeScript + Tailwind
- **State Management:** Unstructured local state in `Index.tsx` and `CourtroomMain.tsx`. Reset on refresh.
- **Communication:**
  - WebSocket (`ws://[HOST]/api/v1/trial/stream`) for real-time dialogue. Very fragile. If the WS drops, the trial freezes permanently.
  - REST (`/api/v1/*`) for case upload, suggestions, evaluation, and TTS.
- **Input:** Browser-native `SpeechRecognition` (only works on some browsers) and basic text inputs.
- **Critical Bugs to Fix:**
  - 15s WebSocket timeouts with no retry logic.
  - Unhandled 502/429 errors from the backend LLM/TTS.
  - Missing file validation during case upload.
  - Context loss in 3D canvas on mobile/low-end devices.

## 3. Proposed Gamified Workflow & State Machine

### 3.1. Global State Management
We must adopt a strict state machine (e.g., Zustand or Redux) to persist the `thread_id` and trial state in `localStorage`. If the user refreshes, they should seamlessly reconnect to the same `thread_id`.

**Phases:**
1. `MENU`: Landing screen, case selection, profile.
2. `PREPARATION`: Select role (Prosecutor/Defender), upload custom case evidence, read case brief.
3. `LOADING`: Initialize 3D scene, connect WebSocket.
4. `TRIAL_ACTIVE`: The core game loop.
5. `DELIBERATION`: Timer ends, Judge formulates verdict.
6. `POST_MATCH_REPORT`: Final judgment, score, and detailed feedback.

### 3.2. UI Components & Layout
- **The Arena (Center):** 3D characters facing the user or speaking. Active speaker is highlighted.
- **The Transcript (Left/Bottom):** A stylized chat log showing only spoken arguments (no backend tool calls or system logs).
- **The Player Console (Bottom):**
  - Input field (Text + Voice toggle).
  - "Objection!" big red button (triggers backend objection logic).
  - "Hint/Suggest" button (costs points or limited use).
- **The HUD (Top):**
  - Trial Timer (e.g., 5:00 countdown).
  - "Win Chance" tug-of-war meter (updated via `/evaluate`).
  - Current Turn indicator ("Judge is thinking...", "Your Turn").

### 3.3. Robust Integration Requirements

#### Connection Resilience
- The WebSocket connection must implement automatic exponential backoff reconnection.
- If the WS drops, show a "Reconnecting to Courtroom..." overlay without losing the transcript.
- On reconnect, send the last known state or simply re-establish the connection to the active `thread_id`.

#### API Error Handling
- **GitHub Models Limits:** If the backend LLM times out or rate limits, gracefully notify the user: "The Judge needs a moment to review the evidence."
- **Sarvam TTS Limits:** Backend TTS accepts ~600 chars max. The frontend must chunk long AI responses into sentences, queue them, and play audio sequentially. Fallback to browser `speechSynthesis` if Sarvam fails.
- **File Upload:** Validate `file.type === "text/plain"` and size before POSTing to `/api/v1/cases/upload`.

#### Turn-Based Safety
- Only allow the user to submit text or click "Objection" when it is their turn or when the backend allows an interrupt.
- Disable inputs while the AI is typing to prevent LangGraph thread lock contention on the backend.

## 4. Next Steps for the Engineering Team
1. **Scaffold Global State:** Implement Zustand store with persistent `thread_id`.
2. **Abstract API Layer:** Create a robust API client with automatic retries for REST and a self-healing WebSocket manager.
3. **Build the HUD:** Design the gamified UI components (Timer, Win Chance Meter, Transcript).
4. **Implement TTS Queue:** Create an audio manager that fetches Sarvam audio in the background and plays chunks gaplessly.
5. **Re-integrate 3D Scene:** Ensure `react-three-fiber` is optimized and handles context loss gracefully.
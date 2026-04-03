# Frontend and Backend Integration Details

## Overview
The React frontend is integrated with FastAPI using REST + WebSocket. Backend is the source of truth for courtroom turns and generated outputs; frontend is responsible for rendering, user input, and report export UX.

## Route Mapping (Current)

### `POST /api/v1/cases/upload`
- Purpose: Parse uploaded `.txt` case file content.
- Request: `multipart/form-data` with `file`.
- Response fields:
  - `filename`
  - `content_type`
  - `char_count`
  - `parsed_text`

### `WS /api/v1/trial/stream`
- Purpose: Real-time courtroom turn streaming.
- Frontend outbound payload:
  - `message` (string)
  - `thread_id` (string)
  - `player_role` (`defender` | `prosecutor`)
  - `case_details` (string)
- Backend turn event payload:
  - `event: "turn"`
  - `turn` (`judge` | `prosecutor` | `defender`)
  - `content` (spoken courtroom output)
  - `current_turn` (next expected actor)
  - `player_role`
- Completion event payload:
  - `event: "done"`
  - `thread_id`
  - `player_role`

### `POST /api/v1/trial/suggest`
- Purpose: Generate three strategic suggestions for current context.
- Request includes:
  - `case_details`
  - `transcript`
  - `current_turn`
  - `active_objection`
  - `trial_status`
- Response:
  - `suggestions: string[3]`

### `POST /api/v1/trial/evaluate`
- Purpose: Compute live winning chance (%) for HUD.
- Request includes:
  - `case_details`
  - `transcript`
  - `current_turn`
  - `player_role`
- Response:
  - `win_chance` (0-100)
  - `rationale`

### `POST /api/v1/trial/judgment`
- Purpose: Generate judge final oral judgment at timer end.
- Request includes:
  - `case_details`
  - `transcript`
  - `player_role`
  - `timer_minutes`
- Response:
  - `judgment`

### `POST /api/v1/trial/report`
- Purpose: Generate final performance report.
- Request includes:
  - `case_details`
  - `transcript`
  - `current_turn`
  - `trial_status`
- Response:
  - `score` (0-100)
  - `feedback`
  - `markdown`
  - `win_chance`

### `POST /api/v1/tts`
- Purpose: Convert spoken output text to audio via Sarvam.
- Request includes:
  - `text`
  - `voice_gender` (`male` | `female`)
  - `language_code`
- Response:
  - `audio_base64`
  - `mime_type`

## Frontend Flow Pattern
1. User selects role (`defender` or `prosecutor`).
2. User enters case and chooses timer (5/10) + voice gender.
3. Frontend opens WebSocket and sends initial trial message.
4. Frontend renders incoming turn events to sidebar transcript.
5. User submits arguments only during own turn.
6. Suggestion API is called on demand, and suggestion enters chat only after click.
7. Timer expiry triggers final judgment API, then report API.
8. Report screen shows markdown and supports browser PDF export.

## Important Integration Rules
- Do not display LLM thinking/internal scratchpad content in chat.
- Transcript must include every visible user and AI turn.
- Speaker face/label must follow incoming `turn` field.
- WebSocket state drives trial progression; frontend should not run a separate mock trial engine.

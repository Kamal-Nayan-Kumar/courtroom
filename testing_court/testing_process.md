# End-to-End Testing Process

## Goal
Validate full frontend + backend integration for the courtroom app: role-locked speaking flow, websocket transcript, timer-driven completion, Sarvam voice playback path, suggestions-on-click behavior, and final markdown report export.

## Prerequisites

### Start backend (Terminal 1)
```bash
PYTHONPATH=. uv run --env-file .env uvicorn main:app --host 127.0.0.1 --port 8000
```

### Start frontend (Terminal 2)
```bash
bun run dev --cwd frontend
```

Open app at `http://localhost:8080`.

## Copy-Paste Mock Case Inputs

### Mock Case A (The Smart Home Murder - recommended)
**Role to select:** Defender or Prosecutor

**Upload Option:** 
Simply upload the `case_detail.md` file from the project root. The frontend now accepts `.md` files, which will auto-fill the description.

**Manual Copy (if not uploading):**
**Title:** State of Maharashtra v. Aryan Mehta
**Description:** On the night of October 14th, 2024, Ravi Sharma was found dead in his private office. Aryan Mehta, his CTO, claims he was at his apartment 15km away, pointing to his "Smart Home" network logs as a digital alibi. However, the Prosecution argues Aryan hacked his own router to spoof the logs, backed by grainy CCTV footage of a hooded figure entering the victim's office.

**Timer:** 5 minutes
**Voice:** Female / Male

## Step-by-Step Test Workflow

1. **Landing → Role Selection**
   - Click **Enter Courtroom**.
   - Select role (Defender or Prosecutor).
   - Expected: role card selection moves directly to case creation form.

2. **Case Creation + Upload path**
   - Click **Choose File** and select `case_detail.md`.
   - Expected: Title and Description auto-fill from the Markdown file.
   - Set Timer (2/5/10 min).
   - Set AI voice (male/female).
   - Click **Initiate Trial**.
   - Expected: loading scene appears then courtroom starts immediately.

4. **WebSocket Trial Validation**
   - In DevTools → Network → WS, inspect `/api/v1/trial/stream`.
   - Expected outgoing payload includes:
     - `message`
     - `thread_id`
     - `player_role`
     - `case_details`
   - Expected incoming events include AI turns with:
     - `event: "turn"`
     - `turn`
     - `content`
     - `current_turn`
     - `player_role`

5. **Role Lock Validation**
   - If role is Defender, user input should be accepted only on defender turn.
   - If role is Prosecutor, same rule for prosecutor turn.
   - Expected: transcript labels match speaker turn and avatar speaking state.

6. **Suggestion Behavior Validation**
   - During user turn, click **Suggestion**.
   - Wait for list to appear.
   - Click one suggestion.
   - Expected:
     - suggestion is appended as user turn,
     - suggestion is spoken,
     - suggestion is sent to backend as turn message.

7. **Mic Input Validation**
   - Click **Mic**, speak a short sentence, stop mic.
   - Expected: recognized final transcript appears in input box.

8. **Timer + Finalization Validation**
   - Let timer expire naturally.
   - Expected:
     - input disables,
     - judge final judgment appears,
     - report screen opens.

9. **Report + PDF Validation**
   - Confirm report shows score, feedback, and markdown text.
   - Click **Download Report**.
   - Expected: browser print/PDF dialog opens.
   - Click **Start New Session**.
   - Expected: app returns to landing state.

## Pass Criteria
- No black/frozen screen during courtroom start.
- Transcript includes judge + opposing counsel + user turns.
- User role is consistently enforced.
- Suggestions appear only when requested and apply only on click.
- Timer ends session and triggers final judgment + report.
- Report can be exported via browser PDF.
- No uncaught runtime errors in browser console.

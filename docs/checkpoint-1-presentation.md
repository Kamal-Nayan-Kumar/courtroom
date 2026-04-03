# Checkpoint 1 Presentation (3 Slides)

## Slide 1 — Problem Statement

### Title
**AI Courtroom Training: The Gap in Practical Legal Practice**

### Points
- Law students and early practitioners lack affordable, repeatable mock-court practice.
- Existing mock sessions are limited by mentor/judge availability and inconsistent feedback.
- Users need realistic, role-based courtroom interaction (Judge, Prosecutor, Defender).
- Most tools do not provide live turn-based argument flow with actionable feedback.
- There is no simple system combining practice, guidance, and performance reporting in one place.

### One-line message
**We solve the courtroom practice gap by building an interactive AI-powered trial simulator.**

---

## Slide 2 — Our Approach

### Title
**How We Built the Solution**

### Approach
- Built a full-stack system:
  - **Frontend:** React + TypeScript immersive courtroom UI
  - **Backend:** FastAPI + LangGraph for role-aware turn orchestration
- Implemented strict role flow:
  - User chooses Defender/Prosecutor
  - AI agents respond in courtroom sequence with transcript context
- Added real-time communication:
  - WebSocket trial stream for live turns
  - Turn labels and contextual transcript in sidebar
- Added voice layer:
  - Sarvam TTS for AI responses
  - Mic input for user speech-to-text
- Added evaluation pipeline:
  - suggestions, win-chance indicator, final judgment, and report generation

### One-line message
**Our architecture combines real-time interaction, role intelligence, and measurable learning feedback.**

---

## Slide 3 — Key Features

### Title
**What the Product Delivers**

### Feature Highlights
1. **Role-based Trial Simulation**
   - User plays Defender or Prosecutor
   - AI Judge + opposite counsel interact dynamically

2. **Live Courtroom Experience**
   - Real-time chat transcript with speaker labels
   - Sequential turn handling and objection interaction

3. **Voice-enabled Interaction**
   - Sarvam voice output (male/female)
   - Microphone input for argument drafting/speaking

4. **Strict Session Timer**
   - 2 / 5 / 10 minute session options
   - Automatic case closure flow on timer completion

5. **AI Assistance + Evaluation**
   - On-demand suggestion prompts
   - Win-chance score during trial
   - Final judgment and performance report (markdown + PDF export)

### Closing line
**Checkpoint 1 proves the core courtroom loop is functional, interactive, and learning-focused.**

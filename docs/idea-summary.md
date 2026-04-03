# AI Courtroom — Idea Summary

## Vision
Build an AI-powered courtroom practice platform where users can train as a **Defender** or **Prosecutor** in realistic, timed mock trials with actionable feedback.

## Core Problem
Practical legal training is hard to access consistently:
- Mock court sessions require expert availability.
- Feedback is often delayed or subjective.
- Learners need repeatable, role-specific argument practice.

## Proposed Solution
Create an immersive web app that simulates courtroom interactions among:
- **User** (Defender or Prosecutor)
- **AI Judge**
- **AI Opposing Counsel**

The system runs a structured turn-based trial, tracks transcript context, and delivers post-trial performance insights.

## How It Works (High Level)
1. User selects role and case details.
2. Trial starts over real-time WebSocket stream.
3. AI agents respond turn-by-turn using transcript context.
4. User can use suggestions and voice interaction.
5. Timer ends session with final judgment + report.

## Key Value
- **Practice anytime** without dependency on human mock panels.
- **Role-aware simulation** for prosecution and defense strategy.
- **Feedback loop** with strengths, weaknesses, and improvement direction.
- **Engaging format** with voice, scoring signals, and final report export.

## Target Users
- Law students
- Judicial service aspirants
- Moot court participants
- Early-stage legal professionals

## Outcome
An accessible, repeatable courtroom training environment that improves legal reasoning, argument structure, and real-time response quality.

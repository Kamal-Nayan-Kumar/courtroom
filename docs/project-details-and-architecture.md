# AI Courtroom: Backend & AI Architecture Document

## 1. Project Overview
A gamified, AI-powered courtroom simulation designed for law students, practitioners, and lawyers to practice Indian Law. Users can play as either the Complainant's Counsel/Prosecutor or the Defender, interacting with AI agents representing the other roles, including an impartial AI Judge.

## 2. Core Entities (The Agents)
The system relies on a multi-agent orchestration model where agents share a common global context (The Court Record/Transcript) but have distinct private prompts, tools, and objectives.

### 2.1. The AI Judge
*   **Role:** Orchestrator of the courtroom, impartial adjudicator.
*   **Capabilities:** 
    *   Rules on objections ("Sustained" or "Overruled") based on Indian Evidence Act and procedural laws.
    *   Queries historical case laws and precedents (via RAG/Perplexity).
    *   Maintains order and dictates turns.
    *   Evaluates the final outcome and generates the user's performance report.
*   **Tools:** Web Search (Perplexity), Precedent Database (RAG).

### 2.2. The Complainant's Counsel / Prosecutor
*   **Role:** Aggressively pursues the case on behalf of the victim/state.
*   **Capabilities:**
    *   Constructs arguments based on submitted evidence and social justice principles.
    *   Finds loopholes in the defender's arguments.
    *   Raises objections to the defender's claims.
*   **Tools:** Case Evidence RAG, Web Search (Perplexity).

### 2.3. The Defender
*   **Role:** Protects the accused/client, counters the prosecutor's claims.
*   **Capabilities:**
    *   Fact-checks the prosecutor's claims.
    *   Finds exonerating precedents or logical fallacies in the opponent's argument.
    *   Raises objections.
*   **Tools:** Case Evidence RAG, Web Search (Perplexity).

## 3. Technology Stack
*   **Language/Runtime:** Python (managed via `uv`).
*   **Web Framework:** FastAPI (Crucial for high-performance, async API endpoints).
*   **AI Orchestration:** LangGraph (for stateful, cyclical agent interactions and turn-taking) and LangChain.
*   **LLM Providers:** 
    *   **Gemini API:** Primary reasoning engine for agents.
    *   **Sarvam API:** Potential use for Indic language processing, translation, or localized Indian legal nuances if applicable.
    *   **Perplexity API:** Dedicated tool for real-time, accurate legal web search and fact-checking.
*   **Vector Database:** Qdrant, Milvus, or Pinecone (for RAG on uploaded case files and evidence).

## 4. System Architecture & State Management (LangGraph)
To achieve a "real-time, parallel listening" courtroom, we must model the trial as a **State Graph**.

### The Global State Schema
```python
class CourtroomState(TypedDict):
    case_details: str          # Base facts of the case
    evidence_list: List[str]   # Uploaded evidence
    transcript: List[Dict]     # The ongoing chat history (who said what)
    current_turn: str          # 'prosecutor', 'defender', or 'judge'
    active_objection: Dict     # Details if an objection was just raised
    trial_status: str          # 'ongoing', 'deliberating', 'concluded'
```

## 5. Architectural Suggestions & Enhancements

1.  **WebSocket Integration:** Since the courtroom requires real-time chat, parallel agent thinking, and sudden interruptions (Objections), **WebSockets** should be used instead of standard REST endpoints. This allows the backend to stream the AI's typing back to the frontend and allows users to hit an "Objection!" button that instantly interrupts the backend LangGraph execution.
2.  **The "Parallel Listening" Pattern:** In LangGraph, we can design the graph so that when one entity speaks (e.g., User/Prosecutor), the AI Defender agent runs a lightweight "Listener" node in the background. If the Listener detects a legal fallacy, it triggers an "Objection" interrupt before the Judge responds.
3.  **Suggestion Engine (Co-Pilot Mode):** You mentioned the user can request suggestions. This should be a separate, stateless FastAPI endpoint. It takes the current `CourtroomState` and the user's role, and uses Gemini to generate 3 strategic bullet points on what the user should argue next.
4.  **RAG Strategy:** Legal documents are dense. We need to implement **Semantic Chunking** and potentially **Hybrid Search** (Keyword + Vector) so the agents don't hallucinate Indian Penal Code (IPC) or Bharatiya Nyaya Sanhita (BNS) sections.

# AI Courtroom Simulator
### A Virtual Litigation & Advocacy Platform
**Team: Caffeine Coders**

---

## 1. Problem Statement

The journey from a law student to a confident litigator is steep. Students and junior lawyers lack access to **realistic, practical, and risk-free environments** to practice litigation, argumentation, and courtroom procedures. 

Traditional mock trials are resource-heavy, infrequent, and lack immediate objective feedback. There is no accessible, on-demand platform to consistently train verbal argumentation, rapid-fire critical thinking, and emotional resilience under pressure.

---

## 2. Our Solution

We built an **immersive, real-time 3D courtroom simulator** where users argue cases against autonomous AI opposing counsel and an impartial AI Judge. 

Powered by Agentic AI and a gamified 3D environment, the platform provides:
- **Agentic Opponents:** Dynamic counter-arguments based on the user's statements.
- **On-Demand Mentorship:** Instant tactical suggestions and a comprehensive performance report.
- **Voice-First Interaction:** Real-time speech recognition and text-to-speech for lifelike courtroom debate.

---

## 3. Features

1. **Role Selection:** Choose to play as the Prosecutor or Defender.
2. **Case Initialization:** Upload a case brief (PDF/Text/Markdown) or type out the case facts. 
3. **The Trial:** Enter the 3D courtroom. The AI Judge announces the case, and the trial begins. Argue using your microphone or text.
4. **Live AI Legal Co-Pilot:** Stuck during an argument? Click "Suggest" to get 3 strategic hints based on the current context.
5. **RAG & Live Citations:** The AI actively references your uploaded case documents (RAG via Astra DB) and searches the web (Exa API) to cite real legal precedents.
6. **Verdict & Report:** Once the trial concludes, receive the Judge's final verdict and a detailed analytics report on your performance.

---

## 4. Tech Stack

### Frontend
- **Framework:** React, Vite, TypeScript
- **3D Rendering:** React Three Fiber, Drei (WebGL)
- **Styling:** Tailwind CSS, Shadcn UI
- **State Management:** Zustand (for handling trial state, websocket message queues, and 3D UI sync)
- **Audio:** Browser Speech API (Mic) + Sarvam API integration for AI voices with native fallback.

### Backend & Agentic Architecture
- **Framework:** FastAPI, Python (WebSockets for real-time streaming)
- **AI Orchestration:** LangChain & LangGraph (Stateful, multi-agent workflows with a central "Main Brain" router)
- **LLM:** GitHub Models (Azure Inference Endpoint - e.g., GPT-4o)
- **Vector Store:** Astra DB (For RAG document chunking, embedding, and conversation checkpointing)
- **Tools:** Exa Web Search (Live precedents), Sarvam AI (TTS).

---

## 5. Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js & npm (or bun)
- API Keys for GitHub Models, Astra DB, Sarvam (optional), and Exa (optional).

### Environment Variables
Create a `.env` file in the root directory:
```env
GITHUB_MODELS_API_KEY=your_github_token
ASTRA_DB_APPLICATION_TOKEN=your_astra_token
ASTRA_DB_API_ENDPOINT=your_astra_endpoint
ASTRA_DB_NAMESPACE=default_keyspace
SARVAM_API_KEY=your_sarvam_key
EXA_API_KEY=your_exa_key
```

### Run Locally (Separate Terminals)

**1. Backend**
```bash
# Install dependencies using uv or pip
pip install -r requirements.txt

# Run the FastAPI server
PYTHONPATH=. uv run --env-file .env uvicorn main:app
```
*The backend runs on `http://localhost:8000`.*

**2. Frontend**
```bash
cd frontend

# Install dependencies
bun install # or npm install

# Start the dev server
bun run dev
```
*The frontend runs on `http://localhost:8080`.*

---

## 6. How to Demo
1. Open the frontend URL.
2. Select your role (Defender/Prosecutor).
3. Upload `case_detail.md` on the Case Creation screen.
4. Enter the courtroom, use your microphone to speak, and see the AI orchestrate the trial!

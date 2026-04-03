import { CaseData, CaseReport, DialogueEntry, PlayerRole } from "@/types/courtroom";
import { requestWithRetry, userFriendlyServiceMessage } from "@/lib/http";

const API_BASE = "/api/v1";

interface UploadResponse {
  filename: string;
  content_type: string;
  char_count: number;
  parsed_text: string;
}

interface SuggestResponse {
  suggestions: string[];
}

interface EvaluateResponse {
  win_chance: number;
  rationale: string;
}

interface ReportResponse {
  score: number;
  feedback: string;
  markdown?: string;
  win_chance?: number;
}

interface JudgmentResponse {
  judgment: string;
}

function mapSpeakerToTurn(speaker: DialogueEntry["speaker"]): string {
  if (speaker === "system") {
    return "system";
  }
  return speaker;
}

function normalizeRole(role: PlayerRole): PlayerRole {
  return role === "prosecutor" ? "prosecutor" : "defender";
}

export async function uploadCaseFile(file: File): Promise<UploadResponse> {
  if (file.type !== "text/plain" && file.type !== "text/markdown" && !file.name.endsWith(".md") && !file.name.endsWith(".txt")) {
    throw new Error("Only .txt and .md files are allowed.");
  }
  const maxSizeBytes = 2 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new Error("File is too large. Maximum allowed size is 2MB.");
  }

  const form = new FormData();
  form.append("file", file);
  try {
    return await requestWithRetry<UploadResponse>(`${API_BASE}/cases/upload`, {
      method: "POST",
      body: form,
      maxRetries: 2,
    });
  } catch (error) {
    throw new Error(userFriendlyServiceMessage(error));
  }
}

export async function requestTrialSuggestions(params: {
  caseData: CaseData;
  transcript: DialogueEntry[];
  currentTurn: string;
}): Promise<string[]> {
  const payload = {
    case_details: `${params.caseData.title}\n${params.caseData.description}`,
    evidence_list: [],
    transcript: params.transcript.map((entry) => ({
      speaker: entry.speaker,
      text: entry.text,
      timestamp: entry.timestamp,
    })),
    current_turn: params.currentTurn,
    active_objection: {},
    trial_status: "in_progress",
  };

  try {
    const data = await requestWithRetry<SuggestResponse>(`${API_BASE}/trial/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      maxRetries: 3,
    });
    return Array.isArray(data.suggestions) ? data.suggestions : [];
  } catch (error) {
    throw new Error(userFriendlyServiceMessage(error));
  }
}

export async function requestWinChance(params: {
  caseData: CaseData;
  transcript: DialogueEntry[];
  currentTurn: string;
  playerRole: PlayerRole;
}): Promise<number> {
  const payload = {
    case_details: `${params.caseData.title}\n${params.caseData.description}`,
    evidence_list: [],
    transcript: params.transcript.map((entry) => ({
      speaker: entry.speaker,
      text: entry.text,
      timestamp: entry.timestamp,
    })),
    current_turn: params.currentTurn,
    player_role: normalizeRole(params.playerRole),
  };

  try {
    const data = await requestWithRetry<EvaluateResponse>(`${API_BASE}/trial/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      maxRetries: 2,
      timeoutMs: 20000,
    });
    const winChance = Number(data.win_chance);
    if (!Number.isFinite(winChance)) {
      return 50;
    }
    return Math.min(100, Math.max(0, Math.round(winChance)));
  } catch {
    return 50;
  }
}

export async function requestFinalJudgment(params: {
  caseData: CaseData;
  transcript: DialogueEntry[];
  playerRole: PlayerRole;
  timerMinutes: 1 | 2 | 5 | 10;
}): Promise<string> {
  const payload = {
    case_details: `${params.caseData.title}\n${params.caseData.description}`,
    evidence_list: [],
    transcript: params.transcript.map((entry) => ({
      speaker: entry.speaker,
      text: entry.text,
      timestamp: entry.timestamp,
    })),
    player_role: normalizeRole(params.playerRole),
    timer_minutes: params.timerMinutes,
  };

  try {
    const data = await requestWithRetry<JudgmentResponse>(`${API_BASE}/trial/judgment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      maxRetries: 3,
      timeoutMs: 45000,
    });
    return (data.judgment || "").trim();
  } catch (error) {
    throw new Error(userFriendlyServiceMessage(error));
  }
}

export async function requestFinalReport(params: {
  caseData: CaseData;
  transcript: DialogueEntry[];
  currentTurn: string;
}): Promise<CaseReport> {
  const payload = {
    case_details: `${params.caseData.title}\n${params.caseData.description}`,
    evidence_list: [],
    transcript: params.transcript.map((entry) => ({
      role: mapSpeakerToTurn(entry.speaker),
      content: entry.text,
      timestamp: entry.timestamp,
    })),
    current_turn: params.currentTurn,
    active_objection: {},
    trial_status: "completed",
  };

  try {
    const data = await requestWithRetry<ReportResponse>(`${API_BASE}/trial/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      maxRetries: 2,
      timeoutMs: 45000,
    });
    return {
      score: Math.min(100, Math.max(0, Math.round(Number(data.score) || 0))),
      feedback: (data.feedback || "").trim(),
      markdown: (data.markdown || "").trim(),
      winChance: Math.min(
        100,
        Math.max(0, Math.round(Number(data.win_chance ?? data.score ?? 50) || 50)),
      ),
    };
  } catch (error) {
    throw new Error(userFriendlyServiceMessage(error));
  }
}

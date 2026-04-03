export type GamePhase =
  | "landing"
  | "role-selection"
  | "character-selection"
  | "case-creation"
  | "loading"
  | "introductions"
  | "trial"
  | "verdict"
  | "report";

export type PlayerRole = "defender" | "prosecutor";

export interface CharacterStyles {
  judge: string;
  defender: string;
  prosecutor: string;
}

export type Speaker = "judge" | "prosecutor" | "defender" | "system";

export type CaseType =
  | "theft"
  | "cyber-fraud"
  | "property-dispute"
  | "workplace"
  | "custom";

export interface CaseData {
  title: string;
  type: CaseType;
  description: string;
  severity: number;
  voiceGender: "male" | "female";
}

export interface DialogueEntry {
  speaker: Speaker;
  text: string;
  timestamp: number;
}

export interface TrialState {
  turn: Speaker;
  phase: "opening" | "argument" | "questioning" | "closing" | "verdict";
  score: number;
  round: number;
  dialogues: DialogueEntry[];
}

export interface CaseReport {
  verdict: "win" | "lose";
  confidenceScore: number;
  summary: string;
  argumentStrength: number;
  evidenceUsage: number;
  logicalConsistency: number;
  responseClarity: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  legalInsight: string;
  strategy: string[];
  xpEarned: number;
  rank: string;
  badge: string;
}

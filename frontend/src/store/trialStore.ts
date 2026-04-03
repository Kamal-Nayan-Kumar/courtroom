import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CaseData, CaseReport, DialogueEntry, PlayerRole, Speaker, CharacterStyles } from "@/types/courtroom";

export type TrialPhase =
  | "MENU"
  | "PREPARATION"
  | "LOADING"
  | "TRIAL_ACTIVE"
  | "DELIBERATION"
  | "POST_MATCH_REPORT";

type TrialLifecycleStatus = "ongoing" | "deliberating" | "concluded";

type WsConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";

export interface WsTelemetry {
  status: WsConnectionStatus;
  reconnectAttempts: number;
  lastDisconnectAt: number | null;
  lastConnectedAt: number | null;
  error: string;
}

export interface TrialStoreState {
  phase: TrialPhase;
  threadId: string | null;
  playerRole: PlayerRole | null;
  characterStyles: CharacterStyles | null;
  caseData: CaseData | null;
  transcript: DialogueEntry[];
  currentTurn: string;
  activeSpeaker: Speaker;
  trialStatus: TrialLifecycleStatus;
  waitingForUserInput: boolean;
  aiTyping: boolean;
  canInterrupt: boolean;
  hud: {
    timerRemainingSec: number;
    winChance: number;
  };
  report: CaseReport | null;
  ws: WsTelemetry;
  setPhase: (phase: TrialPhase) => void;
  startPreparation: (role: PlayerRole) => void;
  setCharacterStyles: (styles: CharacterStyles | null) => void;
  configureCase: (caseData: CaseData) => void;
  setThreadId: (threadId: string) => void;
  setCurrentTurn: (turn: string) => void;
  appendTranscript: (entry: DialogueEntry) => void;
  overwriteTranscript: (entries: DialogueEntry[]) => void;
  setActiveSpeaker: (speaker: Speaker) => void;
  setWaitingForUserInput: (value: boolean) => void;
  setAiTyping: (value: boolean) => void;
  setCanInterrupt: (value: boolean) => void;
  setTimerRemainingSec: (seconds: number) => void;
  setWinChance: (value: number) => void;
  beginDeliberation: () => void;
  completeTrial: (report: CaseReport) => void;
  setWsStatus: (status: WsConnectionStatus) => void;
  setWsError: (error: string) => void;
  markWsReconnecting: (attempt: number) => void;
  resetTrial: () => void;
}

const DEFAULT_TIMER_SECONDS = 5 * 60;
const DEFAULT_CHARACTER_STYLES: CharacterStyles = {
  judge: "judge-1",
  defender: "defender-1",
  prosecutor: "prosecutor-1",
};

function createThreadId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `thread-${Date.now()}-${random}`;
}

const initialState = {
  phase: "MENU" as TrialPhase,
  threadId: null as string | null,
  playerRole: null as PlayerRole | null,
  characterStyles: DEFAULT_CHARACTER_STYLES,
  caseData: null as CaseData | null,
  transcript: [] as DialogueEntry[],
  currentTurn: "judge",
  activeSpeaker: "system" as Speaker,
  trialStatus: "ongoing" as TrialLifecycleStatus,
  waitingForUserInput: false,
  aiTyping: false,
  canInterrupt: false,
  hud: {
    timerRemainingSec: DEFAULT_TIMER_SECONDS,
    winChance: 50,
  },
  report: null as CaseReport | null,
  ws: {
    status: "idle" as WsConnectionStatus,
    reconnectAttempts: 0,
    lastDisconnectAt: null as number | null,
    lastConnectedAt: null as number | null,
    error: "",
  },
};

export const useTrialStore = create<TrialStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setPhase: (phase) => set({ phase }),
      startPreparation: (role) =>
        set({
          phase: "PREPARATION",
          playerRole: role,
          characterStyles: get().characterStyles || DEFAULT_CHARACTER_STYLES,
          threadId: get().threadId || createThreadId(),
        }),
      setCharacterStyles: (styles) => set({ characterStyles: styles || DEFAULT_CHARACTER_STYLES }),
      configureCase: (caseData) =>
        set({
          caseData,
          phase: "LOADING",
          hud: {
            ...get().hud,
            timerRemainingSec: caseData.timerMinutes * 60,
          },
        }),
      setThreadId: (threadId) => set({ threadId: threadId.trim() || createThreadId() }),
      setCurrentTurn: (turn) => set({ currentTurn: turn }),
      appendTranscript: (entry) =>
        set((state) => {
          const last = state.transcript[state.transcript.length - 1];
          if (last && last.speaker === entry.speaker && last.text.trim() === entry.text.trim()) {
            return state;
          }
          return { transcript: [...state.transcript, entry] };
        }),
      overwriteTranscript: (entries) => set({ transcript: entries }),
      setActiveSpeaker: (speaker) => set({ activeSpeaker: speaker }),
      setWaitingForUserInput: (value) => set({ waitingForUserInput: value }),
      setAiTyping: (value) => set({ aiTyping: value }),
      setCanInterrupt: (value) => set({ canInterrupt: value }),
      setTimerRemainingSec: (seconds) =>
        set({
          hud: {
            ...get().hud,
            timerRemainingSec: Math.max(0, Math.round(seconds)),
          },
        }),
      setWinChance: (value) =>
        set({
          hud: {
            ...get().hud,
            winChance: Math.max(0, Math.min(100, Math.round(value))),
          },
        }),
      beginDeliberation: () =>
        set({
          phase: "DELIBERATION",
          trialStatus: "deliberating",
          waitingForUserInput: false,
          aiTyping: true,
        }),
      completeTrial: (report) =>
        set({
          phase: "POST_MATCH_REPORT",
          trialStatus: "concluded",
          report,
          aiTyping: false,
          waitingForUserInput: false,
          ws: {
            ...get().ws,
            status: "disconnected",
          },
        }),
      setWsStatus: (status) =>
        set({
          ws: {
            ...get().ws,
            status,
            error: status === "connected" ? "" : get().ws.error,
            reconnectAttempts: status === "connected" ? 0 : get().ws.reconnectAttempts,
            lastConnectedAt: status === "connected" ? Date.now() : get().ws.lastConnectedAt,
          },
        }),
      setWsError: (error) =>
        set({
          ws: {
            ...get().ws,
            error,
          },
        }),
      markWsReconnecting: (attempt) =>
        set({
          ws: {
            ...get().ws,
            status: "reconnecting",
            reconnectAttempts: Math.max(1, attempt),
            lastDisconnectAt: Date.now(),
          },
        }),
      resetTrial: () => {
        const preservedThreadId = createThreadId();
        set({
          ...initialState,
          characterStyles: DEFAULT_CHARACTER_STYLES,
          threadId: preservedThreadId,
        });
      },
    }),
    {
      name: "courtroom-trial-store-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        phase: state.phase,
        threadId: state.threadId,
        playerRole: state.playerRole,
        characterStyles: state.characterStyles,
        caseData: state.caseData,
        transcript: state.transcript,
        currentTurn: state.currentTurn,
        activeSpeaker: state.activeSpeaker,
        trialStatus: state.trialStatus,
        waitingForUserInput: state.waitingForUserInput,
        aiTyping: state.aiTyping,
        canInterrupt: state.canInterrupt,
        hud: state.hud,
        report: state.report,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }
        if (!state.threadId) {
          state.setThreadId(createThreadId());
        }
      },
    },
  ),
);

export function getOrCreateThreadId(): string {
  const current = useTrialStore.getState().threadId;
  if (current) {
    return current;
  }
  const next = createThreadId();
  useTrialStore.getState().setThreadId(next);
  return next;
}

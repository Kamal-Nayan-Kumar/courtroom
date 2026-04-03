import { getOrCreateThreadId } from "@/store";

export type TrialWsOutboundMessage = {
  message?: string;
  thread_id: string;
  player_role: "prosecutor" | "defender";
  case_details?: string;
  resume?: boolean;
};

export type TrialWsInboundMessage = {
  event?: "turn" | "done" | "heartbeat" | "status" | "resumed";
  error?: string;
  turn?: string;
  content?: string;
  current_turn?: string;
  player_role?: string;
  thread_id?: string;
  transcript_count?: number;
};

interface TrialWsClientConfig {
  playerRole: "prosecutor" | "defender";
  caseDetails: string;
  startupMessage: string;
  isResume?: boolean;
  maxReconnectAttempts?: number;
  startupTimeoutMs?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onStatus?: (status: "connecting" | "connected" | "reconnecting" | "disconnected") => void;
  onError?: (message: string) => void;
  onMessage?: (message: TrialWsInboundMessage) => void;
}

const WS_PATH = "/api/v1/trial/stream";

function resolveWsBaseUrl(): string {
  const envWsOrigin = (import.meta.env.VITE_WS_ORIGIN as string | undefined)?.trim();
  if (envWsOrigin) {
    return envWsOrigin.replace(/\/$/, "");
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const sameHostOrigin = `${protocol}://${window.location.host}`;
  const defaultDevOrigin = `${protocol}://127.0.0.1:8000`;
  const isLocal =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  return isLocal ? defaultDevOrigin : sameHostOrigin;
}

function backoffWithJitter(attempt: number): number {
  const base = 400;
  const max = 15000;
  const exp = Math.min(max, base * 2 ** Math.max(0, attempt - 1));
  const jitter = 0.8 + Math.random() * 0.5;
  return Math.round(exp * jitter);
}

export class TrialWebSocketClient {
  private readonly config: Required<
    Pick<TrialWsClientConfig, "maxReconnectAttempts" | "startupTimeoutMs">
  > &
    Omit<TrialWsClientConfig, "maxReconnectAttempts" | "startupTimeoutMs">;

  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private startupTimer: number | null = null;
  private manuallyClosed = false;
  private startupTurnReceived = false;
  private pendingOutboundQueue: TrialWsOutboundMessage[] = [];

  constructor(config: TrialWsClientConfig) {
    this.config = {
      maxReconnectAttempts: config.maxReconnectAttempts ?? 12,
      startupTimeoutMs: config.startupTimeoutMs ?? 15000,
      ...config,
    };
  }

  connect(): void {
    this.manuallyClosed = false;
    this.startupTurnReceived = false;
    this.openSocket(false);
  }

  close(): void {
    this.manuallyClosed = true;
    this.clearStartupTimer();
    if (this.socket) {
      this.socket.close();
    }
    this.socket = null;
    this.pendingOutboundQueue = [];
    this.config.onStatus?.("disconnected");
  }

  isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  send(payload: Omit<TrialWsOutboundMessage, "thread_id">): void {
    const withThread: TrialWsOutboundMessage = {
      ...payload,
      thread_id: getOrCreateThreadId(),
    };

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.pendingOutboundQueue.push(withThread);
      return;
    }

    this.socket.send(JSON.stringify(withThread));
  }

  private openSocket(isReconnect: boolean): void {
    this.config.onStatus?.(isReconnect ? "reconnecting" : "connecting");
    const socket = new WebSocket(`${resolveWsBaseUrl()}${WS_PATH}`);
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.config.onStatus?.("connected");
      this.config.onOpen?.();
      this.sendStartup();
      this.flushQueue();
      this.startupTimer = window.setTimeout(() => {
        if (!this.startupTurnReceived) {
          this.config.onError?.("Trial did not start in time. Reconnecting to courtroom...");
          this.forceReconnect();
        }
      }, this.config.startupTimeoutMs);
    };

    socket.onmessage = (event) => {
      let parsed: TrialWsInboundMessage;
      try {
        parsed = JSON.parse(event.data) as TrialWsInboundMessage;
      } catch {
        return;
      }

      if (parsed.event === "heartbeat") {
        this.config.onStatus?.("connected");
        return;
      }

      if (parsed.error) {
        this.config.onError?.(parsed.error);
        return;
      }

      if (parsed.event === "turn" || (parsed.turn && parsed.content)) {
        this.startupTurnReceived = true;
        this.clearStartupTimer();
      }

      this.config.onMessage?.(parsed);
    };

    socket.onerror = () => {
      this.config.onError?.("Courtroom connection error. Attempting recovery...");
    };

    socket.onclose = () => {
      this.clearStartupTimer();
      this.config.onClose?.();

      if (this.manuallyClosed) {
        this.config.onStatus?.("disconnected");
        return;
      }

      this.forceReconnect();
    };
  }

  private forceReconnect(): void {
    if (this.manuallyClosed) {
      return;
    }

    this.reconnectAttempts += 1;
    if (this.reconnectAttempts > this.config.maxReconnectAttempts) {
      this.config.onStatus?.("disconnected");
      this.config.onError?.("Unable to reconnect to courtroom. Please start a new session.");
      return;
    }

    this.config.onStatus?.("reconnecting");
    const delay = backoffWithJitter(this.reconnectAttempts);
    window.setTimeout(() => {
      if (!this.manuallyClosed) {
        this.openSocket(true);
      }
    }, delay);
  }

  private sendStartup(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    const payload: TrialWsOutboundMessage = {
      message: this.config.startupMessage,
      thread_id: getOrCreateThreadId(),
      player_role: this.config.playerRole,
      case_details: this.config.caseDetails,
      ...(this.config.isResume ? { resume: true } : {}),
    };
    this.socket.send(JSON.stringify(payload));
  }

  private flushQueue(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    while (this.pendingOutboundQueue.length > 0) {
      const next = this.pendingOutboundQueue.shift();
      if (!next) {
        continue;
      }
      this.socket.send(JSON.stringify(next));
    }
  }

  private clearStartupTimer(): void {
    if (this.startupTimer !== null) {
      window.clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }
  }
}

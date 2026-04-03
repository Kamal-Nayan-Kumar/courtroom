const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);

export interface RequestWithRetryOptions extends RequestInit {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOnStatuses?: number[];
  timeoutMs?: number;
}

export class ApiHttpError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
    this.payload = payload;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function jitteredBackoff(baseDelayMs: number, attempt: number, maxDelayMs: number): number {
  const exp = baseDelayMs * 2 ** Math.max(0, attempt - 1);
  const jitter = 0.75 + Math.random() * 0.5;
  return Math.min(maxDelayMs, Math.round(exp * jitter));
}

function parseRetryAfterSeconds(headerValue: string | null): number | null {
  if (!headerValue) {
    return null;
  }
  const asNumber = Number(headerValue);
  if (Number.isFinite(asNumber) && asNumber >= 0) {
    return asNumber;
  }
  const asDate = Date.parse(headerValue);
  if (Number.isNaN(asDate)) {
    return null;
  }
  const diffMs = asDate - Date.now();
  if (diffMs <= 0) {
    return 0;
  }
  return Math.ceil(diffMs / 1000);
}

function timeoutSignal(timeoutMs: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(timeoutMs);
  }
  const controller = new AbortController();
  window.setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

export async function requestWithRetry<T>(
  input: RequestInfo | URL,
  options: RequestWithRetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 500,
    maxDelayMs = 8000,
    retryOnStatuses = [...RETRYABLE_STATUS_CODES],
    timeoutMs = 30000,
    ...init
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    try {
      const response = await fetch(input, {
        ...init,
        signal: init.signal || timeoutSignal(timeoutMs),
      });

      if (!response.ok) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = await response.text().catch(() => "");
        }

        const message =
          (typeof payload === "object" && payload && "detail" in payload
            ? String((payload as { detail?: unknown }).detail || "")
            : "") || `Request failed with status ${response.status}`;

        const retryable = retryOnStatuses.includes(response.status);
        if (!retryable || attempt > maxRetries) {
          throw new ApiHttpError(message, response.status, payload);
        }

        const retryAfter = parseRetryAfterSeconds(response.headers.get("retry-after"));
        const retryDelay =
          retryAfter !== null
            ? Math.min(maxDelayMs, retryAfter * 1000)
            : jitteredBackoff(baseDelayMs, attempt, maxDelayMs);

        await sleep(retryDelay);
        continue;
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      const networkError =
        error instanceof TypeError || (error instanceof DOMException && error.name === "AbortError");

      if (!networkError || attempt > maxRetries) {
        throw error;
      }

      await sleep(jitteredBackoff(baseDelayMs, attempt, maxDelayMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed unexpectedly.");
}

export function userFriendlyServiceMessage(error: unknown): string {
  if (error instanceof ApiHttpError && (error.status === 429 || error.status === 502 || error.status === 503)) {
    return "The court service is temporarily unavailable. Please retry.";
  }
  if (error instanceof Error && /429|502|503|timeout/i.test(error.message)) {
    return "The court service is temporarily unavailable. Please retry.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong while contacting the court server.";
}

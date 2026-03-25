export type ErrorCategory =
  | "billing"
  | "upstream_unavailable"
  | "rate_limited"
  | "content_safety"
  | "validation"
  | "auth"
  | "timeout"
  | "internal";

export interface ClassifiedError {
  category: ErrorCategory;
  message: string;
  label: string;
  httpStatus: number;
  isRetryable: boolean;
}

type ParsedErrorPayload = {
  message?: string;
  code?: number;
  status?: number;
};

function pickFirstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function pickFirstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function parseErrorPayload(value: string): ParsedErrorPayload | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidates = [trimmed];
  const braceIndex = trimmed.indexOf("{");
  if (braceIndex > 0) {
    candidates.push(trimmed.slice(braceIndex));
  }

  for (const candidate of candidates) {
    if (!candidate.startsWith("{")) continue;
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const nested =
        typeof parsed.data === "object" && parsed.data !== null
          ? (parsed.data as Record<string, unknown>)
          : undefined;

      const message = pickFirstString(
        parsed.message,
        parsed.msg,
        parsed.error,
        parsed.detail,
        parsed.errorMessage,
        nested?.message,
        nested?.msg,
        nested?.error,
        nested?.detail,
        nested?.errorMessage,
      );
      const code = pickFirstNumber(parsed.code, nested?.code);
      const status = pickFirstNumber(parsed.status, nested?.status);

      if (message || code != null || status != null) {
        return { message, code, status };
      }
    } catch {
      // Ignore non-JSON payloads.
    }
  }

  return null;
}

function sanitizeMessage(message: string): string {
  const compact = message.replace(/\s+/g, " ").trim();
  if (!compact) return "Generation failed";
  return compact.length > 280 ? `${compact.slice(0, 277)}...` : compact;
}

function normalizeError(err: Error): {
  message: string;
  status?: number;
  code?: number;
} {
  const parsed = parseErrorPayload(err.message || "");
  const message = sanitizeMessage(parsed?.message ?? err.message ?? "");
  const status = (err as { status?: number }).status ?? parsed?.status;
  const code =
    (err as { providerCode?: number; code?: number }).providerCode ??
    (err as { code?: number }).code ??
    parsed?.code;

  return { message, status, code };
}

function isSpecificProviderMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("{") || trimmed.startsWith("<")) return false;

  return !/^(generation failed|processing failed|request failed|request timeout|generation did not produce outputs|video generation failed|internal server error|something went wrong during generation\. please try again\.?)$/i.test(
    trimmed,
  );
}

function shouldShowProviderMessage(classified: ClassifiedError): boolean {
  if (!isSpecificProviderMessage(classified.message)) return false;

  const lower = classified.message.toLowerCase();
  switch (classified.category) {
    case "billing":
    case "auth":
    case "validation":
      return true;
    case "rate_limited":
      return /credit|balance|quota|limit|queue|concurrent|rate/i.test(lower);
    default:
      return false;
  }
}

export function classifyError(err: unknown): ClassifiedError {
  const raw = err instanceof Error ? err : new Error(String(err));
  const { message: msg, status, code } = normalizeError(raw);
  const lower = msg.toLowerCase();

  if (
    status === 402 ||
    code === 1100 ||
    /insufficient(?:ly)?\s+(?:credit|balance)|out of credits|payment required|resource pack|account limit|depleted|top up/i.test(
      lower,
    )
  ) {
    return {
      category: "billing",
      message: msg,
      label: "Provider credits exhausted",
      httpStatus: 402,
      isRetryable: false,
    };
  }

  if (
    status === 429 ||
    code === 1101 ||
    code === 1102 ||
    code === 1104 ||
    /429|rate.?limit|resource.?exhausted|quota|concurrent.?limit|queue.?full/i.test(msg)
  ) {
    return {
      category: "rate_limited",
      message: msg,
      label: "Rate limited by provider",
      httpStatus: 429,
      isRetryable: true,
    };
  }

  if (status === 502 || status === 503 || status === 504 || /502|503|504|service.?unavailable|upstream/i.test(msg)) {
    return {
      category: "upstream_unavailable",
      message: msg,
      label: "Provider temporarily unavailable",
      httpStatus: 502,
      isRetryable: true,
    };
  }

  if (/safety|blocked|filtered|content.?policy|harmful/i.test(msg)) {
    return {
      category: "content_safety",
      message: msg,
      label: "Content blocked by safety filter",
      httpStatus: 422,
      isRetryable: false,
    };
  }

  if (status === 400 || code === 1200 || code === 1201 || code === 1202 || code === 1203 || /validation|invalid|bad.?request/i.test(msg)) {
    return {
      category: "validation",
      message: msg,
      label: "Invalid request",
      httpStatus: 400,
      isRetryable: false,
    };
  }

  if (
    status === 401 ||
    status === 403 ||
    code === 1000 ||
    code === 1001 ||
    code === 1002 ||
    code === 1003 ||
    code === 1004 ||
    code === 1103 ||
    /auth|unauthorized|forbidden/i.test(msg)
  ) {
    return {
      category: "auth",
      message: msg,
      label: "Authentication error",
      httpStatus: 401,
      isRetryable: false,
    };
  }

  if (/timeout|timed.?out|aborted|ETIMEDOUT|ECONNRESET/i.test(msg)) {
    return {
      category: "timeout",
      message: msg,
      label: "Request timed out",
      httpStatus: 504,
      isRetryable: true,
    };
  }

  return {
    category: "internal",
    message: msg,
    label: "Generation failed",
    httpStatus: 500,
    isRetryable: true,
  };
}

export function userFacingMessage(classified: ClassifiedError): string {
  if (shouldShowProviderMessage(classified)) {
    return classified.message;
  }

  switch (classified.category) {
    case "billing":
      return "The AI provider account is out of credits or has reached its package limit. Please top up and retry.";
    case "rate_limited":
      return "The AI provider is experiencing high demand. Please try again in a moment.";
    case "upstream_unavailable":
      return "The AI provider is temporarily unavailable. This is usually resolved quickly — please retry.";
    case "content_safety":
      return "This prompt was blocked by the provider's safety filter. Try rephrasing your prompt.";
    case "validation":
      return "The generation request was invalid. Please check your settings and try again.";
    case "auth":
      return "There was an authentication issue with the AI provider. Contact an admin.";
    case "timeout":
      return "The generation timed out waiting for a response from the provider. Please try again.";
    case "internal":
    default:
      return "Something went wrong during generation. Please try again.";
  }
}

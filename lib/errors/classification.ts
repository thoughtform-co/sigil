export type ErrorCategory =
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

export function classifyError(err: unknown): ClassifiedError {
  const raw = err instanceof Error ? err : new Error(String(err));
  const msg = raw.message || "";
  const status = (raw as { status?: number }).status;
  const lower = msg.toLowerCase();

  if (status === 429 || /429|rate.?limit|resource.?exhausted|quota/i.test(msg)) {
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

  if (status === 400 || /validation|invalid|bad.?request/i.test(msg)) {
    return {
      category: "validation",
      message: msg,
      label: "Invalid request",
      httpStatus: 400,
      isRetryable: false,
    };
  }

  if (status === 401 || status === 403 || /auth|unauthorized|forbidden/i.test(msg)) {
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
  switch (classified.category) {
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

---
name: Gemini 503 fast failover
overview: Add request timeouts and a fast-failover path to the Gemini adapter so that 503 errors trigger a rapid switch to the Replicate fallback instead of burning through 4 slow retries.
todos:
  - id: abort-gemini
    content: Add 30s AbortController timeout to callGeminiAPI fetch
    status: completed
  - id: fast-bail-503
    content: Add consecutiveUnavailable counter to generateSingleImageWithRetry; bail after 2
    status: completed
  - id: reduce-503-delay
    content: Lower 503 backoff to 1500ms linear, cap at 6s
    status: completed
  - id: abort-replicate
    content: Add 15s AbortController timeout to Replicate fallback model lookup and prediction creation fetches
    status: completed
isProject: false
---

# Gemini 503 Fast Failover

## Root Cause

When Gemini returns 503 (service unavailable), the current retry loop in `[lib/models/adapters/gemini.ts](lib/models/adapters/gemini.ts)` burns through 4 attempts with escalating delays (~18-27s of sleep alone), with no per-request timeout. Then it falls back to Replicate, adding more latency. Total wall-clock time for a single image can exceed 2 minutes.

## Changes

### 1. Add per-request timeout to `callGeminiAPI`

In `[lib/models/adapters/gemini.ts](lib/models/adapters/gemini.ts)`, line 292 -- wrap the `fetch()` call with an `AbortController` set to 30 seconds. This prevents indefinite hangs when Gemini is overloaded but not returning errors quickly.

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30_000);
try {
  const response = await fetch(`${endpoint}?key=${this.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });
  // ... existing response handling ...
} finally {
  clearTimeout(timeout);
}
```

The `AbortError` will be caught by the existing `isTransientError` check since the error classification in `[lib/errors/classification.ts](lib/errors/classification.ts)` already matches `aborted` at line 74.

### 2. Fast-bail on consecutive 503s in `generateSingleImageWithRetry`

In `generateSingleImageWithRetry` (line 216), add a counter for consecutive 503-class errors. If we hit 2 consecutive 503/502/504 responses, break out of the retry loop immediately instead of burning through all 4 attempts. The caller already has a Replicate fallback path, so bailing early routes the user to a working backend faster.

Specifically, at the top of the retry loop:

- Track a `consecutiveUnavailable` counter
- Inside the catch block, increment it when `isTransientError(err)` is true
- If `consecutiveUnavailable >= 2`, log and break

This reduces the worst-case Gemini retry time from ~40-70s down to ~10-20s.

### 3. Reduce base delay for 503 errors

Change the 503 backoff from linear `(attempt+1) * 2000` to a shorter `(attempt+1) * 1500`, capped at 6s instead of 16s. The 503 "service unavailable" signal means the backend is genuinely down -- unlike 429 rate limits, waiting longer rarely helps. Faster retries + faster bail = faster failover.

```typescript
const baseDelay = isTransientError(err)
  ? Math.min((attempt + 1) * 1500, 6000)
  : Math.pow(2, attempt - 1) * 1000;
```

### 4. Add timeout to Replicate fallback fetch calls

In `generateImageReplicate` (line 384), the model lookup and prediction creation fetches also have no timeout. Add 15-second `AbortController` timeouts to these two calls so the fallback path doesn't also hang.

## Files to change

- `[lib/models/adapters/gemini.ts](lib/models/adapters/gemini.ts)` -- all 4 changes above
- No other files need modification; error classification already handles `aborted`

## Expected improvement

- **Best case** (Gemini working): no change, timeout never fires
- **503 from Gemini**: failover to Replicate in ~10-15s instead of ~60-90s
- **Gemini hanging (no response)**: hard timeout at 30s per call, bail after 2 attempts instead of 4 open-ended waits


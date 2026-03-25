import { describe, expect, it } from "vitest";

import { classifyError, userFacingMessage } from "@/lib/errors/classification";

describe("generation error classification", () => {
  it("surfaces provider billing errors parsed from JSON payloads", () => {
    const err = new Error(
      'Kling API request failed: {"code":1100,"message":"Insufficient Kling credits. Please recharge your resource pack."}',
    );

    const classified = classifyError(err);

    expect(classified.category).toBe("billing");
    expect(classified.isRetryable).toBe(false);
    expect(userFacingMessage(classified)).toBe(
      "Insufficient Kling credits. Please recharge your resource pack.",
    );
  });

  it("keeps the friendly fallback for generic internal failures", () => {
    const classified = classifyError(new Error("Generation failed"));

    expect(classified.category).toBe("internal");
    expect(userFacingMessage(classified)).toBe(
      "Something went wrong during generation. Please try again.",
    );
  });
});

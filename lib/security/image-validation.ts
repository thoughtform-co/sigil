/**
 * Image upload validation: magic number checks and size limits for base64/data URLs.
 */

const MAX_BASE64_DATAURL_BYTES = 26 * 1024 * 1024; // ~26MB (base64 ~4/3 of raw)

// Magic bytes for common image types (first few bytes)
const SIGNATURES: Array<{ mime: string; check: (buf: Buffer) => boolean }> = [
  { mime: "image/png", check: (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/jpeg", check: (b) => b.length >= 2 && b[0] === 0xff && b[1] === 0xd8 },
  { mime: "image/gif", check: (b) => b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61 },
  { mime: "image/webp", check: (b) => b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
];

export function getMaxDataUrlLength(): number {
  const rawMax = MAX_BASE64_DATAURL_BYTES;
  const base64Overhead = 4 / 3;
  const prefix = "data:image/xxx;base64,".length;
  return prefix + Math.floor(rawMax * base64Overhead);
}

/**
 * Validates that a base64 data URL is within size limit and decodes to a recognized image signature.
 * @param dataUrl - data:image/...;base64,... string
 * @returns Decoded buffer if valid
 * @throws Error if invalid or oversized
 */
export function validateImageDataUrl(dataUrl: string): Buffer {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    throw new Error("Invalid data URL format");
  }
  const maxLen = getMaxDataUrlLength();
  if (dataUrl.length > maxLen) {
    throw new Error(`Data URL exceeds maximum size (${Math.round(maxLen / (1024 * 1024))}MB)`);
  }
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) throw new Error("Invalid data URL format");
  const base64 = dataUrl.slice(commaIndex + 1);
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    throw new Error("Invalid base64 in data URL");
  }
  if (buffer.length > MAX_BASE64_DATAURL_BYTES) {
    throw new Error("Decoded image exceeds maximum size");
  }
  const matched = SIGNATURES.find((s) => s.check(buffer));
  if (!matched) {
    throw new Error("Unrecognized image format; use PNG, JPEG, GIF, or WebP");
  }
  return buffer;
}

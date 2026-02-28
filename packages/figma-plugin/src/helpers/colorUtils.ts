export function solidPaint(r: number, g: number, b: number, a = 1): SolidPaint {
  return { type: "SOLID", color: { r, g, b }, opacity: a };
}

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

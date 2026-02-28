import { generateDesignSystem } from "./src/generateDesignSystem";
import { generateStylesOnly } from "./src/generateDesignSystem";

figma.showUI(__html__, { width: 280, height: 240 });

figma.ui.onmessage = async (msg: { type: string }) => {
  try {
    if (msg.type === "generate-design-system") {
      await generateDesignSystem();
      figma.ui.postMessage({ type: "done", text: "Design system generated." });
    } else if (msg.type === "generate-styles-only") {
      await generateStylesOnly();
      figma.ui.postMessage({ type: "done", text: "Figma styles created." });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    figma.ui.postMessage({ type: "error", text: message });
  }
};

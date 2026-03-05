type FrameOpts = {
  name: string;
  direction?: "HORIZONTAL" | "VERTICAL";
  spacing?: number;
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  width?: number;
  height?: number;
  fill?: RGB;
  fillOpacity?: number;
  asComponent?: boolean;
};

function applyAutoLayout(frame: FrameNode | ComponentNode, opts: FrameOpts): void {
  frame.name = opts.name;
  frame.layoutMode = opts.direction ?? "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.itemSpacing = opts.spacing ?? 0;

  if (typeof opts.padding === "number") {
    frame.paddingTop = opts.padding;
    frame.paddingRight = opts.padding;
    frame.paddingBottom = opts.padding;
    frame.paddingLeft = opts.padding;
  } else if (opts.padding) {
    frame.paddingTop = opts.padding.top ?? 0;
    frame.paddingRight = opts.padding.right ?? 0;
    frame.paddingBottom = opts.padding.bottom ?? 0;
    frame.paddingLeft = opts.padding.left ?? 0;
  }

  if (opts.width) {
    frame.resize(opts.width, opts.height || 100);
    if (frame.layoutMode === "VERTICAL") {
      frame.counterAxisSizingMode = "FIXED";
    } else {
      frame.primaryAxisSizingMode = "FIXED";
    }
  }
  if (opts.fill) {
    frame.fills = [{ type: "SOLID", color: opts.fill, opacity: opts.fillOpacity ?? 1 }];
  } else {
    frame.fills = [];
  }
}

export function createAutoLayoutFrame(opts: FrameOpts): FrameNode {
  const frame = figma.createFrame();
  applyAutoLayout(frame, opts);
  return frame;
}

export function createAutoLayoutComponent(opts: FrameOpts): ComponentNode {
  const comp = figma.createComponent();
  applyAutoLayout(comp, opts);
  return comp;
}

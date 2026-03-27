---
name: Wireframe Globe Visual
overview: Replace the current random particle sphere on the Home landing with a hero-sized wireframe globe built from latitude/longitude grid lines rendered as grid-snapped gold particles, slowly rotating with a soft breathing pulse.
todos:
  - id: wireframe-generator
    content: Replace the random particle generator with a structured wireframe globe generator producing latitude/longitude grid lines.
    status: pending
  - id: responsive-canvas
    content: Scale the canvas to hero size (roughly 60vh) and make the sphere radius responsive to canvas dimensions.
    status: pending
  - id: visual-tuning
    content: Tune depth alpha, particle density, and optional axis tilt for the wireframe to read clearly as a navigation globe.
    status: pending
isProject: false
---

# Wireframe Globe Visual

## Target

A hero-sized wireframe globe that reads like a celestial navigation instrument: visible latitude and longitude lines made of grid-snapped gold particles, slowly rotating, with depth-based alpha for a 3D feel. The globe dominates the center of the Home page at roughly 50-60% of viewport height.

## What Changes

Single file: [components/home/HomeLanding.tsx](components/home/HomeLanding.tsx)

### Particle Generation

Replace `generateSphere()` (random cloud of 280 points) with a structured wireframe generator that produces:

- **Longitude lines** (meridians): 12-16 great circles from pole to pole, each sampled at ~40-50 points
- **Latitude lines** (parallels): 8-10 horizontal rings at regular phi intervals, each sampled at ~40-50 points
- Total particle count: roughly 800-1200 (still performant for 2D canvas at 60fps)

Each particle still stores `{ theta, phi, r, alpha }` so the existing rotation + depth + snap logic works unchanged.

### Canvas Sizing

- Change the canvas from fixed `400x400` to responsive, roughly `min(60vh, 600px)` square
- Keep DPR-aware scaling and `imageRendering: pixelated`

### Animation Tuning

- Keep the current rotation speed (0.15 rad/s) and breathing (8px amplitude, 0.4Hz)
- Optionally add a very slow secondary axis tilt (like a globe on a tilted stand) for more visual interest

### Visual Parameters

- Grid quantum stays at 3px for the pixel-art aesthetic
- Gold color stays unchanged (`h:43, s:55, l:54`)
- Depth alpha range: back-face particles at ~0.1 alpha, front-face at ~0.7
- Sphere radius scales with canvas size: roughly `canvasSize * 0.38`

### Side Telemetry

- Keep existing left/right readout panels, just ensure they don't overlap the larger globe on narrow viewports


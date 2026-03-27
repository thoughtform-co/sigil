---
name: Chaotic Particle Globe
overview: Replace the current wireframe globe with a chaotic particle sphere using Thoughtform-style particle generation, plus solar-flare data streams radiating from the surface. Keep the existing Three.js scene shell and side modules intact.
todos:
  - id: particle-core-sphere
    content: Replace the wireframe globe with a chaotic particle sphere using Fibonacci distribution + per-particle jitter, rendered as `THREE.Points`.
    status: completed
  - id: solar-flare-streams
    content: Add 8-12 solar-flare data streams as a second particle layer, with curved outward paths and fading alpha.
    status: completed
  - id: animate-chaos
    content: Update the animation loop to advance flare particles along their paths and add subtle core displacement for a shimmering alive feel.
    status: completed
isProject: false
---

# Chaotic Particle Globe

## Direction

Replace the clean wireframe globe in [components/home/HomeGlobeScene.tsx](components/home/HomeGlobeScene.tsx) with a chaotic particle sphere inspired by the Thoughtform gateway system. The sphere should feel alive and organic rather than geometric, with data-stream flares erupting from the surface like solar prominences.

## What Changes

Single file: [components/home/HomeGlobeScene.tsx](components/home/HomeGlobeScene.tsx)

The existing Three.js renderer, camera, resize handling, and cleanup logic all stay. Only `buildGlobe()` and the animation loop change.

## Particle Architecture

### Core sphere (~2000-3000 particles)

- Distribute particles on a sphere surface using Fibonacci / golden-angle spacing for even coverage
- Add per-particle jitter to break the perfect sphere: random radial offset `0.85-1.15` of base radius
- Use `THREE.Points` + `THREE.BufferGeometry` with a `Float32Array` for positions
- Use `THREE.PointsMaterial` with `sizeAttenuation: true`, gold color, additive blending for glow

### Solar flare streams (~8-12 streams, ~30-40 particles each)

- Each stream originates from a random point on the sphere surface
- Particles follow a curved outward path: radial + tangential offset, fading alpha along the stream
- Streams slowly rotate with the sphere but have their own drift/curl
- Use a second `THREE.Points` layer with brighter gold and larger particle size

### Animation (per frame in `requestAnimationFrame`)

- Slow Y rotation of the whole group
- Breathing scale pulse (same as current)
- Update flare stream particle positions: each particle advances along its path, wraps back to origin when it reaches max distance
- Optional: subtle noise-based displacement on core particles for a shimmering effect (can be done CPU-side without shaders for V1)

## Visual Parameters

- Core particle color: `#caa554` (Gold) at ~0.4-0.6 opacity
- Core particle size: 0.02-0.03 (small, dense cloud feel)
- Flare particle color: `#caa554` at higher opacity (0.6-0.9), larger size (0.04-0.06)
- Flare particle alpha fades along stream length
- Blending: `THREE.AdditiveBlending` on both layers for natural glow overlap
- `depthWrite: false` on both materials so particles composite correctly
- Sphere radius: 2.4 (same as current)
- Flare max reach: 1.5x sphere radius

## What Stays The Same

- [components/home/HomeLanding.tsx](components/home/HomeLanding.tsx) composition shell and side modules -- untouched
- Three.js renderer setup, camera, resize, cleanup
- Container sizing (`min(60vh, 600px)`)
- Transparent WebGL background (HUD dot-grid shows through)


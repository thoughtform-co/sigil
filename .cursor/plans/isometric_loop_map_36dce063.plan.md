---
name: Isometric Loop Map
overview: Replace the flat SVG loop map in the workshop page with a WebGL topographic contour map rendered via Three.js, where Navigate, Encode, and Accelerate are mapped as terrain regions at ascending elevations with contour lines, paths, and labeled waypoints.
todos:
  - id: fix-lead-alignment
    content: Center the Lead paragraph properly in the loop section.
    status: completed
  - id: build-terrain-map
    content: Create the WebGL topographic contour map component with Three.js.
    status: completed
  - id: wire-and-cleanup
    content: Replace LoopMap with LoopTerrainMap in the workshop page and delete the old SVG function.
    status: completed
isProject: false
---

# Isometric Topographic Loop Map

## Current State

The loop section in [components/workshops/BrandedWorkshopPage.tsx](components/workshops/BrandedWorkshopPage.tsx) renders a flat SVG with isometric grid lines and text labels. The `Lead` paragraph below the heading is misaligned because it inherits `max-width: 540px` but sits inside the centered text-align container without explicit centering of itself.

```140:147:components/workshops/BrandedWorkshopPage.tsx
<Slide id="loop" reg={reg} tint="#F5EAE1">
  <div style={{ textAlign: "center" }}>
    <Tag>The framework</Tag>
    <h2 style={h2Style}>A loop, not a ladder.</h2>
    <Lead>Three ways of working with AI...</Lead>
    <LoopMap />
  </div>
</Slide>
```

The `LoopMap` function (lines 606-627) is the SVG that needs replacing.

## Target

A WebGL topographic contour map using Three.js (already installed at `three@^0.183.2`) following the existing particle/globe pattern from [components/home/HomeGlobeScene.tsx](components/home/HomeGlobeScene.tsx):

- Canvas-based renderer, imperative Three.js setup in a `useEffect`, cleanup on unmount
- Three terrain regions at ascending elevations: **Navigate** (lowlands), **Encode** (mid-altitude), **Accelerate** (peak)
- Contour lines rendered as wireframe rings at regular elevation intervals, using the client accent color at low opacity
- A subtle glowing route path connecting the three regions
- Labels rendered as HTML overlays positioned via CSS `transform` to track the 3D positions (avoids Three.js text rendering complexity)
- Gentle auto-rotation to give depth perception
- Isometric-ish camera angle (high OrthographicCamera looking down at ~30-40 degrees)
- Color palette: contour lines in `--ws-accent` at 15-20% opacity, terrain surface transparent or very faint, labels in `--ws-dark`

## Implementation

### Fix Lead alignment

In the `Lead` component, add `margin: "8px auto 0"` as the default so it centers properly inside `text-align: center` containers.

### New component

Create [components/workshops/sections/LoopTerrainMap.tsx](components/workshops/sections/LoopTerrainMap.tsx) as a `"use client"` component:

- Accept `accentColor` and `darkColor` props from the workshop branding
- Use a `useRef` for the canvas, set up `THREE.WebGLRenderer` with `alpha: true` and `antialias: true`
- Create `THREE.OrthographicCamera` with a tilted isometric view
- Generate three terrain mounds using parametric geometry: each is a radial heightfield (cosine falloff from center) positioned at different XZ coordinates
- Render contour lines as `THREE.LineLoop` geometries at fixed Y intervals slicing through each mound
- Add a route path as a `THREE.Line` with dashed material connecting the three peaks
- Add gentle continuous rotation (~0.02 rad/s around Y)
- Overlay three HTML labels positioned absolutely, tracking the peak of each mound via `THREE.Vector3.project()`
- Responsive: re-measure on resize, cap at ~660px wide and ~420px tall to match the original SVG footprint
- Clean up renderer, geometries, and materials on unmount

### Wire into the page

Replace `<LoopMap />` with the new `LoopTerrainMap` component in the loop slide, passing the branding colors. Fix the `Lead` centering at the same time.

### Remove old `LoopMap`

Delete the `LoopMap` SVG function from `BrandedWorkshopPage.tsx` since it is fully replaced.
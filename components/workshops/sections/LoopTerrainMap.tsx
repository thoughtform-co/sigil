"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import * as THREE from "three";

const MAX_W = 900;
const MAX_H = 520;
const ROTATION_SPEED = 0.02;

type Mound = {
  cx: number;
  cz: number;
  height: number;
  radius: number;
  label: string;
};

const MOUNDS: Mound[] = [
  { cx: -2.8, cz: 0.6, height: 1.0, radius: 2.2, label: "Navigate" },
  { cx: 0.4, cz: -0.4, height: 1.8, radius: 2.0, label: "Encode" },
  { cx: 3.2, cz: 1.2, height: 2.8, radius: 2.4, label: "Accelerate" },
];

const CONTOUR_LEVELS = [0.15, 0.35, 0.55, 0.75, 0.95];

function heightAt(x: number, z: number): number {
  let h = 0;
  for (const m of MOUNDS) {
    const dx = x - m.cx;
    const dz = z - m.cz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const t = Math.max(0, 1 - dist / m.radius);
    h += m.height * t * t * (3 - 2 * t);
  }
  return h;
}

function generateContourRing(mound: Mound, level: number, segments: number): Float32Array | null {
  const targetH = mound.height * level;
  const points: number[] = [];

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    let lo = 0;
    let hi = mound.radius * 1.2;
    for (let iter = 0; iter < 20; iter++) {
      const mid = (lo + hi) / 2;
      const px = mound.cx + Math.cos(angle) * mid;
      const pz = mound.cz + Math.sin(angle) * mid;
      if (heightAt(px, pz) > targetH) lo = mid;
      else hi = mid;
    }
    const r = (lo + hi) / 2;
    const px = mound.cx + Math.cos(angle) * r;
    const pz = mound.cz + Math.sin(angle) * r;
    const py = heightAt(px, pz);
    points.push(px, py, pz);
  }

  if (points.length < 9) return null;
  return new Float32Array(points);
}

function generateRoutePath(): Float32Array {
  const pts: number[] = [];
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let x: number, z: number;
    if (t < 0.5) {
      const s = t * 2;
      x = MOUNDS[0].cx * (1 - s) + MOUNDS[1].cx * s;
      z = MOUNDS[0].cz * (1 - s) + MOUNDS[1].cz * s;
      z += Math.sin(s * Math.PI) * 0.8;
    } else {
      const s = (t - 0.5) * 2;
      x = MOUNDS[1].cx * (1 - s) + MOUNDS[2].cx * s;
      z = MOUNDS[1].cz * (1 - s) + MOUNDS[2].cz * s;
      z -= Math.sin(s * Math.PI) * 0.6;
    }
    const y = heightAt(x, z) + 0.05;
    pts.push(x, y, z);
  }
  return new Float32Array(pts);
}

type LoopTerrainMapProps = {
  accentColor?: string;
  darkColor?: string;
};

export function LoopTerrainMap({ accentColor = "#FE6744", darkColor = "#241D1B" }: LoopTerrainMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animRef = useRef<number | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const disposeRef = useRef<(() => void)[]>([]);
  const [labelPositions, setLabelPositions] = useState<{ x: number; y: number }[]>([]);

  const init = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = Math.min(container.clientWidth, MAX_W);
    const h = MAX_H;
    const aspect = w / h;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const frustum = 5;
    const camera = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect,
      frustum, -frustum,
      0.1, 100,
    );
    camera.position.set(6, 8, 6);
    camera.lookAt(0, 0.5, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    const accentHex = new THREE.Color(accentColor);
    const darkHex = new THREE.Color(darkColor);

    const contourMat = new THREE.LineBasicMaterial({
      color: accentHex,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    disposeRef.current.push(() => contourMat.dispose());

    const contourMajorMat = new THREE.LineBasicMaterial({
      color: accentHex,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    disposeRef.current.push(() => contourMajorMat.dispose());

    for (const mound of MOUNDS) {
      CONTOUR_LEVELS.forEach((level, li) => {
        const ring = generateContourRing(mound, level, 64);
        if (!ring) return;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(ring, 3));
        const isMajor = li === 2 || li === 4;
        const line = new THREE.LineLoop(geo, isMajor ? contourMajorMat : contourMat);
        group.add(line);
        disposeRef.current.push(() => geo.dispose());
      });
    }

    const gridMat = new THREE.LineBasicMaterial({
      color: darkHex,
      transparent: true,
      opacity: 0.04,
      depthWrite: false,
    });
    disposeRef.current.push(() => gridMat.dispose());

    const gridExtent = 6;
    const gridStep = 0.8;
    for (let x = -gridExtent; x <= gridExtent; x += gridStep) {
      const pts: number[] = [];
      for (let z = -gridExtent; z <= gridExtent; z += 0.2) {
        pts.push(x, heightAt(x, z) * 0.02, z);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      group.add(new THREE.Line(geo, gridMat));
      disposeRef.current.push(() => geo.dispose());
    }
    for (let z = -gridExtent; z <= gridExtent; z += gridStep) {
      const pts: number[] = [];
      for (let x = -gridExtent; x <= gridExtent; x += 0.2) {
        pts.push(x, heightAt(x, z) * 0.02, z);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      group.add(new THREE.Line(geo, gridMat));
      disposeRef.current.push(() => geo.dispose());
    }

    const routeArr = generateRoutePath();
    const routeGeo = new THREE.BufferGeometry();
    routeGeo.setAttribute("position", new THREE.BufferAttribute(routeArr, 3));
    const routeMat = new THREE.LineDashedMaterial({
      color: accentHex,
      transparent: true,
      opacity: 0.5,
      dashSize: 0.15,
      gapSize: 0.1,
      depthWrite: false,
    });
    const routeLine = new THREE.Line(routeGeo, routeMat);
    routeLine.computeLineDistances();
    group.add(routeLine);
    disposeRef.current.push(() => { routeGeo.dispose(); routeMat.dispose(); });

    for (const mound of MOUNDS) {
      const dotGeo = new THREE.SphereGeometry(0.06, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({ color: accentHex, transparent: true, opacity: 0.8 });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.set(mound.cx, mound.height + 0.1, mound.cz);
      group.add(dot);
      disposeRef.current.push(() => { dotGeo.dispose(); dotMat.dispose(); });
    }
  }, [accentColor, darkColor]);

  const animate = useCallback(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const group = groupRef.current;
    const container = containerRef.current;

    if (!renderer || !scene || !camera || !group || !container) {
      animRef.current = requestAnimationFrame(animate);
      return;
    }

    const t = performance.now() / 1000;
    group.rotation.y = t * ROTATION_SPEED;

    const w = renderer.domElement.width / (renderer.getPixelRatio());
    const h = renderer.domElement.height / (renderer.getPixelRatio());

    const positions = MOUNDS.map((m) => {
      const v = new THREE.Vector3(m.cx, m.height + 0.3, m.cz);
      v.applyMatrix4(group.matrixWorld);
      v.project(camera);
      return {
        x: (v.x * 0.5 + 0.5) * w,
        y: (-v.y * 0.5 + 0.5) * h,
      };
    });
    setLabelPositions(positions);

    renderer.render(scene, camera);
    animRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    init();
    animRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      const container = containerRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      if (!container || !renderer || !camera) return;
      const w = Math.min(container.clientWidth, MAX_W);
      const h = MAX_H;
      const aspect = w / h;
      const frustum = 5;
      camera.left = -frustum * aspect;
      camera.right = frustum * aspect;
      camera.top = frustum;
      camera.bottom = -frustum;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      for (const fn of disposeRef.current) fn();
      disposeRef.current = [];
      const renderer = rendererRef.current;
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
        rendererRef.current = null;
      }
    };
  }, [init, animate]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: MAX_W,
        height: MAX_H,
        margin: "40px auto 0",
      }}
    >
      {labelPositions.map((pos, i) => (
        <div
          key={MOUNDS[i].label}
          style={{
            position: "absolute",
            left: pos.x,
            top: pos.y,
            transform: "translate(-50%, -100%)",
            fontFamily: "var(--ws-font, var(--font-sans))",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--ws-dark, #241D1B)",
            opacity: 0.7,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            textShadow: "0 1px 4px rgba(255,255,255,0.6)",
          }}
        >
          {MOUNDS[i].label}
        </div>
      ))}
      <div
        style={{
          textAlign: "center",
          fontFamily: "var(--ws-mono, var(--font-mono))",
          fontSize: 9,
          opacity: 0.15,
          letterSpacing: "0.05em",
          marginTop: 4,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        ...and back to navigate more
      </div>
    </div>
  );
}

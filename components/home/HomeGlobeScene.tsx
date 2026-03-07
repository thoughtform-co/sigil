"use client";

import { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";

const GOLD_HEX = 0xcaa554;
const SPHERE_RADIUS = 2.4;
const CORE_COUNT = 4000;
const FLARE_STREAM_COUNT = 10;
const FLARE_PARTICLES_PER_STREAM = 35;
const FLARE_MAX_REACH = 1.4;
const ROTATION_SPEED = 0.04;
const TILT_ANGLE = 0.25;
const BREATHING_AMP = 0.02;
const BREATHING_SPEED = 0.25;
const SHIMMER_AMP = 0.03;
const SHIMMER_SPEED = 0.6;
const FLARE_SPEED = 0.3;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

type FlareStream = {
  originTheta: number;
  originPhi: number;
  curve: number;
  tiltX: number;
  tiltZ: number;
  speed: number;
};

function generateCorePositions(): Float32Array {
  const positions = new Float32Array(CORE_COUNT * 3);
  for (let i = 0; i < CORE_COUNT; i++) {
    const y = 1 - (i / (CORE_COUNT - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = GOLDEN_ANGLE * i;
    const jitter = 0.96 + Math.random() * 0.08;
    const r = SPHERE_RADIUS * jitter;
    positions[i * 3] = Math.cos(theta) * radiusAtY * r;
    positions[i * 3 + 1] = y * r;
    positions[i * 3 + 2] = Math.sin(theta) * radiusAtY * r;
  }
  return positions;
}

function generateCoreSeeds(): Float32Array {
  const seeds = new Float32Array(CORE_COUNT);
  for (let i = 0; i < CORE_COUNT; i++) {
    seeds[i] = Math.random() * Math.PI * 2;
  }
  return seeds;
}

function generateFlareStreams(): FlareStream[] {
  const streams: FlareStream[] = [];
  for (let i = 0; i < FLARE_STREAM_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    streams.push({
      originTheta: theta,
      originPhi: phi,
      curve: (Math.random() - 0.5) * 1.0,
      tiltX: (Math.random() - 0.5) * 0.5,
      tiltZ: (Math.random() - 0.5) * 0.5,
      speed: 0.6 + Math.random() * 0.5,
    });
  }
  return streams;
}

function buildParticleGlobe(
  corePositions: Float32Array,
): { group: THREE.Group; coreGeo: THREE.BufferGeometry; flareGeo: THREE.BufferGeometry } {
  const group = new THREE.Group();

  const coreGeo = new THREE.BufferGeometry();
  coreGeo.setAttribute("position", new THREE.BufferAttribute(corePositions.slice(), 3));
  const coreMat = new THREE.PointsMaterial({
    color: GOLD_HEX,
    size: 0.04,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  group.add(new THREE.Points(coreGeo, coreMat));

  const totalFlare = FLARE_STREAM_COUNT * FLARE_PARTICLES_PER_STREAM;
  const flarePositions = new Float32Array(totalFlare * 3);
  const flareGeo = new THREE.BufferGeometry();
  flareGeo.setAttribute("position", new THREE.BufferAttribute(flarePositions, 3));

  const flareMat = new THREE.PointsMaterial({
    color: GOLD_HEX,
    size: 0.06,
    transparent: true,
    opacity: 0.7,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  group.add(new THREE.Points(flareGeo, flareMat));

  return { group, coreGeo, flareGeo };
}

export function HomeGlobeScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const globeRef = useRef<THREE.Group | null>(null);
  const coreGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const flareGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const coreBaseRef = useRef<Float32Array | null>(null);
  const coreSeedsRef = useRef<Float32Array | null>(null);
  const flareStreamsRef = useRef<FlareStream[]>([]);
  const animRef = useRef<number | null>(null);

  const init = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const w = container.clientWidth;
    const h = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(0, 0, 8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const corePositions = generateCorePositions();
    coreBaseRef.current = corePositions;
    coreSeedsRef.current = generateCoreSeeds();
    flareStreamsRef.current = generateFlareStreams();

    const { group, coreGeo, flareGeo } = buildParticleGlobe(corePositions);
    group.rotation.x = TILT_ANGLE;
    scene.add(group);
    globeRef.current = group;
    coreGeoRef.current = coreGeo;
    flareGeoRef.current = flareGeo;
  }, []);

  const animate = useCallback(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const globe = globeRef.current;
    const coreGeo = coreGeoRef.current;
    const flareGeo = flareGeoRef.current;
    const coreBase = coreBaseRef.current;
    const seeds = coreSeedsRef.current;
    const streams = flareStreamsRef.current;

    if (!renderer || !scene || !camera || !globe || !coreGeo || !flareGeo || !coreBase || !seeds) {
      animRef.current = requestAnimationFrame(animate);
      return;
    }

    const t = performance.now() / 1000;

    globe.rotation.y = t * ROTATION_SPEED;
    const breathe = 1 + Math.sin(t * BREATHING_SPEED * Math.PI * 2) * BREATHING_AMP;
    globe.scale.setScalar(breathe);

    const corePos = coreGeo.attributes.position as THREE.BufferAttribute;
    const arr = corePos.array as Float32Array;
    for (let i = 0; i < CORE_COUNT; i++) {
      const seed = seeds[i];
      const shimmer = Math.sin(t * SHIMMER_SPEED + seed) * SHIMMER_AMP;
      const bx = coreBase[i * 3];
      const by = coreBase[i * 3 + 1];
      const bz = coreBase[i * 3 + 2];
      const len = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
      arr[i * 3] = bx + (bx / len) * shimmer;
      arr[i * 3 + 1] = by + (by / len) * shimmer;
      arr[i * 3 + 2] = bz + (bz / len) * shimmer;
    }
    corePos.needsUpdate = true;

    const flarePos = flareGeo.attributes.position as THREE.BufferAttribute;
    const fArr = flarePos.array as Float32Array;

    for (let s = 0; s < streams.length; s++) {
      const stream = streams[s];
      const ox = Math.sin(stream.originPhi) * Math.cos(stream.originTheta);
      const oy = Math.cos(stream.originPhi);
      const oz = Math.sin(stream.originPhi) * Math.sin(stream.originTheta);

      for (let p = 0; p < FLARE_PARTICLES_PER_STREAM; p++) {
        const idx = (s * FLARE_PARTICLES_PER_STREAM + p) * 3;
        const rawT = ((t * FLARE_SPEED * stream.speed + p / FLARE_PARTICLES_PER_STREAM) % 1);
        const dist = SPHERE_RADIUS * (1 + rawT * FLARE_MAX_REACH);
        const curveOffset = stream.curve * rawT * rawT;

        fArr[idx] = ox * dist + stream.tiltX * rawT * dist * 0.25 + Math.sin(curveOffset) * rawT * 0.3;
        fArr[idx + 1] = oy * dist + stream.tiltZ * rawT * dist * 0.25;
        fArr[idx + 2] = oz * dist + Math.cos(curveOffset) * rawT * 0.3;
      }
    }
    flarePos.needsUpdate = true;

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

      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const renderer = rendererRef.current;
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, [init, animate]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "min(75vh, 800px)",
        height: "min(75vh, 800px)",
        flexShrink: 0,
      }}
    />
  );
}

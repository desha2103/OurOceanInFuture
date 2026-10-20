import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import fishSrc from "../assets/fish1.png";
import fish2Src from "../assets/fish2.png";

import type {
  CoralPalette,
  CoralVisualType,
} from "../data/coralSpecies";

function hexToThree(hex: string) {
  return new THREE.Color(hex);
}

function createSkyTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#bdf6ff");
  grad.addColorStop(0.28, "#6fd3e8");
  grad.addColorStop(0.6, "#1c86a8");
  grad.addColorStop(1, "#052a3d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// cheap deterministic 3D pseudo-noise (no extra dependency needed) —
// used to break up per-vertex color into organic mottled patches
function hashNoise(x: number, y: number, z: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

// bakes a rich, organic per-vertex color: darker/deeper near the base,
// brighter/more saturated toward growth tips, with mottled speckling —
// this is what makes a single-hue STL actually look like real coral
function applyVertexColors(
  geometry: THREE.BufferGeometry,
  baseHex: string,
  speckleStrength: number,
) {
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  const minY = bbox.min.y;
  const maxY = bbox.max.y;
  const heightRange = Math.max(1e-6, maxY - minY);

  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const count = pos.count;
  const colors = new Float32Array(count * 3);

  const base = hexToThree(baseHex);
  const baseHSL = { h: 0, s: 0, l: 0 };
  base.getHSL(baseHSL);

  const tip = new THREE.Color().setHSL(
    baseHSL.h,
    Math.min(1, baseHSL.s * 1.05),
    Math.min(0.86, baseHSL.l + 0.28),
  );
  const rootTone = new THREE.Color().setHSL(
    baseHSL.h,
    Math.min(1, baseHSL.s * 0.9),
    Math.max(0.08, baseHSL.l - 0.22),
  );

  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const t = (y - minY) / heightRange;
    c.copy(rootTone).lerp(tip, Math.pow(t, 0.85));

    const speck =
      (hashNoise(x * 0.35, y * 0.35, z * 0.35) - 0.5) *
      speckleStrength;

    c.r = Math.max(0, Math.min(1, c.r + speck));
    c.g = Math.max(0, Math.min(1, c.g + speck * 0.8));
    c.b = Math.max(0, Math.min(1, c.b + speck * 0.6));

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

function sampleSurfacePoints(
  mesh: THREE.Mesh,
  bbox: THREE.Box3,
  count: number,
) {
  const raycaster = new THREE.Raycaster();
  const points: { position: THREE.Vector3; normal: THREE.Vector3 }[] =
    [];

  const top = bbox.max.y + (bbox.max.y - bbox.min.y) * 0.5 + 5;
  let attempts = 0;

  while (points.length < count && attempts < count * 14) {
    attempts++;

    const x =
      bbox.min.x + Math.random() * (bbox.max.x - bbox.min.x);
    const z =
      bbox.min.z + Math.random() * (bbox.max.z - bbox.min.z);

    raycaster.set(
      new THREE.Vector3(x, top, z),
      new THREE.Vector3(0, -1, 0),
    );

    const hits = raycaster.intersectObject(mesh, false);

    if (hits.length > 0) {
      const hit = hits[0];
      points.push({
        position: hit.point.clone(),
        normal: (hit.face?.normal ?? new THREE.Vector3(0, 1, 0)).clone(),
      });
    }
  }

  return points;
}

function makeFishSprite(texture: THREE.Texture, tint: number) {
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    color: tint,
  });
  return new THREE.Sprite(material);
}

type CoralScene3DProps = {
  modelUrl: string;
  visualType: CoralVisualType;
  stageIndex: number; // 0-3
  palette: CoralPalette;
  driverLabel: string;
  currentStageLabel: string;
  currentStageCause: string;
};

export default function CoralScene3D({
  modelUrl,
  visualType,
  stageIndex,
  palette,
  driverLabel,
  currentStageLabel,
  currentStageCause,
}: CoralScene3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [eventText, setEventText] = useState("");

  const stageIndexRef = useRef(stageIndex);
  stageIndexRef.current = stageIndex;

  const sceneApi = useRef<{
    material: THREE.MeshPhysicalMaterial | null;
    surfacePoints: { position: THREE.Vector3; normal: THREE.Vector3 }[];
  }>({
    material: null,
    surfacePoints: [],
  });

  // fire the "what's happening" story callout whenever the chapter changes
  useEffect(() => {
    if (stageIndex === 0) {
      setEventText("");
      return;
    }

    const verb =
      stageIndex >= 3
        ? "has collapsed"
        : stageIndex === 2
          ? "is breaking down"
          : "is under stress";

    setEventText(
      `📖 Chapter ${stageIndex + 1}: "${currentStageLabel}" — this colony ${verb} as ${driverLabel} rises.`,
    );
  }, [stageIndex, currentStageLabel, driverLabel]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const skyTexture = createSkyTexture();
    scene.background = skyTexture;
    scene.fog = new THREE.FogExp2(0x0d5a78, 0.0016);

    const camera = new THREE.PerspectiveCamera(
      46,
      width / height,
      0.1,
      3000,
    );
    camera.position.set(0, 90, 340);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.7;
    controls.minDistance = 90;
    controls.maxDistance = 560;
    controls.maxPolarAngle = Math.PI * 0.55;
    controls.target.set(0, 60, 0);

    // ---------- lighting: bright sunlit reef ----------
    const hemi = new THREE.HemisphereLight(0xcdf7ff, 0x03303f, 1.15);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff2d0, 2.1);
    sun.position.set(160, 260, 140);
    scene.add(sun);

    const fillLight = new THREE.DirectionalLight(0x8fe3f7, 0.55);
    fillLight.position.set(-180, 90, -120);
    scene.add(fillLight);

    const warmRim = new THREE.PointLight(0xffcf8f, 0.9, 700);
    warmRim.position.set(-40, 140, -200);
    scene.add(warmRim);

    // ---------- seafloor ----------
    const floorGeo = new THREE.CircleGeometry(420, 56);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x123c46,
      roughness: 1,
      metalness: 0,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // ---------- colorful reef filler (context + scale) ----------
    const fillerGroup = new THREE.Group();
    scene.add(fillerGroup);

    const fillerColors = [0xff7a45, 0xc084fc, 0xffd166, 0xff8fb3, 0x6fe3c2];
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2 + Math.random() * 0.6;
      const dist = 160 + Math.random() * 140;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const isFan = Math.random() > 0.5;
      const color =
        fillerColors[Math.floor(Math.random() * fillerColors.length)];

      const geo: THREE.BufferGeometry = isFan
        ? new THREE.ConeGeometry(6 + Math.random() * 5, 22 + Math.random() * 18, 6)
        : new THREE.SphereGeometry(8 + Math.random() * 6, 10, 8);

      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, isFan ? 10 : 6, z);
      mesh.rotation.y = Math.random() * Math.PI;
      fillerGroup.add(mesh);
    }

    // ---------- ambient fish for life + scale ----------
    const fishTexA = new THREE.TextureLoader().load(fishSrc);
    const fishTexB = new THREE.TextureLoader().load(fish2Src);
    const fishGroup = new THREE.Group();
    scene.add(fishGroup);

    const fishes: {
      sprite: THREE.Sprite;
      radius: number;
      speed: number;
      phase: number;
      y: number;
      baseWidth: number;
      baseHeight: number;
    }[] = [];

    for (let i = 0; i < 9; i++) {
      const tex = i % 2 === 0 ? fishTexA : fishTexB;
      const sprite = makeFishSprite(tex, 0xffffff);
      const w = 10 + Math.random() * 10;
      const h = w * 0.6;
      sprite.scale.set(w, h, 1);
      fishGroup.add(sprite);

      fishes.push({
        sprite,
        radius: 60 + Math.random() * 200,
        speed: 0.05 + Math.random() * 0.08,
        phase: Math.random() * Math.PI * 2,
        y: 20 + Math.random() * 140,
        baseWidth: w,
        baseHeight: h,
      });
    }

    // ---------- marine snow particles ----------
    const snowCount = 300;
    const snowGeo = new THREE.BufferGeometry();
    const snowPos = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i++) {
      snowPos[i * 3] = (Math.random() - 0.5) * 600;
      snowPos[i * 3 + 1] = Math.random() * 400;
      snowPos[i * 3 + 2] = (Math.random() - 0.5) * 600;
    }
    snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
    const snowMat = new THREE.PointsMaterial({
      color: 0xdff7ff,
      size: 1.6,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    scene.add(new THREE.Points(snowGeo, snowMat));

    // ---------- continuous "tissue flaking" particles ----------
    // instead of chunks snapping off, small flakes drift away from the
    // real surface at a rate that increases with decline — a steadier,
    // less jarring way to show ongoing damage
    const MAX_FLAKES = 500;
    const flakeGeo = new THREE.BufferGeometry();
    const flakePos = new Float32Array(MAX_FLAKES * 3);
    const flakeVel = new Float32Array(MAX_FLAKES * 3);
    const flakeLife = new Float32Array(MAX_FLAKES).fill(0);
    flakeGeo.setAttribute("position", new THREE.BufferAttribute(flakePos, 3));
    const flakeMat = new THREE.PointsMaterial({
      color: 0xf2e6c8,
      size: 2.6,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const flakePoints = new THREE.Points(flakeGeo, flakeMat);
    scene.add(flakePoints);
    let flakeCursor = 0;

    function spawnFlake(origin: THREE.Vector3) {
      const idx = flakeCursor % MAX_FLAKES;
      flakeCursor++;

      flakePos[idx * 3] = origin.x;
      flakePos[idx * 3 + 1] = origin.y;
      flakePos[idx * 3 + 2] = origin.z;

      flakeVel[idx * 3] = (Math.random() - 0.5) * 0.7;
      flakeVel[idx * 3 + 1] = -0.15 - Math.random() * 0.35;
      flakeVel[idx * 3 + 2] = (Math.random() - 0.5) * 0.7;

      flakeLife[idx] = 1;
    }

    // ---------- load coral model ----------
    const loader = new STLLoader();
    const group = new THREE.Group();
    scene.add(group);

    loader.load(modelUrl, (geometry) => {
      if (disposed) return;

      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox!;
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
      const scale = 210 / maxDim;

      const center = new THREE.Vector3();
      bbox.getCenter(center);
      geometry.translate(-center.x, -bbox.min.y, -center.z);
      geometry.scale(scale, scale, scale);
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();

      const finalBBox = geometry.boundingBox!;

      const speckle =
        visualType === "branching" ? 0.22 : 0.14;
      applyVertexColors(geometry, palette.healthy, speckle);

      const material = new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0.03,
        clearcoat: 0.4,
        clearcoatRoughness: 0.3,
        emissive: 0x000000,
        emissiveIntensity: 1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);

      sceneApi.current.material = material;
      sceneApi.current.surfacePoints = sampleSurfacePoints(
        mesh,
        finalBBox,
        40,
      );

      // frame the camera so the coral reads big and imposing
      const dist = 300;
      camera.position.set(dist * 0.5, dist * 0.32, dist * 0.82);
      controls.target.set(0, finalBBox.max.y * 0.4, 0);
      controls.update();

      setLoading(false);
    });

    // ---------- animation loop ----------
    let rafId = 0;
    let flakeAccumulator = 0;

    function frame(time: number, delta: number) {
      const api = sceneApi.current;
      const decay = Math.min(1, stageIndexRef.current / 3);

      if (api.material) {
        // stage 0 -> ~2: bleaching — emissive white wash increases
        // stage  2 -> 3: death — emissive fades, base color darkens
        const bleach = Math.min(1, decay * 1.6);
        const death = Math.max(0, decay * 1.8 - 0.9);

        const emissiveAmount = bleach * (1 - death * 0.85);
        api.material.emissive.setRGB(
          emissiveAmount,
          emissiveAmount,
          emissiveAmount * 0.96,
        );

        const deadTone = hexToThree(palette.dead);
        const tint = new THREE.Color(1, 1, 1).lerp(deadTone, death);
        api.material.color.copy(tint);

        // continuous flaking, rate scales with decline
        flakeAccumulator += delta * decay * 14;
        while (flakeAccumulator > 1 && api.surfacePoints.length > 0) {
          flakeAccumulator -= 1;
          const pt =
            api.surfacePoints[
              Math.floor(Math.random() * api.surfacePoints.length)
            ];
          spawnFlake(pt.position);
        }
      }

      // gentle idle sway for the whole coral
      group.rotation.y = Math.sin(time * 0.00012) * 0.05;

      // fish drifting through the scene, some passing near/under coral
      fishes.forEach((f) => {
        const t = time * 0.001 * f.speed + f.phase;
        f.sprite.position.set(
          Math.cos(t) * f.radius,
          f.y + Math.sin(t * 1.7) * 8,
          Math.sin(t) * f.radius,
        );
        f.sprite.material.rotation = Math.sin(t * 2) * 0.1;

        const vx = -Math.sin(t) * f.radius;
        f.sprite.scale.x = f.baseWidth * (vx >= 0 ? 1 : -1);
        f.sprite.scale.y = f.baseHeight;
      });

      // marine snow drift
      const posAttr = snowGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < snowCount; i++) {
        const y = posAttr.getY(i) - 0.07;
        posAttr.setY(i, y < 0 ? 400 : y);
      }
      posAttr.needsUpdate = true;

      // flake particle physics
      const fPosAttr = flakeGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < MAX_FLAKES; i++) {
        if (flakeLife[i] <= 0) continue;

        flakeVel[i * 3 + 1] -= 0.01;
        flakePos[i * 3] += flakeVel[i * 3];
        flakePos[i * 3 + 1] += flakeVel[i * 3 + 1];
        flakePos[i * 3 + 2] += flakeVel[i * 3 + 2];
        flakeLife[i] -= 0.012;

        if (flakePos[i * 3 + 1] < 0 || flakeLife[i] <= 0) {
          flakeLife[i] = 0;
        }

        fPosAttr.setXYZ(
          i,
          flakePos[i * 3],
          Math.max(0, flakePos[i * 3 + 1]),
          flakePos[i * 3 + 2],
        );
      }
      fPosAttr.needsUpdate = true;

      controls.update();
      renderer.render(scene, camera);
    }

    let lastTime = performance.now();
    function loop(time: number) {
      const delta = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;
      frame(time, delta);
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    function handleResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      skyTexture.dispose();
      fishTexA.dispose();
      fishTexB.dispose();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl, visualType]);

  return (
    <div className="coral-3d-wrap">
      <div ref={containerRef} className="coral-3d-canvas" />

      {loading && (
        <div className="coral-3d-loading">Loading coral model…</div>
      )}

      {eventText && (
        <div className="coral-3d-callout">{eventText}</div>
      )}

      <div className="coral-3d-hint">Drag to rotate · Scroll to zoom</div>

      <p className="coral-detail-cause coral-3d-cause-mobile">
        {currentStageCause}
      </p>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import type {
  StageModelDescription,
  StageModelSet,
} from "../data/coralSpecies";

function createSkyTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#044365");
  grad.addColorStop(0.45, "#023450");
  grad.addColorStop(1, "#001e36");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

type Bucket = 0 | 1 | 2;

// Respect the GLB's authored colours. Cold-water coral can naturally be
// white or ivory; a green tint or global colour multiplier would be misleading.
function stageIndexToBucket(stageIndex: number): Bucket {
  if (stageIndex <= 1) return 0;
  if (stageIndex === 2) return 1;
  return 2;
}

type CoralGLTFStagesProps = {
  stageModels: StageModelSet;
  descriptions: [
    StageModelDescription,
    StageModelDescription,
    StageModelDescription,
  ];
  driverLabel: string;
  driverValue: number;
  stageIndex: number; // 0-3, from the site-wide slider-driven system
};

export default function CoralGLTFStages({
  stageModels,
  descriptions,
  driverValue,
  stageIndex,
}: CoralGLTFStagesProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [manualBucket, setManualBucket] = useState<Bucket | null>(
    null,
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const liveBucket = stageIndexToBucket(stageIndex);
  const effectiveBucket = manualBucket ?? liveBucket;

  const urls: [string, string, string] = [
    stageModels.healthy,
    stageModels.stressed,
    stageModels.collapsed,
  ];

  const currentUrl = urls[effectiveBucket];
  const currentDescription = descriptions[effectiveBucket];

  // three.js scene setup — created once
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    modelGroup: THREE.Group;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = createSkyTexture();
    scene.fog = new THREE.FogExp2(0x001e36, 0.0007);

    const camera = new THREE.PerspectiveCamera(
      46,
      width / height,
      0.1,
      3000,
    );
    camera.position.set(0, 90, 340);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    // A gentle, clearly visible horizontal presentation spin.
    controls.autoRotateSpeed = -1.25;
    controls.minDistance = 60;
    controls.maxDistance = 600;
    controls.maxPolarAngle = Math.PI * 0.55;
    controls.target.set(0, 60, 0);

    const hemi = new THREE.HemisphereLight(0xf0f8ff, 0x173545, 0.58);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff7ef, 1.15);
    sun.position.set(160, 260, 140);
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xb6e6ff, 0.28);
    fill.position.set(-180, 90, -120);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0x9be8ff, 0.48);
    rim.position.set(-100, 175, -180);
    scene.add(rim);

    // gives MeshStandardMaterial something to reflect — without this,
    // the coral has no highlights to catch and looks flat/soft no
    // matter how sharp the underlying texture is
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    pmremGenerator.dispose();
    scene.environmentIntensity = 0.25;

    const floorGeo = new THREE.CircleGeometry(420, 56);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0d2e40,
      roughness: 1,
      envMapIntensity: 0,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // ---------- marine snow ----------
    // small soft specks that drift slowly downward, like real
    // particulate matter suspended in ocean water
    function createSnowSprite() {
      const c = document.createElement("canvas");
      c.width = 32;
      c.height = 32;
      const sctx = c.getContext("2d")!;
      const g = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, "rgba(255,255,255,0.9)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, 32, 32);
      return new THREE.CanvasTexture(c);
    }

    const SNOW_COUNT = 260;
    const SNOW_RADIUS = 260;
    const SNOW_HEIGHT = 320;

    const snowPositions = new Float32Array(SNOW_COUNT * 3);
    const snowSpeeds = new Float32Array(SNOW_COUNT);
    const snowDrift = new Float32Array(SNOW_COUNT * 2);

    for (let i = 0; i < SNOW_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * SNOW_RADIUS;
      snowPositions[i * 3] = Math.cos(angle) * radius;
      snowPositions[i * 3 + 1] = Math.random() * SNOW_HEIGHT;
      snowPositions[i * 3 + 2] = Math.sin(angle) * radius;

      snowSpeeds[i] = 4 + Math.random() * 8; // units/sec falling
      snowDrift[i * 2] = (Math.random() - 0.5) * 3; // sideways sway
      snowDrift[i * 2 + 1] = Math.random() * Math.PI * 2; // sway phase
    }

    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(snowPositions, 3),
    );

    const snowMat = new THREE.PointsMaterial({
      size: 4.5,
      map: createSnowSprite(),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      sizeAttenuation: true,
      color: 0xdff2ff,
    });

    const snow = new THREE.Points(snowGeo, snowMat);
    scene.add(snow);

    sceneRef.current = { scene, camera, renderer, controls, modelGroup };

    let rafId = 0;
    const clock = new THREE.Clock();
    function frame() {
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      const posAttr = snowGeo.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      for (let i = 0; i < SNOW_COUNT; i++) {
        let y = posAttr.getY(i) - snowSpeeds[i] * dt;
        if (y < 0) y = SNOW_HEIGHT; // loop back to the top

        const sway = Math.sin(elapsed * 0.5 + snowDrift[i * 2 + 1]) *
          snowDrift[i * 2];
        const x = posAttr.getX(i) + sway * dt;

        posAttr.setY(i, y);
        posAttr.setX(i, x);
      }
      posAttr.needsUpdate = true;

      controls.update();
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

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
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();

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

      snowGeo.dispose();
      snowMat.map?.dispose();
      snowMat.dispose();

      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }

      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Presentation-only preference; model-stage selection is unchanged.
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.controls.autoRotate = isAutoRotating;
    }
  }, [isAutoRotating]);

  // load whichever stage model is currently selected
  useEffect(() => {
    const api = sceneRef.current;
    if (!api) return;

    let disposed = false;
    setLoading(true);
    setLoadError(false);

    // A few original GLBs (including Lophelia healthy) use Draco-compressed meshes.
    // A postinstall script provides matching, local decoder files.
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
    dracoLoader.setWorkerLimit(2);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    const resolvedUrl = `${import.meta.env.BASE_URL}${currentUrl.startsWith("/") ? currentUrl.slice(1) : currentUrl}`;

    loader.load(resolvedUrl, (gltf) => {
      if (disposed || !sceneRef.current) return;

      // clear previous model
      while (api.modelGroup.children.length > 0) {
        const child = api.modelGroup.children[0];
        api.modelGroup.remove(child);
        child.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });
      }

      const root = gltf.scene;

      // All bundled GLB baseColorFactors have been converted from sRGB
      // into glTF linear RGB, so use their true colours without a tint.
      // Some exports (notably the stressed/collapsed stages) bake
      // metallicFactor=1.0 onto every material with no environment
      // map present, which makes them render dark/flat no matter
      // what color was painted — force a matte, non-metallic look
      // instead so the real painted colors actually show
      const maxAniso = api.renderer.capabilities.getMaxAnisotropy();

      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const applyFix = (mat: THREE.Material) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
              // only correct materials that actually have the broken
              // bake (metalness ~1 with no env map) — leave healthy-
              // stage materials with their real painted values so we
              // don't flatten stages that were never broken
              if (mat.metalness > 0.5) {
                mat.metalness = 0.05;
                mat.roughness = Math.max(mat.roughness, 0.8);
                mat.needsUpdate = true;
              }

              // sharpen any baked textures instead of letting them
              // blur out at an angle / on retina screens
              const maps = [
                mat.map,
                mat.normalMap,
                mat.roughnessMap,
                mat.metalnessMap,
                mat.aoMap,
                mat.emissiveMap,
              ];
              maps.forEach((t) => {
                if (t) {
                  t.anisotropy = maxAniso;
                  t.needsUpdate = true;
                }
              });

              // Leave base colour and vertex colours untouched.
              mat.needsUpdate = true;
            }
          };

          if (Array.isArray(obj.material)) {
            obj.material.forEach(applyFix);
          } else {
            applyFix(obj.material);
          }
        }
      });

      const bbox = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
      const scale = 270 / maxDim;

      const center = new THREE.Vector3();
      bbox.getCenter(center);

      root.position.set(
        -center.x * scale,
        -bbox.min.y * scale,
        -center.z * scale,
      );
      root.scale.setScalar(scale);

      api.modelGroup.add(root);

      const newBBox = new THREE.Box3().setFromObject(root);
      api.controls.target.set(0, newBBox.max.y * 0.48, 0);
      const newSize = new THREE.Vector3();
      newBBox.getSize(newSize);
      const aspect = api.camera.aspect;
      const verticalFov = THREE.MathUtils.degToRad(api.camera.fov);
      const fitHeight = newSize.y / (2 * Math.tan(verticalFov / 2));
      const fitWidth = newSize.x / (2 * Math.tan(verticalFov / 2) * aspect);
      const distance = Math.max(fitHeight, fitWidth) * 1.32;
      api.controls.maxDistance = Math.max(700, distance * 2.5);
      api.camera.position.set(0, api.controls.target.y + distance * 0.12, distance);
      api.camera.far = Math.max(3000, distance * 5);
      api.camera.updateProjectionMatrix();
      api.controls.update();

      setLoading(false);
    }, undefined, (error) => {
      console.error("Could not load coral GLB:", resolvedUrl, error);
      if (disposed) return;
      setLoading(false);
      setLoadError(true);
    });

    return () => {
      disposed = true;
      dracoLoader.dispose();
    };
  }, [currentUrl]);

  useEffect(() => {
    function handleFsChange() {
      setIsFullscreen(
        document.fullscreenElement === wrapRef.current,
      );
    }
    document.addEventListener("fullscreenchange", handleFsChange);
    return () =>
      document.removeEventListener(
        "fullscreenchange",
        handleFsChange,
      );
  }, []);

  function toggleFullscreen() {
    if (!wrapRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      wrapRef.current.requestFullscreen();
    }
  }

  const bucketLabels = ["Stage 1", "Stage 2", "Stage 3"] as const;

  return (
    <div className="coral-viewer-shell">
      <div className="coral-viewer-eyebrow"><span className="coral-viewer-status-dot" /> INTERACTIVE SPECIMEN <span className="coral-viewer-eyebrow-right">360° VIEW</span></div>
      <div
        ref={wrapRef}
        className={`coral-3d-wrap ${isFullscreen ? "is-fullscreen" : ""}`}
      >
      <div ref={containerRef} className="coral-3d-canvas" />

      {loading && (
        <div className="coral-3d-loading" role="status">Loading coral specimen…</div>
      )}
      {loadError && (
        <div className="coral-3d-loading coral-3d-error" role="alert">
          Unable to load this coral model. Check the model URL and browser console.
        </div>
      )}

      <button
        type="button"
        className="coral-3d-fullscreen-btn"
        onClick={toggleFullscreen}
      >
        {isFullscreen ? "⤡ Exit" : "⛶ Fullscreen"}
      </button>

      <div className="coral-3d-hint">Drag to rotate · Scroll to zoom</div>
      </div>
      <div className="coral-viewer-panel">
        <div className="coral-viewer-toolbar">
          <div className="coral-viewer-panel-heading">Choose a condition <span>· visual comparison</span></div>
          <button
            className="coral-viewer-rotation-btn"
            type="button"
            aria-pressed={isAutoRotating}
            onClick={() => setIsAutoRotating((value) => !value)}
          >
            {isAutoRotating ? "Ⅱ Pause rotation" : "↻ Resume rotation"}
          </button>
        </div>
      <div className="coral-stage-buttons" role="group" aria-label="Select illustrated coral condition">
        {bucketLabels.map((label, index) => {
          const bucket = index as Bucket;
          const isActive = effectiveBucket === bucket;
          const isLive =
            manualBucket === null && liveBucket === bucket;

          return (
            <button
              key={label}
              type="button"
              className={`coral-stage-btn ${isActive ? "active" : ""}`}
              aria-pressed={isActive}
              aria-label={`${label}: ${descriptions[bucket].label}`}
              onClick={() => setManualBucket(bucket)}
            >
              <span className="coral-stage-number">0{index + 1}</span>
              <span className="coral-stage-btn-copy"><span>{label}</span><small>{descriptions[bucket].label}</small></span>
              {isLive && <span className="coral-stage-live-dot" aria-label="Current simulator stage" />}
            </button>
          );
        })}

        {manualBucket !== null && (
          <button
            type="button"
            className="coral-stage-btn coral-stage-live-btn"
            onClick={() => setManualBucket(null)}
          >
            ↩ Return to live simulation ({driverValue}%)
          </button>
        )}
      </div>


      <div className="coral-3d-callout" aria-live="polite">
        <span className="coral-stage-caption">STAGE {effectiveBucket + 1} / 3 · {manualBucket === null ? "LIVE SIMULATOR" : "MANUAL PREVIEW"}</span>
        <strong>{currentDescription.label}</strong>
        <span>{currentDescription.cause}</span>
      </div>
      </div>
    </div>
  );
}

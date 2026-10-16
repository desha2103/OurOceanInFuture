import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
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

// darkens the coral slightly and blends in a slow-moving green algae
// tint that ripples up the surface, like real algae growth
function applyDarkenAndAlgaeWave(mat: THREE.MeshStandardMaterial) {
  mat.color.multiplyScalar(0.8);

  // ensures this material always gets its own compiled program with
  // our injected code, instead of possibly reusing another material's
  // cached program that looks structurally similar
  mat.customProgramCacheKey = () => "coral-algae-wave";

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    mat.userData.shader = shader;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>\nvarying vec3 vWorldPos;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>\nvWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\nvarying vec3 vWorldPos;\nuniform float uTime;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float algaeBand = sin(vWorldPos.y * 0.08 + uTime * 0.6) * 0.5 + 0.5;
        float algaePatch = sin(vWorldPos.x * 0.35 + vWorldPos.z * 0.35) * 0.5 + 0.5;
        float algaeWave = pow(algaeBand * algaePatch, 1.4);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.42, 0.12), algaeWave * 0.4);`,
      );
  };
}

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
  driverLabel,
  driverValue,
  stageIndex,
}: CoralGLTFStagesProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [manualBucket, setManualBucket] = useState<Bucket | null>(
    null,
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

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

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.7;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.7;
    controls.minDistance = 60;
    controls.maxDistance = 600;
    controls.maxPolarAngle = Math.PI * 0.55;
    controls.target.set(0, 60, 0);

    const hemi = new THREE.HemisphereLight(0xdff2ff, 0x123044, 0.85);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.set(160, 260, 140);
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x9fd8ee, 0.45);
    fill.position.set(-180, 90, -120);
    scene.add(fill);

    // gives MeshStandardMaterial something to reflect — without this,
    // the coral has no highlights to catch and looks flat/soft no
    // matter how sharp the underlying texture is
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    pmremGenerator.dispose();

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

      modelGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const mats = Array.isArray(obj.material)
            ? obj.material
            : [obj.material];
          mats.forEach((m) => {
            if (m.userData.shader) {
              m.userData.shader.uniforms.uTime.value = elapsed;
            }
          });
        }
      });

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

  // load whichever stage model is currently selected
  useEffect(() => {
    const api = sceneRef.current;
    if (!api) return;

    let disposed = false;
    setLoading(true);

    const loader = new GLTFLoader();

    loader.load(currentUrl, (gltf) => {
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

      // some exports (notably the stressed/collapsed stages) bake
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
                mat.roughness = Math.min(mat.roughness, 0.65);
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

              applyDarkenAndAlgaeWave(mat);
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
      const scale = 210 / maxDim;

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
      api.controls.target.set(
        0,
        newBBox.max.y * 0.4,
        0,
      );
      api.controls.update();

      setLoading(false);
    });

    return () => {
      disposed = true;
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
    <div
      ref={wrapRef}
      className={`coral-3d-wrap ${isFullscreen ? "is-fullscreen" : ""}`}
    >
      <div ref={containerRef} className="coral-3d-canvas" />

      {loading && (
        <div className="coral-3d-loading">Loading coral model…</div>
      )}

      <div className="coral-3d-callout">
        <strong>{currentDescription.label}</strong>
        <span> — {currentDescription.cause}</span>
      </div>

      <div className="coral-stage-buttons">
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
              onClick={() => setManualBucket(bucket)}
            >
              {label}
              {isLive && <span className="coral-stage-live-dot" />}
            </button>
          );
        })}

        {manualBucket !== null && (
          <button
            type="button"
            className="coral-stage-btn coral-stage-live-btn"
            onClick={() => setManualBucket(null)}
          >
            ● Live ({driverValue}% {driverLabel})
          </button>
        )}
      </div>

      <button
        type="button"
        className="coral-3d-fullscreen-btn"
        onClick={toggleFullscreen}
      >
        {isFullscreen ? "⤡ Exit" : "⛶ Fullscreen"}
      </button>

      <div className="coral-3d-hint">Drag to rotate · Scroll to zoom</div>
    </div>
  );
}

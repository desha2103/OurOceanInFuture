import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./OceanFutureSimulator.css";

import netSrc from "./assets/fishing-net.png";
import plasticSrc from "./assets/plastic-bottle1.png";

import coldWaterCoralSrc from "./assets/cold-water-coral.png";
import blackCoralSrc from "./assets/black-coral.png";
import bambooCoralSrc from "./assets/bamboo-coral.png";

import benthicFishSrc from "./assets/benthic-fish.png";
import seaAnemoneSrc from "./assets/sea-anemone.png";
import brittleStarSrc from "./assets/brittle-star.png";

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function randInt(a: number, b: number) {
  return Math.floor(rand(a, b));
}

function loadImg(src: string) {
  const image = new Image();
  image.src = src;
  return image;
}

type EcologicalZone =
  | "on-seabed"
  | "near-seabed"
  | "lower-water-column";

type Fish = {
  id: number;
  x: number;
  y: number;
  speed: number;
  size: number;
  direction: 1 | -1;
  wobble: number;
  flee: number;
  alpha: number;

  /*
   * Benthic fish are shown in the near-seabed zone.
   * offsetPx is only a visual spacing value; it is not
   * presented as a biological measurement.
   */
  zone: EcologicalZone;
  offsetPx: number;
};

type Jellyfish = {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  direction: 1 | -1;
  wobble: number;
  alpha: number;

  /*
   * Jellyfish are shown in the lower water column.
   * waterPosition is a normalized visual position (0–1),
   * not a depth or height measurement.
   */
  zone: EcologicalZone;
  waterPosition: number;
};

type MarineSnow = {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  wobble: number;
  alpha: number;
};

type MarineLitter = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  scale: number;
  wobble: number;
};

type Sediment = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
};

type OceanCanvasProps = {
  health: number;
  marineLitter: number;
  temperature: number;
  acidification: number;
  bottomTrawling: number;
};

function OceanCanvas({
  health,
  marineLitter,
  temperature,
  acidification,
  bottomTrawling,
}: OceanCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const state = useRef({
    fish: [] as Fish[],
    jellyfish: [] as Jellyfish[],
    marineSnow: [] as MarineSnow[],
    litter: [] as MarineLitter[],
    sediment: [] as Sediment[],

    trawl: {
      x: -350,
      active: false,
      speed: 3,
      cooldown: 0,
    },

    tick: 0,
    mouseX: -999,
    mouseY: -999,

    health: 87,
    marineLitter: 15,
    temperature: 10,
    acidification: 10,
    bottomTrawling: 12,

    rafId: 0,

    images: {} as Record<string, HTMLImageElement>,
  });

  /* =======================================================
     LOAD ONLY THE ASSETS USED IN THIS VERSION
  ======================================================= */

  useEffect(() => {
    const s = state.current;

    s.images = {
      coldWaterCoral: loadImg(coldWaterCoralSrc),
      blackCoral: loadImg(blackCoralSrc),
      bambooCoral: loadImg(bambooCoralSrc),

      benthicFish: loadImg(benthicFishSrc),
      seaAnemone: loadImg(seaAnemoneSrc),
      brittleStar: loadImg(brittleStarSrc),

      plastic: loadImg(plasticSrc),
      net: loadImg(netSrc),
    };

    /*
     * Four benthic fish are intentionally staggered within the
     * near-seabed zone. The vertical spacing is illustrative:
     * no fixed metre values are claimed.
     */
    s.fish = [
      {
        id: 0,
        x: 430,
        y: 485,
        speed: 0.28,
        size: 94,
        direction: 1,
        wobble: rand(0, Math.PI * 2),
        flee: 0,
        alpha: 0.96,
        zone: "near-seabed",
        offsetPx: 26,
      },
      {
        id: 1,
        x: 650,
        y: 455,
        speed: 0.24,
        size: 86,
        direction: -1,
        wobble: rand(0, Math.PI * 2),
        flee: 0,
        alpha: 0.9,
        zone: "near-seabed",
        offsetPx: 40,
      },
      {
        id: 2,
        x: 850,
        y: 425,
        speed: 0.21,
        size: 78,
        direction: 1,
        wobble: rand(0, Math.PI * 2),
        flee: 0,
        alpha: 0.82,
        zone: "near-seabed",
        offsetPx: 55,
      },
      {
        id: 3,
        x: 1060,
        y: 405,
        speed: 0.18,
        size: 70,
        direction: -1,
        wobble: rand(0, Math.PI * 2),
        flee: 0,
        alpha: 0.74,
        zone: "near-seabed",
        offsetPx: 68,
      },
    ];

    /*
     * A small amount of mobile fauna is shown higher than the
     * benthic community. Jellyfish occupy the lower water column
     * in this educational illustration.
     */
    s.jellyfish = [
      {
        id: 0,
        x: 690,
        y: 230,
        size: 34,
        speed: 0.08,
        direction: 1,
        wobble: rand(0, Math.PI * 2),
        alpha: 0.46,
        zone: "lower-water-column",
        waterPosition: 0.40,
      },
      {
        id: 1,
        x: 1010,
        y: 190,
        size: 27,
        speed: 0.06,
        direction: -1,
        wobble: rand(0, Math.PI * 2),
        alpha: 0.34,
        zone: "lower-water-column",
        waterPosition: 0.30,
      },
    ];

    s.marineSnow = Array.from({ length: 78 }, (_, index) => ({
      id: index,
      x: rand(0, 1500),
      y: rand(10, 620),
      size: rand(0.5, 2.4),
      speed: rand(0.04, 0.2),
      wobble: rand(0, Math.PI * 2),
      alpha: rand(0.045, 0.16),
    }));

    s.litter = Array.from({ length: 55 }, (_, index) => ({
      id: index,
      x: rand(0, 1500),
      y: rand(100, 540),
      vx: rand(-0.1, 0.1),
      vy: rand(-0.03, 0.05),
      rotation: rand(0, 360),
      scale: rand(0.18, 0.48),
      wobble: rand(0, Math.PI * 2),
    }));
  }, []);

  useEffect(() => {
    const s = state.current;

    s.health = health;
    s.marineLitter = marineLitter;
    s.temperature = temperature;
    s.acidification = acidification;
    s.bottomTrawling = bottomTrawling;
  }, [
    health,
    marineLitter,
    temperature,
    acidification,
    bottomTrawling,
  ]);

  const onMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();

      state.current.mouseX =
        (event.clientX - rect.left) * (canvas.width / rect.width);

      state.current.mouseY =
        (event.clientY - rect.top) * (canvas.height / rect.height);
    },
    [],
  );

  const onMouseLeave = useCallback(() => {
    state.current.mouseX = -999;
    state.current.mouseY = -999;
  }, []);

  useEffect(() => {
  const maybeCanvas = canvasRef.current;
  if (!maybeCanvas) return;

  const canvas: HTMLCanvasElement = maybeCanvas;

  const maybeContext = canvas.getContext("2d");

    if (!maybeContext) return;

    const context: CanvasRenderingContext2D = maybeContext;

    const WATER_COLUMN_TOP = 66;

    function lerpColor(
      from: number[],
      to: number[],
      amount: number,
    ) {
      return from.map((value, index) =>
        Math.round(
          value +
            (to[index] - value) * amount,
        ),
      );
    }

    function colorToRgb(color: number[]) {
      return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    }

    function gauss(
      x: number,
      center: number,
      spread: number,
      height: number,
    ) {
      const distance = (x - center) / spread;
      return Math.exp(-(distance * distance)) * height;
    }

    /* =====================================================
       3D-STYLE TERRAIN
    ===================================================== */

    function seabedBaseAt(
      x: number,
      width: number,
      height: number,
    ) {
      const broad =
        Math.sin(
          (x / width) *
            Math.PI *
            2.15,
        ) * 8;

      const local =
        Math.sin(x * 0.012) * 3 +
        Math.sin(x * 0.0049) * 5 +
        Math.sin(x * 0.028) * 1.6;

      return height - 72 + broad + local;
    }

    function terrainLiftAt(
      x: number,
      width: number,
    ) {
      /*
       * Raised rocky banks. The larger right and left mounds
       * help the coral colonies look embedded in real terrain.
       */
      return (
        gauss(x, width * 0.08, width * 0.055, 24) +
        gauss(x, width * 0.18, width * 0.065, 15) +
        gauss(x, width * 0.31, width * 0.052, 18) +
        gauss(x, width * 0.48, width * 0.07, 12) +
        gauss(x, width * 0.63, width * 0.055, 17) +
        gauss(x, width * 0.79, width * 0.06, 22) +
        gauss(x, width * 0.92, width * 0.055, 26)
      );
    }

    function seabedSurfaceAt(
      x: number,
      width: number,
      height: number,
    ) {
      return (
        seabedBaseAt(x, width, height) -
        terrainLiftAt(x, width)
      );
    }

    /*
     * Visual placement helpers.
     *
     * These functions separate organisms into ecological zones
     * without claiming exact species-specific metre ranges.
     */
    function nearSeabedY(
      x: number,
      offsetPx: number,
      width: number,
      height: number,
    ) {
      return (
        seabedSurfaceAt(
          x,
          width,
          height,
        ) -
        offsetPx
      );
    }

    function lowerWaterColumnY(
      x: number,
      waterPosition: number,
      width: number,
      height: number,
    ) {
      const floorY =
        seabedSurfaceAt(
          x,
          width,
          height,
        );

      const usableWater =
        Math.max(
          1,
          floorY -
            WATER_COLUMN_TOP,
        );

      const normalized =
        Math.max(
          0.18,
          Math.min(
            0.55,
            waterPosition,
          ),
        );

      return (
        WATER_COLUMN_TOP +
        usableWater *
          normalized
      );
    }

    function drawWaterHaze(
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
    ) {
      const haze =
        ctx.createLinearGradient(
          0,
          0,
          0,
          height,
        );

      haze.addColorStop(
        0,
        "rgba(6,27,53,0.01)",
      );

      haze.addColorStop(
        0.38,
        "rgba(5,22,45,0.05)",
      );

      haze.addColorStop(
        0.72,
        "rgba(4,15,31,0.13)",
      );

      haze.addColorStop(
        1,
        "rgba(2,7,16,0.29)",
      );

      ctx.fillStyle = haze;
      ctx.fillRect(
        0,
        0,
        width,
        height,
      );

      const vignette =
        ctx.createRadialGradient(
          width / 2,
          height * 0.4,
          width * 0.12,
          width / 2,
          height * 0.4,
          width * 0.76,
        );

      vignette.addColorStop(
        0,
        "rgba(0,0,0,0)",
      );

      vignette.addColorStop(
        0.7,
        "rgba(0,5,14,0.04)",
      );

      vignette.addColorStop(
        1,
        "rgba(0,3,10,0.22)",
      );

      ctx.fillStyle =
        vignette;

      ctx.fillRect(
        0,
        0,
        width,
        height,
      );
    }

    function drawDeepSeaLight(
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      h: number,
      tick: number,
    ) {
      if (h <= 20) return;

      for (
        let index = 0;
        index < 3;
        index += 1
      ) {
        const rayX =
          width * 0.18 +
          index *
            width *
            0.31 +
          Math.sin(
            tick * 0.0027 +
              index,
          ) *
            7;

        const alpha =
          (h / 100) *
          0.017;

        const gradient =
          ctx.createLinearGradient(
            rayX,
            0,
            rayX,
            height * 0.74,
          );

        gradient.addColorStop(
          0,
          `rgba(150,205,235,${alpha})`,
        );

        gradient.addColorStop(
          0.45,
          `rgba(135,190,222,${
            alpha * 0.3
          })`,
        );

        gradient.addColorStop(
          1,
          "rgba(120,175,210,0)",
        );

        ctx.fillStyle =
          gradient;

        ctx.beginPath();
        ctx.moveTo(
          rayX - 38,
          0,
        );
        ctx.lineTo(
          rayX + 38,
          0,
        );
        ctx.lineTo(
          rayX + 112,
          height * 0.74,
        );
        ctx.lineTo(
          rayX - 112,
          height * 0.74,
        );
        ctx.closePath();
        ctx.fill();
      }
    }

    function drawMarineSnow(
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
    ) {
      const s = state.current;

      s.marineSnow.forEach(
        (particle) => {
          particle.y -=
            particle.speed;

          particle.wobble +=
            0.01;

          particle.x +=
            Math.sin(
              particle.wobble,
            ) * 0.05;

          if (
            particle.y < -8
          ) {
            particle.y =
              rand(
                height * 0.18,
                height - 15,
              );

            particle.x =
              rand(
                0,
                width,
              );
          }

          ctx.beginPath();

          ctx.arc(
            particle.x,
            particle.y,
            particle.size,
            0,
            Math.PI * 2,
          );

          ctx.fillStyle =
            `rgba(214,226,232,${particle.alpha})`;

          ctx.fill();
        },
      );
    }

    function drawGroundShadow(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      radiusX: number,
      radiusY: number,
      alpha = 0.18,
    ) {
      ctx.save();

      ctx.filter =
        "blur(4px)";

      ctx.fillStyle =
        `rgba(0,0,0,${alpha})`;

      ctx.beginPath();

      ctx.ellipse(
        x,
        y,
        radiusX,
        radiusY,
        0,
        0,
        Math.PI * 2,
      );

      ctx.fill();

      ctx.restore();
    }

    function drawTerrainMound(
      ctx: CanvasRenderingContext2D,
      centerX: number,
      baseY: number,
      moundWidth: number,
      moundHeight: number,
      seed: number,
    ) {
      /*
       * Dark side/shadow.
       */
      const shadow =
        ctx.createRadialGradient(
          centerX,
          baseY - moundHeight * 0.35,
          2,
          centerX,
          baseY - moundHeight * 0.35,
          moundWidth * 0.6,
        );

      shadow.addColorStop(
        0,
        "rgba(82,72,58,0.42)",
      );

      shadow.addColorStop(
        0.5,
        "rgba(43,36,29,0.56)",
      );

      shadow.addColorStop(
        1,
        "rgba(12,10,9,0)",
      );

      ctx.fillStyle =
        shadow;

      ctx.beginPath();

      ctx.ellipse(
        centerX,
        baseY - moundHeight * 0.16,
        moundWidth * 0.52,
        moundHeight * 0.6,
        0,
        0,
        Math.PI * 2,
      );

      ctx.fill();

      /*
       * Solid rocky mound.
       */
      const mound =
        ctx.createLinearGradient(
          0,
          baseY - moundHeight,
          0,
          baseY + 8,
        );

      mound.addColorStop(
        0,
        "rgba(76,67,55,0.72)",
      );

      mound.addColorStop(
        0.38,
        "rgba(52,43,34,0.86)",
      );

      mound.addColorStop(
        1,
        "rgba(20,15,12,0.96)",
      );

      ctx.fillStyle =
        mound;

      ctx.beginPath();

      ctx.moveTo(
        centerX -
          moundWidth * 0.52,
        baseY + 5,
      );

      for (
        let step = 0;
        step <= 18;
        step += 1
      ) {
        const t =
          step / 18;

        const x =
          centerX -
          moundWidth * 0.52 +
          t *
            moundWidth *
            1.04;

        const dome =
          Math.sin(
            t * Math.PI,
          ) * moundHeight;

        const roughness =
          Math.sin(
            (step + seed) *
              1.7,
          ) *
            3 +
          Math.sin(
            (step + seed) *
              0.58,
          ) *
            2;

        ctx.lineTo(
          x,
          baseY -
            dome +
            roughness,
        );
      }

      ctx.lineTo(
        centerX +
          moundWidth * 0.55,
        baseY + 10,
      );

      ctx.lineTo(
        centerX -
          moundWidth * 0.55,
        baseY + 10,
      );

      ctx.closePath();

      ctx.fill();

      /*
       * Upper rim/highlight gives a stronger 3D edge.
       */
      ctx.beginPath();

      ctx.moveTo(
        centerX -
          moundWidth * 0.42,
        baseY -
          moundHeight * 0.25,
      );

      ctx.quadraticCurveTo(
        centerX,
        baseY -
          moundHeight * 0.9,
        centerX +
          moundWidth * 0.38,
        baseY -
          moundHeight * 0.24,
      );

      ctx.strokeStyle =
        "rgba(131,111,80,0.15)";

      ctx.lineWidth = 2;
      ctx.stroke();
    }

    function drawThreeDimensionalFloor(
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      damage: number,
    ) {
      /*
       * FAR RIDGE
       */
      const far =
        ctx.createLinearGradient(
          0,
          height - 250,
          0,
          height - 70,
        );

      far.addColorStop(
        0,
        "rgba(30,43,48,0)",
      );

      far.addColorStop(
        0.58,
        "rgba(24,31,31,0.23)",
      );

      far.addColorStop(
        1,
        "rgba(12,14,14,0.55)",
      );

      ctx.fillStyle = far;

      ctx.beginPath();
      ctx.moveTo(
        0,
        height - 145,
      );

      for (
        let x = 0;
        x <= width;
        x += 28
      ) {
        const y =
          height -
          140 +
          Math.sin(
            x * 0.0055,
          ) *
            20 +
          Math.sin(
            x * 0.017,
          ) *
            6;

        ctx.lineTo(
          x,
          y,
        );
      }

      ctx.lineTo(
        width,
        height,
      );
      ctx.lineTo(
        0,
        height,
      );
      ctx.closePath();
      ctx.fill();

      /*
       * MID-DISTANCE FLOOR.
       */
      const mid =
        ctx.createLinearGradient(
          0,
          height - 170,
          0,
          height,
        );

      mid.addColorStop(
        0,
        "rgba(55,55,47,0.14)",
      );

      mid.addColorStop(
        0.55,
        "rgba(36,31,26,0.45)",
      );

      mid.addColorStop(
        1,
        "rgba(13,11,10,0.84)",
      );

      ctx.fillStyle = mid;

      ctx.beginPath();

      ctx.moveTo(
        0,
        height - 104,
      );

      for (
        let x = 0;
        x <= width;
        x += 18
      ) {
        const y =
          height -
          106 +
          Math.sin(
            x * 0.008,
          ) *
            10 +
          Math.sin(
            x * 0.021,
          ) *
            4;

        ctx.lineTo(
          x,
          y,
        );
      }

      ctx.lineTo(
        width,
        height,
      );
      ctx.lineTo(
        0,
        height,
      );
      ctx.closePath();
      ctx.fill();

      /*
       * MAIN SEAFLOOR.
       */
      const main =
        ctx.createLinearGradient(
          0,
          height - 130,
          0,
          height,
        );

      main.addColorStop(
        0,
        "#3a3025",
      );

      main.addColorStop(
        0.25,
        "#2b221a",
      );

      main.addColorStop(
        0.65,
        "#17120e",
      );

      main.addColorStop(
        1,
        "#080706",
      );

      ctx.fillStyle = main;

      ctx.beginPath();

      ctx.moveTo(
        0,
        seabedSurfaceAt(
          0,
          width,
          height,
        ),
      );

      for (
        let x = 0;
        x <= width;
        x += 10
      ) {
        ctx.lineTo(
          x,
          seabedSurfaceAt(
            x,
            width,
            height,
          ),
        );
      }

      ctx.lineTo(
        width,
        height,
      );
      ctx.lineTo(
        0,
        height,
      );
      ctx.closePath();
      ctx.fill();

      /*
       * Perspective sediment bands.
       */
      for (
        let band = 0;
        band < 5;
        band += 1
      ) {
        const y =
          height -
          73 +
          band * 13;

        ctx.beginPath();

        ctx.moveTo(
          width * 0.08,
          y,
        );

        ctx.bezierCurveTo(
          width * 0.32,
          y -
            10 +
            band * 2,
          width * 0.66,
          y +
            7,
          width * 0.96,
          y -
            3,
        );

        ctx.strokeStyle =
          `rgba(118,95,67,${
            0.035 +
            band * 0.012
          })`;

        ctx.lineWidth =
          1 +
          band * 0.5;

        ctx.stroke();
      }

      /*
       * Perspective pebbles: smaller near the horizon,
       * larger near the front.
       */
      for (
        let index = 0;
        index < 70;
        index += 1
      ) {
        const t =
          ((index * 37) %
            100) /
          100;

        const x =
          ((index * 113 +
            29) %
            width);

        const surfaceY =
          seabedSurfaceAt(
            x,
            width,
            height,
          );

        const y =
          surfaceY +
          4 +
          t *
            Math.max(
              8,
              height -
                surfaceY -
                10,
            ) *
            0.72;

        const perspective =
          0.45 +
          t * 1.45;

        const radiusX =
          (1.6 +
            (index % 5) *
              0.7) *
          perspective;

        const radiusY =
          radiusX *
          0.48;

        ctx.beginPath();

        ctx.ellipse(
          x,
          y,
          radiusX,
          radiusY,
          Math.sin(index) *
            0.5,
          0,
          Math.PI * 2,
        );

        ctx.fillStyle =
          index % 4 === 0
            ? `rgba(120,98,70,${
                0.16 +
                t * 0.15
              })`
            : `rgba(56,46,36,${
                0.2 +
                t * 0.2
              })`;

        ctx.fill();
      }

      /*
       * Soft transition haze between water and sediment.
       */
      const bottomHaze =
        ctx.createLinearGradient(
          0,
          height - 175,
          0,
          height,
        );

      bottomHaze.addColorStop(
        0,
        "rgba(80,91,83,0)",
      );

      bottomHaze.addColorStop(
        0.62,
        "rgba(67,69,59,0.055)",
      );

      bottomHaze.addColorStop(
        1,
        `rgba(23,18,13,${
          0.21 +
          damage * 0.07
        })`,
      );

      ctx.fillStyle =
        bottomHaze;

      ctx.fillRect(
        0,
        height - 175,
        width,
        175,
      );
    }

    /* =====================================================
       PNG ORGANISM DRAWING
    ===================================================== */

    function drawCreature(
      ctx: CanvasRenderingContext2D,
      image:
        | HTMLImageElement
        | undefined,
      x: number,
      baseY: number,
      drawWidth: number,
      drawHeight: number,
      healthValue: number,
      threshold: number,
      options?: {
        alpha?: number;
        shadow?: boolean;
        flip?: boolean;
        brightness?: number;
      },
    ) {
      if (
        !image ||
        !image.complete ||
        image.naturalWidth === 0
      ) {
        return;
      }

      const stress =
        healthValue >= threshold
          ? 0
          : Math.min(
              1,
              (threshold -
                healthValue) /
                threshold,
            );

      if (
        options?.shadow !== false
      ) {
        drawGroundShadow(
          ctx,
          x,
          baseY + 2,
          drawWidth * 0.25,
          Math.max(
            4,
            drawHeight * 0.045,
          ),
          0.16,
        );
      }

      ctx.save();

      ctx.globalAlpha =
        (options?.alpha ??
          0.9) *
        (1 -
          stress * 0.55);

      ctx.filter = [
        `grayscale(${Math.round(
          stress * 52,
        )}%)`,
        `brightness(${Math.round(
          (options?.brightness ??
            96) -
            stress * 12,
        )}%)`,
        `saturate(${Math.round(
          96 -
            stress * 22,
        )}%)`,
        "contrast(114%)",
        "drop-shadow(0 5px 8px rgba(0,0,0,0.62))",
        "drop-shadow(0 0 5px rgba(125,210,225,0.16))",
      ].join(" ");

      ctx.translate(
        x,
        0,
      );

      if (options?.flip) {
        ctx.scale(
          -1,
          1,
        );
      }

      ctx.drawImage(
        image,
        -drawWidth / 2,
        baseY -
          drawHeight,
        drawWidth,
        drawHeight,
      );

      ctx.restore();
    }

    function drawCoralColony(
      ctx: CanvasRenderingContext2D,
      image:
        | HTMLImageElement
        | undefined,
      x: number,
      width: number,
      height: number,
      healthValue: number,
      threshold: number,
      moundWidth: number,
      moundHeight: number,
      seed: number,
      options?: {
        alpha?: number;
        flip?: boolean;
        brightness?: number;
      },
    ) {
      const baseY =
        seabedSurfaceAt(
          x,
          canvas.width,
          canvas.height,
        ) + 2;

      drawTerrainMound(
        ctx,
        x,
        baseY + 6,
        moundWidth,
        moundHeight,
        seed,
      );

      drawCreature(
        ctx,
        image,
        x,
        baseY,
        width,
        height,
        healthValue,
        threshold,
        {
          alpha:
            options?.alpha ??
            0.9,
          flip:
            options?.flip,
          brightness:
            options?.brightness ??
            79,
        },
      );
    }

    /* =====================================================
       CANVAS-DRAWN JELLYFISH
    ===================================================== */

    function drawJellyfish(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      alpha: number,
      tick: number,
      seed: number,
    ) {
      ctx.save();

      ctx.globalAlpha =
        alpha;

      ctx.translate(
        x,
        y,
      );

      const pulse =
        1 +
        Math.sin(
          tick * 0.025 +
            seed,
        ) *
          0.05;

      ctx.scale(
        pulse,
        1,
      );

      const bell =
        ctx.createRadialGradient(
          -size * 0.08,
          -size * 0.12,
          2,
          0,
          0,
          size * 0.42,
        );

      bell.addColorStop(
        0,
        "rgba(205,232,248,0.78)",
      );

      bell.addColorStop(
        0.65,
        "rgba(125,175,215,0.48)",
      );

      bell.addColorStop(
        1,
        "rgba(95,135,185,0.12)",
      );

      ctx.fillStyle =
        bell;

      ctx.beginPath();

      ctx.ellipse(
        0,
        0,
        size * 0.42,
        size * 0.28,
        0,
        Math.PI,
        Math.PI * 2,
      );

      ctx.quadraticCurveTo(
        size * 0.3,
        size * 0.22,
        0,
        size * 0.2,
      );

      ctx.quadraticCurveTo(
        -size * 0.3,
        size * 0.22,
        -size * 0.42,
        0,
      );

      ctx.fill();

      for (
        let tentacle = 0;
        tentacle < 5;
        tentacle += 1
      ) {
        const startX =
          (tentacle - 2) *
          size *
          0.12;

        ctx.beginPath();

        ctx.moveTo(
          startX,
          size * 0.14,
        );

        ctx.bezierCurveTo(
          startX +
            Math.sin(
              tick * 0.018 +
                tentacle,
            ) *
              size *
              0.08,
          size * 0.45,
          startX -
            size * 0.06,
          size * 0.72,
          startX +
            Math.sin(
              tick * 0.012 +
                tentacle * 2,
            ) *
              size *
              0.08,
          size,
        );

        ctx.strokeStyle =
          "rgba(180,215,235,0.58)";

        ctx.lineWidth =
          1.1;

        ctx.stroke();
      }

      ctx.restore();
    }

    /* =====================================================
       ECOLOGICAL ZONE GUIDE
    ===================================================== */

    function drawEcologicalZoneGuide(
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
    ) {
      const guideX =
        width - 26;

      const floorY =
        seabedSurfaceAt(
          width - 55,
          width,
          height,
        );

      const nearTop =
        floorY - 105;

      const waterTop =
        WATER_COLUMN_TOP + 10;

      ctx.save();

      ctx.strokeStyle =
        "rgba(158,225,235,0.48)";

      ctx.fillStyle =
        "rgba(225,247,250,0.9)";

      ctx.lineWidth = 1;

      /*
       * Lower-water-column bracket.
       */
      ctx.beginPath();

      ctx.moveTo(
        guideX,
        waterTop,
      );

      ctx.lineTo(
        guideX,
        nearTop - 12,
      );

      ctx.stroke();

      /*
       * Near-seabed bracket.
       */
      ctx.beginPath();

      ctx.moveTo(
        guideX,
        nearTop,
      );

      ctx.lineTo(
        guideX,
        floorY - 8,
      );

      ctx.stroke();

      /*
       * Small horizontal ticks.
       */
      [
        waterTop,
        nearTop - 12,
        nearTop,
        floorY - 8,
        floorY,
      ].forEach(
        (y) => {
          ctx.beginPath();

          ctx.moveTo(
            guideX - 7,
            y,
          );

          ctx.lineTo(
            guideX + 3,
            y,
          );

          ctx.stroke();
        },
      );

      ctx.font =
        "700 13px Arial";

      ctx.textAlign =
        "right";

      ctx.fillText(
        "Lower water column",
        guideX - 10,
        (waterTop +
          nearTop -
          12) /
          2,
      );

      ctx.fillText(
        "Near seabed",
        guideX - 10,
        (nearTop +
          floorY -
          8) /
          2,
      );

      ctx.fillText(
        "Seabed",
        guideX - 10,
        floorY + 4,
      );

      ctx.font =
        "700 12px Arial";

      ctx.fillStyle =
        "rgba(210,240,244,0.8)";

      ctx.fillText(
        "Illustrative ecological zones",
        guideX - 10,
        waterTop - 12,
      );

      ctx.restore();
    }

    function drawLabel(
      ctx: CanvasRenderingContext2D,
      label: string,
      x: number,
      y: number,
    ) {
      ctx.save();

      ctx.font =
        "700 14px Arial";

      const metrics =
        ctx.measureText(
          label,
        );

      const paddingX = 11;

      ctx.fillStyle =
        "rgba(0,8,18,0.78)";

      ctx.strokeStyle =
        "rgba(88,220,235,0.5)";

      ctx.lineWidth = 1;

      ctx.beginPath();

      ctx.roundRect(
        x,
        y - 22,
        metrics.width +
          paddingX * 2,
        30,
        8,
      );

      ctx.fill();
      ctx.stroke();

      ctx.fillStyle =
        "rgba(235,250,252,0.98)";

      ctx.fillText(
        label,
        x + paddingX,
        y,
      );

      ctx.restore();
    }

    function drawFinalGrade(
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
    ) {
      const grade =
        ctx.createLinearGradient(
          0,
          0,
          0,
          height,
        );

      grade.addColorStop(
        0,
        "rgba(7,31,61,0.02)",
      );

      grade.addColorStop(
        0.5,
        "rgba(5,24,47,0.055)",
      );

      grade.addColorStop(
        0.82,
        "rgba(4,17,34,0.065)",
      );

      grade.addColorStop(
        1,
        "rgba(2,9,19,0.10)",
      );

      ctx.fillStyle =
        grade;

      ctx.fillRect(
        0,
        0,
        width,
        height,
      );
    }

    /* =====================================================
       FRAME
    ===================================================== */

    function drawFrame() {
      const s =
        state.current;

      s.tick += 1;

      const tick =
        s.tick;

      const width =
        canvas.width;

      const height =
        canvas.height;

      const h =
        s.health;

      /* ---------------------------------------------------
         WATER
      --------------------------------------------------- */

      const healthyTop = [
        8,
        58,
        98,
      ];

      const healthyBottom = [
        4,
        16,
        34,
      ];

      const stressedTop = [
        58,
        42,
        40,
      ];

      const stressedBottom = [
        14,
        9,
        12,
      ];

      const temperatureTint =
        Math.max(
          0,
          (s.temperature -
            35) /
            100,
        );

      const acidTint =
        Math.max(
          0,
          (s.acidification -
            35) /
            100,
        );

      const topColor =
        lerpColor(
          healthyTop,
          stressedTop,
          temperatureTint,
        );

      const bottomColor =
        lerpColor(
          healthyBottom,
          stressedBottom,
          Math.max(
            temperatureTint,
            acidTint * 0.8,
          ),
        );

      const water =
        context.createLinearGradient(
          0,
          0,
          0,
          height,
        );

      water.addColorStop(
        0,
        colorToRgb(
          topColor,
        ),
      );

      water.addColorStop(
        0.45,
        colorToRgb(
          lerpColor(
            topColor,
            bottomColor,
            0.55,
          ),
        ),
      );

      water.addColorStop(
        1,
        colorToRgb(
          bottomColor,
        ),
      );

      context.fillStyle =
        water;

      context.fillRect(
        0,
        0,
        width,
        height,
      );

      drawWaterHaze(
        context,
        width,
        height,
      );

      drawDeepSeaLight(
        context,
        width,
        height,
        h,
        tick,
      );

      drawMarineSnow(
        context,
        width,
        height,
      );

      /* ---------------------------------------------------
         MARINE LITTER
      --------------------------------------------------- */

      const visibleLitter =
        Math.floor(
          s.litter.length *
            (s.marineLitter /
              100),
        );

      if (
        s.images.plastic
          ?.complete
      ) {
        s.litter
          .slice(
            0,
            visibleLitter,
          )
          .forEach(
            (item) => {
              item.wobble +=
                0.012;

              item.x =
                (item.x +
                  item.vx +
                  width) %
                width;

              item.y =
                Math.max(
                  70,
                  Math.min(
                    height -
                      90,
                    item.y +
                      item.vy +
                      Math.sin(
                        item.wobble,
                      ) *
                        0.08,
                  ),
                );

              item.rotation +=
                0.08;

              context.save();

              context.translate(
                item.x,
                item.y,
              );

              context.rotate(
                (item.rotation *
                  Math.PI) /
                  180,
              );

              context.globalAlpha =
                0.42;

              context.filter =
                "brightness(62%) saturate(52%)";

              const itemWidth =
                38 *
                item.scale;

              const itemHeight =
                22 *
                item.scale;

              context.drawImage(
                s.images.plastic,
                -itemWidth / 2,
                -itemHeight / 2,
                itemWidth,
                itemHeight,
              );

              context.restore();
            },
          );
      }

      /* ---------------------------------------------------
         3D FLOOR
      --------------------------------------------------- */

      const ecosystemDamage =
        Math.max(
          0,
          (65 - h) /
            65,
        );

      drawThreeDimensionalFloor(
        context,
        width,
        height,
        ecosystemDamage,
      );

      /* ===================================================
         CORAL-FOCUSED DEEP-SEA COMMUNITY
      =================================================== */

      /*
       * Cold-water coral dominates the scene.
       * Repeated colonies use the same transparent asset at
       * different scales and positions.
       */
      drawCoralColony(
        context,
        s.images.coldWaterCoral,
        width * 0.075,
        210,
        155,
        h,
        65,
        245,
        58,
        2,
        {
          alpha: 0.92,
          brightness: 108,
        },
      );

      drawCoralColony(
        context,
        s.images.coldWaterCoral,
        width * 0.18,
        175,
        130,
        h,
        65,
        195,
        46,
        5,
        {
          alpha: 0.8,
          flip: true,
          brightness: 99,
        },
      );

      drawCoralColony(
        context,
        s.images.coldWaterCoral,
        width * 0.46,
        160,
        118,
        h,
        65,
        180,
        43,
        8,
        {
          alpha: 0.73,
          brightness: 97,
        },
      );

      /*
       * Black coral colonies.
       */
      drawCoralColony(
        context,
        s.images.blackCoral,
        width * 0.295,
        112,
        142,
        h,
        58,
        135,
        40,
        11,
        {
          alpha: 0.8,
          brightness: 99,
        },
      );

      drawCoralColony(
        context,
        s.images.blackCoral,
        width * 0.61,
        104,
        132,
        h,
        58,
        130,
        38,
        14,
        {
          alpha: 0.7,
          flip: true,
          brightness: 94,
        },
      );

      /*
       * Bamboo coral colonies on the raised right terrain.
       */
      drawCoralColony(
        context,
        s.images.bambooCoral,
        width * 0.78,
        90,
        156,
        h,
        58,
        122,
        42,
        17,
        {
          alpha: 0.8,
          brightness: 99,
        },
      );

      drawCoralColony(
        context,
        s.images.bambooCoral,
        width * 0.88,
        72,
        132,
        h,
        58,
        105,
        35,
        20,
        {
          alpha: 0.68,
          flip: true,
          brightness: 92,
        },
      );

      /* ===================================================
         THREE SEA ANEMONES
      =================================================== */

      const anemoneXs = [
        width * 0.37,
        width * 0.54,
        width * 0.72,
      ];

      const anemoneSizes = [
        [66, 75],
        [78, 88],
        [58, 68],
      ];

      anemoneXs.forEach(
        (
          x,
          index,
        ) => {
          const baseY =
            seabedSurfaceAt(
              x,
              width,
              height,
            ) + 1;

          drawCreature(
            context,
            s.images.seaAnemone,
            x,
            baseY,
            anemoneSizes[index][0],
            anemoneSizes[index][1],
            h,
            42,
            {
              alpha:
                index === 1
                  ? 0.92
                  : 0.78,
              brightness:
                index === 1
                  ? 80
                  : 75,
              flip:
                index === 2,
            },
          );
        },
      );

      /* ===================================================
         BRITTLE STARS ON THE SEABED
      =================================================== */

      const brittleXs = [
        width * 0.42,
        width * 0.68,
      ];

      brittleXs.forEach(
        (
          x,
          index,
        ) => {
          const baseY =
            seabedSurfaceAt(
              x,
              width,
              height,
            ) + 3;

          drawCreature(
            context,
            s.images.brittleStar,
            x,
            baseY,
            index === 0
              ? 88
              : 104,
            index === 0
              ? 60
              : 72,
            h,
            38,
            {
              alpha:
                index === 0
                  ? 0.75
                  : 0.88,
              brightness: 100,
              flip:
                index === 0,
            },
          );
        },
      );

      /* ===================================================
         OTHER ANIMAL: DEEP-SEA JELLYFISH
      =================================================== */

      if (h >= 42) {
        s.jellyfish.forEach(
          (jelly) => {
            jelly.wobble +=
              0.012;

            jelly.x +=
              jelly.direction *
              jelly.speed;

            if (
              jelly.x >
              width + 50
            ) {
              jelly.x = -50;
            }

            if (
              jelly.x < -50
            ) {
              jelly.x =
                width + 50;
            }

            jelly.y =
              lowerWaterColumnY(
                jelly.x,
                jelly.waterPosition,
                width,
                height,
              ) +
              Math.sin(
                jelly.wobble,
              ) *
                8;

            drawJellyfish(
              context,
              jelly.x,
              jelly.y,
              jelly.size,
              jelly.alpha,
              tick,
              jelly.id,
            );
          },
        );
      }

      /* ===================================================
         FOUR BENTHIC FISH AT DIFFERENT HEIGHTS
      =================================================== */

      const heatwavePenalty =
        Math.max(
          0,
          (s.temperature -
            55) *
            0.72,
        );

      const fishSupport =
        Math.max(
          0,
          h -
            heatwavePenalty,
        );

      let visibleFish = 0;

      if (
        fishSupport >= 72
      ) {
        visibleFish = 4;
      } else if (
        fishSupport >= 58
      ) {
        visibleFish = 3;
      } else if (
        fishSupport >= 44
      ) {
        visibleFish = 2;
      } else if (
        fishSupport >= 32
      ) {
        visibleFish = 1;
      }

      if (
        s.images.benthicFish
          ?.complete
      ) {
        s.fish
          .slice(
            0,
            visibleFish,
          )
          .forEach(
            (
              fish,
              index,
            ) => {
              fish.wobble +=
                0.018;

              const dx =
                fish.x -
                s.mouseX;

              const dy =
                fish.y -
                s.mouseY;

              if (
                Math.hypot(
                  dx,
                  dy,
                ) < 105
              ) {
                fish.flee =
                  45;

                fish.direction =
                  dx > 0
                    ? 1
                    : -1;
              }

              if (
                fish.flee >
                0
              ) {
                fish.flee -=
                  1;
              }

              const speed =
                fish.flee >
                0
                  ? Math.min(
                      3,
                      fish.speed *
                        3,
                    )
                  : fish.speed;

              fish.x +=
                fish.direction *
                speed;

              if (
                fish.x >
                width + 100
              ) {
                fish.x =
                  -100;
              }

              if (
                fish.x <
                -100
              ) {
                fish.x =
                  width + 100;
              }

              const desiredY =
                nearSeabedY(
                  fish.x,
                  fish.offsetPx,
                  width,
                  height,
                );

              fish.y +=
                (desiredY -
                  fish.y) *
                0.055;

              fish.y +=
                Math.sin(
                  fish.wobble,
                ) *
                0.07;

              /*
               * Only the lowest fish casts a noticeable seabed
               * shadow. Higher fish are too far above the bottom.
               */
              if (
                fish.offsetPx <=
                30
              ) {
                const floorY =
                  seabedSurfaceAt(
                    fish.x,
                    width,
                    height,
                  );

                drawGroundShadow(
                  context,
                  fish.x,
                  floorY + 1,
                  fish.size *
                    0.22,
                  fish.size *
                    0.045,
                  0.1,
                );
              }

              context.save();

              context.translate(
                fish.x,
                fish.y,
              );

              if (
                fish.direction ===
                -1
              ) {
                context.scale(
                  -1,
                  1,
                );
              }

              context.rotate(
                Math.sin(
                  fish.wobble *
                    2,
                ) *
                  0.018,
              );

              context.globalAlpha =
                fish.alpha;

              /*
               * Fish farther from the seabed are slightly dimmer
               * to strengthen visual depth, without assigning a
               * biological metre range.
               */
              const depthFade =
                1 -
                Math.min(
                  0.16,
                  fish.offsetPx /
                    500,
                );

              context.filter = [
                `brightness(${Math.round(
                  96 *
                    depthFade,
                )}%)`,
                "saturate(92%)",
                "contrast(114%)",
                "drop-shadow(0 4px 7px rgba(0,0,0,0.58))",
                "drop-shadow(0 0 4px rgba(125,210,225,0.14))",
              ].join(" ");

              context.drawImage(
                s.images.benthicFish,
                -fish.size / 2,
                -fish.size *
                  0.22,
                fish.size,
                fish.size *
                  0.44,
              );

              context.restore();

              if (
                index === 0
              ) {

                drawLabel(
                  context,
                  "Benthic fish",
                  fish.x -
                    48,
                  fish.y -
                    48,
                );
              }
            },
          );
      }

      /* ===================================================
         BOTTOM TRAWLING
      =================================================== */

      const trawl =
        s.trawl;

      trawl.cooldown =
        Math.max(
          0,
          trawl.cooldown -
            1,
        );

      if (
        s.bottomTrawling >
          25 &&
        !trawl.active &&
        trawl.cooldown ===
          0
      ) {
        trawl.active =
          true;

        trawl.x =
          -320;

        trawl.speed =
          2.3 +
          s.bottomTrawling /
            30;
      }

      if (
        trawl.active
      ) {
        trawl.x +=
          trawl.speed;

        if (
          s.images.net
            ?.complete
        ) {
          context.save();

          context.globalAlpha =
            0.68;

          context.filter =
            "brightness(65%) saturate(60%)";

          context.drawImage(
            s.images.net,
            trawl.x,
            height -
              210,
            245,
            175,
          );

          context.restore();
        }

        context.beginPath();

        context.moveTo(
          trawl.x +
            120,
          height -
            193,
        );

        context.lineTo(
          trawl.x + 60,
          0,
        );

        context.strokeStyle =
          "rgba(190,165,115,0.52)";

        context.lineWidth =
          2.5;

        context.stroke();

        if (
          tick % 3 ===
          0
        ) {
          for (
            let index = 0;
            index < 3;
            index += 1
          ) {
            s.sediment.push({
              x:
                trawl.x +
                rand(
                  20,
                  230,
                ),
              y:
                height -
                rand(
                  35,
                  70,
                ),
              vx:
                rand(
                  -1.2,
                  0.8,
                ),
              vy:
                rand(
                  -2,
                  -0.25,
                ),
              life:
                randInt(
                  55,
                  110,
                ),
              size:
                rand(
                  4,
                  13,
                ),
            });
          }
        }

        s.fish.forEach(
          (fish) => {
            if (
              fish.zone ===
                "near-seabed" &&
              Math.abs(
                fish.x -
                  trawl.x,
              ) < 220
            ) {
              fish.flee =
                80;

              fish.direction =
                fish.x >
                trawl.x
                  ? 1
                  : -1;
            }
          },
        );

        if (
          trawl.x >
          width + 350
        ) {
          trawl.active =
            false;

          trawl.cooldown =
            Math.max(
              70,
              280 -
                Math.floor(
                  s.bottomTrawling *
                    1.7,
                ),
            );
        }
      }

      s.sediment =
        s.sediment.filter(
          (particle) => {
            particle.x +=
              particle.vx;

            particle.y +=
              particle.vy;

            particle.vy +=
              0.02;

            particle.life -=
              1;

            if (
              particle.life <=
              0
            ) {
              return false;
            }

            context.beginPath();

            context.arc(
              particle.x,
              particle.y,
              particle.size,
              0,
              Math.PI * 2,
            );

            context.fillStyle =
              `rgba(143,119,83,${Math.min(
                0.32,
                particle.life /
                  220,
              )})`;

            context.fill();

            return true;
          },
        );

      /* ===================================================
         DAMAGE EFFECTS
      =================================================== */

      const scarCount =
        Math.floor(
          s.bottomTrawling /
            24,
        );

      for (
        let index = 0;
        index < scarCount;
        index += 1
      ) {
        const scarY =
          height -
          34 -
          (index % 3) *
            7;

        context.beginPath();

        context.moveTo(
          index * 205 -
            30,
          scarY,
        );

        context.lineTo(
          index * 205 +
            150,
          scarY +
            Math.sin(
              index,
            ) *
              2,
        );

        context.strokeStyle =
          `rgba(98,78,58,${
            0.16 +
            s.bottomTrawling /
              650
          })`;

        context.lineWidth =
          3;

        context.stroke();
      }

      if (
        s.acidification >
        35
      ) {
        const haze =
          context.createLinearGradient(
            0,
            height * 0.5,
            0,
            height,
          );

        haze.addColorStop(
          0,
          "rgba(80,48,110,0)",
        );

        haze.addColorStop(
          1,
          `rgba(80,48,110,${Math.min(
            0.18,
            (s.acidification -
              35) /
              330,
          )})`,
        );

        context.fillStyle =
          haze;

        context.fillRect(
          0,
          height * 0.5,
          width,
          height * 0.5,
        );
      }

      drawFinalGrade(
        context,
        width,
        height,
      );

      /* ===================================================
         REPRESENTATIVE LABELS
         (not every repeated organism is labelled)
      =================================================== */

      drawLabel(
        context,
        "Cold-water coral",
        28,
        seabedSurfaceAt(
          width *
            0.075,
          width,
          height,
        ) - 166,
      );

      drawLabel(
        context,
        "Black coral",
        width *
          0.255,
        seabedSurfaceAt(
          width *
            0.295,
          width,
          height,
        ) - 144,
      );

      drawLabel(
        context,
        "Bamboo coral",
        width *
          0.755,
        seabedSurfaceAt(
          width *
            0.78,
          width,
          height,
        ) - 158,
      );

      drawLabel(
        context,
        "Sea anemone",
        width *
          0.515,
        seabedSurfaceAt(
          width *
            0.54,
          width,
          height,
        ) - 95,
      );

      drawLabel(
        context,
        "Brittle star",
        width *
          0.655,
        seabedSurfaceAt(
          width *
            0.68,
          width,
          height,
        ) - 75,
      );

      if (
        h >= 42
      ) {
        const jellyLabelY =
          lowerWaterColumnY(
            width * 0.49,
            0.4,
            width,
            height,
          ) - 45;

        drawLabel(
          context,
          "Deep-sea jellyfish",
          width * 0.46,
          jellyLabelY,
        );

      }

      drawEcologicalZoneGuide(
        context,
        width,
        height,
      );

      /* ===================================================
         CENTRAL CONDITION MESSAGE
      =================================================== */

      const messages:
        Array<
          [
            number,
            number,
            string,
            string,
          ]
        > = [
        [
          85,
          101,
          "Thriving Deep-Sea Coral Habitat",
          "#62e6c9",
        ],
        [
          70,
          85,
          "Stable, but Protection Is Needed",
          "#62bde6",
        ],
        [
          55,
          70,
          "Early Coral Habitat Stress",
          "#e5b65e",
        ],
        [
          35,
          55,
          "Deep-Sea Coral Habitat Under Threat",
          "#ee7b45",
        ],
        [
          0,
          35,
          "Critical Coral Habitat Loss",
          "#f05252",
        ],
      ];

      for (
        const [
          minimum,
          maximum,
          message,
          color,
        ] of messages
      ) {
        if (
          h >= minimum &&
          h < maximum
        ) {
          const alpha =
            0.52 +
            Math.sin(
              tick *
                0.025,
            ) *
              0.1;

          context.save();

          context.font =
            "bold 34px Arial";

          context.textAlign =
            "center";

          context.shadowColor =
            color;

          context.shadowBlur =
            13;

          context.fillStyle =
            `${color}${Math.round(
              alpha * 255,
            )
              .toString(16)
              .padStart(
                2,
                "0",
              )}`;

          /*
           * Keep the large ecosystem-condition message high in the
           * water column so it does not cover jellyfish, fish or
           * coral labels.
           */
          const conditionMessageY = 82;

          context.fillText(
            message,
            width / 2,
            conditionMessageY,
          );

          context.restore();

          break;
        }
      }

      const alerts:
        string[] = [];

      if (
        trawl.active
      ) {
        alerts.push(
          "Bottom trawling is resuspending sediment and damaging coral habitat",
        );
      }

      if (
        s.temperature >
        62
      ) {
        alerts.push(
          "Marine heatwave risk is increasing",
        );
      }

      if (
        s.acidification >
        62
      ) {
        alerts.push(
          "Acidification is reducing coral calcification",
        );
      }

      if (
        s.marineLitter >
        62
      ) {
        alerts.push(
          "Lost gear and litter are accumulating around coral habitat",
        );
      }

      alerts
        .slice(
          0,
          2,
        )
        .forEach(
          (
            alert,
            index,
          ) => {
            context.save();

            context.font =
              "bold 17px Arial";

            context.textAlign =
              "center";

            context.fillStyle =
              index === 0
                ? "rgba(255,204,92,0.94)"
                : "rgba(255,150,92,0.9)";

            context.fillText(
              `⚠ ${alert}`,
              width / 2,
              24 +
                index * 22,
            );

            context.restore();
          },
        );

      s.rafId =
        requestAnimationFrame(
          drawFrame,
        );
    }

    state.current.rafId =
      requestAnimationFrame(
        drawFrame,
      );

    return () => {
      cancelAnimationFrame(
        state.current.rafId,
      );
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={1400}
      height={620}
      className="ocean-canvas"
      onMouseMove={
        onMouseMove
      }
      onMouseLeave={
        onMouseLeave
      }
    />
  );
}

const HABITAT_CONDITIONS = [
  {
    min: 85,
    max: 100,
    name: "Thriving Deep-Sea Coral Habitat",
    description:
      "Cold-water coral, black coral and bamboo coral form structurally complex habitat for benthic animals.",
  },
  {
    min: 70,
    max: 84,
    name: "Stable with Early Stress",
    description:
      "Coral habitat remains functional, but warming, litter or fishing pressure is beginning to appear.",
  },
  {
    min: 55,
    max: 69,
    name: "Coral Habitat Disturbance",
    description:
      "Multiple pressures begin reducing coral condition, habitat complexity and associated biodiversity.",
  },
  {
    min: 35,
    max: 54,
    name: "Severe Coral Damage",
    description:
      "Coral colonies are damaged or fragmented and associated benthic biodiversity is declining.",
  },
  {
    min: 0,
    max: 34,
    name: "Coral Habitat Collapse Risk",
    description:
      "Large areas of deep-sea coral habitat are lost and recovery may take decades or centuries.",
  },
];

const MARINE_LIFE_STATUS = [
  {
    name: "Cold-Water Coral 🪸",
    threshold: 65,
  },
  {
    name: "Benthic Fish 🐟",
    threshold: 48,
  },
  {
    name: "Brittle Star ⭐",
    threshold: 38,
  },
  {
    name: "Sea Anemone 🌸",
    threshold: 42,
  },
];

const ECOSYSTEM_COMPONENTS = [
  {
    icon: "🪸",
    name: "Cold-Water Coral",
    description:
      "Habitat-forming cold-water corals create complex three-dimensional structure on the deep seafloor.",
  },
  {
    icon: "🌿",
    name: "Black Coral",
    description:
      "Long-lived branching black corals provide elevated habitat and attachment surfaces for deep-sea organisms.",
  },
  {
    icon: "🌾",
    name: "Bamboo Coral",
    description:
      "Bamboo corals are deep-water octocorals with jointed skeletons that add structure to benthic habitats.",
  },
  {
    icon: "🐟",
    name: "Benthic Fish",
    description:
      "Benthic fish are shown within a near-seabed zone. Their exact vertical position is illustrative rather than a fixed species-specific height.",
  },
  {
    icon: "🌸",
    name: "Sea Anemone",
    description:
      "Deep-sea anemones attach directly to hard surfaces and coral-associated rocky habitat on the seabed.",
  },
  {
    icon: "⭐",
    name: "Brittle Star",
    description:
      "Brittle stars live on or close to the seafloor and form part of deep-sea benthic food webs.",
  },
  {
    icon: "◌",
    name: "Deep-Sea Jellyfish",
    description:
      "Jellyfish are shown in the lower water column to distinguish mobile water-column fauna from organisms attached to or living near the seabed.",
  },
];

const TIPS: Record<string, string[]> = {
  marineLitter: [
    "♻ Reduce single-use plastic",
    "🕸 Support retrieval of lost fishing gear",
    "🚯 Keep waste away from waterways",
  ],
  temperature: [
    "⚡ Support low-carbon energy",
    "🚲 Choose lower-emission transport",
    "🌍 Protect carbon-storing marine ecosystems",
  ],
  acidification: [
    "🏭 Reduce carbon emissions",
    "🔬 Support long-term ocean monitoring",
    "🌱 Protect vulnerable marine habitats",
  ],
  bottomTrawling: [
    "🗺 Support protected deep-sea areas",
    "🐟 Choose traceable seafood",
    "🚫 Support restrictions on destructive fishing gear",
  ],
};

type Scenario = {
  status: string;
  habitat: string;
  biodiversity: string;
  litter: string;
  fishing: string;
  outlook: string;
  moodClass: string;
};

export default function OceanFutureSimulator() {
  const [
    marineLitter,
    setMarineLitter,
  ] = useState(15);

  const [
    temperature,
    setTemperature,
  ] = useState(10);

  const [
    acidification,
    setAcidification,
  ] = useState(10);

  const [
    bottomTrawling,
    setBottomTrawling,
  ] = useState(12);

  const [
    year,
    setYear,
  ] = useState(2024);

  const [
    toast,
    setToast,
  ] = useState("");

  const health = useMemo(
    () =>
      Math.max(
        0,
        Math.round(
          100 -
            marineLitter * 0.25 -
            temperature * 0.25 -
            acidification * 0.25 -
            bottomTrawling * 0.25,
        ),
      ),
    [
      marineLitter,
      temperature,
      acidification,
      bottomTrawling,
    ],
  );

  useEffect(() => {
    if (health > 90) {
      setToast(
        "🏆 The deep-sea habitat is in a thriving state!",
      );

      const timer =
        window.setTimeout(
          () => setToast(""),
          4500,
        );

      return () =>
        window.clearTimeout(timer);
    }

    return undefined;
  }, [health]);

  const scenario: Scenario = useMemo(() => {
    if (health >= 85) {
      return {
        status: "Healthy",
        habitat:
          "Deep-sea coral and rocky benthic habitats are stable and structurally complex.",
        biodiversity:
          "A diverse community of benthic fish, brittle stars, sea anemones and other coral-associated animals remains present.",
        litter:
          "Minimal accumulation and little entanglement risk.",
        fishing:
          "Low disturbance to the seafloor.",
        outlook:
          "The deep-sea ecosystem is healthy and resilient.",
        moodClass: "healthy",
      };
    }

    if (health >= 70) {
      return {
        status: "Mostly Stable",
        habitat:
          "The habitat remains functional, but early environmental stress is visible.",
        biodiversity:
          "Most benthic groups remain present, with some decline in sensitive organisms.",
        litter:
          "Discarded material is becoming visible.",
        fishing:
          "Occasional seafloor disturbance is occurring.",
        outlook:
          "Protection now can prevent long-term damage.",
        moodClass: "warning",
      };
    }

    if (health >= 55) {
      return {
        status: "Warning Signs",
        habitat:
          "Deep-sea coral communities are increasingly stressed.",
        biodiversity:
          "Sensitive benthic organisms and mobile fauna are declining.",
        litter:
          "Lost gear and waste are affecting seafloor organisms.",
        fishing:
          "Sediment resuspension is reducing habitat quality.",
        outlook:
          "The ecosystem is losing resilience.",
        moodClass: "warning-low",
      };
    }

    if (health >= 35) {
      return {
        status: "At Risk",
        habitat:
          "Deep-sea coral and associated benthic habitats are damaged and fragmented.",
        biodiversity:
          "Major declines occur across benthic fish and other coral-associated animals.",
        litter:
          "Entanglement and seafloor accumulation are widespread.",
        fishing:
          "Repeated trawling is altering the seafloor.",
        outlook:
          "Recovery will be slow without strong protection.",
        moodClass: "warning-low",
      };
    }

    return {
      status: "Critical",
      habitat:
        "Large areas of structurally complex deep-sea habitat have been lost.",
      biodiversity:
        "Benthic communities and associated food webs face severe decline.",
      litter:
        "Severe accumulation of waste and abandoned fishing gear.",
      fishing:
        "Intense bottom trawling continues to damage the seabed.",
      outlook:
        "Recovery may require decades or centuries.",
      moodClass: "critical",
    };
  }, [health]);

  const riskLevels = [
    {
      min: 85,
      max: 100,
      label: "Healthy Habitat",
      note: "Deep-sea systems are functioning well.",
    },
    {
      min: 70,
      max: 84,
      label: "Mostly Stable",
      note: "Stable, but early warning signs exist.",
    },
    {
      min: 55,
      max: 69,
      label: "Warning Signs",
      note: "Visible stress from multiple pressures.",
    },
    {
      min: 35,
      max: 54,
      label: "Habitat at Risk",
      note: "Strong pressure and biodiversity loss.",
    },
    {
      min: 0,
      max: 34,
      label: "Critical State",
      note: "Severe damage and collapse risk.",
    },
  ];

  function handleYear(value: number) {
    setYear(value);

    const decades = Math.floor(
      (value - 2024) / 10,
    );

    setMarineLitter(
      Math.min(
        100,
        15 + decades * 4,
      ),
    );

    setTemperature(
      Math.min(
        100,
        10 + decades * 5,
      ),
    );

    setAcidification(
      Math.min(
        100,
        10 + decades * 4,
      ),
    );

    setBottomTrawling(
      Math.min(
        100,
        12 + decades * 3,
      ),
    );
  }

  function reset() {
    setMarineLitter(15);
    setTemperature(10);
    setAcidification(10);
    setBottomTrawling(12);
    setYear(2024);
  }

  const activeTips = [
    ...(marineLitter > 40
      ? TIPS.marineLitter
      : []),
    ...(temperature > 40
      ? TIPS.temperature
      : []),
    ...(acidification > 40
      ? TIPS.acidification
      : []),
    ...(bottomTrawling > 40
      ? TIPS.bottomTrawling
      : []),
  ].slice(0, 6);

  return (
    <main
      className={`ocean-page ${scenario.moodClass}`}
    >
      <div className="water-overlay" />
      <div className="bubble-layer" />

      {toast && (
        <button
          className="challenge-toast"
          onClick={() => setToast("")}
          type="button"
        >
          {toast} ×
        </button>
      )}

      <section className="hero">
        <h1>Ocean in Future</h1>

        <p>
          Cold-Water Corals & Deep-Sea Future Simulator
        </p>

        <div className="wave-line">
          〰
        </div>
      </section>

      <section className="main-layout glass">
        <div className="sliders-col">
          <Slider
            icon="🧴"
            title="Marine Litter"
            description="Plastic, microplastics, dumped waste and lost fishing gear"
            value={marineLitter}
            onChange={setMarineLitter}
          />

          <Slider
            icon="🌡"
            title="Ocean Warming"
            description="Rising temperature and marine heatwave pressure"
            value={temperature}
            onChange={setTemperature}
          />

          <Slider
            icon="🫧"
            title="Ocean Acidification"
            description="Increasing acidity caused by absorbed carbon dioxide"
            value={acidification}
            onChange={setAcidification}
          />

          <Slider
            icon="🕸"
            title="Bottom Trawling"
            description="Fishing gear dragged across the deep seafloor"
            value={bottomTrawling}
            onChange={setBottomTrawling}
          />

          <Slider
            icon="📅"
            title={`Year: ${year}`}
            description="Explore a possible future scenario"
            value={year}
            min={2024}
            max={2100}
            onChange={handleYear}
            isYear
          />

          <div className="mini-health">
            <div className="mini-health-label">
              Deep-Sea Habitat Health
            </div>

            <div className="mini-health-bar">
              <div
                className="mini-health-fill"
                style={{
                  width: `${health}%`,
                  background:
                    health >= 70
                      ? "#27f5ff"
                      : health >= 40
                        ? "#ffb430"
                        : "#ff4040",
                }}
              />
            </div>

            <div
              className="mini-health-pct"
              style={{
                color:
                  health >= 70
                    ? "#27f5ff"
                    : health >= 40
                      ? "#ffb430"
                      : "#ff4040",
              }}
            >
              {health}%
            </div>
          </div>

          <button
            className="reset-btn"
            onClick={reset}
            type="button"
          >
            ↺ Reset Scenario
          </button>
        </div>

        <div className="canvas-col">
          <section className="animals-panel glass">
            <h2>
              Deep-Sea Species Status
            </h2>

            <div className="animals-grid">
              {MARINE_LIFE_STATUS.map(
                (species) => (
                  <div
                    key={species.name}
                    className={`animal-card ${
                      health >= species.threshold
                        ? "alive"
                        : "atrisk"
                    }`}
                  >
                    <span className="animal-name">
                      {species.name}
                    </span>

                    <span className="animal-status">
                      {health >= species.threshold
                        ? "✅ Stable"
                        : "⚠️ At Risk"}
                    </span>

                    <div className="animal-bar">
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            (health /
                              species.threshold) *
                              100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>

          <OceanCanvas
            health={health}
            marineLitter={marineLitter}
            temperature={temperature}
            acidification={acidification}
            bottomTrawling={bottomTrawling}
          />

          {year > 2024 && (
            <div className="year-badge">
              🔮 {year - 2024} years into the future
            </div>
          )}
        </div>
      </section>

      <section className="result-panel glass">
        <div className="result-top">
          <div className="health-circle">
            <div
              className="health-ring"
              style={{
                background: `conic-gradient(
                  #27f5ff ${health * 3.6}deg,
                  rgba(255,255,255,0.1) ${health * 3.6}deg
                )`,
              }}
            >
              <div className="health-inner">
                <span className="health-title">
                  Conceptual Habitat Score
                </span>

                <strong>
                  {health}%
                </strong>

                <em>
                  {scenario.status}
                </em>
              </div>
            </div>
          </div>

          <div className="ohi-risk-box">
            <h3>
              Score Interpretation
            </h3>

            <div className="ohi-scale-list">
              {riskLevels.map(
                (level) => (
                  <div
                    key={level.label}
                    className={`ohi-scale-row ${
                      health >= level.min &&
                      health <= level.max
                        ? "active"
                        : ""
                    }`}
                  >
                    <span className="range">
                      {level.min}–{level.max}%
                    </span>

                    <div>
                      <strong>
                        {level.label}
                      </strong>

                      <p>
                        {level.note}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="habitat-panel">
            <h3 className="habitat-title">
              🪸 Deep-Sea Habitat Condition
            </h3>

            {HABITAT_CONDITIONS.map(
              (condition) => {
                const isCurrent =
                  health >= condition.min &&
                  health <= condition.max;

                return (
                  <div
                    key={condition.name}
                    className={`habitat-row ${
                      isCurrent
                        ? "habitat-current"
                        : ""
                    }`}
                  >
                    <span>
                      {isCurrent
                        ? "🔵"
                        : "⚪"}
                    </span>

                    <div>
                      <strong>
                        {condition.name}
                      </strong>

                      <p>
                        {condition.description}
                      </p>
                    </div>
                  </div>
                );
              },
            )}
          </div>

          <div className="scenario-info">
            <h2>
              Future Deep-Sea Scenario
            </h2>

            <InfoRow
              icon="🪸"
              title="Habitat"
              value={scenario.habitat}
            />

            <InfoRow
              icon="🦐"
              title="Benthic Biodiversity"
              value={scenario.biodiversity}
            />

            <InfoRow
              icon="🧴"
              title="Marine Litter"
              value={scenario.litter}
            />

            <InfoRow
              icon="🕸"
              title="Fishing Pressure"
              value={scenario.fishing}
            />

            <InfoRow
              icon="🌡"
              title="Ocean Warming"
              value={
                temperature < 35
                  ? "Low warming pressure."
                  : temperature < 65
                    ? "Warming is stressing sensitive deep-sea organisms."
                    : "Marine heatwave and mortality risk is high."
              }
            />

            <InfoRow
              icon="🫧"
              title="Ocean Acidification"
              value={
                acidification < 35
                  ? "Low chemical stress on coral skeletons."
                  : acidification < 65
                    ? "Coral calcification and growth are becoming harder."
                    : "Severe acidification threatens long-term coral survival."
              }
            />

            <InfoRow
              icon="🌍"
              title="Outlook"
              value={scenario.outlook}
            />
          </div>
        </div>

        <p className="scientific-note">
          This is a conceptual educational model. The score combines
          four pressures equally and is not an official Ocean Health
          Index calculation or a prediction from a scientific dataset.
          Organism vertical positions are illustrative ecological zones,
          not fixed species-specific depth or height measurements.
        </p>
      </section>

      <section className="habitats-overview glass">
        <h2>
          Deep-Sea Life Shown in the Simulator
        </h2>

        <p className="habitats-intro">
          The display focuses on habitat-forming deep-sea corals
          together with representative benthic and water-column animals.
          Vertical placement uses illustrative ecological zones rather
          than fixed species-specific metre ranges.
        </p>

        <div className="habitat-types-grid">
          {ECOSYSTEM_COMPONENTS.map(
            (component) => (
              <article
                className="habitat-type-card"
                key={component.name}
              >
                <span className="habitat-type-icon">
                  {component.icon}
                </span>

                <div>
                  <h3>
                    {component.name}
                  </h3>

                  <p>
                    {component.description}
                  </p>
                </div>
              </article>
            ),
          )}
        </div>
      </section>

      {activeTips.length > 0 && (
        <section className="tips-panel glass">
          <h2>
            💡 What Can Help
          </h2>

          <div className="tips-grid">
            {activeTips.map(
              (tip) => (
                <div
                  key={tip}
                  className="tip-card"
                >
                  {tip}
                </div>
              ),
            )}
          </div>
        </section>
      )}

      <section className="ocean-visual glass">
        <h2>
          Major Deep-Sea Ecosystem Impacts
        </h2>

        <div className="impact-grid">
          {marineLitter > 35 && (
            <div className="impact-card danger">
              <h3>
                Marine Litter and Entanglement
              </h3>

              <p>
                Plastic, microplastics and abandoned fishing gear can
                accumulate at depth, entangle corals and damage benthic habitats.
              </p>
            </div>
          )}

          {temperature > 35 && (
            <div className="impact-card warning">
              <h3>
                Ocean Warming and Marine Heatwaves
              </h3>

              <p>
                Prolonged warming can disrupt vulnerable coral, benthic fish
                and invertebrate communities.
              </p>
            </div>
          )}

          {acidification > 35 && (
            <div className="impact-card warning">
              <h3>
                Ocean Acidification
              </h3>

              <p>
                Increasing acidity can make it harder for calcifying
                deep-sea organisms to build and maintain skeletons.
              </p>
            </div>
          )}

          {bottomTrawling > 35 && (
            <div className="impact-card danger">
              <h3>
                Bottom-Trawling Damage
              </h3>

              <p>
                Heavy fishing gear can remove fragile benthic organisms,
                resuspend sediment and modify seafloor habitats.
              </p>
            </div>
          )}

          {health < 35 && (
            <div className="impact-card critical">
              <h3>
                Critical Ecosystem State
              </h3>

              <p>
                Habitat-forming species and benthic food webs face
                severe decline, while recovery may require decades or centuries.
              </p>
            </div>
          )}

          {health >= 70 && (
            <div className="impact-card healthy-card">
              <h3>
                Protected Deep-Sea Future 🌱
              </h3>

              <p>
                Lower emissions, responsible waste management and
                protection from destructive fishing can preserve deep-sea biodiversity.
              </p>
            </div>
          )}
        </div>

        <p className="bottom-text">
          Deep-sea habitats may be far from sight, but they are
          connected to climate, biodiversity and human wellbeing.
        </p>
      </section>
    </main>
  );
}

type SliderProps = {
  icon: string;
  title: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  isYear?: boolean;
};

function Slider({
  icon,
  title,
  description,
  value,
  onChange,
  min = 0,
  max = 100,
  isYear = false,
}: SliderProps) {
  const level =
    isYear
      ? ""
      : value > 70
        ? "High"
        : value > 35
          ? "Medium"
          : "Low";

  return (
    <div className="slider-row">
      <div className="slider-icon">
        {icon}
      </div>

      <div className="slider-main">
        <div className="slider-head">
          <div>
            <h3>
              {title}
            </h3>

            <p>
              {description}
            </p>
          </div>

          <div className="slider-value">
            <strong>
              {isYear
                ? value
                : `${value}%`}
            </strong>

            {!isYear && (
              <span>
                {level}
              </span>
            )}
          </div>
        </div>

        <input
          type="range"
          min={min}
          max={max}
          value={value}
          aria-label={title}
          onChange={(event) =>
            onChange(
              Number(
                event.target.value,
              ),
            )
          }
        />
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: string;
}) {
  return (
    <div className="info-row">
      <span>
        {icon}
      </span>

      <div>
        <h4>
          {title}
        </h4>

        <p>
          {value}
        </p>
      </div>
    </div>
  );
}

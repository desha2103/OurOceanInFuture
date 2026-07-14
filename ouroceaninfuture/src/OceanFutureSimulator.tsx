import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./OceanFutureSimulator.css";

import deadFishSrc from "./assets/dead-fish.png";
import fish1Src from "./assets/fish1.png";
import fish2Src from "./assets/fish2.png";
import netSrc from "./assets/fishing-net.png";
import plasticSrc from "./assets/plastic-bottle1.png";
import sharkSrc from "./assets/shark.png";

import lopheliaSrc from "./assets/lophelia-reef.png";
import coralGardenSrc from "./assets/coral-garden.png";
import seepFieldSrc from "./assets/seep-field.png";
import spongeGroundSrc from "./assets/sponge-ground.png";

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

type PreparedHabitat = {
  canvas: HTMLCanvasElement;
  aspectRatio: number;
};

/**
 * Loads a habitat PNG, removes any baked-in white/grey checkerboard that is
 * connected to the image border, crops the empty space and returns a canvas
 * with a genuine transparent background.
 *
 * This also works when the source PNG already has real transparency.
 */
async function prepareHabitatAsset(
  src: string,
  maxDimension = 900,
): Promise<PreparedHabitat> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const loadedImage = new Image();
    loadedImage.onload = () => resolve(loadedImage);
    loadedImage.onerror = () =>
      reject(new Error(`Could not load habitat image: ${src}`));
    loadedImage.src = src;
  });

  const scale = Math.min(
    1,
    maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const workCanvas = document.createElement("canvas");
  workCanvas.width = width;
  workCanvas.height = height;

  const workContext = workCanvas.getContext("2d", {
    willReadFrequently: true,
  });
  if (!workContext) {
    return { canvas: workCanvas, aspectRatio: width / height };
  }

  workContext.drawImage(image, 0, 0, width, height);
  const imageData = workContext.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const pixelCount = width * height;

  // Find the most common bright neutral colours on the outside border.
  // Those are normally the two colours of a baked checkerboard.
  const borderColours = new Map<string, number>();
  const sampleBorderPixel = (x: number, y: number) => {
    const offset = (y * width + x) * 4;
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    const alpha = pixels[offset + 3];

    if (alpha < 32) return;

    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const brightness = (red + green + blue) / 3;

    if (brightness > 205 && maximum - minimum < 24) {
      const key = `${Math.round(red / 8) * 8},${Math.round(green / 8) * 8},${
        Math.round(blue / 8) * 8
      }`;
      borderColours.set(key, (borderColours.get(key) ?? 0) + 1);
    }
  };

  for (let x = 0; x < width; x += 1) {
    sampleBorderPixel(x, 0);
    sampleBorderPixel(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    sampleBorderPixel(0, y);
    sampleBorderPixel(width - 1, y);
  }

  const checkerPalette = [...borderColours.entries()]
    .sort((first, second) => second[1] - first[1])
    .slice(0, 4)
    .map(([key]) => key.split(",").map(Number));

  const isBackgroundCandidate = (pixelIndex: number) => {
    const offset = pixelIndex * 4;
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    const alpha = pixels[offset + 3];

    if (alpha < 32) return true;
    if (checkerPalette.length === 0) return false;

    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    if (maximum - minimum > 26) return false;

    return checkerPalette.some(([paletteRed, paletteGreen, paletteBlue]) => {
      const distance =
        Math.abs(red - paletteRed) +
        Math.abs(green - paletteGreen) +
        Math.abs(blue - paletteBlue);
      return distance < 31;
    });
  };

  // Flood-fill only from the outside. This removes the surrounding
  // checkerboard but keeps pale corals and sponges inside the subject.
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let queueStart = 0;
  let queueEnd = 0;

  const enqueue = (pixelIndex: number) => {
    if (
      pixelIndex < 0 ||
      pixelIndex >= pixelCount ||
      visited[pixelIndex] === 1 ||
      !isBackgroundCandidate(pixelIndex)
    ) {
      return;
    }

    visited[pixelIndex] = 1;
    queue[queueEnd] = pixelIndex;
    queueEnd += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (queueStart < queueEnd) {
    const current = queue[queueStart];
    queueStart += 1;

    const x = current % width;
    const y = Math.floor(current / width);

    if (x > 0) enqueue(current - 1);
    if (x < width - 1) enqueue(current + 1);
    if (y > 0) enqueue(current - width);
    if (y < height - 1) enqueue(current + width);
  }

  for (let index = 0; index < pixelCount; index += 1) {
    if (visited[index] === 1) {
      pixels[index * 4 + 3] = 0;
    }
  }

  workContext.putImageData(imageData, 0, 0);

  // Crop the now-transparent border so each habitat can sit naturally
  // on the shared seabed instead of looking like a rectangular poster.
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] > 10) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { canvas: workCanvas, aspectRatio: width / height };
  }

  const padding = 8;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);

  const croppedWidth = maxX - minX + 1;
  const croppedHeight = maxY - minY + 1;
  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = croppedWidth;
  croppedCanvas.height = croppedHeight;

  const croppedContext = croppedCanvas.getContext("2d");
  croppedContext?.drawImage(
    workCanvas,
    minX,
    minY,
    croppedWidth,
    croppedHeight,
    0,
    0,
    croppedWidth,
    croppedHeight,
  );

  return {
    canvas: croppedCanvas,
    aspectRatio: croppedWidth / croppedHeight,
  };
}

type Fish = {
  id: number;
  x: number;
  y: number;
  speed: number;
  size: number;
  direction: 1 | -1;
  wobble: number;
  type: 0 | 1;
  flee: number;
  depth: number;
};

type Bubble = {
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
    bubbles: [] as Bubble[],
    litter: [] as MarineLitter[],
    sediment: [] as Sediment[],
    trawl: { x: -360, active: false, speed: 3, cooldown: 0 },
    shark: { x: -220, y: 260, direction: 1 as 1 | -1, wobble: 0 },
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
    habitats: {} as Record<string, PreparedHabitat>,
    habitatsReady: false,
    habitatLoadError: false,
  });

  useEffect(() => {
    const s = state.current;

    s.images = {
      fish1: loadImg(fish1Src),
      fish2: loadImg(fish2Src),
      deadFish: loadImg(deadFishSrc),
      plastic: loadImg(plasticSrc),
      net: loadImg(netSrc),
      shark: loadImg(sharkSrc),
      lophelia: loadImg(lopheliaSrc),
      coralGarden: loadImg(coralGardenSrc),
      seepField: loadImg(seepFieldSrc),
      spongeGround: loadImg(spongeGroundSrc),
    };

    s.fish = Array.from({ length: 26 }, (_, index) => ({
      id: index,
      x: rand(-300, 1650),
      y: rand(80, 500),
      speed: rand(0.55, 1.8),
      size: randInt(34, 66),
      direction: index % 2 === 0 ? 1 : -1,
      wobble: rand(0, Math.PI * 2),
      type: (index % 2 === 0 ? 0 : 1) as 0 | 1,
      flee: 0,
      depth: rand(0.55, 1),
    }));

    s.bubbles = Array.from({ length: 65 }, (_, index) => ({
      id: index,
      x: rand(0, 1600),
      y: rand(30, 610),
      size: rand(2, 9),
      speed: rand(0.25, 0.8),
      wobble: rand(0, Math.PI * 2),
      alpha: rand(0.2, 0.58),
    }));

    s.litter = Array.from({ length: 90 }, (_, index) => ({
      id: index,
      x: rand(0, 1600),
      y: rand(70, 560),
      vx: rand(-0.22, 0.22),
      vy: rand(-0.08, 0.12),
      rotation: rand(0, 360),
      scale: rand(0.32, 0.85),
      wobble: rand(0, Math.PI * 2),
    }));

  }, []);

  useEffect(() => {
    let cancelled = false;

    const habitatSources: Record<string, string> = {
      lophelia: lopheliaSrc,
      coralGarden: coralGardenSrc,
      seepField: seepFieldSrc,
      spongeGround: spongeGroundSrc,
    };

    async function loadHabitats() {
      const results = await Promise.all(
        Object.entries(habitatSources).map(async ([key, source]) => {
          try {
            const prepared = await prepareHabitatAsset(source);
            return [key, prepared] as const;
          } catch (error) {
            console.error(`Failed to prepare habitat image "${key}".`, error);
            return null;
          }
        }),
      );

      if (cancelled) return;

      const loadedHabitats: Record<string, PreparedHabitat> = {};
      results.forEach((result) => {
        if (result) {
          loadedHabitats[result[0]] = result[1];
        }
      });

      state.current.habitats = loadedHabitats;
      state.current.habitatsReady = Object.keys(loadedHabitats).length > 0;
      state.current.habitatLoadError =
        Object.keys(loadedHabitats).length === 0;
    }

    void loadHabitats();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const s = state.current;
    s.health = health;
    s.marineLitter = marineLitter;
    s.temperature = temperature;
    s.acidification = acidification;
    s.bottomTrawling = bottomTrawling;
  }, [health, marineLitter, temperature, acidification, bottomTrawling]);

  const onMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;

    state.current.mouseX = (event.clientX - rect.left) * scaleX;
    state.current.mouseY = (event.clientY - rect.top) * scaleY;
  }, []);

  const onMouseLeave = useCallback(() => {
    state.current.mouseX = -999;
    state.current.mouseY = -999;
  }, []);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    function lerpColor(from: number[], to: number[], amount: number) {
      return from.map((value, index) =>
        Math.round(value + (to[index] - value) * amount),
      );
    }

    function colorToRgb(color: number[]) {
      return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    }

    function drawDeepSeaFloor(ctx: CanvasRenderingContext2D, width: number, height: number) {
      const floorGradient = ctx.createLinearGradient(0, height - 70, 0, height);
      floorGradient.addColorStop(0, "#211a13");
      floorGradient.addColorStop(1, "#080807");
      ctx.fillStyle = floorGradient;

      ctx.beginPath();
      ctx.moveTo(0, height - 48);
      for (let x = 0; x <= width; x += 35) {
        const y = height - 45 + Math.sin(x * 0.018) * 6 + Math.sin(x * 0.006) * 8;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
    }

    function drawHabitatCluster(
      ctx: CanvasRenderingContext2D,
      habitat: PreparedHabitat,
      centerX: number,
      baseY: number,
      targetWidth: number,
      targetHeight: number,
      damage: number,
      glowColour: string,
    ) {
      const scale = Math.min(
        targetWidth / habitat.canvas.width,
        targetHeight / habitat.canvas.height,
      );

      const drawWidth = habitat.canvas.width * scale;
      const drawHeight = habitat.canvas.height * scale;
      const drawX = centerX - drawWidth / 2;
      const drawY = baseY - drawHeight;

      // A soft shadow makes the habitat look attached to the seabed.
      ctx.save();
      const shadowGradient = ctx.createRadialGradient(
        centerX,
        baseY - 7,
        0,
        centerX,
        baseY - 7,
        drawWidth * 0.55,
      );
      shadowGradient.addColorStop(
        0,
        `rgba(0, 0, 0, ${0.42 + damage * 0.2})`,
      );
      shadowGradient.addColorStop(0.72, "rgba(0, 0, 0, 0.2)");
      shadowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = shadowGradient;
      ctx.beginPath();
      ctx.ellipse(
        centerX,
        baseY - 5,
        drawWidth * 0.52,
        Math.max(16, drawHeight * 0.09),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();

      // A very subtle local glow separates the habitat from the dark water
      // without making it look like a rectangular card.
      ctx.save();
      const halo = ctx.createRadialGradient(
        centerX,
        baseY - drawHeight * 0.42,
        10,
        centerX,
        baseY - drawHeight * 0.42,
        drawWidth * 0.62,
      );
      halo.addColorStop(0, glowColour);
      halo.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.globalAlpha = Math.max(0.08, 0.22 - damage * 0.12);
      ctx.fillStyle = halo;
      ctx.fillRect(
        drawX - 30,
        drawY - 25,
        drawWidth + 60,
        drawHeight + 50,
      );
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = Math.max(0.28, 1 - damage * 0.62);
      ctx.filter = [
        `grayscale(${Math.round(damage * 52)}%)`,
        `brightness(${Math.round(88 - damage * 28)}%)`,
        `contrast(${Math.round(104 - damage * 8)}%)`,
        `saturate(${Math.round(86 - damage * 40)}%)`,
        "drop-shadow(0 10px 14px rgba(0,0,0,0.48))",
      ].join(" ");

      ctx.drawImage(
        habitat.canvas,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
      );
      ctx.restore();

      // Blend the lower edge into the same sediment used by the rest
      // of the simulator so the habitat appears to grow from the floor.
      const sedimentGradient = ctx.createLinearGradient(
        0,
        baseY - 28,
        0,
        baseY + 12,
      );
      sedimentGradient.addColorStop(0, "rgba(31, 25, 18, 0)");
      sedimentGradient.addColorStop(
        0.58,
        `rgba(31, 25, 18, ${0.26 + damage * 0.12})`,
      );
      sedimentGradient.addColorStop(1, "rgba(12, 10, 8, 0.78)");

      ctx.save();
      ctx.fillStyle = sedimentGradient;
      ctx.beginPath();
      ctx.ellipse(
        centerX,
        baseY,
        drawWidth * 0.53,
        Math.max(18, drawHeight * 0.11),
        0,
        Math.PI,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();
    }

    function drawNaturalSeabedDetails(
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      damage: number,
    ) {
      const baseY = height - 36;

      for (let index = 0; index < 42; index += 1) {
        const x = ((index * 97 + 35) % width) + Math.sin(index * 2.7) * 13;
        const size = 3 + (index % 7);
        const y = baseY + Math.sin(index * 1.9) * 8;

        ctx.beginPath();
        ctx.ellipse(
          x,
          y,
          size * 1.35,
          size * 0.62,
          Math.sin(index) * 0.6,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle =
          index % 3 === 0
            ? `rgba(90, 77, 61, ${0.34 + damage * 0.12})`
            : `rgba(57, 49, 39, ${0.38 + damage * 0.12})`;
        ctx.fill();
      }
    }

    function drawHabitatLabel(
      ctx: CanvasRenderingContext2D,
      label: string,
      x: number,
      y: number,
    ) {
      ctx.save();
      ctx.font = "bold 11px Arial";
      const metrics = ctx.measureText(label);
      const paddingX = 9;
      const boxWidth = metrics.width + paddingX * 2;
      ctx.fillStyle = "rgba(0, 10, 22, 0.72)";
      ctx.strokeStyle = "rgba(92, 224, 235, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y - 17, boxWidth, 23, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(218, 251, 255, 0.9)";
      ctx.fillText(label, x + paddingX, y);
      ctx.restore();
    }

    function drawSeepField(
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      tick: number,
      healthValue: number,
    ) {
      const seepX = width * 0.63;
      const baseY = height - 45;
      const glow = ctx.createRadialGradient(seepX, baseY, 5, seepX, baseY, 95);
      glow.addColorStop(0, `rgba(75, 214, 195, ${0.18 + healthValue / 700})`);
      glow.addColorStop(1, "rgba(75, 214, 195, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(seepX - 105, baseY - 105, 210, 115);

      for (let index = 0; index < 14; index += 1) {
        const phase = (tick * 0.55 + index * 43) % 190;
        const x = seepX + Math.sin(index * 2.2) * 55 + Math.sin(tick * 0.01 + index) * 4;
        const y = baseY - phase;
        const size = 2.2 + (index % 4);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(145, 255, 235, 0.48)";
        ctx.stroke();
      }
    }

    function drawFrame() {
      const s = state.current;
      s.tick += 1;

      const tick = s.tick;
      const width = canvas.width;
      const height = canvas.height;
      const h = s.health;
      const healthyTop = [9, 54, 100];
      const healthyBottom = [2, 13, 32];
      const stressedTop = [72, 48, 40];
      const stressedBottom = [14, 10, 12];
      const temperatureTint = Math.max(0, (s.temperature - 35) / 100);
      const acidTint = Math.max(0, (s.acidification - 35) / 100);

      const topColor = lerpColor(healthyTop, stressedTop, temperatureTint);
      const bottomColor = lerpColor(healthyBottom, stressedBottom, Math.max(temperatureTint, acidTint * 0.8));

      const waterGradient = context.createLinearGradient(0, 0, 0, height);
      waterGradient.addColorStop(0, colorToRgb(topColor));
      waterGradient.addColorStop(0.52, colorToRgb(lerpColor(topColor, bottomColor, 0.68)));
      waterGradient.addColorStop(1, colorToRgb(bottomColor));
      context.fillStyle = waterGradient;
      context.fillRect(0, 0, width, height);

      // Deep-sea light shafts: subtle and weaker than a shallow-water scene.
      if (h > 22) {
        for (let index = 0; index < 5; index += 1) {
          const rayX = width * 0.1 + index * width * 0.19 + Math.sin(tick * 0.008 + index) * 20;
          const rayGradient = context.createLinearGradient(rayX, 0, rayX, height * 0.72);
          const alpha = (h / 100) * 0.045;
          rayGradient.addColorStop(0, `rgba(160, 220, 255, ${alpha * 1.8})`);
          rayGradient.addColorStop(1, "rgba(160, 220, 255, 0)");
          context.fillStyle = rayGradient;
          context.beginPath();
          context.moveTo(rayX - 18, 0);
          context.lineTo(rayX + 18, 0);
          context.lineTo(rayX + 115, height * 0.78);
          context.lineTo(rayX - 115, height * 0.78);
          context.closePath();
          context.fill();
        }
      }

      // Marine snow and bubbles.
      const visibleBubbles = Math.max(15, Math.floor(s.bubbles.length * (0.45 + h / 200)));
      s.bubbles.slice(0, visibleBubbles).forEach((bubble) => {
        bubble.y -= bubble.speed;
        bubble.wobble += 0.025;
        bubble.x += Math.sin(bubble.wobble) * 0.32;

        if (bubble.y < -15) {
          bubble.y = rand(height * 0.45, height - 30);
          bubble.x = rand(0, width);
        }

        context.beginPath();
        context.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
        context.strokeStyle = `rgba(185, 230, 255, ${bubble.alpha})`;
        context.lineWidth = 1;
        context.stroke();
      });

      // Marine litter: plastic plus lost fishing lines.
      const visibleLitter = Math.floor(s.litter.length * (s.marineLitter / 100));
      const plasticImage = s.images.plastic;

      if (plasticImage?.complete) {
        s.litter.slice(0, visibleLitter).forEach((item) => {
          item.wobble += 0.016;
          item.x = (item.x + item.vx + width) % width;
          item.y = Math.max(35, Math.min(height - 55, item.y + item.vy + Math.sin(item.wobble) * 0.22));
          item.rotation += 0.18;

          context.save();
          context.translate(item.x, item.y);
          context.rotate((item.rotation * Math.PI) / 180);
          context.globalAlpha = 0.68;
          const litterWidth = 50 * item.scale;
          const litterHeight = 29 * item.scale;
          context.drawImage(plasticImage, -litterWidth / 2, -litterHeight / 2, litterWidth, litterHeight);
          context.restore();
        });
      }

      const lineCount = Math.floor(s.marineLitter / 16);
      for (let index = 0; index < lineCount; index += 1) {
        const x = width * (0.12 + index * 0.14);
        const y = height - 120 - (index % 3) * 50;
        context.beginPath();
        context.moveTo(x - 45, y - 40);
        context.bezierCurveTo(
          x + Math.sin(tick * 0.01 + index) * 35,
          y - 15,
          x - 25,
          y + 25,
          x + 35,
          y + 45,
        );
        context.strokeStyle = "rgba(215, 225, 210, 0.5)";
        context.lineWidth = 1.6;
        context.stroke();
      }

      drawDeepSeaFloor(context, width, height);

      // Repeated trawling leaves visible tracks and can flatten parts of the seabed.
      const scarCount = Math.floor(s.bottomTrawling / 18);
      for (let index = 0; index < scarCount; index += 1) {
        const scarY = height - 34 - (index % 3) * 7;
        context.beginPath();
        context.moveTo(index * 165 - 40, scarY);
        context.lineTo(index * 165 + 115, scarY + Math.sin(index) * 3);
        context.strokeStyle = `rgba(94, 76, 58, ${0.22 + s.bottomTrawling / 520})`;
        context.lineWidth = 3;
        context.stroke();
      }

      const warmingDamage = Math.max(0, (s.temperature - 30) / 70);
      const acidificationDamage = Math.max(0, (s.acidification - 25) / 75);
      const ecosystemDamage = Math.max(0, (65 - h) / 65);
      const trawlingDamage = s.bottomTrawling / 100;

      drawNaturalSeabedDetails(
        context,
        width,
        height,
        ecosystemDamage,
      );

      // The habitats share one continuous seabed. Their widths, heights and
      // vertical positions are intentionally different so they look like
      // natural clusters instead of four equal image cards.
      const habitatZones = [
        {
          key: "lophelia",
          label: "Lophelia pertusa reef",
          centerX: width * 0.13,
          baseY: height - 27,
          targetWidth: width * 0.27,
          targetHeight: 255,
          sensitivity: 1,
          glow: "rgba(120, 198, 218, 0.32)",
        },
        {
          key: "coralGarden",
          label: "Coral garden",
          centerX: width * 0.375,
          baseY: height - 31,
          targetWidth: width * 0.245,
          targetHeight: 238,
          sensitivity: 0.92,
          glow: "rgba(201, 117, 184, 0.28)",
        },
        {
          key: "seepField",
          label: "Seep field",
          centerX: width * 0.625,
          baseY: height - 24,
          targetWidth: width * 0.26,
          targetHeight: 218,
          sensitivity: 0.62,
          glow: "rgba(78, 218, 194, 0.3)",
        },
        {
          key: "spongeGround",
          label: "Sponge ground",
          centerX: width * 0.87,
          baseY: height - 30,
          targetWidth: width * 0.235,
          targetHeight: 205,
          sensitivity: 0.82,
          glow: "rgba(213, 176, 104, 0.28)",
        },
      ];

      if (s.habitatsReady) {
        habitatZones.forEach((zone) => {
          const habitat = s.habitats[zone.key];
          if (!habitat) return;

          const damage = Math.min(
            0.94,
            ecosystemDamage * 0.52 +
              warmingDamage * 0.22 * zone.sensitivity +
              acidificationDamage * 0.3 * zone.sensitivity +
              trawlingDamage * 0.42,
          );

          drawHabitatCluster(
            context,
            habitat,
            zone.centerX,
            zone.baseY,
            zone.targetWidth,
            zone.targetHeight,
            damage,
            zone.glow,
          );

          const scale = Math.min(
            zone.targetWidth / habitat.canvas.width,
            zone.targetHeight / habitat.canvas.height,
          );
          const actualWidth = habitat.canvas.width * scale;
          const actualHeight = habitat.canvas.height * scale;

          drawHabitatLabel(
            context,
            zone.label,
            Math.max(12, zone.centerX - actualWidth * 0.46),
            Math.max(30, zone.baseY - actualHeight - 10),
          );
        });
      } else {
        context.save();
        context.textAlign = "center";
        context.font = "600 15px Arial";
        context.fillStyle = s.habitatLoadError
          ? "rgba(255, 130, 110, 0.92)"
          : "rgba(160, 225, 235, 0.78)";
        context.fillText(
          s.habitatLoadError
            ? "Habitat images could not be loaded. Check src/assets filenames."
            : "Loading deep-sea habitats…",
          width / 2,
          height - 105,
        );
        context.restore();
      }

      // The seep field has its own rising-fluid and bubble activity.
      drawSeepField(context, width, height, tick, h);

      // Lost fishing line becomes entangled mainly around coral habitats.
      const entanglementCount = Math.min(7, Math.floor(s.marineLitter / 14));
      const coralHabitatCenters = [width * 0.125, width * 0.375];

      for (let index = 0; index < entanglementCount; index += 1) {
        const centerX = coralHabitatCenters[index % coralHabitatCenters.length];
        const x = centerX + ((index % 3) - 1) * 70;
        const lineY = height - 130 - (index % 2) * 34;

        context.beginPath();
        context.moveTo(x - 50, lineY - 30);
        context.bezierCurveTo(
          x + Math.sin(tick * 0.01 + index) * 28,
          lineY - 10,
          x - 28,
          lineY + 28,
          x + 52,
          lineY + 48,
        );
        context.strokeStyle = "rgba(225, 231, 218, 0.7)";
        context.lineWidth = 1.8;
        context.stroke();
      }

      // Bottom-trawling event: gear moves across the seafloor and creates sediment.
      const trawl = s.trawl;
      trawl.cooldown = Math.max(0, trawl.cooldown - 1);

      if (s.bottomTrawling > 25 && !trawl.active && trawl.cooldown === 0) {
        trawl.active = true;
        trawl.x = -320;
        trawl.speed = 2.4 + s.bottomTrawling / 28;
      }

      if (trawl.active) {
        trawl.x += trawl.speed;
        const netImage = s.images.net;

        if (netImage?.complete) {
          context.save();
          context.globalAlpha = 0.82;
          context.drawImage(netImage, trawl.x, height - 205, 250, 175);
          context.restore();
        }

        context.beginPath();
        context.moveTo(trawl.x + 118, height - 190);
        context.lineTo(trawl.x + 55, 0);
        context.strokeStyle = "rgba(210, 175, 100, 0.72)";
        context.lineWidth = 3;
        context.stroke();

        if (tick % 2 === 0) {
          for (let index = 0; index < 5; index += 1) {
            s.sediment.push({
              x: trawl.x + rand(20, 235),
              y: height - rand(35, 65),
              vx: rand(-1.5, 1.1),
              vy: rand(-2.5, -0.3),
              life: randInt(70, 140),
              size: rand(5, 18),
            });
          }
        }


        s.fish.forEach((fish) => {
          if (Math.abs(fish.x - trawl.x) < 240 && fish.y > height - 260) {
            fish.flee = 90;
            fish.direction = fish.x > trawl.x ? 1 : -1;
          }
        });

        if (trawl.x > width + 360) {
          trawl.active = false;
          trawl.cooldown = Math.max(55, 250 - Math.floor(s.bottomTrawling * 1.7));
        }
      }

      s.sediment = s.sediment.filter((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.02;
        particle.life -= 1;

        if (particle.life <= 0) return false;

        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fillStyle = `rgba(165, 135, 92, ${Math.min(0.42, particle.life / 210)})`;
        context.fill();
        return true;
      });

      // Fish population declines with habitat condition and marine heatwave pressure.
      const heatwavePenalty = Math.max(0, (s.temperature - 55) * 0.72);
      const fishSupport = Math.max(0, h - heatwavePenalty);
      const visibleFish = Math.max(2, Math.floor(s.fish.length * (fishSupport / 100)));
      s.fish.slice(0, visibleFish).forEach((fish) => {
        fish.wobble += 0.026;

        const dx = fish.x - s.mouseX;
        const dy = fish.y - s.mouseY;
        if (Math.hypot(dx, dy) < 125) {
          fish.flee = 55;
          fish.direction = dx > 0 ? 1 : -1;
        }

        if (fish.flee > 0) fish.flee -= 1;
        const speed = fish.flee > 0 ? Math.min(5.2, fish.speed * 3.1) : fish.speed;

        fish.x += fish.direction * speed;
        fish.y += Math.sin(fish.wobble) * 0.38;
        fish.y = Math.max(60, Math.min(height - 75, fish.y));

        if (fish.x > width + 180) {
          fish.x = -70;
          fish.y = rand(70, height - 90);
        }
        if (fish.x < -180) {
          fish.x = width + 70;
          fish.y = rand(70, height - 90);
        }

        const useDeadFish = h < 32 || s.temperature > 74;
        const image = useDeadFish
          ? s.images.deadFish
          : fish.type === 0
            ? s.images.fish1
            : s.images.fish2;

        if (!image?.complete) return;

        context.save();
        context.translate(fish.x, fish.y);
        context.globalAlpha = fish.depth * (h < 30 ? 0.5 : 1);

        if (useDeadFish) {
          context.rotate(Math.PI);
        } else {
          const shouldFlip =
            (fish.type === 0 && fish.direction === -1) ||
            (fish.type === 1 && fish.direction === 1);
          if (shouldFlip) context.scale(-1, 1);
        }

        context.rotate(Math.sin(fish.wobble * 2) * 0.06);
        context.drawImage(image, -fish.size / 2, -fish.size / 4, fish.size, fish.size / 2);
        context.restore();
      });


      // A deep-sea shark remains only while the ecosystem can support predators.
      if (h >= 28) {
        const shark = s.shark;
        shark.wobble += 0.012;
        shark.x += shark.direction * (0.75 + h / 180);
        shark.y += Math.sin(shark.wobble) * 0.25;

        if (shark.x > width + 180) {
          shark.x = -180;
          shark.direction = 1;
          shark.y = rand(170, 390);
        }

        const sharkImage = s.images.shark;
        if (sharkImage?.complete) {
          context.save();
          context.translate(shark.x, shark.y);
          context.globalAlpha = 0.55 + h / 250;
          context.scale(-1, 1);
          context.drawImage(sharkImage, -85, -34, 170, 68);
          context.restore();
        }
      }


      // Acidification haze near the seafloor.
      if (s.acidification > 35) {
        const haze = context.createLinearGradient(0, height * 0.45, 0, height);
        haze.addColorStop(0, "rgba(95, 50, 130, 0)");
        haze.addColorStop(
          1,
          `rgba(95, 50, 130, ${Math.min(0.32, (s.acidification - 35) / 220)})`,
        );
        context.fillStyle = haze;
        context.fillRect(0, height * 0.45, width, height * 0.55);
      }

      // Central ecosystem status.
      const messages: Array<[number, number, string, string]> = [
        [85, 101, "Thriving Deep-Sea Habitat", "#62e6c9"],
        [70, 85, "Stable, but Protection Is Needed", "#62bde6"],
        [55, 70, "Early Ecosystem Stress", "#e5b65e"],
        [35, 55, "Deep-Sea Habitat Under Threat", "#ee7b45"],
        [0, 35, "Critical Habitat Loss", "#f05252"],
      ];

      for (const [minimum, maximum, message, color] of messages) {
        if (h >= minimum && h < maximum) {
          const alpha = 0.55 + Math.sin(tick * 0.035) * 0.18;
          context.save();
          context.font = "bold 27px Arial";
          context.textAlign = "center";
          context.shadowColor = color;
          context.shadowBlur = 20;
          context.fillStyle = `${color}${Math.round(alpha * 255)
            .toString(16)
            .padStart(2, "0")}`;
          context.fillText(message, width / 2, height / 2 - 24);
          context.restore();
          break;
        }
      }

      // Scientific event alerts.
      const alerts: string[] = [];
      if (trawl.active) alerts.push("Bottom trawling is resuspending sediment and damaging habitat");
      if (s.temperature > 62) alerts.push("Marine heatwave risk is increasing");
      if (s.acidification > 62) alerts.push("Acidification is reducing coral calcification");
      if (s.marineLitter > 62) alerts.push("Lost gear and litter are accumulating on the seafloor");

      alerts.slice(0, 2).forEach((alert, index) => {
        context.save();
        context.font = "bold 13px Arial";
        context.textAlign = "center";
        context.fillStyle = index === 0 ? "rgba(255, 204, 92, 0.96)" : "rgba(255, 150, 92, 0.92)";
        context.fillText(`⚠ ${alert}`, width / 2, 24 + index * 22);
        context.restore();
      });

      s.rafId = requestAnimationFrame(drawFrame);
    }

    state.current.rafId = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(state.current.rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={1400}
      height={620}
      className="ocean-canvas"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    />
  );
}

const HABITAT_CONDITIONS = [
  {
    min: 85,
    max: 100,
    name: "Thriving Cold-Water Coral Habitat",
    description: "Cold-water corals, sponges and benthic animals form a diverse ecosystem.",
  },
  {
    min: 70,
    max: 84,
    name: "Stable with Early Stress",
    description: "The habitat is functioning, but warming, litter or fishing pressure is appearing.",
  },
  {
    min: 55,
    max: 69,
    name: "Habitat Disturbance",
    description: "Marine litter, acidification and sediment begin reducing ecosystem health.",
  },
  {
    min: 35,
    max: 54,
    name: "Severe Damage",
    description: "Coral and sponge grounds are damaged and benthic biodiversity is declining.",
  },
  {
    min: 0,
    max: 34,
    name: "Ecosystem Collapse Risk",
    description: "Large areas of habitat are lost and recovery may take decades or centuries.",
  },
];

const MARINE_LIFE_STATUS = [
  { name: "Cold-Water Coral 🪸", threshold: 65 },
  { name: "Deep-Sea Sponge 🧽", threshold: 58 },
  { name: "Benthic Fish 🐟", threshold: 48 },
  { name: "Deep-Sea Crustaceans 🦐", threshold: 40 },
  { name: "Deep-Sea Octopus 🐙", threshold: 45 },
  { name: "Deep-Sea Shark 🦈", threshold: 30 },
  { name: "Brittle Star ⭐", threshold: 38 },
  { name: "Sea Anemone 🌸", threshold: 42 },
];

const HABITAT_TYPES = [
  {
    icon: "🪸",
    name: "Lophelia pertusa Reef",
    description: "A reef built by cold-water corals that provides shelter and feeding areas for many species.",
  },
  {
    icon: "🌿",
    name: "Coral Garden",
    description: "Dense groups of corals growing on the deep seafloor and creating three-dimensional habitat.",
  },
  {
    icon: "🧽",
    name: "Sponge Ground",
    description: "Large sponge communities that filter water and support small animals, fish and microbes.",
  },
  {
    icon: "🫧",
    name: "Seep Field",
    description: "A deep-sea habitat where chemicals rise from the seabed and support specialised communities.",
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
    "🌍 Protect blue-carbon ecosystems",
  ],
  acidification: [
    "🏭 Reduce carbon emissions",
    "🔬 Support long-term ocean monitoring",
    "🌱 Protect habitats that store carbon",
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
  const [marineLitter, setMarineLitter] = useState(15);
  const [temperature, setTemperature] = useState(10);
  const [acidification, setAcidification] = useState(10);
  const [bottomTrawling, setBottomTrawling] = useState(12);
  const [year, setYear] = useState(2024);
  const [toast, setToast] = useState("");

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
    [marineLitter, temperature, acidification, bottomTrawling],
  );

  useEffect(() => {
    if (health > 90) {
      setToast("🏆 The deep-sea habitat is in a thriving state!");
      const timer = window.setTimeout(() => setToast(""), 4500);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [health]);

  const scenario: Scenario = useMemo(() => {
    if (health >= 85) {
      return {
        status: "Healthy",
        habitat: "Cold-water coral, sponge grounds and seep communities are stable.",
        biodiversity: "Diverse benthic life and healthy predator populations.",
        litter: "Minimal accumulation and little entanglement risk.",
        fishing: "Low disturbance to the seafloor.",
        outlook: "The deep-sea ecosystem is healthy and resilient.",
        moodClass: "healthy",
      };
    }

    if (health >= 70) {
      return {
        status: "Mostly Stable",
        habitat: "The habitat remains functional, but early stress is visible.",
        biodiversity: "Most species remain present, with some decline.",
        litter: "Discarded material is becoming visible.",
        fishing: "Occasional seafloor disturbance is occurring.",
        outlook: "Protection now can prevent long-term damage.",
        moodClass: "warning",
      };
    }

    if (health >= 55) {
      return {
        status: "Warning Signs",
        habitat: "Coral and sponge grounds are increasingly stressed.",
        biodiversity: "Sensitive species are declining.",
        litter: "Lost gear and waste are affecting benthic organisms.",
        fishing: "Sediment resuspension is reducing habitat quality.",
        outlook: "The ecosystem is losing resilience.",
        moodClass: "warning-low",
      };
    }

    if (health >= 35) {
      return {
        status: "At Risk",
        habitat: "Coral and sponge habitats are damaged and fragmented.",
        biodiversity: "Major decline in benthic species and fish.",
        litter: "Entanglement and seafloor accumulation are widespread.",
        fishing: "Repeated trawling is altering the seafloor.",
        outlook: "Recovery will be slow without strong protection.",
        moodClass: "warning-low",
      };
    }

    return {
      status: "Critical",
      habitat: "Large areas of deep-sea habitat have been lost.",
      biodiversity: "Food webs and benthic communities face collapse.",
      litter: "Severe accumulation of waste and abandoned fishing gear.",
      fishing: "Intense bottom trawling continues to damage the seabed.",
      outlook: "Recovery may require decades or centuries.",
      moodClass: "critical",
    };
  }, [health]);

  const riskLevels = [
    { min: 85, max: 100, label: "Healthy Habitat", note: "Deep-sea systems are functioning well." },
    { min: 70, max: 84, label: "Mostly Stable", note: "Stable, but early warning signs exist." },
    { min: 55, max: 69, label: "Warning Signs", note: "Visible stress from multiple pressures." },
    { min: 35, max: 54, label: "Habitat at Risk", note: "Strong pressure and biodiversity loss." },
    { min: 0, max: 34, label: "Critical State", note: "Severe damage and collapse risk." },
  ];

  function handleYear(value: number) {
    setYear(value);
    const decades = Math.floor((value - 2024) / 10);
    setMarineLitter(Math.min(100, 15 + decades * 4));
    setTemperature(Math.min(100, 10 + decades * 5));
    setAcidification(Math.min(100, 10 + decades * 4));
    setBottomTrawling(Math.min(100, 12 + decades * 3));
  }

  function reset() {
    setMarineLitter(15);
    setTemperature(10);
    setAcidification(10);
    setBottomTrawling(12);
    setYear(2024);
  }

  const activeTips = [
    ...(marineLitter > 40 ? TIPS.marineLitter : []),
    ...(temperature > 40 ? TIPS.temperature : []),
    ...(acidification > 40 ? TIPS.acidification : []),
    ...(bottomTrawling > 40 ? TIPS.bottomTrawling : []),
  ].slice(0, 6);

  return (
    <main className={`ocean-page ${scenario.moodClass}`}>
      <div className="water-overlay" />
      <div className="bubble-layer" />

      {toast && (
        <button className="challenge-toast" onClick={() => setToast("")} type="button">
          {toast} ×
        </button>
      )}

      <section className="hero">
        <h1>Ocean in Future</h1>
        <p>Cold-Water Corals & Deep-Sea Future Simulator</p>
        <div className="wave-line">〰</div>
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
            <div className="mini-health-label">Deep-Sea Habitat Health</div>
            <div className="mini-health-bar">
              <div
                className="mini-health-fill"
                style={{
                  width: `${health}%`,
                  background: health >= 70 ? "#27f5ff" : health >= 40 ? "#ffb430" : "#ff4040",
                }}
              />
            </div>
            <div
              className="mini-health-pct"
              style={{ color: health >= 70 ? "#27f5ff" : health >= 40 ? "#ffb430" : "#ff4040" }}
            >
              {health}%
            </div>
          </div>

          <button className="reset-btn" onClick={reset} type="button">
            ↺ Reset Scenario
          </button>
        </div>

        <div className="canvas-col">
          <section className="animals-panel glass">
            <h2>Cold-Water Coral Habitats & Sea Creature Status</h2>
            <div className="animals-grid">
              {MARINE_LIFE_STATUS.map((species) => (
                <div
                  key={species.name}
                  className={`animal-card ${health >= species.threshold ? "alive" : "atrisk"}`}
                >
                  <span className="animal-name">{species.name}</span>
                  <span className="animal-status">
                    {health >= species.threshold ? "✅ Stable" : "⚠️ At Risk"}
                  </span>
                  <div className="animal-bar">
                    <div style={{ width: `${Math.min(100, (health / species.threshold) * 100)}%` }} />
                  </div>
                </div>
              ))}
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
            <div className="year-badge">🔮 {year - 2024} years into the future</div>
          )}
        </div>
      </section>

      <section className="result-panel glass">
        <div className="result-top">
          <div className="health-circle">
            <div
              className="health-ring"
              style={{
                background: `conic-gradient(#27f5ff ${health * 3.6}deg, rgba(255,255,255,0.1) ${
                  health * 3.6
                }deg)`,
              }}
            >
              <div className="health-inner">
                <span className="health-title">Conceptual Habitat Score</span>
                <strong>{health}%</strong>
                <em>{scenario.status}</em>
              </div>
            </div>
          </div>

          <div className="ohi-risk-box">
            <h3>Score Interpretation</h3>
            <div className="ohi-scale-list">
              {riskLevels.map((level) => (
                <div
                  key={level.label}
                  className={`ohi-scale-row ${
                    health >= level.min && health <= level.max ? "active" : ""
                  }`}
                >
                  <span className="range">
                    {level.min}–{level.max}%
                  </span>
                  <div>
                    <strong>{level.label}</strong>
                    <p>{level.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="habitat-panel">
            <h3 className="habitat-title">🪸 Deep-Sea Habitat Condition</h3>
            {HABITAT_CONDITIONS.map((condition) => {
              const isCurrent = health >= condition.min && health <= condition.max;
              return (
                <div
                  key={condition.name}
                  className={`habitat-row ${isCurrent ? "habitat-current" : ""}`}
                >
                  <span>{isCurrent ? "🔵" : "⚪"}</span>
                  <div>
                    <strong>{condition.name}</strong>
                    <p>{condition.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="scenario-info">
            <h2>Future Deep-Sea Scenario</h2>
            <InfoRow icon="🪸" title="Habitat" value={scenario.habitat} />
            <InfoRow icon="🦐" title="Benthic Biodiversity" value={scenario.biodiversity} />
            <InfoRow icon="🧴" title="Marine Litter" value={scenario.litter} />
            <InfoRow icon="🕸" title="Fishing Pressure" value={scenario.fishing} />
            <InfoRow
              icon="🌡"
              title="Ocean Warming"
              value={
                temperature < 35
                  ? "Low warming pressure."
                  : temperature < 65
                    ? "Warming is stressing sensitive organisms."
                    : "Marine heatwave and mass-mortality risk is high."
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
                    : "Severe acidification threatens long-term reef survival."
              }
            />
            <InfoRow icon="🌍" title="Outlook" value={scenario.outlook} />
          </div>
        </div>

        <p className="scientific-note">
          This is a conceptual educational model. The score combines four pressures equally and is not an
          official Ocean Health Index calculation or a prediction from a scientific dataset.
        </p>
      </section>

      <section className="habitats-overview glass">
        <h2>Deep-Sea Habitats Included</h2>
        <p className="habitats-intro">
          The simulator now shows the diversity Cristina recommended, not only one coral reef.
        </p>
        <div className="habitat-types-grid">
          {HABITAT_TYPES.map((habitat) => (
            <article className="habitat-type-card" key={habitat.name}>
              <span className="habitat-type-icon">{habitat.icon}</span>
              <div>
                <h3>{habitat.name}</h3>
                <p>{habitat.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {activeTips.length > 0 && (
        <section className="tips-panel glass">
          <h2>💡 What Can Help</h2>
          <div className="tips-grid">
            {activeTips.map((tip) => (
              <div key={tip} className="tip-card">
                {tip}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="ocean-visual glass">
        <h2>Major Deep-Sea Ecosystem Impacts</h2>
        <div className="impact-grid">
          {marineLitter > 35 && (
            <div className="impact-card danger">
              <h3>Marine Litter and Entanglement</h3>
              <p>
                Plastic, microplastics and abandoned fishing gear can accumulate at depth, entangle ancient
                corals and remove the habitat they create.
              </p>
            </div>
          )}

          {temperature > 35 && (
            <div className="impact-card warning">
              <h3>Ocean Warming and Marine Heatwaves</h3>
              <p>
                Prolonged warming can cause mortality events and disrupt vulnerable coral, sponge and benthic
                communities.
              </p>
            </div>
          )}

          {acidification > 35 && (
            <div className="impact-card warning">
              <h3>Ocean Acidification</h3>
              <p>
                Increasing acidity makes it harder for cold-water corals to build and maintain their calcium
                carbonate skeletons.
              </p>
            </div>
          )}

          {bottomTrawling > 35 && (
            <div className="impact-card danger">
              <h3>Bottom-Trawling Damage</h3>
              <p>
                Heavy fishing gear removes fragile organisms, resuspends sediment and can alter the shape of
                submarine landscapes.
              </p>
            </div>
          )}

          {health < 35 && (
            <div className="impact-card critical">
              <h3>Critical Ecosystem State</h3>
              <p>
                Habitat-forming species and food webs face collapse, while recovery may require decades or
                centuries.
              </p>
            </div>
          )}

          {health >= 70 && (
            <div className="impact-card healthy-card">
              <h3>Protected Deep-Sea Future 🌱</h3>
              <p>
                Lower emissions, responsible waste management and protection from destructive fishing can
                preserve deep-sea biodiversity.
              </p>
            </div>
          )}
        </div>
        <p className="bottom-text">
          Deep-sea habitats may be far from sight, but they are connected to climate, biodiversity and human
          wellbeing.
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
  const level = isYear ? "" : value > 70 ? "High" : value > 35 ? "Medium" : "Low";

  return (
    <div className="slider-row">
      <div className="slider-icon">{icon}</div>
      <div className="slider-main">
        <div className="slider-head">
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
          <div className="slider-value">
            <strong>{isYear ? value : `${value}%`}</strong>
            {!isYear && <span>{level}</span>}
          </div>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          aria-label={title}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>
    </div>
  );
}

function InfoRow({ icon, title, value }: { icon: string; title: string; value: string }) {
  return (
    <div className="info-row">
      <span>{icon}</span>
      <div>
        <h4>{title}</h4>
        <p>{value}</p>
      </div>
    </div>
  );
}

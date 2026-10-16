// NOTE: cold-water-coral.png / black-coral.png / bamboo-coral.png were
// only ~70-130px wide, which looked blurry once stretched to fill the
// list-page thumbnail box. Swapped to higher-resolution images already
// in assets/ as placeholders — replace these per-species once real
// photos are uploaded for each coral.
import coldWaterCoralSrc from "../assets/healthy-coral.png";
import blackCoralSrc from "../assets/coral-garden-thumb.png";
import bambooCoralSrc from "../assets/lophelia-reef-thumb.png";
import deadCoralSrc from "../assets/dead-coral.png";

import acroporaCervicornis from "../assets/models/acropora_cervicornis.stl?url";
import acroporaCytherea from "../assets/models/acropora_cytherea.stl?url";
import acroporaFlorida from "../assets/models/acropora_florida.stl?url";
import acroporaHyacinthus from "../assets/models/acropora_hyacinthus.stl?url";
import acroporaLoripes from "../assets/models/acropora_loripes.stl?url";
import acroporaMillepora from "../assets/models/acropora_millepora.stl?url";
import acroporaNobilis from "../assets/models/acropora_nobilis.stl?url";
import acroporaPalmata from "../assets/models/acropora_palmata.stl?url";
import acroporaSarmentosa from "../assets/models/acropora_sarmentosa.stl?url";
import acroporaTenuis from "../assets/models/acropora_tenuis.stl?url";
import fungiaScutaria from "../assets/models/fungia_scutaria.stl?url";
import goniastreaAspera from "../assets/models/goniastrea_aspera.stl?url";
import montiporaCapitata from "../assets/models/montipora_capitata.stl?url";
import platygyraDaedalea from "../assets/models/platygyra_daedalea.stl?url";
import platygyraLamellina from "../assets/models/platygyra_lamellina.stl?url";
import pocilloporaMeandrina from "../assets/models/pocillopora_meandrina.stl?url";

import acroporaFloridaHealthy from "../assets/stagemodels/acroporaFlorida/acropora_florida_healthy.glb?url";
import acroporaFloridaStressed from "../assets/stagemodels/acroporaFlorida/acropora_florida_stressed.glb?url";
import acroporaFloridaCollapsed from "../assets/stagemodels/acroporaFlorida/acropora_florida_collapsed.glb?url";

export type CoralDriver =
  | "acidification"
  | "bottomTrawling"
  | "marineLitter";

// branching corals read as fast-growing, fragile colonies;
// boulder/plate corals read as slow-growing, dense colonies —
// used for flavor text only, both now share the same render path
export type CoralVisualType = "branching" | "boulder";

export type CoralStage = {
  max: number;
  label: string;
  cause: string;
};

export type CoralPalette = {
  healthy: string;
  mid: string;
  dead: string;
};

export type StageModelSet = {
  healthy: string;
  stressed: string;
  collapsed: string;
};

export type StageModelDescription = {
  label: string;
  cause: string;
};

export type CoralSpeciesData = {
  key: string;
  name: string;
  scientificName: string;
  icon: string;
  image: string; // 2D thumbnail used on the list page
  model: string; // STL model used on the 3D detail page
  visualType: CoralVisualType;
  driver: CoralDriver;
  driverLabel: string;
  baseline: number;
  palette: CoralPalette;
  storyIntro: string;
  stages: CoralStage[];
  // real 3-stage GLB models, present once uploaded for a species;
  // falls back to the single STL model above when absent
  stageModels?: StageModelSet;
  stageModelDescriptions?: [
    StageModelDescription,
    StageModelDescription,
    StageModelDescription,
  ];
};

export { deadCoralSrc };

const ACIDIFICATION_STAGES: CoralStage[] = [
  {
    max: 30,
    label: "Healthy Structure",
    cause:
      "Calcium carbonate skeleton is forming normally and reef structure is intact.",
  },
  {
    max: 55,
    label: "Early Stress",
    cause:
      "Carbonate saturation is dropping, slowing new skeletal growth.",
  },
  {
    max: 80,
    label: "Skeleton Weakening",
    cause:
      "Acidified water is outpacing the coral's ability to repair itself.",
  },
  {
    max: 100,
    label: "Skeletal Dissolution",
    cause:
      "Existing reef structure is dissolving faster than it can be replaced.",
  },
];

const TRAWLING_STAGES: CoralStage[] = [
  {
    max: 30,
    label: "Undisturbed Colony",
    cause:
      "Delicate branching structure remains intact on the seafloor.",
  },
  {
    max: 55,
    label: "First Contact",
    cause:
      "Passing trawl gear is starting to brush and weaken outer branches.",
  },
  {
    max: 80,
    label: "Major Stress",
    cause:
      "Repeated trawl passes have damaged major branches; regrowth takes decades.",
  },
  {
    max: 100,
    label: "Colony Collapse",
    cause:
      "Bottom trawling has scoured this coral colony from the seafloor.",
  },
];

const LITTER_STAGES: CoralStage[] = [
  {
    max: 30,
    label: "Clear Structure",
    cause: "Coral surface is free of debris and growing normally.",
  },
  {
    max: 55,
    label: "Debris Catching",
    cause:
      "Discarded netting and plastic are starting to snag on the colony.",
  },
  {
    max: 80,
    label: "Restricted Growth",
    cause:
      "Entangled litter is blocking light and restricting normal growth.",
  },
  {
    max: 100,
    label: "Colony Smothered",
    cause:
      "Accumulated litter has smothered the coral structure.",
  },
];

// ---------- small hex color helpers (no three.js dependency here) ----------

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

// mixes a color toward white — used for the "bleached / mid-decline" tone
function lighten(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  );
}

// desaturates + darkens toward a muted brown-gray — the "dead" tone
function toDeadTone(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const gray = (r + g + b) / 3;
  const mixed = {
    r: r * 0.35 + gray * 0.25 + 40,
    g: g * 0.3 + gray * 0.25 + 32,
    b: b * 0.25 + gray * 0.2 + 26,
  };
  return rgbToHex(mixed.r * 0.55, mixed.g * 0.5, mixed.b * 0.45);
}

// one distinct, vivid, real-reef-like hue per species — this is what
// makes each coral read as colorful instead of one repeated tint
const VIVID_HUES = [
  "#ff6f91", // coral pink
  "#ff8c42", // tangerine
  "#ffd23f", // sunflower
  "#c86bfa", // orchid
  "#ff4da6", // magenta
  "#ff7f6b", // salmon
  "#a05eea", // violet
  "#ffb26b", // apricot
  "#ff5d8f", // rose
  "#f4c95d", // gold
  "#b98cf2", // lilac
  "#ff5e57", // coral red
  "#ffab73", // peach
  "#e0449e", // fuchsia
  "#ffbe4d", // amber
  "#ff8fa3", // watermelon pink
];

function paletteFromHue(hex: string): CoralPalette {
  return {
    healthy: hex,
    mid: lighten(hex, 0.72),
    dead: toDeadTone(hex),
  };
}

function makeSpecies(
  index: number,
  key: string,
  scientificName: string,
  model: string,
  visualType: CoralVisualType,
  driver: CoralDriver,
): CoralSpeciesData {
  const driverLabel =
    driver === "acidification"
      ? "Ocean Acidification"
      : driver === "bottomTrawling"
        ? "Bottom Trawling"
        : "Marine Litter";

  const stages =
    driver === "acidification"
      ? ACIDIFICATION_STAGES
      : driver === "bottomTrawling"
        ? TRAWLING_STAGES
        : LITTER_STAGES;

  const image =
    driver === "acidification"
      ? coldWaterCoralSrc
      : driver === "bottomTrawling"
        ? blackCoralSrc
        : bambooCoralSrc;

  const name = scientificName
    .split(" ")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

  const shapeWord =
    visualType === "branching"
      ? "fast-growing, delicately branching"
      : "slow-growing, solid boulder";

  const storyIntro = `This is the story of ${name}, a ${shapeWord} coral. Its fate here is tied to one pressure above all others: ${driverLabel}.`;

  return {
    key,
    name,
    scientificName,
    icon: visualType === "branching" ? "🌿" : "🪸",
    image,
    model,
    visualType,
    driver,
    driverLabel,
    baseline:
      driver === "acidification"
        ? 10
        : driver === "bottomTrawling"
          ? 12
          : 15,
    palette: paletteFromHue(VIVID_HUES[index % VIVID_HUES.length]),
    storyIntro,
    stages,
  };
}

export const CORAL_SPECIES: CoralSpeciesData[] = [
  // --- Ocean Acidification group (mostly boulder/plate corals) ---
  makeSpecies(
    0,
    "platygyraDaedalea",
    "platygyra daedalea",
    platygyraDaedalea,
    "boulder",
    "acidification",
  ),
  makeSpecies(
    1,
    "platygyraLamellina",
    "platygyra lamellina",
    platygyraLamellina,
    "boulder",
    "acidification",
  ),
  makeSpecies(
    2,
    "goniastreaAspera",
    "goniastrea aspera",
    goniastreaAspera,
    "boulder",
    "acidification",
  ),
  makeSpecies(
    3,
    "fungiaScutaria",
    "fungia scutaria",
    fungiaScutaria,
    "boulder",
    "acidification",
  ),
  makeSpecies(
    4,
    "montiporaCapitata",
    "montipora capitata",
    montiporaCapitata,
    "branching",
    "acidification",
  ),

  // --- Bottom Trawling group (branching corals — fragile, snap easily) ---
  makeSpecies(
    5,
    "acroporaCervicornis",
    "acropora cervicornis",
    acroporaCervicornis,
    "branching",
    "bottomTrawling",
  ),
  makeSpecies(
    6,
    "acroporaPalmata",
    "acropora palmata",
    acroporaPalmata,
    "branching",
    "bottomTrawling",
  ),
  makeSpecies(
    7,
    "acroporaFlorida",
    "acropora florida",
    acroporaFlorida,
    "branching",
    "bottomTrawling",
  ),
  makeSpecies(
    8,
    "acroporaTenuis",
    "acropora tenuis",
    acroporaTenuis,
    "branching",
    "bottomTrawling",
  ),
  makeSpecies(
    9,
    "acroporaNobilis",
    "acropora nobilis",
    acroporaNobilis,
    "branching",
    "bottomTrawling",
  ),
  makeSpecies(
    10,
    "acroporaLoripes",
    "acropora loripes",
    acroporaLoripes,
    "branching",
    "bottomTrawling",
  ),

  // --- Marine Litter group (mixed — entanglement + smothering) ---
  makeSpecies(
    11,
    "acroporaMillepora",
    "acropora millepora",
    acroporaMillepora,
    "branching",
    "marineLitter",
  ),
  makeSpecies(
    12,
    "acroporaCytherea",
    "acropora cytherea",
    acroporaCytherea,
    "boulder",
    "marineLitter",
  ),
  makeSpecies(
    13,
    "acroporaHyacinthus",
    "acropora hyacinthus",
    acroporaHyacinthus,
    "boulder",
    "marineLitter",
  ),
  makeSpecies(
    14,
    "acroporaSarmentosa",
    "acropora sarmentosa",
    acroporaSarmentosa,
    "boulder",
    "marineLitter",
  ),
  makeSpecies(
    15,
    "pocilloporaMeandrina",
    "pocillopora meandrina",
    pocilloporaMeandrina,
    "boulder",
    "marineLitter",
  ),
];

const acroporaFloridaEntry = CORAL_SPECIES.find(
  (c) => c.key === "acroporaFlorida",
);

if (acroporaFloridaEntry) {
  acroporaFloridaEntry.stageModels = {
    healthy: acroporaFloridaHealthy,
    stressed: acroporaFloridaStressed,
    collapsed: acroporaFloridaCollapsed,
  };

  acroporaFloridaEntry.stageModelDescriptions = [
    {
      label: "Healthy Colony",
      cause:
        "Full, intact branching structure. Coral is growing normally.",
    },
    {
      label: "Bleaching",
      cause:
        "Turning pale white as the coral loses its symbiotic algae under stress.",
    },
    {
      label: "Collapsed & Overgrown",
      cause:
        "Structure has broken apart into gaps and holes. A murky algae-green film is spreading across the dead skeleton.",
    },
  ];
}

export const FEATURED_SPECIES: CoralSpeciesData[] = [
  CORAL_SPECIES.find((c) => c.key === "platygyraDaedalea")!,
  CORAL_SPECIES.find((c) => c.key === "acroporaCervicornis")!,
  CORAL_SPECIES.find((c) => c.key === "acroporaMillepora")!,
];

export function getStageIndex(
  stages: CoralStage[],
  value: number,
) {
  const index = stages.findIndex((stage) => value <= stage.max);
  return index === -1 ? stages.length - 1 : index;
}

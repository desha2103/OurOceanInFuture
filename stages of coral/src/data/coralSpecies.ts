// NOTE: cold-water species below don't have real thumbnail/model files
// yet. Everything points into /public/species-thumbnails and
// /public/models by plain path (not a bundler import), specifically so
// the build keeps working before those files exist — drop matching
// files into those two folders later and they'll pick up automatically,
// no code changes needed.
import deadCoralSrc from "../assets/dead-coral.png";

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
      "Entangled debris can rub against coral tissue and damage delicate branches.",
  },
  {
    max: 100,
    label: "Colony Smothered",
    cause:
      "Accumulated litter can smother, crush or break fragile coral structures.",
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

  const image = `/species-thumbnails/${key}.png`;

  const name = scientificName
    .split(" ")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

  const shapeWord =
    visualType === "branching"
      ? "slow-growing, delicately branching"
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
    // Default: no species-specific published impact figure could be
    // found for this species (checked against the trawling/
    // acidification/litter literature). Overridden below for the two
    // species where a real, citable number does exist.
    baseline: 0,
    palette: paletteFromHue(VIVID_HUES[index % VIVID_HUES.length]),
    storyIntro,
    stages,
  };
}

export const CORAL_SPECIES: CoralSpeciesData[] = [
  // To add a coral later: copy one entry, change the key, name and
  // driver. Thumbnail and model files are found by key in /public.
  makeSpecies(
    0,
    "lopheliaPertusa",
    "lophelia pertusa",
    "/models/lopheliaPertusa.stl",
    "branching",
    "bottomTrawling",
  ),
  makeSpecies(
    1,
    "solenosmiliaVariabilis",
    "solenosmilia variabilis",
    "/models/solenosmiliaVariabilis.stl",
    "branching",
    "bottomTrawling",
  ),
  makeSpecies(
    2,
    "madreporaOculata",
    "madrepora oculata",
    "/models/madreporaOculata.stl",
    "branching",
    "acidification",
  ),
  // species not confirmed yet, so only the genus is named
  makeSpecies(
    3,
    "enallopsammia",
    "enallopsammia",
    "/models/enallopsammia.stl",
    "branching",
    "marineLitter",
  ),
];

// per-driver stage descriptions for the 3-stage GLB viewer, matching
// the color-grading/damage plan worked out for each threat type —
// applied to every species in that driver group below
const STAGE_MODEL_DESCRIPTIONS: Record<
  CoralDriver,
  [StageModelDescription, StageModelDescription, StageModelDescription]
> = {
  bottomTrawling: [
    {
      label: "Healthy Colony",
      cause:
        "Full, intact branching structure. Coral is growing normally.",
    },
    {
      label: "Scraped",
      cause:
        "Trawl gear has brushed the outer branch tips, stripping living tissue and exposing bare white skeleton beneath.",
    },
    {
      label: "Broken & Dead",
      cause:
        "Repeated trawl passes have snapped and killed most of the colony, leaving only a small living patch near the base.",
    },
  ],
  acidification: [
    {
      label: "Healthy Colony",
      cause:
        "Full, intact branching structure. Coral is growing normally.",
    },
    {
      label: "Thinning",
      cause:
        "Lower carbonate saturation is slowing skeletal growth, causing an even, colony-wide loss of density and color.",
    },
    {
      label: "Eroded",
      cause:
        "Acidified water is dissolving the skeleton faster than the coral can rebuild it, leaving a chalky, thinned structure.",
    },
  ],
  marineLitter: [
    {
      label: "Healthy Colony",
      cause:
        "Full, intact branching structure. Coral is growing normally.",
    },
    {
      label: "Entangled",
      cause:
        "Discarded netting or line has snagged on branch junctions, killing tissue in patches where it presses against the coral.",
    },
    {
      label: "Smothered",
      cause:
        "Entangling debris has spread across most of the colony, smothering tissue while the branching structure remains standing.",
    },
  ],
};

for (const coral of CORAL_SPECIES) {
  coral.stageModels = {
    healthy: `/models/${coral.key}_healthy.glb`,
    stressed: `/models/${coral.key}_stressed.glb`,
    collapsed: `/models/${coral.key}_collapsed.glb`,
  };
  coral.stageModelDescriptions = STAGE_MODEL_DESCRIPTIONS[coral.driver];
}

// Real, cited impact figures — only added where a species-specific
// published statistic actually exists. The other four species are
// intentionally left at their default (0) rather than reusing a
// nearby species' number or a regional average, since the source
// papers don't break impact down by individual species.
const BASELINE_IMPACT: Partial<Record<string, number>> = {
  // 30-50% of Lophelia pertusa reef area is damaged or destroyed by
  // bottom trawling in western Norway (midpoint used here).
  // Fosså, Mortensen & Furevik (2002), Hydrobiologia 471: 1-12.
  lopheliaPertusa: 40,

  // 45 of 51 surveyed South Pacific/NZ/Tasmanian seamounts (88%) show
  // damage attributable to bottom trawling, on seamounts where
  // Solenosmilia variabilis is the dominant reef-forming coral.
  // Williams et al. (2020), Frontiers in Marine Science 7:567002.
  solenosmiliaVariabilis: 88,
};

for (const coral of CORAL_SPECIES) {
  const impact = BASELINE_IMPACT[coral.key];
  if (impact !== undefined) {
    coral.baseline = impact;
  }
}

export const FEATURED_SPECIES: CoralSpeciesData[] = CORAL_SPECIES.slice(0, 3);

export function getStageIndex(
  stages: CoralStage[],
  value: number,
) {
  const index = stages.findIndex((stage) => value <= stage.max);
  return index === -1 ? stages.length - 1 : index;
}

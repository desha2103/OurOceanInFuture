# Coral Atlas — website visual refresh (version 2)

## What has changed
- Large responsive 3D viewer, model-fit camera and calmer lighting.
- Gentle automatically rotating specimen (with Pause / Resume control), drag to orbit and scroll to zoom.
- Polished return-navigation button, a custom branching-coral SVG emblem, and clear stage selection cards.
- Stage description, research context and links moved OUTSIDE the 3D view.
- Scientific accuracy: the deep-water species shown here do not need sunlight to feed, and healthy cold-water corals can naturally be white. The default GLB material/vertex colours are no longer tinted green by the viewer.
- Clear warning when a GLB has not been placed in `public/models`.
- Responsive accessibility, button labels, visible focus states, and screen-reader stage information.

## What has NOT changed
- `SimulatorContext.tsx` and its persistence and slider calculations.
- Slider thresholds (30 / 55 / 80 / 100) and `getStageIndex`.
- Existing four-chapter to three-GLB bucket mapping, manual stage previews, and Live reset.
- Model geometry and original colour materials.
- Navigation URLs and species configuration keys.

## Science and visualization note
The models are educational illustrations. Stage names and colours do NOT constitute validated indicators of severity, and slider percentages do NOT represent measured exposure or an empirically established response threshold.

Relevant primary institutional reference pages:
- NOAA Fisheries — Deep-sea coral habitat: https://www.fisheries.noaa.gov/national/habitat-conservation/deep-sea-coral-habitat
- NOAA Marine Debris Program — Habitat damage: https://marinedebris.noaa.gov/why-marine-debris-problem/habitat-damage
- NOAA Ocean Exploration — Cold-water coral: https://oceanexplorer.noaa.gov/ocean-fact/coral-water/
- Smithsonian Ocean — Ocean acidification: https://ocean.si.edu/ocean-life/invertebrates/ocean-acidification

## Run the website
```
npm install
npm run dev
```

The **Complete** ZIP includes all twelve known coral models in `public/models` with names expected by the site (three per species). The **Lite** ZIP includes only the one originally packaged model; copy the others into `public/models` if using it.

### Validation note
TypeScript/TSX source parsing and GLB header/length validation succeeded. A complete `npm run build` or live-browser test could not be performed because the package install timed out in the editing environment. Please test on your own development system before publishing.


## Updates in this release
- Removed the "Why this matters" research panel and the explanatory note underneath the viewer, as requested.
- Fixed compressed healthy Lophelia model by attaching a Draco loader and preparing its local decoder at installation time.
- Retained all stage controls, manual versus Live selection, rotation, simulator state, and other website functionality.

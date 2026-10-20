# Coral stage colour visibility fix

The earlier bundled GLBs used 8-bit sRGB colour fractions in glTF `baseColorFactor` (which should use **linear RGB**). Combined with bright lighting, the colours appeared pale or nearly white.

This version corrects the colour space in **all 12 GLBs** while preserving geometry, positions, materials, faces, and stage assignments. It also reduces overlighting, maintains a gentle auto-rotation, and fixes duplicate requestAnimationFrame scheduling for smoother performance.

**No changes** to simulator math, stage thresholds, chapter mapping, route navigation, button logic, or description text.

As before, healthy pale/white areas can be natural in cold-water corals. Model stages are visualisations, not species-specific experimentally calibrated pollution responses.

### Local testing

````
npm install
npm run dev
````

Since model assets are large, use Git LFS to push to GitHub.

Note: Browser/runtime testing may require local `npm install` due to environment dependency constraints.

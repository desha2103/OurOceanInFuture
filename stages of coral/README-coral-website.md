# Cold-water coral pages (second page + coral 3D pages)

This is only what comes AFTER the main page's icon:
- `/coral-impact`            list of corals, grouped by threat, with icons
- `/coral-impact/:coralKey`  one coral's 3D page (healthy / stressed / collapsed)

## Run it alone to test
npm install
npm run dev      (opens at http://localhost:5173, "/" redirects to /coral-impact)

## Give it to your partner (3 steps)
1. Copy these into their project, keeping the same folders:
   src/pages/ (CoralImpactList.tsx, CoralImpactDetail.tsx, CoralImpact.css)
   src/components/ (CoralGLTFStages.tsx, CoralScene3D.tsx)
   src/data/coralSpecies.ts
   src/state/SimulatorContext.tsx
   src/assets/ (dead-coral.png, fish1.png, fish2.png)
   public/models/ and public/species-thumbnails/
   Packages needed: react, react-dom, react-router-dom, three
2. Add the two routes (see src/App.tsx) and wrap the app in <SimulatorProvider>.
3. Link their main-page icon to /coral-impact. The "Back to simulator" link on
   the list page goes to "/" (change it in CoralImpactList.tsx if needed).

## Slider values (the "Currently 10%" numbers)
They decide each coral's stage. The pages read marineLitter, acidification and
bottomTrawling from SimulatorContext. Partner's main page can either:
- call useSimulator() and use setMarineLitter / setAcidification / setBottomTrawling, or
- write this JSON to localStorage key "oceanSimSliders":
  {"marineLitter":15,"temperature":10,"acidification":10,"bottomTrawling":12,"year":2024}
  (pages open in a new tab pick it up automatically)

## Corals (keys) and files
lopheliaPertusa (trawling), solenosmiliaVariabilis (trawling),
madreporaOculata (acidification), enallopsammia (litter, species not confirmed)
Per coral: public/species-thumbnails/{key}.png and
public/models/{key}_healthy.glb, {key}_stressed.glb, {key}_collapsed.glb
The complete edition contains all 12 GLB files. A missing thumbnail shows
the icon; if a model fails to load, the viewer displays an error and logs details in the browser console.

## Impact % (baseline)
Real cited figures only for Lophelia (40) and Solenosmilia (88). Others are 0 on
purpose: no species-specific published number was found.

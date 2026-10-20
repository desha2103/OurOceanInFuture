# Upload this coral website to GitHub

The full project includes large `.glb` models. Extract the ZIP before committing. Use Git LFS for model files.

## First upload
Install Git and Git LFS, create a new *empty* GitHub repository (without adding a README), then open the extracted project in VS Code. In the VS Code terminal run:

```powershell
git init
git lfs install
git lfs track "*.glb"
git add .gitattributes
git add .
git commit -m "Add coral website and models"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPOSITORY` with your GitHub username and repository name. GitHub may prompt you to sign in.

## Later updates

```powershell
git add .
git commit -m "Improve coral pages"
git push
```

## Run locally

```powershell
npm install
npm run dev
```

`npm install` also runs a script that copies Three.js's Draco decoder into `public/draco`. This enables the compressed healthy Lophelia model to load.

## Important

- Keep all 12 models in `public/models`; the full package includes them.
- Do not commit `node_modules`, `dist` or the original ZIP.
- Uploading to a GitHub repository does not itself publish a website. GitHub Pages requires a Vite production build and handling Git LFS assets on deployment.
- If integrating into your main simulator, maintain shared React simulator state so the stages remain synchronized.

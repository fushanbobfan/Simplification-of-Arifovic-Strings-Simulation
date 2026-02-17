# Simplification-of-Arifovic-Strings-Simulation

A classroom-friendly simulation for PS 115D (UCLA), using **literal strings** where string length represents effort level.

## What “string” means here
- **Short string** = low effort (L), cost 0
- **Medium string** = medium effort (M), cost 5
- **Long string** = high effort (H), cost 10

Group benefit depends on **minimum effort in the group**:
- min L → 0
- min M → 10
- min H → 100

Individual payoff each tick = group benefit − own effort cost.

## Frontend behavior
The web UI is intentionally NetLogo-like:
- left panel with controls (`setup`, `go`, `step`, `stop`)
- right square world where each agent is drawn as a moving literal string
- string length in the world changes with effort (short/medium/long)
- scenario buttons for `n=2`, `n=4`, `n=15`, and `whole class`

## Run locally
```bash
python3 -m http.server 8000
```
Open:
- `http://localhost:8000/web/`

## Deploy to public GitHub Pages
Use the setting you already have (no `gh-pages` branch required):

1. Push this repository to GitHub (`main` branch).
2. In **Settings → Pages**, set:
   - Source: **Deploy from a branch**
   - Branch: `main`
   - Folder: `/ (root)`
3. Save, wait 1–2 minutes, then open the site URL.

Notes:
- Root `index.html` now automatically redirects to `./web/`, so the latest frontend loads from your current Pages setup.
- If you still see old content, hard-refresh (`Ctrl+Shift+R`) or open in incognito.

Public URL format:
- `https://<your-github-username>.github.io/Simplification-of-Arifovic-Strings-Simulation/`

## Paper staging
Put the original paper at:
- `docs/papers/arifovic.pdf`

# Simplification-of-Arifovic-Strings-Simulation

A teaching-oriented, **much simpler** simulation inspired by Arifovic-style string models.

## Public website (GitHub Pages)
This repo now includes a browser-based simulation in `web/` and a GitHub Actions workflow that deploys it to GitHub Pages.

After you push to your default branch and enable Pages in repo settings, the public site URL will be:


- `https://<your-github-username>.github.io/Simplification-of-Arifovic-Strings-Simulation/`

## How to start it locally
### 1) Browser version (recommended for class demos)
```bash
python3 -m http.server 8000
```
Then open:
- `http://localhost:8000/web/`

### 2) CLI version (original script)
```bash
python3 src/simple_arifovic_sim.py
```

## Project goal
This repository is for PS 115D (UCLA) classroom use: show the core dynamic of evolutionary learning with strings, not reproduce the full original paper model.

## Paper staging
Place the original Arifovic Strings paper PDF in:

- `docs/papers/arifovic.pdf`

## What is intentionally simplified
Compared with richer versions in the original literature, this classroom model keeps only:

1. Binary strategy strings for each agent.
2. A simple fitness score: matching a target string bit-by-bit.
3. Evolutionary update cycle:
   - selection (tournament)
   - crossover (single-point)
   - mutation (bit flips)

## Deploy to a public website (one-time setup)
1. Push this repository to GitHub.
2. In GitHub: **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
   - (The workflow also includes `enablement: true` to auto-enable Pages if it is currently disabled.)
4. Push to your default branch (or run the workflow manually in **Actions**).
5. GitHub will publish the site for anyone on the public internet.


## If you see a 404 on GitHub Pages
Use this checklist:

1. Confirm the repository is **public**.
2. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Open **Actions** and confirm the workflow **"Deploy web simulation to GitHub Pages"** succeeded on your default branch.
4. If your default branch is not `main`, this repo now supports `master` and `work` too.
5. Wait 1-3 minutes after a successful deploy, then hard refresh the URL.

## Next step after uploading the PDF
After `docs/papers/arifovic.pdf` is uploaded, we can map each feature from the paper to this simplified version and document exactly what is omitted for pedagogy.

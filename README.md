# Simplification-of-Arifovic-Strings-Simulation

A teaching-oriented, **much simpler** simulation inspired by Arifovic-style coordination dynamics, using literal string lengths (short/medium/long).

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


## Classroom game interpretation (literal strings)
This web simulation treats each agent choice as a **literal string length**:

- **L (low effort)** = short string (cost 0)
- **M (medium effort)** = medium string (cost 5)
- **H (high effort)** = long string (cost 10)

Group benefit is determined by the **minimum effort in the group**:

- minimum L → group benefit 0
- minimum M → group benefit 10
- minimum H → group benefit 100

Individual payoff each round = group benefit − own effort cost.

The browser UI includes the four class scenarios you listed: `n=2`, `n=4`, `n=15`, and `whole class`.

## Project goal
This repository is for PS 115D (UCLA) classroom use: show the core dynamic of evolutionary learning with strings, not reproduce the full original paper model.

## Paper staging
Place the original Arifovic Strings paper PDF in:

- `docs/papers/arifovic.pdf`

## What is intentionally simplified
Compared with richer versions in the original literature, this classroom model keeps only:

1. Three effort/string states (short, medium, long).
2. One-stage minimum-effort payoff mapping (0, 10, 100) minus effort costs (0, 5, 10).
3. A lightweight adaptive rule: agents partially imitate the currently best-performing effort level each round.

## Deploy to a public website (one-time setup)
1. Push this repository to GitHub.
2. In **Settings → Actions → General**, set workflow permissions to **Read and write permissions**.
3. Run the workflow **Deploy web simulation to GitHub Pages** (or push to your default branch).
4. In **Settings → Pages**, set:
   - **Source**: *Deploy from a branch*
   - **Branch**: `gh-pages`
   - **Folder**: `/ (root)`
5. Wait 1-3 minutes, then open the public URL.

## If you see a 404 on GitHub Pages
Use this checklist:

1. Confirm the repository is **public**.
2. Go to **Settings → Pages** and set **Source** to **Deploy from a branch** (`gh-pages`, `/root`).
3. Open **Actions** and confirm the workflow **"Deploy web simulation to GitHub Pages"** succeeded on your default branch.
4. If your default branch is not `main`, this repo now supports `master` and `work` too.
5. Wait 1-3 minutes after a successful deploy, then hard refresh the URL.

## Next step after uploading the PDF
After `docs/papers/arifovic.pdf` is uploaded, we can map each feature from the paper to this simplified version and document exactly what is omitted for pedagogy.

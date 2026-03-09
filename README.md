# Simplification-of-Arifovic-Strings-Simulation

A classroom coordination-game simulation for PS 115D (UCLA), using literal strings where length maps to effort.

## Core model (coordination game)
- Effort states: `L` (short), `M` (medium), `H` (long)
- Costs: `L=0`, `M=5`, `H=10`
- Group benefit by minimum effort: `L→0`, `M→10`, `H→100`
- Individual payoff: `group benefit - own cost` (range `-10` to `90`)

## Simulation flow
1. Create population (100–300)
2. Form groups by sample size `n`
3. Compute payoff and survival probability
4. Show dead strings in gray for 3–5 frames
5. Remove dead strings
6. Add babies to keep population size constant
7. Repeat for multiple periods

## Controls
- `1) Create population`
- `2) Make groups`
- `3) Survival step`
- `Next frame`
- `Run periods` / `Stop`
- Survival rule: payoff-based or equal baseline
- Baby rule: from alive population or equal random

## Run locally
```bash
python3 -m http.server 8000
```
Open:
- `http://localhost:8000/`

## GitHub Pages
Use `main / (root)` in Pages settings.

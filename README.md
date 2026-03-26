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
4. Show a single transition frame then remove dead strings
5. Add babies to keep population size constant
6. Repeat for multiple periods

## Version switch
- Use the top-left mode button to switch between **Easy** and **Hard** versions.
- Easy mode uses fixed survival equation: `P(survival) = (0.85 * payoff + 10) / 100`
- Hard mode allows user to edit the multiplier `c`: `P(survival) = (c * payoff + 10) / 100`

## Controls
- `1) Create population`
- `2) Make groups`
- `3) Survival step`
- `Run periods` / `Stop`
- `Previous frame` / `Next frame`
- Baby rule: from alive population or equal random

## Run locally
```bash
python3 -m http.server 8000
```
Open:
- `http://localhost:8000/`

## GitHub Pages
Use `main / (root)` in Pages settings.

## Mutable run-time parameters
- During `Run periods`, these are applied live: `fps`, `babyRule`, `periods`, and mode-specific survival multiplier (`easy=0.85`, `hard=c`).
- Structural parameters (`populationSize`, `groupSize`, `seed`) trigger a fresh population build when changed.

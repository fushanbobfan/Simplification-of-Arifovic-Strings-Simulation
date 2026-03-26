# Simplification-of-Arifovic-Strings-Simulation

A classroom coordination-game simulation for PS 115D (UCLA), using literal strings where length maps to effort.

## Core model (coordination game)
- Effort states: `L` (short), `M` (medium), `H` (long)
- Costs: `L=0`, `M=5`, `H=10`
- Group benefit by minimum effort: `L→0`, `M→10`, `H→100`
- Individual payoff: `group benefit - own cost` (range `-10` to `90`)

## Version switch
- Use the top-left mode button to switch between **Easy** and **Hard** versions.
- Easy mode uses fixed survival equation: `P(survival) = (0.85 * payoff + 10) / 100`
- Hard mode allows user to edit the multiplier `c`: `P(survival) = (c * payoff + 10) / 100`
- Both versions include `Reset simulation`, which restores all controls and simulation state to initial defaults.

## Baby rules
- `fromAlive`: each baby copies a random effort type from current survivors (strong exploitation).
- `equalRandom`: each baby is random `L/M/H` with equal probability (strong exploration).
- `mixedP`: each baby uses `p` probability fromAlive and `1-p` probability equalRandom (balance between exploitation and exploration).

## Simulation flow
1. Create population (100–300)
2. Form groups from a shuffled population order
3. Compute payoff and survival probability
4. Show pre-death and death visualization frames
5. Remove dead and add babies to keep population size fixed
6. Repeat for multiple periods

## Run locally
```bash
python3 -m http.server 8000
```
Open:
- `http://localhost:8000/`

## GitHub Pages
Use `main / (root)` in Pages settings.

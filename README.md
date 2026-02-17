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

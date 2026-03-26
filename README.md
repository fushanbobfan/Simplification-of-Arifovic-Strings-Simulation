# Simplified Arifovic Strings Simulation

This repository provides an interactive, browser-based simulation of repeated coordination dynamics inspired by Arifovic-style evolutionary settings. The tool is designed for classroom use and exploratory research: users can step through each phase manually, run multiple periods automatically, and inspect how population behavior changes under different survival and reproduction rules.

The current interface supports two model variants:

- **Simple version**: fixed selection strength in survival probability.
- **Complex version**: user-controlled selection strength via parameter `c`.

Both versions share the same simulation pipeline, visualization stages, and baby-generation rules.

---

## 1) Conceptual model

The simulation tracks a population of agents, each with one effort type:

- `L` (low effort)
- `M` (medium effort)
- `H` (high effort)

### Payoff structure

The game is a minimum-effort coordination environment:

- Group benefit is determined by the **minimum effort** in the group.
- Individual payoff is:

\[
\text{payoff} = \text{group benefit} - \text{own effort cost}
\]

Default values used in the app:

- Costs: `L=0`, `M=5`, `H=10`
- Group benefit by group minimum: `L→0`, `M→10`, `H→100`

So an individual can earn anywhere from `-10` to `90` depending on group composition and own effort.

---

## 2) Full interaction flow (what users see)

The UI is intentionally phase-based to make model mechanics understandable for first-time users.

A typical cycle is:

1. **Create population**
2. **Make groups**
3. **Survival draw**
4. **Death display**
5. **Birth**
6. **Regroup and continue**

The stage indicator and event log explain each transition in plain language, so users can follow not only outcomes but also the process that produced them.

### Why Survival draw and Death display are separate

- **Survival draw** computes who survives (stochastic selection based on probability), marking outcomes logically.
- **Death display** shows those outcomes visually, so users can inspect what changed before births refill the population.

This separation prevents the model from feeling like a single “instant jump” from grouped agents to next period.

---

## 3) Version rule set: Simple vs Complex

Both versions use linear survival probabilities from payoff, with a baseline offset of `+10`.

## Rule V1 — Simple survival rule

\[
P(\text{survival}) = \frac{0.85 \cdot \text{payoff} + 10}{100}
\]

- Selection slope is fixed at `0.85`.
- Good for teaching and baseline experiments.
- Fewer free parameters, easier to compare runs.

## Rule V2 — Complex survival rule

\[
P(\text{survival}) = \frac{c \cdot \text{payoff} + 10}{100}
\]

- `c` is user-editable (`0` to `2`).
- Larger `c` increases sensitivity to payoff differences (stronger selection pressure).
- Smaller `c` weakens payoff-driven selection.

### Practical interpretation

- **Simple** is a stable reference model.
- **Complex** supports sensitivity analysis and richer parameter studies.

---

## 4) Baby rules (all reproduction options, in detail)

After deaths are applied, the simulator creates newborns to keep total population size constant. How newborn effort is assigned is controlled by the baby rule.

## Rule B1 — `fromAlive`

Each baby copies a random effort type sampled from the current survivor pool.

- Mechanism: survivor-weighted replication.
- Interpretation: “successful strategies reproduce more often.”
- Typical effect: faster convergence, stronger lock-in/path dependence.

## Rule B2 — `equalRandom`

Each baby independently draws effort uniformly from `L/M/H`.

- Mechanism: pure exploration / mutation-like replacement.
- Interpretation: survivors do not directly bias newborn composition.
- Typical effect: more persistent diversity, slower convergence, higher noise.

## Rule B3 — `mixedP`

For each baby:

- with probability `p`: sample via `fromAlive`
- with probability `1 - p`: sample via `equalRandom`

So `p` is an exploitation–exploration dial:

- `p = 1`: equivalent to pure `fromAlive`
- `p = 0`: equivalent to pure `equalRandom`
- intermediate `p`: balanced behavior

This rule is often the most useful for avoiding two extremes:

- overly rigid lock-in (`fromAlive` only)
- overly noisy drift (`equalRandom` only)

---

## 5) Why groups feel “not independent” across time

This is a frequent and valid question.

- Within one grouped interaction, payoff computation is local to each group.
- Across periods, groups are not fully independent because:
  1. newborn generation references the global survivor composition,
  2. the next period reshuffles and regroups agents.

Result: local interactions + global replacement + reshuffling create cross-group coupling over time.

---

## 6) Controls and parameters

Main controls exposed in the UI:

- `Population size`
- `Group size`
- `Periods`
- `Seed`
- `Speed`
- `Baby rule`
- `p` (shown when `mixedP` is selected)
- `c` (shown in Complex mode)
- `Reset simulation` (restores full initial state)

Navigation buttons:

- `Create population`
- `Make groups`
- `Survival step`
- `Run periods`
- `Previous frame`
- `Next frame`
- `Stop`

---

## 7) Determinism and reproducibility

The simulation uses a seedable RNG. For reproducible comparisons:

1. keep `seed` fixed,
2. change one parameter at a time,
3. compare trajectories across multiple periods.

This is especially important when evaluating sensitivity to `c` (Complex mode) and `p` (`mixedP` rule).

---

## 8) Suggested experiment sequence

For new users:

1. Start with **Simple + mixedP (`p=0.5`)**.
2. Observe several manual steps to understand each phase.
3. Run longer periods automatically.
4. Switch to **Complex**, vary `c` (e.g., `0.4`, `0.85`, `1.4`).
5. Compare outcomes under `fromAlive`, `equalRandom`, and `mixedP`.

For reporting, track:

- final effort distribution,
- speed of convergence,
- volatility across periods,
- sensitivity to seed.

---

## 9) Local run

```bash
python3 -m http.server 8000
```

Open:

- `http://localhost:8000/`

If you use GitHub Pages, publish from `main / (root)`.

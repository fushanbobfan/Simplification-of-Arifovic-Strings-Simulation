class LCG {
  constructor(seed) {
    this.mod = 2147483647;
    this.mult = 48271;
    this.state = Math.abs(Math.floor(seed)) % this.mod;
    if (this.state === 0) this.state = 1;
  }
  random() {
    this.state = (this.state * this.mult) % this.mod;
    return this.state / this.mod;
  }
  randInt(max) {
    return Math.floor(this.random() * max);
  }
}

function randomStrategy(length, rng) {
  let out = "";
  for (let i = 0; i < length; i++) out += rng.random() < 0.5 ? "0" : "1";
  return out;
}

function fitness(strategy, target) {
  let score = 0;
  for (let i = 0; i < strategy.length; i++) if (strategy[i] === target[i]) score++;
  return score;
}

function tournamentSelect(pop, scores, k, rng) {
  let bestIdx = rng.randInt(pop.length);
  for (let i = 1; i < k; i++) {
    const idx = rng.randInt(pop.length);
    if (scores[idx] > scores[bestIdx]) bestIdx = idx;
  }
  return pop[bestIdx];
}

function crossover(a, b, rng) {
  if (a.length <= 1) return a;
  const cut = 1 + rng.randInt(a.length - 1);
  return a.slice(0, cut) + b.slice(cut);
}

function mutate(strategy, mutationRate, rng) {
  let out = "";
  for (const bit of strategy) {
    if (rng.random() < mutationRate) out += bit === "0" ? "1" : "0";
    else out += bit;
  }
  return out;
}

function runSimulation(params) {
  const rng = new LCG(params.seed);
  const target = randomStrategy(params.strategyLength, rng);
  let population = Array.from({ length: params.populationSize }, () => randomStrategy(params.strategyLength, rng));
  const history = [];

  for (let g = 0; g <= params.generations; g++) {
    const scores = population.map((s) => fitness(s, target));
    let bestIdx = 0;
    for (let i = 1; i < scores.length; i++) if (scores[i] > scores[bestIdx]) bestIdx = i;

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    history.push({
      generation: g,
      bestFitness: scores[bestIdx],
      averageFitness: avg,
      uniqueStrategies: new Set(population).size,
      bestStrategy: population[bestIdx],
    });

    if (g === params.generations) break;

    const next = [];
    while (next.length < params.populationSize) {
      const a = tournamentSelect(population, scores, params.tournamentSize, rng);
      const b = tournamentSelect(population, scores, params.tournamentSize, rng);
      const mixed = rng.random() < params.crossoverRate ? crossover(a, b, rng) : a;
      next.push(mutate(mixed, params.mutationRate, rng));
    }
    population = next;
  }

  return { target, history };
}

function readParams() {
  const getNum = (id) => Number(document.getElementById(id).value);
  const params = {
    populationSize: getNum("populationSize"),
    strategyLength: getNum("strategyLength"),
    generations: getNum("generations"),
    mutationRate: getNum("mutationRate"),
    tournamentSize: getNum("tournamentSize"),
    crossoverRate: getNum("crossoverRate"),
    seed: getNum("seed"),
  };

  if (params.populationSize < 2) throw new Error("Population size must be at least 2.");
  if (params.strategyLength < 2) throw new Error("Strategy length must be at least 2.");
  if (params.generations < 1) throw new Error("Generations must be at least 1.");
  if (params.mutationRate < 0 || params.mutationRate > 1) throw new Error("Mutation rate must be between 0 and 1.");
  if (params.crossoverRate < 0 || params.crossoverRate > 1) throw new Error("Crossover rate must be between 0 and 1.");
  if (params.tournamentSize < 2 || params.tournamentSize > params.populationSize) {
    throw new Error("Tournament size must be between 2 and population size.");
  }

  return params;
}

function renderResults(result) {
  const body = document.getElementById("resultsBody");
  body.innerHTML = "";
  for (const row of result.history) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${row.generation}</td><td>${row.bestFitness}</td><td>${row.averageFitness.toFixed(2)}</td><td>${row.uniqueStrategies}</td><td>${row.bestStrategy}</td>`;
    body.appendChild(tr);
  }

  const finalRow = result.history[result.history.length - 1];
  document.getElementById("targetString").textContent = result.target;
  document.getElementById("finalBest").textContent = `${finalRow.bestFitness}/${result.target.length}`;
  document.getElementById("finalAvg").textContent = finalRow.averageFitness.toFixed(2);
}

document.getElementById("runButton").addEventListener("click", () => {
  try {
    const params = readParams();
    const result = runSimulation(params);
    renderResults(result);
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("runButton").click();

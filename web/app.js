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
  pick(arr) {
    return arr[this.randInt(arr.length)];
  }
}

const ACTIONS = ["L", "M", "H"];
const COST = { L: 0, M: 5, H: 10 };
const BENEFIT = { L: 0, M: 10, H: 100 };
const CLASS_NAME = { L: "low", M: "medium", H: "high" };

let state = null;

function minAction(actions) {
  if (actions.includes("L")) return "L";
  if (actions.includes("M")) return "M";
  return "H";
}

function payoff(myAction, groupActions) {
  const minEffort = minAction(groupActions);
  return BENEFIT[minEffort] - COST[myAction];
}

function shuffledIndices(n, rng) {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = rng.randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeGroups(populationSize, groupSize, rng) {
  if (groupSize === "all") {
    return [Array.from({ length: populationSize }, (_, i) => i)];
  }
  const n = Number(groupSize);
  const order = shuffledIndices(populationSize, rng);
  const groups = [];
  for (let i = 0; i < order.length; i += n) {
    groups.push(order.slice(i, i + n));
  }
  return groups;
}

function readParams() {
  const populationSize = Number(document.getElementById("populationSize").value);
  const rounds = Number(document.getElementById("rounds").value);
  const seed = Number(document.getElementById("seed").value);
  const learningRate = Number(document.getElementById("learningRate").value);
  const active = document.querySelector(".scenario button.active");
  const groupSize = active.dataset.groupSize;

  if (populationSize < 4) throw new Error("Class size must be at least 4.");
  if (rounds < 1) throw new Error("Rounds must be at least 1.");
  if (learningRate < 0 || learningRate > 1) throw new Error("Learning rate must be between 0 and 1.");
  if (groupSize !== "all" && Number(groupSize) > populationSize) {
    throw new Error("Group size cannot exceed class size.");
  }

  return { populationSize, rounds, seed, learningRate, groupSize };
}

function initializeState(params) {
  const rng = new LCG(params.seed);
  const actions = Array.from({ length: params.populationSize }, () => rng.pick(ACTIONS));
  return { params, rng, actions, history: [], round: 0 };
}

function computeRound(actions, params, rng) {
  const groups = makeGroups(actions.length, params.groupSize, rng);
  const payoffs = Array.from({ length: actions.length }, () => 0);

  for (const group of groups) {
    const groupActions = group.map((idx) => actions[idx]);
    for (const idx of group) {
      payoffs[idx] = payoff(actions[idx], groupActions);
    }
  }

  const avgByAction = { L: -Infinity, M: -Infinity, H: -Infinity };
  const countByAction = { L: 0, M: 0, H: 0 };
  const sumByAction = { L: 0, M: 0, H: 0 };

  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    countByAction[a] += 1;
    sumByAction[a] += payoffs[i];
  }
  for (const a of ACTIONS) {
    if (countByAction[a] > 0) avgByAction[a] = sumByAction[a] / countByAction[a];
  }

  const bestAction = ACTIONS.reduce((best, a) => (avgByAction[a] > avgByAction[best] ? a : best), "L");

  const nextActions = actions.slice();
  for (let i = 0; i < actions.length; i++) {
    if (rng.random() < params.learningRate) nextActions[i] = bestAction;
  }

  const share = {
    L: nextActions.filter((a) => a === "L").length / nextActions.length,
    M: nextActions.filter((a) => a === "M").length / nextActions.length,
    H: nextActions.filter((a) => a === "H").length / nextActions.length,
  };
  const avgPayoff = payoffs.reduce((x, y) => x + y, 0) / payoffs.length;

  return {
    nextActions,
    avgPayoff,
    share,
    classMin: minAction(nextActions),
  };
}

function appendHistoryRow(round, share, avgPayoff) {
  const body = document.getElementById("historyBody");
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${round}</td><td>${(share.L * 100).toFixed(1)}%</td><td>${(share.M * 100).toFixed(1)}%</td><td>${(share.H * 100).toFixed(1)}%</td><td>${avgPayoff.toFixed(2)}</td>`;
  body.prepend(tr);
}

function renderStrings(actions) {
  const viz = document.getElementById("viz");
  viz.innerHTML = "";
  actions.forEach((a) => {
    const el = document.createElement("div");
    el.className = `agent ${CLASS_NAME[a]}`;
    el.textContent = a;
    viz.appendChild(el);
  });
}

function scenarioText(groupSize, populationSize) {
  return groupSize === "all" ? `whole class (n=${populationSize})` : `n=${groupSize}`;
}

function renderState() {
  document.getElementById("scenarioLabel").textContent = scenarioText(state.params.groupSize, state.params.populationSize);
  document.getElementById("roundLabel").textContent = String(state.round);

  const latest = state.history[state.history.length - 1];
  const avgPayoff = latest ? latest.avgPayoff : 0;
  const classMin = latest ? latest.classMin : minAction(state.actions);

  document.getElementById("avgPayoffLabel").textContent = avgPayoff.toFixed(2);
  document.getElementById("classMinLabel").textContent = classMin;
  renderStrings(state.actions);
}

function runOneRound() {
  const result = computeRound(state.actions, state.params, state.rng);
  state.actions = result.nextActions;
  state.round += 1;
  state.history.push({ round: state.round, ...result });
  appendHistoryRow(state.round, result.share, result.avgPayoff);
  renderState();
}

function runSimulation() {
  const params = readParams();
  state = initializeState(params);
  document.getElementById("historyBody").innerHTML = "";
  renderState();

  for (let r = 0; r < params.rounds; r++) {
    runOneRound();
  }
}

function setupScenarioButtons() {
  document.querySelectorAll(".scenario button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".scenario button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

document.getElementById("runButton").addEventListener("click", () => {
  try {
    runSimulation();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("nextRoundButton").addEventListener("click", () => {
  try {
    if (!state) {
      state = initializeState(readParams());
      document.getElementById("historyBody").innerHTML = "";
      renderState();
    }
    runOneRound();
  } catch (err) {
    alert(err.message);
  }
});

setupScenarioButtons();
runSimulation();

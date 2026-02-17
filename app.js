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
  choice(arr) {
    return arr[this.randInt(arr.length)];
  }
}

const ACTIONS = ["L", "M", "H"];
const COST = { L: 0, M: 5, H: 10 };
const BENEFIT = { L: 0, M: 10, H: 100 };
const LENGTH = { L: 16, M: 30, H: 44 };
const COLOR = { L: "#f59e0b", M: "#16a34a", H: "#2563eb" };

const world = document.getElementById("world");
const ctx = world.getContext("2d");

let sim = {
  rng: new LCG(42),
  agents: [],
  tick: 0,
  running: false,
  timer: null,
  params: null,
};

function minEffort(arr) {
  if (arr.includes("L")) return "L";
  if (arr.includes("M")) return "M";
  return "H";
}

function individualPayoff(myEffort, groupEfforts) {
  const groupMin = minEffort(groupEfforts);
  return BENEFIT[groupMin] - COST[myEffort];
}

function shuffleIndices(n, rng) {
  const out = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = rng.randInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function formGroups(agentCount, groupSetting, rng) {
  if (groupSetting === "all") {
    return [Array.from({ length: agentCount }, (_, i) => i)];
  }
  const n = Number(groupSetting);
  const ids = shuffleIndices(agentCount, rng);
  const groups = [];
  for (let i = 0; i < ids.length; i += n) groups.push(ids.slice(i, i + n));
  return groups;
}

function readParams() {
  const active = document.querySelector("#scenarioButtons .active");
  const groupSetting = active.dataset.group;
  const populationSize = Number(document.getElementById("populationSize").value);
  const seed = Number(document.getElementById("seed").value);
  const learningRate = Number(document.getElementById("learningRate").value);
  const fps = Number(document.getElementById("fps").value);

  if (populationSize < 2) throw new Error("Agents must be at least 2.");
  if (learningRate < 0 || learningRate > 1) throw new Error("Imitation rate must be in [0,1].");
  if (groupSetting !== "all" && Number(groupSetting) > populationSize) {
    throw new Error("Group size cannot exceed number of agents.");
  }

  return { groupSetting, populationSize, seed, learningRate, fps };
}

function setupSimulation() {
  const params = readParams();
  sim.params = params;
  sim.rng = new LCG(params.seed);
  sim.tick = 0;
  sim.agents = [];

  for (let i = 0; i < params.populationSize; i++) {
    sim.agents.push({
      x: 25 + sim.rng.random() * (world.width - 50),
      y: 25 + sim.rng.random() * (world.height - 50),
      theta: sim.rng.random() * Math.PI * 2,
      effort: sim.rng.choice(ACTIONS),
      payoff: 0,
    });
  }

  document.getElementById("historyBody").innerHTML = "";
  updateLabels();
  drawWorld();
}

function oneTick() {
  const groups = formGroups(sim.agents.length, sim.params.groupSetting, sim.rng);

  for (const g of groups) {
    const efforts = g.map((id) => sim.agents[id].effort);
    for (const id of g) {
      sim.agents[id].payoff = individualPayoff(sim.agents[id].effort, efforts);
    }
  }

  const sum = { L: 0, M: 0, H: 0 };
  const count = { L: 0, M: 0, H: 0 };
  for (const a of sim.agents) {
    sum[a.effort] += a.payoff;
    count[a.effort] += 1;
  }

  const avg = {};
  for (const e of ACTIONS) avg[e] = count[e] > 0 ? sum[e] / count[e] : -Infinity;
  const bestEffort = ACTIONS.reduce((best, e) => (avg[e] > avg[best] ? e : best), "L");

  for (const a of sim.agents) {
    if (sim.rng.random() < sim.params.learningRate) a.effort = bestEffort;

    a.theta += (sim.rng.random() - 0.5) * 0.6;
    const step = 4;
    a.x += Math.cos(a.theta) * step;
    a.y += Math.sin(a.theta) * step;

    if (a.x < 10 || a.x > world.width - 10) a.theta = Math.PI - a.theta;
    if (a.y < 10 || a.y > world.height - 10) a.theta = -a.theta;
    a.x = Math.max(10, Math.min(world.width - 10, a.x));
    a.y = Math.max(10, Math.min(world.height - 10, a.y));
  }

  sim.tick += 1;
  updateLabels();
  appendHistory();
  drawWorld();
}

function shares() {
  const n = sim.agents.length || 1;
  const c = { L: 0, M: 0, H: 0 };
  for (const a of sim.agents) c[a.effort] += 1;
  return { L: c.L / n, M: c.M / n, H: c.H / n };
}

function averagePayoff() {
  if (sim.agents.length === 0) return 0;
  return sim.agents.reduce((acc, a) => acc + a.payoff, 0) / sim.agents.length;
}

function scenarioLabelValue() {
  return sim.params.groupSetting === "all" ? `whole class (n=${sim.params.populationSize})` : `n = ${sim.params.groupSetting}`;
}

function updateLabels() {
  if (!sim.params) return;
  const s = shares();
  document.getElementById("scenarioLabel").textContent = scenarioLabelValue();
  document.getElementById("tickLabel").textContent = String(sim.tick);
  document.getElementById("shareL").textContent = `${(s.L * 100).toFixed(1)}%`;
  document.getElementById("shareM").textContent = `${(s.M * 100).toFixed(1)}%`;
  document.getElementById("shareH").textContent = `${(s.H * 100).toFixed(1)}%`;
  document.getElementById("avgPayoff").textContent = averagePayoff().toFixed(1);
}

function appendHistory() {
  const s = shares();
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${sim.tick}</td><td>${(s.L * 100).toFixed(1)}%</td><td>${(s.M * 100).toFixed(1)}%</td><td>${(s.H * 100).toFixed(1)}%</td><td>${averagePayoff().toFixed(1)}</td>`;
  document.getElementById("historyBody").prepend(tr);
}

function drawWorld() {
  ctx.clearRect(0, 0, world.width, world.height);
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, world.width, world.height);

  for (const a of sim.agents) {
    const len = LENGTH[a.effort];
    const dx = Math.cos(a.theta) * len;
    const dy = Math.sin(a.theta) * len;

    ctx.beginPath();
    ctx.strokeStyle = COLOR[a.effort];
    ctx.lineWidth = 3;
    ctx.moveTo(a.x - dx / 2, a.y - dy / 2);
    ctx.lineTo(a.x + dx / 2, a.y + dy / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = "#111827";
    ctx.arc(a.x, a.y, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function startGo() {
  if (!sim.params) setupSimulation();
  if (sim.running) return;
  sim.running = true;
  const ms = Math.max(30, Math.round(1000 / sim.params.fps));
  sim.timer = setInterval(oneTick, ms);
}

function stopGo() {
  sim.running = false;
  if (sim.timer) clearInterval(sim.timer);
  sim.timer = null;
}

function selectScenario(button) {
  document.querySelectorAll("#scenarioButtons button").forEach((b) => {
    b.classList.remove("active");
    b.classList.add("ghost");
  });
  button.classList.add("active");
  button.classList.remove("ghost");

  const group = button.dataset.group;
  if (group === "all") {
    document.getElementById("populationSize").value = 60;
  } else {
    document.getElementById("populationSize").value = Number(group);
  }
}

document.querySelectorAll("#scenarioButtons button").forEach((button) => {
  button.addEventListener("click", () => selectScenario(button));
});

document.getElementById("setupBtn").addEventListener("click", () => {
  try {
    stopGo();
    setupSimulation();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("goBtn").addEventListener("click", () => {
  try {
    startGo();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("stopBtn").addEventListener("click", stopGo);

document.getElementById("stepBtn").addEventListener("click", () => {
  try {
    if (!sim.params) setupSimulation();
    stopGo();
    oneTick();
  } catch (err) {
    alert(err.message);
  }
});

setupSimulation();

window.__simBooted = true;

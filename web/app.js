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

const EFFORTS = ["L", "M", "H"];
const COST = { L: 0, M: 5, H: 10 };
const BENEFIT = { L: 0, M: 10, H: 100 };
const CLASS_BY_EFFORT = { L: "low", M: "medium", H: "high" };

const sim = {
  rng: new LCG(42),
  period: 0,
  agents: [],
  groups: [],
  params: null,
  running: false,
  timer: null,
  phase: "idle", // idle -> grouped -> survival -> death -> birth
};

function el(id) { return document.getElementById(id); }

function readParams() {
  const params = {
    populationSize: Number(el("populationSize").value),
    groupSize: Number(el("groupSize").value),
    periods: Number(el("periods").value),
    seed: Number(el("seed").value),
    deathFrames: Number(el("deathFrames").value),
    fps: Number(el("fps").value),
    survivalRule: el("survivalRule").value,
    babyRule: el("babyRule").value,
  };
  if (params.populationSize < 100 || params.populationSize > 300) throw new Error("Population must be 100-300.");
  if (params.groupSize < 2 || params.groupSize > params.populationSize) throw new Error("Group size must be between 2 and population.");
  if (params.deathFrames < 3 || params.deathFrames > 5) throw new Error("Death frames must be 3-5.");
  return params;
}

function createAgent(rng, inheritedEffort = null) {
  return {
    effort: inheritedEffort ?? rng.choice(EFFORTS),
    payoff: 0,
    pSurvival: 0,
    dead: false,
    deathFramesLeft: 0,
  };
}

function createPopulation() {
  sim.params = readParams();
  sim.rng = new LCG(sim.params.seed);
  sim.period = 0;
  sim.agents = Array.from({ length: sim.params.populationSize }, () => createAgent(sim.rng));
  sim.groups = [];
  sim.phase = "idle";
  el("historyBody").innerHTML = "";
  setStatus("Population created.");
  updateStats();
  renderGroups();
}

function formGroups() {
  if (!sim.params) createPopulation();
  sim.groups = [];

  // no visual shuffle needed; deterministic grouping by current order
  for (let i = 0; i < sim.agents.length; i += sim.params.groupSize) {
    const memberIndices = [];
    for (let j = i; j < Math.min(i + sim.params.groupSize, sim.agents.length); j++) memberIndices.push(j);
    sim.groups.push({ memberIndices, minEffort: "L", benefit: 0, avgPayoff: 0 });
  }
  sim.phase = "grouped";
  setStatus(`Groups formed: ${sim.groups.length}.`);
  renderGroups();
}

function minEffort(efforts) {
  if (efforts.includes("L")) return "L";
  if (efforts.includes("M")) return "M";
  return "H";
}

function payoffToSurvivalProbability(payoff) {
  // payoff -10..90 mapped to 0..1
  return Math.max(0, Math.min(1, (payoff + 10) / 100));
}

function evaluateSurvival() {
  if (sim.groups.length === 0) formGroups();

  for (const g of sim.groups) {
    const members = g.memberIndices.map((idx) => sim.agents[idx]);
    const efforts = members.map((a) => a.effort);
    g.minEffort = minEffort(efforts);
    g.benefit = BENEFIT[g.minEffort];

    let sumPayoff = 0;
    for (const idx of g.memberIndices) {
      const a = sim.agents[idx];
      a.payoff = g.benefit - COST[a.effort];
      a.pSurvival = sim.params.survivalRule === "equal" ? 0.5 : payoffToSurvivalProbability(a.payoff);
      a.dead = sim.rng.random() > a.pSurvival;
      a.deathFramesLeft = a.dead ? sim.params.deathFrames : 0;
      sumPayoff += a.payoff;
    }
    g.avgPayoff = sumPayoff / g.memberIndices.length;
  }

  sim.phase = "survival";
  setStatus("Survival probabilities computed. Dead strings are now gray.");
  renderGroups();
}

function stepDeathBirthFrame() {
  if (sim.phase === "grouped") {
    evaluateSurvival();
    return;
  }

  if (sim.phase === "survival" || sim.phase === "death") {
    let hasGray = false;
    for (const a of sim.agents) {
      if (a.dead && a.deathFramesLeft > 0) {
        a.deathFramesLeft -= 1;
        hasGray = hasGray || a.deathFramesLeft > 0;
      }
    }

    if (hasGray) {
      sim.phase = "death";
      setStatus("Dead strings grayed out (death frames).");
      renderGroups();
      return;
    }

    const aliveEfforts = sim.agents.filter((a) => !a.dead).map((a) => a.effort);
    const survivors = sim.agents.filter((a) => !a.dead);
    const deadCount = sim.agents.length - survivors.length;

    for (let i = 0; i < deadCount; i++) {
      let babyEffort;
      if (sim.params.babyRule === "fromAlive" && aliveEfforts.length > 0) {
        babyEffort = sim.rng.choice(aliveEfforts);
      } else {
        babyEffort = sim.rng.choice(EFFORTS);
      }
      survivors.push(createAgent(sim.rng, babyEffort));
    }

    sim.agents = survivors;
    sim.phase = "birth";
    sim.period += 1;
    appendHistory();
    formGroups();
    setStatus(`Birth completed. New period ${sim.period}.`);
    renderGroups();
    return;
  }
}

function runPeriods() {
  if (!sim.params) createPopulation();
  if (sim.running) return;
  sim.running = true;
  const ms = Math.max(30, Math.round(1000 / sim.params.fps));

  sim.timer = setInterval(() => {
    if (sim.period >= sim.params.periods) {
      stopRun();
      setStatus("Stopped: target periods reached.");
      return;
    }

    if (sim.phase === "idle" || sim.phase === "birth") formGroups();
    if (sim.phase === "grouped") evaluateSurvival();
    else stepDeathBirthFrame();
  }, ms);
}

function stopRun() {
  sim.running = false;
  if (sim.timer) clearInterval(sim.timer);
  sim.timer = null;
}

function shareOf(effort) {
  if (sim.agents.length === 0) return 0;
  return sim.agents.filter((a) => a.effort === effort).length / sim.agents.length;
}

function updateStats() {
  el("periodLabel").textContent = String(sim.period);
  el("aliveLabel").textContent = String(sim.agents.filter((a) => !a.dead).length);
  el("lLabel").textContent = `${(shareOf("L") * 100).toFixed(1)}%`;
  el("mLabel").textContent = `${(shareOf("M") * 100).toFixed(1)}%`;
  el("hLabel").textContent = `${(shareOf("H") * 100).toFixed(1)}%`;
}

function groupClassByBenefit(benefit) {
  if (benefit >= 100) return "high";
  if (benefit >= 10) return "medium";
  return "low";
}

function renderGroups() {
  const grid = el("groupsGrid");
  grid.innerHTML = "";

  for (let gi = 0; gi < sim.groups.length; gi++) {
    const g = sim.groups[gi];
    const box = document.createElement("div");
    box.className = `groupBox ${groupClassByBenefit(g.benefit)}`;

    const head = document.createElement("div");
    head.className = "groupHead";
    head.innerHTML = `<span>Group ${gi + 1} (n=${g.memberIndices.length})</span><span class="points">benefit: ${g.benefit}, avg: ${g.avgPayoff.toFixed(1)}</span>`;
    box.appendChild(head);

    const strings = document.createElement("div");
    strings.className = "strings";

    for (const idx of g.memberIndices) {
      const a = sim.agents[idx];
      const s = document.createElement("div");
      s.className = `string ${CLASS_BY_EFFORT[a.effort]}${a.dead ? " dead" : ""}`;
      s.title = `effort=${a.effort}, payoff=${a.payoff}, p_survival=${a.pSurvival.toFixed(2)}${a.dead ? ", DEAD" : ""}`;
      strings.appendChild(s);
    }

    box.appendChild(strings);
    grid.appendChild(box);
  }

  updateStats();
}

function appendHistory() {
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${sim.period}</td><td>${sim.agents.filter((a) => !a.dead).length}</td><td>${(shareOf("L") * 100).toFixed(1)}%</td><td>${(shareOf("M") * 100).toFixed(1)}%</td><td>${(shareOf("H") * 100).toFixed(1)}%</td>`;
  el("historyBody").prepend(tr);
}

function setStatus(msg) { el("status").textContent = msg; }

el("createBtn").addEventListener("click", () => {
  try { stopRun(); createPopulation(); }
  catch (e) { alert(e.message); }
});
el("groupBtn").addEventListener("click", () => {
  try { stopRun(); formGroups(); renderGroups(); }
  catch (e) { alert(e.message); }
});
el("survivalBtn").addEventListener("click", () => {
  try { stopRun(); evaluateSurvival(); }
  catch (e) { alert(e.message); }
});
el("nextBtn").addEventListener("click", () => {
  try { stopRun(); if (!sim.params) createPopulation(); stepDeathBirthFrame(); }
  catch (e) { alert(e.message); }
});
el("runBtn").addEventListener("click", () => {
  try { if (!sim.params) createPopulation(); runPeriods(); }
  catch (e) { alert(e.message); }
});
el("stopBtn").addEventListener("click", () => { stopRun(); setStatus("Stopped."); });

createPopulation();
formGroups();
renderGroups();
window.__simBooted = true;

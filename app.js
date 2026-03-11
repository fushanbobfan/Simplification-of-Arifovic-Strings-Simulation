class LCG {
  constructor(seed) {
    this.mod = 2147483647;
    this.mult = 48271;
    this.state = Math.abs(Math.floor(seed)) % this.mod;
    if (this.state === 0) this.state = 1;
  }
  random() { this.state = (this.state * this.mult) % this.mod; return this.state / this.mod; }
  randInt(max) { return Math.floor(this.random() * max); }
  choice(arr) { return arr[this.randInt(arr.length)]; }
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
  phase: "idle", // idle -> grouped -> survival_pre -> death -> birth
  preDeathHoldLeft: 0,
  snapshots: [],
};

function el(id) { return document.getElementById(id); }

function readParams() {
  const params = {
    populationSize: Number(el("populationSize").value),
    groupSize: Number(el("groupSize").value),
    periods: Number(el("periods").value),
    seed: Number(el("seed").value),
    deathFrames: Number(el("deathFrames").value),
    preDeathHold: Number(el("preDeathHold").value),
    fps: Number(el("fps").value),
    survivalRule: el("survivalRule").value,
    babyRule: el("babyRule").value,
  };
  if (params.populationSize < 100 || params.populationSize > 300) throw new Error("Population must be 100-300.");
  if (params.groupSize < 2 || params.groupSize > params.populationSize) throw new Error("Group size must be between 2 and population.");
  if (params.deathFrames < 3 || params.deathFrames > 8) throw new Error("Death frames must be 3-8.");
  if (params.preDeathHold < 1 || params.preDeathHold > 10) throw new Error("Pre-death hold must be 1-10.");
  return params;
}

function createAgent(rng, inheritedEffort = null) {
  return { effort: inheritedEffort ?? rng.choice(EFFORTS), payoff: 0, pSurvival: 0, dead: false, deathFramesLeft: 0 };
}

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

function saveSnapshot() {
  sim.snapshots.push({
    period: sim.period,
    agents: deepClone(sim.agents),
    groups: deepClone(sim.groups),
    params: deepClone(sim.params),
    phase: sim.phase,
    preDeathHoldLeft: sim.preDeathHoldLeft,
    status: el("status").textContent,
  });
  if (sim.snapshots.length > 200) sim.snapshots.shift();
}

function restorePreviousFrame() {
  if (sim.snapshots.length === 0) return;
  stopRun();
  const s = sim.snapshots.pop();
  sim.period = s.period;
  sim.agents = s.agents;
  sim.groups = s.groups;
  sim.params = s.params;
  sim.phase = s.phase;
  sim.preDeathHoldLeft = s.preDeathHoldLeft;
  setStatus(`Restored previous frame. ${s.status}`);
  renderGroups();
}

function createPopulation() {
  sim.params = readParams();
  sim.rng = new LCG(sim.params.seed);
  sim.period = 0;
  sim.agents = Array.from({ length: sim.params.populationSize }, () => createAgent(sim.rng));
  sim.groups = [];
  sim.phase = "idle";
  sim.preDeathHoldLeft = 0;
  sim.snapshots = [];
  el("historyBody").innerHTML = "";
  setStatus("Population created.");
  updateStats();
  renderGroups();
}

function formGroups() {
  if (!sim.params) createPopulation();
  sim.groups = [];
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

  sim.phase = "survival_pre";
  sim.preDeathHoldLeft = sim.params.preDeathHold;
  setStatus("Survival probabilities computed. Holding pre-death frames before gray-stage removal.");
  renderGroups();
}

function stepDeathBirthFrame() {
  if (sim.phase === "grouped") {
    evaluateSurvival();
    return;
  }

  if (sim.phase === "survival_pre") {
    sim.preDeathHoldLeft -= 1;
    if (sim.preDeathHoldLeft > 0) {
      setStatus(`Pre-death hold frame (${sim.preDeathHoldLeft} left).`);
      renderGroups();
      return;
    }
    sim.phase = "death";
  }

  if (sim.phase === "death") {
    let hasGray = false;
    for (const a of sim.agents) {
      if (a.dead && a.deathFramesLeft > 0) {
        a.deathFramesLeft -= 1;
        hasGray = hasGray || a.deathFramesLeft > 0;
      }
    }

    if (hasGray) {
      setStatus("Dead strings shown in gray (death frames).\n");
      renderGroups();
      return;
    }

    const aliveEfforts = sim.agents.filter((a) => !a.dead).map((a) => a.effort);
    const survivors = sim.agents.filter((a) => !a.dead);
    const deadCount = sim.agents.length - survivors.length;

    for (let i = 0; i < deadCount; i++) {
      let babyEffort;
      if (sim.params.babyRule === "fromAlive" && aliveEfforts.length > 0) babyEffort = sim.rng.choice(aliveEfforts);
      else babyEffort = sim.rng.choice(EFFORTS);
      survivors.push(createAgent(sim.rng, babyEffort));
    }

    sim.agents = survivors;
    sim.phase = "birth";
    sim.period += 1;
    appendHistory();
    formGroups();
    setStatus(`Birth completed. New period ${sim.period}.`);
    renderGroups();
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
    saveSnapshot();
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

function setGroupDetails(text) { el("groupDetails").textContent = text; }
function setStringDetails(text) { el("stringDetails").textContent = text; }

function renderGroups() {
  const grid = el("groupsGrid");
  grid.innerHTML = "";

  for (let gi = 0; gi < sim.groups.length; gi++) {
    const g = sim.groups[gi];
    const box = document.createElement("div");
    box.className = `groupBox ${groupClassByBenefit(g.benefit)}`;

    box.addEventListener("mouseenter", () => {
      setGroupDetails(
        `Group ${gi + 1}\n` +
        `Size: ${g.memberIndices.length}\n` +
        `Minimum effort: ${g.minEffort}\n` +
        `Group benefit: ${g.benefit}\n` +
        `Average payoff: ${g.avgPayoff.toFixed(2)}`
      );
    });

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
      s.addEventListener("mouseenter", () => {
        setStringDetails(
          `Effort: ${a.effort}\n` +
          `Payoff: ${a.payoff.toFixed(2)}\n` +
          `P(survival): ${a.pSurvival.toFixed(2)}\n` +
          `State: ${a.dead ? "Dead/gray" : "Alive"}`
        );
      });
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

function clearAllState() {
  stopRun();
  sim.period = 0;
  sim.agents = [];
  sim.groups = [];
  sim.params = null;
  sim.phase = "idle";
  sim.preDeathHoldLeft = 0;
  sim.snapshots = [];
  el("historyBody").innerHTML = "";
  setGroupDetails("Hover over a group box to see min effort, benefit, and average payoff.");
  setStringDetails("Hover over a string bar to see effort, payoff, and survival probability.");
  updateStats();
  renderGroups();
  setStatus("All simulation state cleared. Update parameters, then click Create population.");
}

el("createBtn").addEventListener("click", () => {
  try { stopRun(); createPopulation(); }
  catch (e) { alert(e.message); }
});
el("groupBtn").addEventListener("click", () => {
  try { stopRun(); saveSnapshot(); formGroups(); renderGroups(); }
  catch (e) { alert(e.message); }
});
el("survivalBtn").addEventListener("click", () => {
  try { stopRun(); saveSnapshot(); evaluateSurvival(); }
  catch (e) { alert(e.message); }
});
el("prevBtn").addEventListener("click", () => {
  try { restorePreviousFrame(); }
  catch (e) { alert(e.message); }
});
el("nextBtn").addEventListener("click", () => {
  try { stopRun(); if (!sim.params) createPopulation(); saveSnapshot(); stepDeathBirthFrame(); }
  catch (e) { alert(e.message); }
});
el("runBtn").addEventListener("click", () => {
  try { if (!sim.params) createPopulation(); runPeriods(); }
  catch (e) { alert(e.message); }
});
el("stopBtn").addEventListener("click", () => { stopRun(); setStatus("Stopped."); });
el("clearBtn").addEventListener("click", () => { clearAllState(); });

createPopulation();
formGroups();
renderGroups();
window.__simBooted = true;

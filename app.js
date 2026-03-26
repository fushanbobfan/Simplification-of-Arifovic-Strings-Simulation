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
const EASY_SURVIVAL_MULTIPLIER = 0.85;
const DEATH_FRAMES = 5;
const PRE_DEATH_HOLD = 3;
const BIRTH_HOLD_FRAMES = 4;
const DEFAULTS = {
  populationSize: 180,
  groupSize: 15,
  periods: 60,
  seed: 42,
  fps: 1,
  survivalConstant: 0.85,
  babyRule: "fromAlive",
  babyMixP: 0.5,
};

const sim = {
  rng: new LCG(DEFAULTS.seed),
  period: 0,
  agents: [],
  groups: [],
  params: null,
  running: false,
  loopHandle: null,
  phase: "idle",
  preDeathHoldLeft: 0,
  birthHoldLeft: 0,
  snapshots: [],
  mode: "easy",
};

function el(id) { return document.getElementById(id); }
function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

function addEvent(message) {
  const ul = el("eventLogList");
  const li = document.createElement("li");
  li.textContent = `[P${sim.period}] ${message}`;
  ul.prepend(li);
  while (ul.children.length > 8) ul.removeChild(ul.lastChild);
}

function setPhase(phase) {
  sim.phase = phase;
  const phases = ["idle", "grouped", "survival_pre", "death", "birth"];
  const hints = {
    idle: "Create population and groups to start.",
    grouped: "Groups are formed from a shuffled population.",
    survival_pre: "Payoffs and survival probabilities are computed.",
    death: "Dead strings are shown in gray for several frames.",
    birth: "Dead strings are replaced by babies to restore population size.",
  };
  el("phaseNow").textContent = `Current phase: ${phase}`;
  el("phaseHint").textContent = hints[phase] ?? "";

  for (const p of phases) {
    const node = el(`phase-${p}`);
    if (!node) continue;
    if (p === phase) node.classList.add("active");
    else node.classList.remove("active");
  }
}

function currentSurvivalEquation(multiplier) {
  return `P(survival) = (${multiplier.toFixed(2)} × payoff + 10) / 100`;
}

function updateBabyRuleUI() {
  el("mixedBabyControls").style.display = el("babyRule").value === "mixedP" ? "block" : "none";
}

function updateModeUI() {
  const isEasy = sim.mode === "easy";
  el("modeLabel").textContent = isEasy ? "Easy version" : "Hard version";
  el("modeToggleBtn").textContent = isEasy ? "Switch to hard" : "Switch to easy";
  el("controlsTitle").textContent = isEasy ? "Easy Version Controls" : "Hard Version Controls";
  el("hardControls").style.display = isEasy ? "none" : "block";
  const multiplier = isEasy ? EASY_SURVIVAL_MULTIPLIER : Number(el("survivalConstant").value);
  el("survivalEquationText").textContent = currentSurvivalEquation(multiplier);
}

function readParams() {
  const mode = sim.mode;
  const params = {
    mode,
    populationSize: Number(el("populationSize").value),
    groupSize: Number(el("groupSize").value),
    periods: Number(el("periods").value),
    seed: Number(el("seed").value),
    fps: Number(el("fps").value),
    babyRule: el("babyRule").value,
    babyMixP: Number(el("babyMixP").value),
    survivalConstant: mode === "easy" ? EASY_SURVIVAL_MULTIPLIER : Number(el("survivalConstant").value),
  };

  if (params.populationSize < 100 || params.populationSize > 300) throw new Error("Population must be 100-300.");
  if (params.groupSize < 2 || params.groupSize > params.populationSize) throw new Error("Group size must be between 2 and population.");
  if (params.fps < 1 || params.fps > 30) throw new Error("FPS must be 1-30.");
  if (Number.isNaN(params.survivalConstant) || params.survivalConstant < 0 || params.survivalConstant > 2) throw new Error("Hard-mode c must be 0-2.");
  if (Number.isNaN(params.babyMixP) || params.babyMixP < 0 || params.babyMixP > 1) throw new Error("Mixed baby rule p must be 0-1.");
  return params;
}

function hasStructuralChanges(newParams) {
  if (!sim.params) return true;
  return (
    sim.params.populationSize !== newParams.populationSize ||
    sim.params.groupSize !== newParams.groupSize ||
    sim.params.seed !== newParams.seed
  );
}

function applyLiveParams() {
  const p = readParams();
  if (!sim.params) {
    sim.params = p;
    return { structuralChanged: true };
  }
  const structuralChanged = hasStructuralChanges(p);
  sim.params.periods = p.periods;
  sim.params.fps = p.fps;
  sim.params.babyRule = p.babyRule;
  sim.params.babyMixP = p.babyMixP;
  sim.params.mode = p.mode;
  sim.params.survivalConstant = p.survivalConstant;
  return { structuralChanged, next: p };
}

function createAgent(rng, inheritedEffort = null) {
  return { effort: inheritedEffort ?? rng.choice(EFFORTS), payoff: 0, pSurvival: 0, willDie: false, deathFramesLeft: 0 };
}

function saveSnapshot() {
  sim.snapshots.push({
    period: sim.period,
    agents: deepClone(sim.agents),
    groups: deepClone(sim.groups),
    params: deepClone(sim.params),
    phase: sim.phase,
    preDeathHoldLeft: sim.preDeathHoldLeft,
    birthHoldLeft: sim.birthHoldLeft,
    status: el("status").textContent,
    mode: sim.mode,
    events: el("eventLogList").innerHTML,
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
  sim.mode = s.mode ?? sim.mode;
  sim.preDeathHoldLeft = s.preDeathHoldLeft;
  sim.birthHoldLeft = s.birthHoldLeft ?? 0;
  setPhase(s.phase);
  el("eventLogList").innerHTML = s.events ?? "";
  updateModeUI();
  setStatus("Restored previous frame.");
  renderGroups();
}

function resetInputsToDefaults() {
  el("populationSize").value = String(DEFAULTS.populationSize);
  el("groupSize").value = String(DEFAULTS.groupSize);
  el("periods").value = String(DEFAULTS.periods);
  el("seed").value = String(DEFAULTS.seed);
  el("fps").value = String(DEFAULTS.fps);
  el("survivalConstant").value = String(DEFAULTS.survivalConstant);
  el("babyRule").value = DEFAULTS.babyRule;
  el("babyMixP").value = String(DEFAULTS.babyMixP);
  updateBabyRuleUI();
}

function resetSimulation() {
  stopRun();
  resetInputsToDefaults();
  sim.params = null;
  sim.period = 0;
  sim.agents = [];
  sim.groups = [];
  sim.snapshots = [];
  sim.preDeathHoldLeft = 0;
  sim.birthHoldLeft = 0;
  sim.rng = new LCG(DEFAULTS.seed);
  el("historyBody").innerHTML = "";
  el("eventLogList").innerHTML = "";
  setGroupDetails("Hover over a group box to see min effort, benefit, and average payoff.");
  setStringDetails("Hover over a string bar to see effort, payoff, and survival probability.");
  createPopulation();
  formGroups();
  renderGroups();
  addEvent("Simulation reset to initial defaults.");
  setStatus("Simulation reset.");
}

function createPopulation(forcedParams = null) {
  sim.params = forcedParams ?? readParams();
  sim.mode = sim.params.mode;
  sim.rng = new LCG(sim.params.seed);
  sim.period = 0;
  sim.agents = Array.from({ length: sim.params.populationSize }, () => createAgent(sim.rng));
  sim.groups = [];
  sim.preDeathHoldLeft = 0;
  sim.birthHoldLeft = 0;
  sim.snapshots = [];
  el("historyBody").innerHTML = "";
  setPhase("idle");
  updateModeUI();
  setStatus("Population created.");
  addEvent("Created a new population.");
  updateStats();
  renderGroups();
}

function shuffledIndices(length, rng) {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formGroups() {
  if (!sim.params) createPopulation();
  sim.groups = [];
  const order = shuffledIndices(sim.agents.length, sim.rng);

  for (let i = 0; i < order.length; i += sim.params.groupSize) {
    sim.groups.push({
      memberIndices: order.slice(i, Math.min(i + sim.params.groupSize, order.length)),
      minEffort: "L",
      benefit: 0,
      avgPayoff: 0,
    });
  }

  setPhase("grouped");
  setStatus(`Groups formed: ${sim.groups.length}.`);
  addEvent(`Formed ${sim.groups.length} groups from shuffled population.`);
  renderGroups();
}

function minEffort(efforts) {
  if (efforts.includes("L")) return "L";
  if (efforts.includes("M")) return "M";
  return "H";
}

function payoffToSurvivalProbability(payoff) {
  const c = sim.params?.survivalConstant ?? EASY_SURVIVAL_MULTIPLIER;
  return Math.max(0, Math.min(1, (c * payoff + 10) / 100));
}

function evaluateSurvival() {
  if (sim.groups.length === 0) formGroups();
  applyLiveParams();
  updateModeUI();

  let deadCount = 0;
  for (const g of sim.groups) {
    const members = g.memberIndices.map((idx) => sim.agents[idx]);
    const efforts = members.map((a) => a.effort);
    g.minEffort = minEffort(efforts);
    g.benefit = BENEFIT[g.minEffort];

    let sumPayoff = 0;
    for (const idx of g.memberIndices) {
      const a = sim.agents[idx];
      a.payoff = g.benefit - COST[a.effort];
      a.pSurvival = payoffToSurvivalProbability(a.payoff);
      a.willDie = sim.rng.random() > a.pSurvival;
      a.deathFramesLeft = a.willDie ? DEATH_FRAMES : 0;
      if (a.willDie) deadCount += 1;
      sumPayoff += a.payoff;
    }
    g.avgPayoff = sumPayoff / g.memberIndices.length;
  }

  setPhase("survival_pre");
  sim.preDeathHoldLeft = PRE_DEATH_HOLD;
  sim.birthHoldLeft = 0;
  addEvent(`Computed survival probabilities. Dead this step: ${deadCount}.`);
  setStatus(`Survival computed (${sim.mode} mode).`);
  renderGroups();
}

function stepDeathBirthFrame() {
  if (sim.phase === "birth") {
    if (sim.birthHoldLeft <= 0) sim.birthHoldLeft = BIRTH_HOLD_FRAMES;
    sim.birthHoldLeft -= 1;
    if (sim.birthHoldLeft > 0) {
      setStatus(`Birth stage: newborns visible (${sim.birthHoldLeft} frames left).`);
      renderGroups();
      return;
    }
    formGroups();
    return;
  }

  if (sim.phase === "grouped") {
    evaluateSurvival();
    return;
  }

  if (sim.phase === "survival_pre") {
    sim.preDeathHoldLeft -= 1;
    if (sim.preDeathHoldLeft > 0) {
      setStatus(`Showing payoff results before death (${sim.preDeathHoldLeft} frames left).`);
      renderGroups();
      return;
    }
    setPhase("death");
    addEvent("Entered death visualization stage.");
  }

  if (sim.phase === "death") {
    let hasGray = false;
    for (const a of sim.agents) {
      if (a.willDie && a.deathFramesLeft > 0) {
        a.deathFramesLeft -= 1;
        hasGray = hasGray || a.deathFramesLeft > 0;
      }
    }

    if (hasGray) {
      setStatus("Dead strings shown in gray (visual transition).");
      renderGroups();
      return;
    }

    const aliveEfforts = sim.agents.filter((a) => !a.willDie).map((a) => a.effort);
    const survivors = sim.agents.filter((a) => !a.willDie);
    const deadCount = sim.agents.length - survivors.length;

    for (let i = 0; i < deadCount; i++) {
      let babyEffort;
      if (sim.params.babyRule === "fromAlive" && aliveEfforts.length > 0) {
        babyEffort = sim.rng.choice(aliveEfforts);
      } else if (sim.params.babyRule === "mixedP") {
        if (sim.rng.random() < sim.params.babyMixP && aliveEfforts.length > 0) babyEffort = sim.rng.choice(aliveEfforts);
        else babyEffort = sim.rng.choice(EFFORTS);
      } else {
        babyEffort = sim.rng.choice(EFFORTS);
      }
      survivors.push(createAgent(sim.rng, babyEffort));
    }

    sim.agents = survivors;
    setPhase("birth");
    sim.birthHoldLeft = BIRTH_HOLD_FRAMES;
    sim.period += 1;
    appendHistory();
    addEvent(`Birth stage: replaced ${deadCount} dead strings.`);
    setStatus(`Birth stage entered. New period ${sim.period}.`);
    renderGroups();
    return;
  }
  stepDeathBirthFrame();
}


function advanceOnePhase() {
  if (sim.phase === "idle") {
    formGroups();
    return;
  }
  if (sim.phase === "grouped") {
    evaluateSurvival();
    return;
  }
  stepDeathBirthFrame();
}


function advanceOnePhase() {
  if (sim.phase === "idle") {
    formGroups();
    return;
  }
  if (sim.phase === "grouped") {
    evaluateSurvival();
    return;
  }
  stepDeathBirthFrame();
}


function advanceOnePhase() {
  if (sim.phase === "idle") {
    formGroups();
    return;
  }
  if (sim.phase === "grouped") {
    evaluateSurvival();
    return;
  }
  stepDeathBirthFrame();
}

function runLoopStep() {
  if (!sim.running) return;
  try {
    const { structuralChanged, next } = applyLiveParams();
    if (structuralChanged && sim.params) {
      createPopulation(next);
      formGroups();
    }

    if (sim.period >= sim.params.periods) {
      stopRun();
      setStatus("Stopped: target periods reached.");
      addEvent("Run finished at target period.");
      return;
    }

    saveSnapshot();
    advanceOnePhase();
  } catch (e) {
    stopRun();
    alert(e.message);
    return;
  }

  const ms = Math.max(30, Math.round(1000 / sim.params.fps));
  sim.loopHandle = setTimeout(runLoopStep, ms);
}

function runPeriods() {
  if (!sim.params) createPopulation();
  if (sim.running) return;
  const { structuralChanged, next } = applyLiveParams();
  if (structuralChanged) {
    createPopulation(next);
    formGroups();
  }
  sim.running = true;
  addEvent("Auto-run started.");
  runLoopStep();
}

function stopRun() {
  sim.running = false;
  if (sim.loopHandle) clearTimeout(sim.loopHandle);
  sim.loopHandle = null;
}

function shareOf(effort) {
  if (sim.agents.length === 0) return 0;
  return sim.agents.filter((a) => a.effort === effort).length / sim.agents.length;
}

function updateStats() {
  el("periodLabel").textContent = String(sim.period);
  el("aliveLabel").textContent = String(sim.phase === "death" || sim.phase === "survival_pre" ? sim.agents.filter((a) => !a.willDie).length : sim.agents.length);
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
function setStatus(msg) { el("status").textContent = msg; }

function renderGroups() {
  const grid = el("groupsGrid");
  grid.innerHTML = "";

  for (let gi = 0; gi < sim.groups.length; gi++) {
    const g = sim.groups[gi];
    const box = document.createElement("div");
    box.className = `groupBox ${groupClassByBenefit(g.benefit)}`;

    box.addEventListener("mouseenter", () => {
      setGroupDetails(
        `Group ${gi + 1}\nSize: ${g.memberIndices.length}\nMinimum effort: ${g.minEffort}\nGroup benefit: ${g.benefit}\nAverage payoff: ${g.avgPayoff.toFixed(2)}`
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
      const showDead = sim.phase === "death" && a.willDie;
      s.className = `string ${CLASS_BY_EFFORT[a.effort]}${showDead ? " dead" : ""}`;
      s.addEventListener("mouseenter", () => {
        setStringDetails(
          `Effort: ${a.effort}\nPayoff: ${a.payoff.toFixed(2)}\nP(survival): ${a.pSurvival.toFixed(2)}\nState: ${a.willDie ? (sim.phase === "death" ? "Dead/gray" : "Marked for removal") : "Alive"}`
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
  tr.innerHTML = `<td>${sim.period}</td><td>${sim.agents.length}</td><td>${(shareOf("L") * 100).toFixed(1)}%</td><td>${(shareOf("M") * 100).toFixed(1)}%</td><td>${(shareOf("H") * 100).toFixed(1)}%</td>`;
  el("historyBody").prepend(tr);
}

el("modeToggleBtn").addEventListener("click", () => {
  sim.mode = sim.mode === "easy" ? "hard" : "easy";
  updateModeUI();
  if (sim.params) {
    applyLiveParams();
    addEvent(`Switched to ${sim.mode} mode.`);
    setStatus(`Switched to ${sim.mode} mode.`);
  }
});
el("babyRule").addEventListener("change", () => {
  updateBabyRuleUI();
  if (sim.params) applyLiveParams();
});
el("survivalConstant").addEventListener("input", () => {
  if (sim.mode === "hard") {
    updateModeUI();
    if (sim.params) applyLiveParams();
  }
});

el("createBtn").addEventListener("click", () => { try { stopRun(); createPopulation(); } catch (e) { alert(e.message); } });
el("groupBtn").addEventListener("click", () => { try { stopRun(); saveSnapshot(); formGroups(); } catch (e) { alert(e.message); } });
el("survivalBtn").addEventListener("click", () => { try { stopRun(); saveSnapshot(); evaluateSurvival(); } catch (e) { alert(e.message); } });
el("prevBtn").addEventListener("click", () => { try { restorePreviousFrame(); } catch (e) { alert(e.message); } });
el("nextBtn").addEventListener("click", () => {
  try {
    stopRun();
    if (!sim.params) createPopulation();
    applyLiveParams();
    saveSnapshot();
    advanceOnePhase();
  } catch (e) { alert(e.message); }
});
el("runBtn").addEventListener("click", () => { try { if (!sim.params) createPopulation(); runPeriods(); } catch (e) { alert(e.message); } });
el("stopBtn").addEventListener("click", () => { stopRun(); addEvent("Run stopped by user."); setStatus("Stopped."); });
el("resetBtn").addEventListener("click", () => { resetSimulation(); });

resetInputsToDefaults();
updateBabyRuleUI();
updateModeUI();
setPhase("idle");
resetSimulation();
window.__simBooted = true;

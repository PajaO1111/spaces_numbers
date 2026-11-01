import * as THREE from "three";
import { OrbitControls } from "../vendor/three/addons/controls/OrbitControls.js";
import { gsap } from "../vendor/gsap/gsap.js";
import OctonionMath from "../vendor/octonion-math.mjs";
import { FANO_LINES, INCIDENCE_EDGES, TRIPLES } from "../data/octonion-data.js";
import { LayeredView } from "./layered-view.js";
import { IncidenceView } from "./incidence-view.js";
import { FanoView } from "./fano-view.js";
import { OctonionView } from "./octonion-view.js";
import { AssociatorView } from "./associator-view.js";

const label = unit => `e${unit}`;
const vectorText = vector => `(${vector.map(value => {
  const clean = Math.abs(value) < 1e-10 ? 0 : value;
  return Number(clean.toFixed(5)).toLocaleString("cs-CZ");
}).join("; ")})`;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const host = document.querySelector("#scene-host");
const controlsPanel = document.querySelector("#mode-controls");
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111827);
scene.add(new THREE.HemisphereLight(0xdce9ff, 0x18202d, 2.2));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
keyLight.position.set(6, 8, 10); scene.add(keyLight);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
} catch {
  const message = document.createElement("p");
  message.className = "webgl-error";
  message.textContent = "3D vykreslení není dostupné. Zkontroluj podporu WebGL a ovladače prohlížeče. Matematické definice zůstávají dostupné v základní expozici.";
  host.replaceChildren(message);
  document.querySelector("#scene-help").textContent = "Tento prohlížeč nemůže zobrazit 3D scénu. Otevři základní expozici pro textové výklady a alternativní vizualizace.";
  controlsPanel.innerHTML = `<p class="muted">Interaktivní 3D režimy vyžadují WebGL. Výpočty a výukový obsah jsou dostupné v <a href="/">základní expozici</a>.</p>`;
  document.querySelectorAll(".mode-button, #reset-camera").forEach(control => { control.disabled = true; });
}
if (renderer) {
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
host.append(renderer.domElement);
renderer.domElement.setAttribute("aria-label", "3D scéna. Použij ovládací prvky pod scénou pro přístup bez myši.");

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
camera.position.set(0, -11, 12);
camera.up.set(0, 0, 1);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.075;
orbit.minDistance = 4;
orbit.maxDistance = 45;
orbit.target.set(0, 0, 0);

const state = { mode: "layered", tripleIndex: 0, unit: null, focus: new THREE.Vector3() };
const layered = new LayeredView({
  onTriple: index => selectTriple(index),
  onUnit: unit => selectUnit(unit)
});
const incidence = new IncidenceView({ onTriple: index => selectTriple(index) });
const fano = new FanoView({
  onUnit: unit => selectUnit(unit),
  onLine: (index, triple) => selectFanoLine(index, triple)
});
const octonion = new OctonionView({
  controls: controlsPanel,
  onProduct: result => renderProduct(result)
});
const associator = new AssociatorView({
  controls: controlsPanel,
  onResult: result => renderAssociator(result)
});

const viewGroups = {
  layered: [layered.group],
  incidence: [incidence.group],
  fano: [fano.group],
  octonion: [octonion.group],
  associator: [associator.group],
  universe: [layered.group, fano.group]
};
const allGroups = [...new Set(Object.values(viewGroups).flat())];
allGroups.forEach(group => { group.visible = false; scene.add(group); });
layered.setSelection(state.tripleIndex, null);
fano.setSelection(null);
octonion.setSelection(1, 2);

function tripleLabel(triple) {
  return triple.vertices.map(label).join(" · ");
}

function updateCombinationStatistics() {
  const counts = [
    ["Trojice", TRIPLES.length],
    ["Vrstev", 5],
    ["Fanoovy trojice", FANO_LINES.length],
    ["Incidenční vazby", INCIDENCE_EDGES.length],
    ["Sdílejí 1 bod", INCIDENCE_EDGES.filter(edge => edge.shared.length === 1).length],
    ["Sdílejí 2 body", INCIDENCE_EDGES.filter(edge => edge.shared.length === 2).length]
  ];
  const container = document.querySelector("#combination-statistics");
  container.replaceChildren(...counts.flatMap(([term, value]) => {
    const dt = document.createElement("dt"), dd = document.createElement("dd");
    dt.textContent = term; dd.textContent = String(value); return [dt, dd];
  }));
}

function renderFanoRelations() {
  const container = document.querySelector("#fano-relations");
  container.replaceChildren(...FANO_LINES.map((line, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "relation-button";
    button.dataset.fanoLine = String(index);
    button.setAttribute("aria-pressed", "false");
    button.textContent = `${label(line[0])} × ${label(line[1])} = ${label(line[2])}`;
    button.addEventListener("click", () => selectFanoLine(index, line));
    return button;
  }));
}

function updateIncidenceMetrics(index = state.tripleIndex) {
  const triple = TRIPLES[index], edge = incidence.metrics[index];
  const sharedCounts = [0, 0, 0];
  for (const other of TRIPLES) {
    if (other.id === triple.id) continue;
    const shared = triple.vertices.filter(unit => other.vertices.includes(unit)).length;
    sharedCounts[shared]++;
  }
  document.querySelector("#incidence-metrics").textContent =
    `${tripleLabel(triple)} · stupeň ${edge.degree}/34 · normalizovaná stupňová centralita ${edge.degreeCentrality.toFixed(3)} · ` +
    `mezi sousedy shlukovací koeficient ${edge.clustering.toFixed(3)} · betweenness centrality ${edge.betweenness.toFixed(3)}. ` +
    `Sdílené body s ostatními: 1 → ${sharedCounts[1]}, 2 → ${sharedCounts[2]}, 0 → ${sharedCounts[0]}.`;
}

function renderProduct(result) {
  if (!result) return;
  const first = result.first === 0 ? "1" : label(result.first);
  const second = result.second === 0 ? "1" : label(result.second);
  const output = result.sign < 0 ? `−${result.resultIndex === 0 ? "1" : label(result.resultIndex)}`
    : result.resultIndex === 0 ? "1" : label(result.resultIndex);
  document.querySelector("#multiplication-result").textContent =
    `${first} × ${second} = ${output}. Vektor v pevném pořadí složek (1,e₁,…,e₇): ${vectorText(result.result)}.`;
}

function renderAssociator(result) {
  if (!result) return;
  document.querySelector("#associator-result").textContent =
    `${result.units.join(", ")} · (xy)z = ${vectorText(result.left)}; x(yz) = ${vectorText(result.right)}; ` +
    `[x,y,z] = ${vectorText(result.associator)}; norma ≈ ${result.norm.toLocaleString("cs-CZ", { maximumFractionDigits: 5 })}.`;
}

function setFocusForTriple(index) {
  const triple = TRIPLES[index];
  state.focus.set(0, 0, 0);
  const active = state.mode === "incidence" ? incidence.positions[index] : null;
  if (active) state.focus.fromArray(active);
  else if (state.mode === "layered" || state.mode === "universe") {
    const layer = triple.layer;
    const points = triple.vertices.map(unit => {
      const angle = -Math.PI / 2 + (unit - 1) * Math.PI * 2 / 7;
      return new THREE.Vector3(Math.cos(angle) * 3.4, Math.sin(angle) * 3.4, (3 - layer) * 1.15);
    });
    points.forEach(point => state.focus.add(point));
    state.focus.divideScalar(3);
  }
}

function selectTriple(index) {
  if (!Number.isInteger(index) || !TRIPLES[index]) return;
  state.tripleIndex = index; state.unit = null;
  layered.setSelection(index, null);
  incidence.setSelection(index);
  setFocusForTriple(index);
  updateIncidenceMetrics(index);
  document.querySelector("#selection-status").textContent =
    `Vybraná trojice ${tripleLabel(TRIPLES[index])}; vrstva ${TRIPLES[index].layer}; ` +
    `asociátor ${TRIPLES[index].isFano ? "nulový (Fanoova přímka)" : "nenulový"}.`;
  document.querySelectorAll("[data-triple-select]").forEach(select => { select.value = String(index); });
  document.querySelectorAll("[data-fano-line]").forEach(button => button.setAttribute("aria-pressed", "false"));
}

function selectUnit(unit) {
  if (!Number.isInteger(unit) || unit < 1 || unit > 7) return;
  state.unit = unit;
  layered.setSelection(state.tripleIndex, unit);
  fano.setSelection(unit);
  incidence.setSelection(null, unit);
  const occurrences = TRIPLES.filter(triple => triple.vertices.includes(unit)).length;
  document.querySelector("#selection-status").textContent =
    `${label(unit)} se vyskytuje v ${occurrences} z 35 trojic. Zvýrazněny jsou odpovídající vazby.`;
}

function selectFanoLine(index, line) {
  const tripleIndex = TRIPLES.findIndex(triple => triple.vertices.join(",") === line.slice().sort((a, b) => a - b).join(","));
  fano.setSelection(null, index);
  selectTriple(tripleIndex);
  document.querySelectorAll("[data-fano-line]").forEach(button =>
    button.setAttribute("aria-pressed", String(Number(button.dataset.fanoLine) === index)));
  document.querySelector("#multiplication-result").textContent =
    `Orientovaná Fanoova trojice: ${label(line[0])}×${label(line[1])}=${label(line[2])}; ` +
    `${label(line[1])}×${label(line[2])}=${label(line[0])}; ${label(line[2])}×${label(line[0])}=${label(line[1])}. Opačné pořadí mění znaménko.`;
}

function buildLayerControls() {
  const fieldset = document.createElement("fieldset");
  fieldset.className = "layer-controls vn-inset-surface";
  const legend = document.createElement("legend"); legend.textContent = "Viditelné vrstvy";
  fieldset.append(legend);
  for (let layer = 1; layer <= 5; layer++) {
    const labelElement = document.createElement("label");
    const input = document.createElement("input"); input.type = "checkbox"; input.checked = true; input.value = String(layer);
    input.addEventListener("change", () => {
      layered.visibleLayers[layer - 1] = input.checked;
      layered.setLayers(layered.visibleLayers);
    });
    labelElement.append(input, `Vrstva ${layer}`); fieldset.append(labelElement);
  }
  controlsPanel.replaceChildren(fieldset);
  return { fieldset };
}
const layerControl = buildLayerControls();

function buildIncidenceControls() {
  const controls = document.createElement("div"); controls.className = "control-card vn-inset-surface";
  controls.innerHTML = `<h3>Filtry grafu</h3><div class="layer-controls">
    <label><input type="checkbox" data-edge="weak" checked> Slabá vazba · 1 společný bod</label>
    <label><input type="checkbox" data-edge="strong" checked> Silná vazba · 2 společné body</label></div>
    <label class="select-label">Zaměřit trojici<select class="select-input" data-triple-select></select></label>`;
  const weak = controls.querySelector('[data-edge="weak"]');
  const strong = controls.querySelector('[data-edge="strong"]');
  weak.checked = incidence.weakLines.visible;
  strong.checked = incidence.strongLines.visible;
  weak.addEventListener("change", () => { incidence.weakLines.visible = weak.checked; });
  strong.addEventListener("change", () => { incidence.strongLines.visible = strong.checked; });
  const select = controls.querySelector("[data-triple-select]");
  TRIPLES.forEach((triple, index) => {
    const option = document.createElement("option"); option.value = String(index); option.textContent = tripleLabel(triple); select.append(option);
  });
  select.addEventListener("change", () => selectTriple(Number(select.value)));
  controlsPanel.replaceChildren(controls);
}

function buildFanoControls() {
  const panel = document.createElement("div"); panel.className = "control-card vn-inset-surface";
  panel.innerHTML = `<h3>Orientace</h3><p class="muted">Po směru orientované linie je součin kladný; opačný směr mění znaménko.</p>
    <div class="fano-control-list"></div>`;
  const list = panel.querySelector(".fano-control-list");
  FANO_LINES.forEach((line, index) => {
    const button = document.createElement("button"); button.type = "button"; button.className = "relation-button";
    button.dataset.fanoLine = String(index);
    button.textContent = `${label(line[0])} → ${label(line[1])} → ${label(line[2])}`;
    button.addEventListener("click", () => selectFanoLine(index, line));
    list.append(button);
  });
  controlsPanel.replaceChildren(panel);
}

function buildUniverseControls() {
  const panel = document.createElement("div"); panel.className = "control-card vn-inset-surface";
  panel.innerHTML = `<h3>Společný pohled</h3><p>Vrstvy úplného hypergrafu a sedm orientovaných Fanoových trojic jsou zobrazeny současně. Čárky a barvy neznázorňují další násobení.</p>
    <label><input type="checkbox" data-universe-fano checked> Zobrazit Fanoovy linie</label>`;
  const checkbox = panel.querySelector("input");
  checkbox.addEventListener("change", () => { fano.group.visible = checkbox.checked; });
  controlsPanel.replaceChildren(panel);
}

function renderLegend(mode) {
  const legend = document.querySelector("#scene-legend");
  const entries = mode === "layered" || mode === "universe"
    ? [["#22b8cf", "Vrstva 1"], ["#ed8b23", "Vrstva 2"], ["#ae85ed", "Vrstva 3"], ["#36ad76", "Vrstva 4"], ["#de73ad", "Vrstva 5"]]
    : mode === "incidence" ? [["#73c9e8", "1 společný bod"], ["#eabf54", "2 společné body"]]
      : [["#f0c86c", "Orientovaná Fanoova linie"], ["#7bd8e9", "Bázová jednotka"]];
  legend.replaceChildren(...entries.map(([color, text]) => {
    const item = document.createElement("span"); item.className = "legend-item";
    const swatch = document.createElement("i"); swatch.style.setProperty("--swatch", color);
    item.append(swatch, text); return item;
  }));
}

const modeCopy = {
  layered: ["ÚPLNÝ 3-UNIFORMNÍ HYPERGRAF", "Vrstvené trojice", "Vrstevné barvy a výšky jsou organizační, nikoli algebraická souřadnice."],
  incidence: ["PÁROVÝ GRAF 35 HYPERHRAN", "Incidenční graf", "Každý uzel je trojice; hrana znamená jeden nebo dva společné body."],
  fano: ["7 ORIENTOVANÝCH PŘÍMEK", "Fanoova rovina", "Fanoova rovina shrnuje orientovaná pravidla násobení imaginárních jednotek."],
  octonion: ["NÁSOBENÍ V PEVNÉ BÁZI", "Oktonionové násobení", "Výsledek se počítá z oktonionového jádra, nikoli jen z popisku diagramu."],
  associator: ["TŘI ARGUMENTY · DVĚ UZÁVORKOVÁNÍ", "Asociátor", "Asociátor [x,y,z] = (xy)z − x(yz) měří selhání asociativity."],
  universe: ["HYPERGRAF + ALGEBRAICKÁ PODSTRUKTURA", "Universe projection", "Pět vrstev obsahuje všech 35 trojic; zlatá Fanoova vrstva označuje pouze sedm orientovaných přímek."]
};

function setMode(mode) {
  if (!viewGroups[mode]) return;
  const previous = state.mode;
  state.mode = mode;
  document.querySelectorAll(".mode-button").forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const [kicker, title, help] = modeCopy[mode];
  document.querySelector("#mode-kicker").textContent = kicker;
  document.querySelector("#mode-title").textContent = title;
  document.querySelector("#scene-help").textContent = help;
  renderLegend(mode);
  for (const group of allGroups) group.visible = viewGroups[mode].includes(group);
  if (mode === "layered") {
    controlsPanel.replaceChildren(layerControl.fieldset);
    layered.animateExplode(reducedMotion.matches);
  } else if (mode === "incidence") {
    buildIncidenceControls(); incidence.animateIn(reducedMotion.matches);
  } else if (mode === "fano") buildFanoControls();
  else if (mode === "octonion") octonion._buildControls();
  else if (mode === "associator") {
    associator._buildControls();
    associator.update();
  }
  else if (mode === "universe") {
    const panel = document.createElement("div"); panel.className = "control-card vn-inset-surface";
    panel.innerHTML = `<h3>Universe projection</h3><p>Překryv úplného hypergrafu a Fanoových vztahů. Ztlumená nebo skrytá plocha nemění incidenční statistiky.</p>`;
    controlsPanel.replaceChildren(panel, layerControl.fieldset);
  }
  if (previous !== mode && !reducedMotion.matches) {
    const targets = viewGroups[mode];
    for (const group of targets) {
      gsap.killTweensOf(group.scale);
      group.scale.setScalar(0.88);
      gsap.to(group.scale, { x: 1, y: 1, z: 1, duration: 0.48, ease: "power2.out" });
    }
  }
  document.querySelector("#combination-statistics").dataset.mode = mode;
}

function screenPoint(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
}

function activeView() {
  if (state.mode === "layered" || state.mode === "universe") return layered;
  if (state.mode === "incidence") return incidence;
  if (state.mode === "fano") return fano;
  if (state.mode === "octonion") return octonion;
  return associator;
}

let pointerStart = null;
renderer.domElement.addEventListener("pointerdown", event => {
  pointerStart = { x: event.clientX, y: event.clientY, button: event.button };
});
renderer.domElement.addEventListener("pointerup", event => {
  if (!pointerStart || pointerStart.button !== 0 ||
      Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) {
    pointerStart = null; return;
  }
  screenPoint(event);
  const view = activeView();
  const selected = view.raycast(raycaster);
  if (!selected && state.mode === "universe") fano.raycast(raycaster);
  pointerStart = null;
});
renderer.domElement.addEventListener("pointermove", event => {
  if (event.buttons) return;
  screenPoint(event);
  const view = activeView();
  if (!view.pickables) return;
  const hit = raycaster.intersectObjects(view.pickables, false)[0];
  if (!hit && state.mode === "universe") {
    const fanoHit = raycaster.intersectObjects(fano.pickables, false)[0];
    if (fanoHit?.object.userData.kind === "fano-line") {
      document.querySelector("#selection-status").textContent =
        `Orientovaná Fanoova trojice ${fanoHit.object.userData.triple.map(label).join(", ")}. Kliknutím vybereš vztah.`;
    } else if (fanoHit?.instanceId !== undefined) {
      document.querySelector("#selection-status").textContent =
        `${label(fano.unitForInstance[fanoHit.instanceId])} · Fanoova jednotka. Kliknutím vybereš bod.`;
    }
    return;
  }
  if (!hit) return;
  if (hit.object.userData.id) {
    const triple = TRIPLES.find(item => item.id === hit.object.userData.id);
    document.querySelector("#selection-status").textContent = `Trojice ${tripleLabel(triple)} · vrstva ${triple.layer}.`;
  } else if (hit.instanceId !== undefined && view === incidence) {
    const triple = TRIPLES[hit.instanceId];
    document.querySelector("#selection-status").textContent = `${tripleLabel(triple)} · ${view.metrics[hit.instanceId].degree} sousedů.`;
  }
});
renderer.domElement.addEventListener("dblclick", () => {
  orbit.target.copy(state.focus);
  camera.position.copy(state.focus).add(new THREE.Vector3(0, -8, 8));
  orbit.update();
});

document.querySelectorAll(".mode-button").forEach(button =>
  button.addEventListener("click", () => setMode(button.dataset.mode)));
document.querySelector("#reset-camera").addEventListener("click", () => {
  orbit.target.set(0, 0, 0); camera.position.set(0, -11, 12); orbit.update();
});

const savedTheme = localStorage.getItem("octonion-explorer-theme");
if (savedTheme === "light") document.documentElement.dataset.theme = "light";
const themeButton = document.querySelector("#theme-toggle");
function renderTheme() {
  const light = document.documentElement.dataset.theme === "light";
  themeButton.textContent = light ? "Tmavý režim" : "Světlý režim";
  themeButton.setAttribute("aria-pressed", String(light));
  const pageColor = getComputedStyle(document.documentElement).getPropertyValue("--vn-page").trim();
  scene.background.set(pageColor);
  document.querySelector('meta[name="theme-color"]').content = pageColor;
}
themeButton.addEventListener("click", () => {
  document.documentElement.dataset.theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  localStorage.setItem("octonion-explorer-theme", document.documentElement.dataset.theme);
  renderTheme();
});
renderTheme();

function resize() {
  const width = Math.max(1, host.clientWidth), height = Math.max(300, host.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(host);
resize();
updateCombinationStatistics();
renderFanoRelations();
updateIncidenceMetrics(0);
setMode("layered");
if (!reducedMotion.matches) layered.animateExplode(false);

let frame = 0;
function render() {
  frame = requestAnimationFrame(render);
  orbit.update();
  renderer.render(scene, camera);
}
render();
window.addEventListener("pagehide", () => {
  cancelAnimationFrame(frame);
  resizeObserver.disconnect();
  orbit.dispose();
  renderer.dispose();
}, { once: true });

Object.assign(window, {
  OctonionExplorer: Object.freeze({
    triples: TRIPLES.length,
    fanoLines: FANO_LINES.length,
    incidenceEdges: INCIDENCE_EDGES.length,
    selectTriple,
    selectUnit,
    setMode
  })
});
}

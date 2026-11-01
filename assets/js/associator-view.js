import * as THREE from "three";
import OctonionMath from "../vendor/octonion-math.mjs";

const unitLabel = index => index === 0 ? "1" : `e${index}`;
const vectorText = vector => `(${vector.map(value => {
  const clean = Math.abs(value) < 1e-10 ? 0 : value;
  return Number(clean.toFixed(5)).toLocaleString("cs-CZ");
}).join("; ")})`;

export class AssociatorView {
  constructor({ controls, onResult }) {
    this.group = new THREE.Group();
    this.controls = controls;
    this.onResult = onResult;
    this._buildControls();
    this._buildScene();
    this.update();
  }

  _buildControls() {
    const previousUnits = this.inputs?.map(input => input.value) ?? ["1", "2", "4"];
    const card = document.createElement("section");
    card.className = "control-card";
    card.innerHTML = `<h3>Volba tří argumentů</h3><div class="select-row">
      <label>x<select data-associator="x"></select></label>
      <label>y<select data-associator="y"></select></label>
      <label>z<select data-associator="z"></select></label></div>
      <div class="preset-row" role="group" aria-label="Příklady asociátoru">
        <button type="button" class="button button-quiet" data-preset="nonassoc">Neasociativní (e₁,e₂,e₄)</button>
        <button type="button" class="button button-quiet" data-preset="assoc">V ℍ (e₁,e₂,e₃)</button>
      </div>
      <div class="branch-results" aria-live="polite">
        <p data-result="left"></p><p data-result="right"></p><p data-result="associator"></p>
      </div>`;
    this.inputs = [...card.querySelectorAll("[data-associator]")];
    this.inputs.forEach((select, position) => {
      select.className = "select-input";
      for (let unit = 1; unit <= 7; unit++) {
        const option = document.createElement("option"); option.value = String(unit); option.textContent = `e${unit}`; select.append(option);
      }
      select.value = previousUnits[position] ?? String([1, 2, 4][position]);
      select.addEventListener("change", () => this.update());
    });
    card.querySelector('[data-preset="nonassoc"]').addEventListener("click", () => this.setPreset([1, 2, 4]));
    card.querySelector('[data-preset="assoc"]').addEventListener("click", () => this.setPreset([1, 2, 3]));
    this.leftOutput = card.querySelector('[data-result="left"]');
    this.rightOutput = card.querySelector('[data-result="right"]');
    this.associatorOutput = card.querySelector('[data-result="associator"]');
    this.controls.replaceChildren(card);
  }

  _buildScene() {
    this.branchGroups = [new THREE.Group(), new THREE.Group()];
    const colors = [0x68cde4, 0xf0c86c];
    this.branchGroups.forEach((group, branch) => {
      const points = [new THREE.Vector3(-3.2, 1.2 - branch * 2.4, 0),
        new THREE.Vector3(0, 1.2 - branch * 2.4, 0),
        new THREE.Vector3(3.2, 1.2 - branch * 2.4, 0)];
      const curve = new THREE.CatmullRomCurve3(points);
      const path = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 24, 0.045, 6, false),
        new THREE.MeshStandardMaterial({ color: colors[branch], emissive: colors[branch], emissiveIntensity: 0.12 })
      );
      group.add(path);
      const spheres = new THREE.InstancedMesh(
        new THREE.SphereGeometry(0.16, 12, 10),
        new THREE.MeshStandardMaterial({ color: colors[branch] }), 3
      );
      const dummy = new THREE.Object3D();
      points.forEach((point, index) => {
        dummy.position.copy(point); dummy.updateMatrix(); spheres.setMatrixAt(index, dummy.matrix);
      });
      group.add(spheres);
      this.group.add(group);
    });
    this.pickables = [];
  }

  setPreset(units) {
    this.inputs.forEach((input, index) => { input.value = String(units[index]); });
    this.update();
  }

  update() {
    const [x, y, z] = this.inputs.map(input => OctonionMath.basis(Number(input.value)));
    const left = OctonionMath.multiply(OctonionMath.multiply(x, y), z);
    const right = OctonionMath.multiply(x, OctonionMath.multiply(y, z));
    const associator = OctonionMath.associator(x, y, z);
    const norm = Math.hypot(...associator);
    const labels = this.inputs.map(input => `e${input.value}`);
    this.leftOutput.textContent = `Levá cesta (xy)z: ${labels[0]}×${labels[1]}=${vectorText(OctonionMath.multiply(x, y))}; poté ×${labels[2]} = ${vectorText(left)}`;
    this.rightOutput.textContent = `Pravá cesta x(yz): ${labels[1]}×${labels[2]}=${vectorText(OctonionMath.multiply(y, z))}; poté ${labels[0]}× = ${vectorText(right)}`;
    this.associatorOutput.textContent = `[x,y,z] = (xy)z − x(yz) = ${vectorText(associator)}; norma ≈ ${norm.toLocaleString("cs-CZ", { maximumFractionDigits: 5 })}. ` +
      (norm > 1e-10 ? "Cesty se větví: tato trojice je neasociativní." : "Obě cesty se shodují pro tuto trojici; neznamená to asociativitu celé 𝕆.");
    const same = left.every((value, index) => Math.abs(value - right[index]) < 1e-10);
    this.branchGroups[0].position.z = same ? 0 : 0.45;
    this.branchGroups[1].position.z = same ? 0 : -0.45;
    this.onResult({ units: labels, left, right, associator, norm, same });
  }

  raycast() { return null; }
}

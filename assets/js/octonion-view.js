import * as THREE from "three";
import OctonionMath from "../vendor/octonion-math.mjs";
import { FANO_LINES, UNITS } from "../data/octonion-data.js";

const label = unit => unit === 0 ? "1" : `e${unit}`;

export class OctonionView {
  constructor({ controls, onProduct }) {
    this.group = new THREE.Group();
    this.controls = controls;
    this.onProduct = onProduct;
    this._buildScene();
    this._buildControls();
  }

  _buildScene() {
    const positions = new Map(UNITS.map((unit, index) => {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / 7;
      return [unit, new THREE.Vector3(Math.cos(angle) * 3, Math.sin(angle) * 3, 0)];
    }));
    const nodes = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.16, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0x7bd8e9 }),
      7
    );
    nodes.userData.kind = "octonion-units";
    const dummy = new THREE.Object3D();
    UNITS.forEach((unit, index) => {
      dummy.position.copy(positions.get(unit));
      dummy.updateMatrix();
      nodes.setMatrixAt(index, dummy.matrix);
    });
    nodes.instanceMatrix.needsUpdate = true;
    this.group.add(nodes);
    this.nodes = nodes;
    this.lines = [];
    for (const [index, triple] of FANO_LINES.entries()) {
      const points = triple.map(unit => positions.get(unit));
      const line = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: 0x75d4e5, transparent: true, opacity: 0.72 })
      );
      line.userData = { lineIndex: index, triple };
      this.group.add(line);
      this.lines.push(line);
    }
    this.pickables = [nodes, ...this.lines];
    this.unitForInstance = UNITS.slice();
    this.group.userData.positions = positions;
  }

  _buildControls() {
    const previousFactors = this.factorInputs?.map(select => select.value) ?? ["1", "2"];
    const wrap = document.createElement("section");
    wrap.className = "control-card";
    wrap.innerHTML = `<h3>Výpočet součinu</h3><div class="select-row">
      <label>První faktor A<select data-factor="a"></select></label>
      <label>Druhý faktor B<select data-factor="b"></select></label></div>
      <p class="muted">Výsledek se počítá stejnou pevnou Cayley–Dicksonovou konvencí jako atlas.</p>
      <div class="matrix-scroll"><table class="product-table"><caption>Tabulka součinů 1,e₁…e₇</caption><thead></thead><tbody></tbody></table></div>`;
    this.factorInputs = [...wrap.querySelectorAll("[data-factor]")];
    for (const select of this.factorInputs) {
      select.className = "select-input";
      for (let unit = 0; unit <= 7; unit++) {
        const option = document.createElement("option");
        option.value = String(unit); option.textContent = label(unit); select.append(option);
      }
      select.addEventListener("change", () => this.updateProduct());
    }
    this.factorInputs.forEach((select, index) => {
      select.value = previousFactors[index] ?? String(index + 1);
    });
    const head = document.createElement("tr");
    for (let unit = 0; unit <= 7; unit++) {
      const cell = document.createElement("th"); cell.scope = "col"; cell.textContent = label(unit); head.append(cell);
    }
    wrap.querySelector("thead").append(head);
    for (let first = 0; first <= 7; first++) {
      const row = document.createElement("tr");
      const heading = document.createElement("th"); heading.scope = "row"; heading.textContent = label(first); row.append(heading);
      for (let second = 0; second <= 7; second++) {
        const value = OctonionMath.multiply(OctonionMath.basis(first), OctonionMath.basis(second));
        const index = value.findIndex(component => component !== 0);
        const cell = document.createElement("td");
        const button = document.createElement("button");
        button.type = "button"; button.className = "product-cell";
        button.textContent = `${value[index] < 0 ? "−" : ""}${label(index)}`;
        button.setAttribute("aria-label", `${label(first)} krát ${label(second)} je ${button.textContent}`);
        button.addEventListener("click", () => {
          this.factorInputs[0].value = String(first);
          this.factorInputs[1].value = String(second);
          this.updateProduct();
        });
        cell.append(button); row.append(cell);
      }
      wrap.querySelector("tbody").append(row);
    }
    this.controls.replaceChildren(wrap);
    this.updateProduct();
  }

  updateProduct() {
    const first = Number(this.factorInputs[0].value), second = Number(this.factorInputs[1].value);
    const product = OctonionMath.multiply(OctonionMath.basis(first), OctonionMath.basis(second));
    const resultIndex = product.findIndex(component => component !== 0);
    this.setSelection(first, second);
    this.onProduct({ first, second, result: product, resultIndex, sign: product[resultIndex] });
  }

  setSelection(first, second) {
    this.selectedUnits = [first, second].filter(unit => unit > 0);
    UNITS.forEach((unit, index) => this.nodes.setColorAt(index,
      new THREE.Color(this.selectedUnits.includes(unit) ? 0xf0c86c : 0x536171)));
    this.nodes.instanceColor.needsUpdate = true;
    this.lines.forEach(line => {
      const selected = this.selectedUnits.length > 0 &&
        this.selectedUnits.every(unit => line.userData.triple.includes(unit));
      line.material.opacity = selected ? 1 : 0.16;
      line.material.color.setHex(selected ? 0xf0c86c : 0x75d4e5);
    });
  }

  raycast(raycaster) {
    const hit = raycaster.intersectObjects(this.pickables, false)[0];
    if (!hit) return null;
    if (hit.instanceId !== undefined) {
      const unit = this.unitForInstance[hit.instanceId];
      this.factorInputs[0].value = String(unit);
      this.updateProduct();
      return { kind: "unit", unit };
    }
    const line = hit.object.userData;
    if (line.triple) {
      this.factorInputs[0].value = String(line.triple[0]);
      this.factorInputs[1].value = String(line.triple[1]);
      this.updateProduct();
      return { kind: "fano-line", triple: line.triple };
    }
    return null;
  }
}

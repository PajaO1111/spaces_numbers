import * as THREE from "three";
import { FANO_LINES, UNITS } from "../data/octonion-data.js";

const GOLD = 0xe9bd54;

function pointFor(unit) {
  const angle = -Math.PI / 2 + (unit - 1) * Math.PI * 2 / 7;
  return new THREE.Vector3(Math.cos(angle) * 3, Math.sin(angle) * 3, 0);
}

export class FanoView {
  constructor({ onUnit, onLine }) {
    this.group = new THREE.Group();
    this.onUnit = onUnit;
    this.onLine = onLine;
    this.lines = [];
    this._build();
  }

  _build() {
    const geometry = new THREE.SphereGeometry(0.16, 16, 12);
    const material = new THREE.MeshStandardMaterial({ color: GOLD, emissive: 0x3e2d0b });
    this.nodes = new THREE.InstancedMesh(geometry, material, UNITS.length);
    this.nodes.userData.kind = "fano-units";
    this.unitForInstance = UNITS.slice();
    const dummy = new THREE.Object3D();
    UNITS.forEach((unit, index) => {
      dummy.position.copy(pointFor(unit));
      dummy.updateMatrix();
      this.nodes.setMatrixAt(index, dummy.matrix);
    });
    this.nodes.instanceMatrix.needsUpdate = true;
    this.group.add(this.nodes);
    this.pickables = [this.nodes];
    for (const [index, triple] of FANO_LINES.entries()) {
      const points = triple.map(pointFor);
      const line = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 })
      );
      line.userData = { kind: "fano-line", index, triple };
      this.group.add(line);
      this.lines.push(line);
      this.pickables.push(line);
      for (let edge = 0; edge < 3; edge++) {
        const start = points[edge].clone().lerp(points[(edge + 1) % 3], 0.72);
        const direction = points[(edge + 1) % 3].clone().sub(points[edge]).normalize();
        const arrow = new THREE.ArrowHelper(direction, start, 0.34, GOLD, 0.12, 0.09);
        this.group.add(arrow);
      }
    }
  }

  setSelection(unit, lineIndex = null) {
    this.selectedUnit = unit ?? null;
    this.selectedLine = Number.isInteger(lineIndex) ? lineIndex : null;
    UNITS.forEach((value, index) => this.nodes.setColorAt(index,
      new THREE.Color(!this.selectedUnit || this.selectedUnit === value ? GOLD : 0x46515c)));
    this.nodes.instanceColor.needsUpdate = true;
    this.lines.forEach((line, index) => {
      const selected = this.selectedLine === null ? !this.selectedUnit || FANO_LINES[index].includes(this.selectedUnit)
        : index === this.selectedLine;
      line.material.opacity = selected ? 0.95 : 0.14;
    });
  }

  raycast(raycaster) {
    const hit = raycaster.intersectObjects(this.pickables, false)[0];
    if (!hit) return null;
    if (hit.object.userData.kind === "fano-line") {
      const { index, triple } = hit.object.userData;
      this.onLine(index, triple);
      return { kind: "fano-line", index, triple };
    }
    if (hit.instanceId !== undefined) {
      const unit = this.unitForInstance[hit.instanceId];
      this.onUnit(unit);
      return { kind: "unit", unit };
    }
    return null;
  }
}

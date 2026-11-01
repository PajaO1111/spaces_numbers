import * as THREE from "three";
import { gsap } from "gsap";
import { INCIDENCE_EDGES, TRIPLES } from "../data/octonion-data.js";
import { calculateBetweenness, calculateForceLayout, calculateMetrics } from "./graph-layout.js";

const GOLD = new THREE.Color("#eabf54");
const BLUE = new THREE.Color("#73c9e8");

export class IncidenceView {
  constructor({ onTriple }) {
    this.group = new THREE.Group();
    this.onTriple = onTriple;
    this.positions = calculateForceLayout();
    const { adjacency, metrics } = calculateMetrics();
    const betweenness = calculateBetweenness(adjacency);
    this.metrics = metrics.map((item, index) => ({ ...item, betweenness: betweenness[index] }));
    this._build();
  }

  _build() {
    this.edgeLinks = { weak: [], strong: [] };
    for (const edge of INCIDENCE_EDGES) this.edgeLinks[edge.strength].push(edge);
    this.weakLines = this._edgeInstances("weak", 0x73c9e8, 0.026);
    this.strongLines = this._edgeInstances("strong", 0xeabf54, 0.06);
    this.group.add(this.weakLines, this.strongLines);

    const geometry = new THREE.SphereGeometry(0.13, 14, 12);
    const material = new THREE.MeshStandardMaterial({ color: 0x8be0f2, roughness: 0.38, emissive: 0x0b2430 });
    this.nodes = new THREE.InstancedMesh(geometry, material, TRIPLES.length);
    this.nodes.userData.kind = "incidence-triples";
    this.nodeToTriple = [];
    const dummy = new THREE.Object3D();
    this.positions.forEach((position, index) => {
      dummy.position.fromArray(position);
      dummy.updateMatrix();
      this.nodes.setMatrixAt(index, dummy.matrix);
      this.nodeToTriple[index] = index;
    });
    this.nodes.instanceMatrix.needsUpdate = true;
    this.group.add(this.nodes);
    this.pickables = [this.nodes];
    this.setSelection(null);
  }

  _edgeInstances(strength, color, radius) {
    const links = this.edgeLinks[strength];
    const mesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(radius, radius, 1, 5, 1),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65, transparent: true, opacity: strength === "strong" ? 0.88 : 0.58 }),
      links.length
    );
    mesh.userData.kind = `incidence-${strength}`;
    const dummy = new THREE.Object3D();
    links.forEach((edge, index) => {
      const start = new THREE.Vector3(...this.positions[edge.source]);
      const end = new THREE.Vector3(...this.positions[edge.target]);
      const direction = end.clone().sub(start);
      dummy.position.copy(start).add(end).multiplyScalar(0.5);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
      dummy.scale.set(1, direction.length(), 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.links = links;
    return mesh;
  }

  setSelection(index, unit = null) {
    this.selectedIndex = Number.isInteger(index) ? index : null;
    this.selectedUnit = unit;
    for (let node = 0; node < TRIPLES.length; node++) {
      const related = unit ? TRIPLES[node].vertices.includes(unit) : this.selectedIndex === null || this.selectedIndex === node;
      this.nodes.setColorAt(node, new THREE.Color(related ? 0x8be0f2 : 0x364455));
    }
    this.nodes.instanceColor.needsUpdate = true;
    for (const mesh of [this.weakLines, this.strongLines]) {
      const links = mesh.userData.links;
      const defaultColor = mesh === this.weakLines ? BLUE : GOLD;
      links.forEach((edge, index) => {
        const selected = unit ? edge.shared.includes(unit)
          : this.selectedIndex === null || edge.source === this.selectedIndex || edge.target === this.selectedIndex;
        mesh.setColorAt(index, selected ? defaultColor : new THREE.Color(0x46515c));
      });
      mesh.instanceColor.needsUpdate = true;
    }
  }

  animateIn(reducedMotion = false) {
    if (reducedMotion) return;
    this.nodes.scale.setScalar(0.1);
    gsap.to(this.nodes.scale, { x: 1, y: 1, z: 1, duration: 0.45, ease: "back.out(1.7)" });
  }

  raycast(raycaster) {
    const hit = raycaster.intersectObject(this.nodes, false)[0];
    if (!hit || hit.instanceId === undefined) return null;
    const index = this.nodeToTriple[hit.instanceId];
    this.onTriple(index);
    return { kind: "triple", index, metrics: this.metrics[index] };
  }
}

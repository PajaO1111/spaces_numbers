import * as THREE from "three";
import { gsap } from "gsap";
import { TRIPLES, UNITS } from "../data/octonion-data.js";

const COLORS = [0x22b8cf, 0xed8b23, 0xae85ed, 0x36ad76, 0xde73ad];
const pointFor = (unit, layer, radius = 3.4, zScale = 1) => {
  const angle = -Math.PI / 2 + (unit - 1) * Math.PI * 2 / 7;
  return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, (2 - (layer - 1)) * 1.15 * zScale);
};

export class LayeredView {
  constructor({ onTriple, onUnit }) {
    this.group = new THREE.Group();
    this.onTriple = onTriple;
    this.onUnit = onUnit;
    this.faces = [];
    this.nodeInstances = [];
    this.selectedTriple = 3;
    this.selectedUnit = null;
    this.visibleLayers = Array(5).fill(true);
    this.explosionProgress = 1;
    this.instanceDummy = new THREE.Object3D();
    this._build();
  }

  _build() {
    const nodeGeometry = new THREE.SphereGeometry(0.105, 12, 10);
    this.nodeMaterial = new THREE.MeshStandardMaterial({ color: 0xf3f6fb, roughness: 0.48 });
    const nodes = new THREE.InstancedMesh(nodeGeometry, this.nodeMaterial, 35);
    this.nodes = nodes;
    nodes.userData.kind = "layered-units";
    const dummy = new THREE.Object3D();
    let instance = 0;
    for (let layer = 1; layer <= 5; layer++) {
      for (const unit of UNITS) {
        dummy.position.copy(pointFor(unit, layer));
        dummy.updateMatrix();
        nodes.setMatrixAt(instance, dummy.matrix);
        this.nodeInstances.push({ layer: layer - 1, unit, instance });
        instance++;
      }
    }
    nodes.instanceMatrix.needsUpdate = true;
    this.group.add(nodes);
    this.pickables = [nodes];

    this.edgeLines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({
      color: 0x94a3b8, dashSize: 0.09, gapSize: 0.08, transparent: true, opacity: 0.75
    }));
    this.group.add(this.edgeLines);
    this._updateVerticals();

    for (const triple of TRIPLES) {
      const layer = triple.layer - 1;
      const points = triple.vertices.map(unit => pointFor(unit, triple.layer));
      const material = new THREE.MeshStandardMaterial({
        color: COLORS[layer], side: THREE.DoubleSide, transparent: true,
        opacity: 0.35, depthWrite: false, roughness: 0.5
      });
      const faceGeometry = new THREE.BufferGeometry();
      faceGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
        points[0].x, points[0].y, 0,
        points[1].x, points[1].y, 0,
        points[2].x, points[2].y, 0
      ], 3));
      faceGeometry.computeVertexNormals();
      const face = new THREE.Mesh(faceGeometry, material);
      face.position.z = points[0].z;
      face.userData = { kind: "triple", id: triple.id };
      this.faces.push({ mesh: face, triple, layer, targetZ: points[0].z });
      this.group.add(face);
    }
    this.pickables.push(...this.faces.map(item => item.mesh));
    this.setSelection(this.selectedTriple, null);
    this.setLayers(this.visibleLayers);
  }

  _updateVerticals() {
    const vertices = [];
    const visible = this.visibleLayers.map((shown, index) => shown ? index + 1 : 0).filter(Boolean);
    for (const unit of UNITS) for (let index = 1; index < visible.length; index++) {
      vertices.push(...pointFor(unit, visible[index - 1], 3.4, this.explosionProgress).toArray(),
        ...pointFor(unit, visible[index], 3.4, this.explosionProgress).toArray());
    }
    const position = this.edgeLines.geometry.getAttribute("position");
    if (!position || position.array.length !== vertices.length) {
      this.edgeLines.geometry.dispose();
      this.edgeLines.geometry = new THREE.BufferGeometry();
      this.edgeLines.geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    } else {
      position.array.set(vertices);
      position.needsUpdate = true;
    }
    this.edgeLines.geometry.computeBoundingSphere();
    this.edgeLines.computeLineDistances();
  }

  animateExplode(reducedMotion = false) {
    gsap.killTweensOf(this);
    if (reducedMotion) {
      this.explosionProgress = 1;
      this._applyExplosion();
      return;
    }
    this.explosionProgress = 0;
    this._applyExplosion();
    gsap.to(this, {
      explosionProgress: 1, duration: 0.85, ease: "power2.out",
      onUpdate: () => this._applyExplosion()
    });
  }

  _applyExplosion() {
    this.faces.forEach(({ mesh, targetZ }) => { mesh.position.z = targetZ * this.explosionProgress; });
    this.nodeInstances.forEach(({ layer, unit, instance }) => {
      this.instanceDummy.position.copy(pointFor(unit, layer + 1, 3.4, this.explosionProgress));
      this.instanceDummy.scale.setScalar(this.visibleLayers[layer] ? 1 : 0);
      this.instanceDummy.updateMatrix();
      this.nodes.setMatrixAt(instance, this.instanceDummy.matrix);
    });
    this.nodes.instanceMatrix.needsUpdate = true;
    this._updateVerticals();
  }

  setLayers(visibleLayers) {
    this.visibleLayers = visibleLayers.slice();
    this.faces.forEach(({ mesh, layer }) => { mesh.visible = Boolean(this.visibleLayers[layer]); });
    this._updateVerticals();
    this.edgeLines.visible = this.visibleLayers.filter(Boolean).length > 1;
    this.nodeInstances.forEach(({ layer, instance }) => {
      const unit = this.nodeInstances[instance].unit;
      const selectedTripleUnits = TRIPLES[this.selectedTriple].vertices;
      const highlighted = this.selectedUnit ? unit === this.selectedUnit : selectedTripleUnits.includes(unit);
      this.nodes.setColorAt(instance, new THREE.Color(this.visibleLayers[layer]
        ? highlighted ? 0xf3f6fb : 0x536174
        : 0x202938));
      this.instanceDummy.position.copy(pointFor(unit, layer + 1, 3.4, this.explosionProgress));
      this.instanceDummy.scale.setScalar(this.visibleLayers[layer] ? 1 : 0);
      this.instanceDummy.updateMatrix();
      this.nodes.setMatrixAt(instance, this.instanceDummy.matrix);
    });
    this.nodes.instanceMatrix.needsUpdate = true;
    this.nodes.instanceColor.needsUpdate = true;
  }

  setSelection(tripleIndex, unit) {
    if (Number.isInteger(tripleIndex) && tripleIndex >= 0 && tripleIndex < TRIPLES.length) this.selectedTriple = tripleIndex;
    this.selectedUnit = unit ?? null;
    this.faces.forEach(({ mesh, triple }) => {
      const selected = TRIPLES[this.selectedTriple].id === triple.id;
      const matched = !this.selectedUnit || triple.vertices.includes(this.selectedUnit);
      mesh.material.opacity = selected ? 0.72 : matched ? 0.35 : 0.07;
      mesh.material.emissive.setHex(selected ? 0x263344 : 0x000000);
      mesh.material.emissiveIntensity = selected ? 0.55 : 0;
    });
    this.setLayers(this.visibleLayers);
  }

  raycast(raycaster) {
    const hits = raycaster.intersectObjects(this.pickables, false);
    if (!hits.length) return null;
    const hit = hits[0];
    if (hit.object.userData.kind === "triple") {
      const index = TRIPLES.findIndex(triple => triple.id === hit.object.userData.id);
      this.onTriple(index);
      return { kind: "triple", index };
    }
    const mapping = this.nodeInstances[hit.instanceId];
    if (mapping) {
      this.onUnit(mapping.unit);
      return { kind: "unit", unit: mapping.unit };
    }
    return null;
  }
}

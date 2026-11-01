import { INCIDENCE_EDGES, TRIPLES } from "../data/octonion-data.js";

export function calculateMetrics() {
  const adjacency = TRIPLES.map(() => new Set());
  for (const edge of INCIDENCE_EDGES) {
    adjacency[edge.source].add(edge.target);
    adjacency[edge.target].add(edge.source);
  }
  const metrics = adjacency.map((neighbors, index) => {
    const list = [...neighbors];
    let connectedPairs = 0;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (adjacency[list[i]].has(list[j])) connectedPairs++;
      }
    }
    const possiblePairs = list.length * (list.length - 1) / 2;
    return {
      degree: list.length,
      degreeCentrality: list.length / (TRIPLES.length - 1),
      clustering: possiblePairs ? connectedPairs / possiblePairs : 0,
      neighbors: list
    };
  });
  return { adjacency, metrics };
}

export function calculateForceLayout(iterations = 220) {
  const positions = Array.from({ length: TRIPLES.length }, (_, index) => {
    const y = 1 - 2 * (index + 0.5) / TRIPLES.length;
    const radius = Math.sqrt(1 - y * y);
    const angle = index * Math.PI * (3 - Math.sqrt(5));
    return [radius * Math.cos(angle) * 5, y * 5, radius * Math.sin(angle) * 5];
  });
  const velocity = positions.map(() => [0, 0, 0]);
  const edgeStrength = new Map(INCIDENCE_EDGES.map(edge =>
    [`${edge.source}:${edge.target}`, edge.shared.length === 2 ? 1.5 : 1]));

  for (let step = 0; step < iterations; step++) {
    const force = positions.map(() => [0, 0, 0]);
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const delta = positions[i].map((value, axis) => value - positions[j][axis]);
        const distanceSquared = Math.max(0.2, delta.reduce((sum, value) => sum + value * value, 0));
        const distance = Math.sqrt(distanceSquared);
        const strength = edgeStrength.get(`${i}:${j}`);
        const magnitude = strength === undefined ? 0.16 / distanceSquared : (distance - (strength === 1.5 ? 2.1 : 3.1)) * 0.006;
        delta.forEach((value, axis) => {
          const component = value / distance * magnitude;
          force[i][axis] += component;
          force[j][axis] -= component;
        });
      }
    }
    for (let i = 0; i < positions.length; i++) {
      for (let axis = 0; axis < 3; axis++) {
        velocity[i][axis] = (velocity[i][axis] + force[i][axis] - positions[i][axis] * 0.006) * 0.84;
        positions[i][axis] += velocity[i][axis];
      }
    }
  }
  return positions;
}

export function calculateBetweenness(adjacency) {
  const centrality = Array(adjacency.length).fill(0);
  for (let source = 0; source < adjacency.length; source++) {
    const stack = [];
    const predecessors = adjacency.map(() => []);
    const paths = Array(adjacency.length).fill(0); paths[source] = 1;
    const distance = Array(adjacency.length).fill(-1); distance[source] = 0;
    const queue = [source];
    for (let head = 0; head < queue.length; head++) {
      const vertex = queue[head]; stack.push(vertex);
      for (const neighbor of adjacency[vertex]) {
        if (distance[neighbor] < 0) {
          queue.push(neighbor);
          distance[neighbor] = distance[vertex] + 1;
        }
        if (distance[neighbor] === distance[vertex] + 1) {
          paths[neighbor] += paths[vertex];
          predecessors[neighbor].push(vertex);
        }
      }
    }
    const dependency = Array(adjacency.length).fill(0);
    while (stack.length) {
      const vertex = stack.pop();
      for (const predecessor of predecessors[vertex]) {
        dependency[predecessor] += paths[predecessor] / paths[vertex] * (1 + dependency[vertex]);
      }
      if (vertex !== source) centrality[vertex] += dependency[vertex];
    }
  }
  const scale = 2 / ((adjacency.length - 1) * (adjacency.length - 2));
  return centrality.map(value => value * scale);
}

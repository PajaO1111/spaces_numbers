export const UNITS = Object.freeze([1, 2, 3, 4, 5, 6, 7]);

export const FANO_LINES = Object.freeze([
  [1, 2, 3], [1, 4, 5], [1, 7, 6], [2, 4, 6], [2, 5, 7], [3, 4, 7], [3, 6, 5]
].map(line => Object.freeze(line)));

const lineFor = vertices => FANO_LINES.find(line => vertices.every(unit => line.includes(unit))) ?? null;
const label = unit => `e${unit}`;

export const TRIPLES = Object.freeze(
  UNITS.flatMap(a => UNITS.filter(b => b > a)
    .flatMap(b => UNITS.filter(c => c > b).map(c => [a, b, c])))
    .map((vertices, index) => {
      const orientation = lineFor(vertices);
      return Object.freeze({
        id: `triple-${vertices.join("-")}`,
        vertices: Object.freeze(vertices),
        layer: Math.floor(index / 7) + 1,
        isFano: orientation !== null,
        octonionRule: orientation
          ? `${label(orientation[0])} × ${label(orientation[1])} = ${label(orientation[2])}`
          : null
      });
    })
);

export const TRIPLE_INDEX = new Map(TRIPLES.map((triple, index) => [triple.id, index]));

export const INCIDENCE_EDGES = Object.freeze(TRIPLES.flatMap((first, firstIndex) =>
  TRIPLES.slice(firstIndex + 1).flatMap((second, offset) => {
    const shared = first.vertices.filter(unit => second.vertices.includes(unit));
    return shared.length ? [Object.freeze({
      source: firstIndex,
      target: firstIndex + 1 + offset,
      shared: Object.freeze(shared),
      strength: shared.length === 2 ? "strong" : "weak"
    })] : [];
  })
));

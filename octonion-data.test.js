const test = require("node:test");
const assert = require("node:assert/strict");
const { TRIPLES, FANO_LINES, INCIDENCE_EDGES } = require("./data/octonion-data.js");

test("the complete 3-uniform hypergraph has 35 unique triples across five seven-triple layers", () => {
  assert.equal(TRIPLES.length, 35);
  assert.equal(new Set(TRIPLES.map(triple => triple.id)).size, 35);
  assert.deepEqual(
    Array.from({ length: 5 }, (_, index) => TRIPLES.filter(triple => triple.layer === index + 1).length),
    [7, 7, 7, 7, 7]
  );
  assert.ok(TRIPLES.every(({ vertices }) =>
    vertices.length === 3 && vertices[0] < vertices[1] && vertices[1] < vertices[2]));
});

test("Fano incidence and pair graph counts match the combinatorial model", () => {
  assert.equal(FANO_LINES.length, 7);
  assert.equal(TRIPLES.filter(triple => triple.isFano).length, 7);
  assert.equal(INCIDENCE_EDGES.length, 525);
  assert.equal(INCIDENCE_EDGES.filter(edge => edge.strength === "weak").length, 315);
  assert.equal(INCIDENCE_EDGES.filter(edge => edge.strength === "strong").length, 210);
  for (const unit of [1, 2, 3, 4, 5, 6, 7]) {
    assert.equal(TRIPLES.filter(triple => triple.vertices.includes(unit)).length, 15);
  }
});

test("every triple has the expected graph degree and shared-point counts", () => {
  for (const [index, triple] of TRIPLES.entries()) {
    const shared = TRIPLES.filter(other => other.id !== triple.id)
      .map(other => triple.vertices.filter(unit => other.vertices.includes(unit)).length);
    assert.deepEqual([0, 1, 2].map(count => shared.filter(value => value === count).length), [4, 18, 12]);
    assert.equal(INCIDENCE_EDGES.filter(edge => edge.source === index || edge.target === index).length, 30);
  }
});

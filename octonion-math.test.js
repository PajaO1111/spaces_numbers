const test = require("node:test");
const assert = require("node:assert/strict");
const O = require("./octonion-math.js");
const e = O.basis;
const zero = Array(8).fill(0);
const close = (a, b) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-10));

test("Cayley-Dickson agrees with every pair in the fixed Fano convention", () => {
  const triples = [[1, 2, 3], [1, 4, 5], [1, 7, 6], [2, 4, 6], [2, 5, 7], [3, 4, 7], [3, 6, 5]];
  assert.deepEqual(O.triples, triples);
  for (let i = 0; i < 8; i++) {
    close(O.multiply(e(0), e(i)), e(i));
    close(O.multiply(e(i), e(0)), e(i));
    if (i) close(O.multiply(e(i), e(i)), e(0).map(v => -v));
  }
  for (const triple of triples) for (let i = 0; i < 3; i++) {
    const a = triple[i], b = triple[(i + 1) % 3], c = triple[(i + 2) % 3];
    close(O.multiply(e(a), e(b)), e(c));
    close(O.multiply(e(b), e(a)), e(c).map(v => -v));
  }
});
test("nonzero associator and associative quaternion subalgebra", () => {
  close(O.multiply(O.multiply(e(1), e(2)), e(4)), e(7));
  close(O.multiply(e(1), O.multiply(e(2), e(4))), e(7).map(v => -v));
  close(O.associator(e(1), e(2), e(4)), e(7).map(v => 2 * v));
  close(O.associator(e(1), e(2), e(3)), zero);
});
test("alternativity on all basis pairs and mixed coefficient examples", () => {
  const examples = [...Array.from({ length: 8 }, (_, i) => e(i)),
    [1, 2, -3, 4, 2, -1, 3, 0], [-2, 1, 0, -1, 3, 4, -2, 1]];
  for (const x of examples) for (const y of examples) {
    close(O.associator(x, x, y), zero);
    close(O.associator(y, x, x), zero);
    close(O.associator(x, y, x), zero);
  }
});
test("bilinearity and multiplicative norm for mixed coefficients", () => {
  const x = [1, 2, -3, 4, 2, -1, 3, 0], y = [-2, 1, 0, -1, 3, 4, -2, 1], z = e(4);
  close(O.multiply(x.map((v, i) => v + y[i]), z), O.multiply(x, z).map((v, i) => v + O.multiply(y, z)[i]));
  assert.ok(Math.abs(Math.hypot(...O.multiply(x, y)) - Math.hypot(...x) * Math.hypot(...y)) < 1e-10);
  close(O.multiply(x, zero), zero);
});
test("invalid shapes, values and basis indices are rejected", () => {
  assert.throws(() => O.multiply([1, 2], e(1)), RangeError);
  assert.throws(() => O.multiply([NaN, ...zero.slice(1)], e(1)), RangeError);
  for (const index of [-1, 8, 1.5]) assert.throws(() => e(index), RangeError);
});
test("all 35 unordered distinct triples classify into 7 Fano lines and 28 nonzero associators", () => {
  const entries = O.associatorTriples();
  assert.equal(entries.length, 35);
  assert.equal(new Set(entries.map(entry => entry.units.join(","))).size, 35);
  assert.equal(entries.filter(entry => entry.norm === 0).length, 7);
  assert.equal(entries.filter(entry => entry.norm === 2).length, 28);
  for (const entry of entries) {
    const isLine = O.triples.some(line => entry.units.every(unit => line.includes(unit)));
    assert.equal(entry.norm === 0, isLine);
    const [a, b, c] = entry.units.map(e);
    close(entry.value, O.associator(a, b, c));
    close(O.associator(b, a, c), entry.value.map(v => -v));
  }
});
test("unit octonions normalize safely, including extreme finite coefficients", () => {
  for (const x of [e(0), e(7), [1, 2, -3, 4, 5, 6, 7, 8], Array(8).fill(Number.MAX_VALUE),
    [Number.MIN_VALUE, ...zero.slice(1)]]) {
    assert.ok(Math.abs(O.norm(O.normalize(x)) - 1) < 1e-12);
  }
  close(O.normalize([2, 2, 2, 2, 2, 2, 2, 2]), Array(8).fill(1 / Math.sqrt(8)));
  assert.throws(() => O.normalize(zero), /Nulový/);
  assert.throws(() => O.normalize([Infinity, ...zero.slice(1)]), RangeError);
});
test("coordinate projections retain selected values and account for omitted norm, not the entire sphere", () => {
  const x = [1, 2, 3, 4, 5, 6, 7, 8];
  for (const axes of [[0, 1, 2], [5, 6, 7], [7, 0, 3]]) {
    const result = O.projectUnit(x, axes);
    close(result.point, axes.map(index => x[index] / Math.hypot(...x)));
    assert.ok(Math.abs(Math.hypot(...result.point) ** 2 + result.omittedNorm ** 2 - 1) < 1e-12);
    close(O.projectUnit(x.map(v => -v), axes).point, result.point.map(v => -v));
  }
  close(O.projectUnit(e(7), [0, 1, 2]).point, [0, 0, 0]);
  assert.equal(O.projectUnit(e(7), [0, 1, 2]).omittedNorm, 1);
  assert.throws(() => O.projectUnit(x, [1, 1, 2]), RangeError);
  assert.throws(() => O.projectUnit(x, [0, 1, 8]), RangeError);
  assert.throws(() => O.projectUnit(zero, [0, 1, 2]), /Nulový/);
});
test("layered incidence model has five lexicographic layers, 15 triples per point and exact shared counts", () => {
  const { entries, links } = O.incidenceModel();
  assert.equal(entries.length, 35);
  for (let layer = 0; layer < 5; layer++) assert.equal(entries.filter(e => e.layer === layer).length, 7);
  assert.deepEqual(entries[0].units, [1, 2, 3]);
  assert.deepEqual(entries[7].units, [1, 3, 6]);
  assert.deepEqual(entries[34].units, [5, 6, 7]);
  for (let unit = 1; unit <= 7; unit++) assert.equal(entries.filter(e => e.units.includes(unit)).length, 15);
  assert.equal(links.length, 525);
  assert.equal(links.filter(e => e.shared.length === 1).length, 315);
  assert.equal(links.filter(e => e.shared.length === 2).length, 210);
  for (let index = 0; index < 35; index++) {
    const connected = links.filter(e => e.first === index || e.second === index);
    assert.equal(connected.filter(e => e.shared.length === 1).length, 18);
    assert.equal(connected.filter(e => e.shared.length === 2).length, 12);
    const disjoint = entries.filter(e => !e.units.some(unit => entries[index].units.includes(unit)));
    assert.equal(disjoint.length, 4);
  }
  for (const link of links) assert.deepEqual(link.shared, entries[link.first].units.filter(unit => entries[link.second].units.includes(unit)));
});

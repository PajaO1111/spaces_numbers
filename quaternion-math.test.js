const test = require("node:test");
const assert = require("node:assert/strict");
const math = require("./quaternion-math.js");
const close = (actual, expected) => actual.forEach((value, index) =>
  assert.ok(Math.abs(value - expected[index]) < 1e-12, `${actual} != ${expected}`));
const one = [1, 0, 0, 0], i = [0, 1, 0, 0], j = [0, 0, 1, 0], k = [0, 0, 0, 1];

test("Hamilton multiplication and noncommutativity", () => {
  close(math.multiply(i, j), k);
  close(math.multiply(j, i), [0, 0, 0, -1]);
  for (const unit of [i, j, k]) close(math.multiply(unit, unit), [-1, 0, 0, 0]);
});
test("associativity, norm multiplicativity and conjugate", () => {
  const q = [1, 2, -3, 4], p = [-2, 3, 1, -1], r = [3, 0, 2, -4];
  close(math.multiply(math.multiply(q, p), r), math.multiply(q, math.multiply(p, r)));
  close(math.multiply(q, math.conjugate(q)), [30, 0, 0, 0]);
  assert.ok(Math.abs(math.norm(math.multiply(q, p)) - math.norm(q) * math.norm(p)) < 1e-12);
});
test("both inverses and normalization", () => {
  for (const q of [[1, 2, 3, 4], [-2, 0, 0, 0], [0, 0.1, 0, 0]]) {
    close(math.multiply(q, math.inverse(q)), one);
    close(math.multiply(math.inverse(q), q), one);
    assert.ok(Math.abs(math.norm(math.normalize(q)) - 1) < 1e-12);
  }
});
test("zero and invalid inputs fail explicitly", () => {
  assert.throws(() => math.inverse([0, 0, 0, 0]), /inverzi/);
  assert.throws(() => math.rotate([0, 0, 0, 0], [1, 0, 0]), /Nulový/);
  assert.throws(() => math.norm([NaN, 0, 0, 0]), RangeError);
  assert.throws(() => math.multiply([1, 2], one), RangeError);
  assert.throws(() => math.axisAngle([0, 0, 0], 90), /nulová/);
});
test("rotations around all three axes and length preservation", () => {
  close(math.rotate(math.axisAngle([0, 0, 1], 90), [1, 0, 0]), [0, 1, 0]);
  close(math.rotate(math.axisAngle([1, 0, 0], 90), [0, 1, 0]), [0, 0, 1]);
  close(math.rotate(math.axisAngle([0, 1, 0], 90), [0, 0, 1]), [1, 0, 0]);
  const q = math.axisAngle([1, 2, 3], 123), v = [1, -1, 1];
  assert.ok(Math.abs(Math.hypot(...math.rotate(q, v)) - Math.hypot(...v)) < 1e-12);
  close(math.rotate(q.map(x => -x), v), math.rotate(q, v));
  close(math.rotate(q.map(x => 3 * x), v), math.rotate(q, v));
});
test("every projected cube vertex remains in the SVG viewport", () => {
  for (const axis of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 2, 3]]) {
    for (let angle = 0; angle <= 360; angle += 15) {
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
        const [px, py] = math.project(math.rotate(math.axisAngle(axis, angle), [x, y, z]));
        assert.ok(px > 0 && px < 500 && py > 30 && py < 320);
      }
    }
  }
});
test("stereographic coordinates, normalization and inverse reconstruction for both poles", () => {
  close(math.stereographic(i), [1, 0, 0]);
  close(math.stereographic([-1, 0, 0, 0]), [0, 0, 0]);
  for (const pole of [-1, 1]) for (const q of [[1, 2, 3, 4], [0, -2, 0, 1], [-1, 0.00001, 0, 0]]) {
    const point = math.stereographic(q, pole), squared = point.reduce((sum, v) => sum + v * v, 0);
    close([pole * (squared - 1) / (squared + 1), ...point.map(v => 2 * v / (squared + 1))], math.normalize(q));
    close(math.stereographic(q.map(v => 2 * v), pole), point);
  }
  assert.throws(() => math.stereographic(one), /pól/);
  assert.throws(() => math.stereographic([-1, 0, 0, 0], -1), /pól/);
  assert.throws(() => math.stereographic([0, 0, 0, 0]), /Nulový/);
  assert.throws(() => math.stereographic(i, 0), RangeError);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const math = require("./complex-math.js");
const z = (a, b) => ({ re: math.parse(a), im: math.parse(b) });

test("exact fractions, decimals and signs", () => {
  for (const [input, expected] of [["2/4", "1/2"], ["0,125", "1/8"], ["-1/-3", "1/3"], ["0", "0"]]) {
    assert.equal(math.format(math.parse(input)), expected);
  }
  const result = math.calculate(z("1/2", "0"), z("1/3", "0"), "add");
  assert.equal(math.format(result.re), "5/6");
});

test("known complex operations", () => {
  assert.equal(math.complexText(math.calculate(z("0", "1"), z("0", "1"), "multiply")), "-1 + 0i");
  assert.equal(math.complexText(math.calculate(z("2", "3"), z("1", "2"), "multiply")), "-4 + 7i");
  assert.equal(math.complexText(math.calculate(z("2", "3"), z("1", "2"), "add")), "3 + 5i");
  assert.equal(math.complexText(math.calculate(z("2", "3"), z("1", "2"), "divide")), "8/5 − 1/5i");
  assert.equal(math.complexText(math.calculate(z("0", "0"), z("1", "2"), "divide")), "0 + 0i");
});

test("invalid inputs and zero denominators are explicit errors", () => {
  for (const input of ["", "NaN", "Infinity", "1e3", "1/0", "1/1001", "11", "0.0001", "1+2", "2/3/4"]) {
    assert.throws(() => math.parse(input), RangeError);
  }
  assert.throws(() => math.calculate(z("1", "2"), z("0", "0"), "divide"), /nulou/);
});

test("modulus, all quadrants and undefined argument of zero", () => {
  assert.equal(math.polar(z("3", "4")).modulus, 5);
  assert.equal(math.polar(z("0", "0")).argument, null);
  for (const [a, b, angle] of [["1", "1", Math.PI / 4], ["-1", "1", 3 * Math.PI / 4],
    ["-1", "-1", -3 * Math.PI / 4], ["1", "-1", -Math.PI / 4]]) {
    assert.equal(math.polar(z(a, b)).argument, angle);
  }
});

test("multiplication multiplies moduli and adds arguments modulo a turn", () => {
  const a = z("-2", "3"), b = z("1", "-2");
  const p = math.polar(math.calculate(a, b, "multiply"));
  const x = math.polar(a), y = math.polar(b);
  assert.ok(Math.abs(p.modulus - x.modulus * y.modulus) < 1e-12);
  assert.ok(Math.abs(Math.sin(p.argument - x.argument - y.argument)) < 1e-12);
});

test("plot preserves equal scales and exact result coordinates even at extremes", () => {
  for (const operation of ["add", "multiply", "divide"]) {
    const a = z("10", "-10"), b = z("1/1000", "0");
    const result = math.calculate(a, b, operation);
    const plot = math.plot(a, b, result);
    const p = math.polar(result), drawn = plot.points[2];
    assert.ok(Math.abs((drawn.x - 300) * plot.extent / 240 - p.re) < 1e-8);
    assert.ok(Math.abs((200 - drawn.y) * plot.extent / 240 - p.im) < 1e-8);
    for (const point of plot.points) {
      assert.ok(point.x >= 60 && point.x <= 540 && point.y >= 8 && point.y <= 392);
    }
  }
});

test("division and multiplication cancel exactly for rational components", () => {
  for (const [a, b] of [["1/3", "-2/7"], ["10", "-10"], ["0", "0"], ["0,125", "1/1000"]]) {
    const input = z(a, b);
    const divisor = z("-1/3", "2/5");
    const quotient = math.calculate(input, divisor, "divide");
    const restored = math.calculate(quotient, divisor, "multiply");
    assert.deepEqual(restored, input);
  }
});

test("a number times its conjugate has real squared modulus", () => {
  assert.equal(math.complexText(math.calculate(z("3", "4"), z("3", "-4"), "multiply")), "25 + 0i");
  const quotient = math.polar(math.calculate(z("-2", "3"), z("1", "-2"), "divide"));
  assert.ok(Math.abs(quotient.modulus - Math.sqrt(13 / 5)) < 1e-12);
  const angle = math.polar(z("-2", "3")).argument - math.polar(z("1", "-2")).argument;
  assert.ok(Math.abs(Math.sin(quotient.argument - angle)) < 1e-12);
});

(function (root) {
  "use strict";

  function fraction(n, d = 1n) {
    if (d === 0n) throw new RangeError("Jmenovatel ani dělitel nesmí být nula.");
    if (d < 0n) { n = -n; d = -d; }
    let a = n < 0n ? -n : n;
    let b = d;
    while (b !== 0n) [a, b] = [b, a % b];
    return { n: n / a, d: d / a };
  }

  function parse(text) {
    const value = text.trim().replace(",", ".");
    let n, d;
    if (/^[+-]?\d{1,4}\/[+-]?\d{1,4}$/.test(value)) {
      const parts = value.split("/");
      n = BigInt(parts[0]); d = BigInt(parts[1]);
      if (d > 1000n || d < -1000n) throw new RangeError("Jmenovatel musí mít velikost nejvýše 1000.");
    } else if (/^[+-]?\d{1,2}(?:\.\d{1,3})?$/.test(value)) {
      const digits = (value.split(".")[1] || "").length;
      n = BigInt(value.replace(".", "")); d = 10n ** BigInt(digits);
    } else {
      throw new RangeError("Zadej celé číslo, desetinné číslo s nejvýše 3 místy nebo zlomek p/q.");
    }
    const result = fraction(n, d);
    if (result.n > 10n * result.d || result.n < -10n * result.d) {
      throw new RangeError("Každá složka musí být v rozsahu −10 až 10.");
    }
    return result;
  }

  const add = (a, b) => fraction(a.n * b.d + b.n * a.d, a.d * b.d);
  const negate = a => fraction(-a.n, a.d);
  const subtract = (a, b) => add(a, negate(b));
  const multiply = (a, b) => fraction(a.n * b.n, a.d * b.d);
  const divide = (a, b) => fraction(a.n * b.d, a.d * b.n);
  const numeric = a => Number(a.n) / Number(a.d);
  const format = a => a.d === 1n ? String(a.n) : `${a.n}/${a.d}`;
  const complexText = z => `${format(z.re)} ${z.im.n < 0n ? "−" : "+"} ${format(z.im.n < 0n ? negate(z.im) : z.im)}i`;

  function calculate(z, w, operation) {
    const a = z.re, b = z.im, c = w.re, d = w.im;
    if (operation === "add") return { re: add(a, c), im: add(b, d) };
    if (operation === "multiply") {
      return { re: subtract(multiply(a, c), multiply(b, d)), im: add(multiply(a, d), multiply(b, c)) };
    }
    if (operation === "divide") {
      const normSquared = add(multiply(c, c), multiply(d, d));
      if (normSquared.n === 0n) throw new RangeError("Komplexní nulou nelze dělit. Změň w.");
      return {
        re: divide(add(multiply(a, c), multiply(b, d)), normSquared),
        im: divide(subtract(multiply(b, c), multiply(a, d)), normSquared)
      };
    }
    throw new RangeError("Nepodporovaná operace.");
  }

  function polar(z) {
    const re = numeric(z.re), im = numeric(z.im);
    return { re, im, modulus: Math.hypot(re, im), argument: re === 0 && im === 0 ? null : Math.atan2(im, re) };
  }

  function plot(z, w, result) {
    const points = [z, w, result].map(polar);
    const extent = Math.max(1, ...points.flatMap(p => [Math.abs(p.re), Math.abs(p.im)])) * 1.25;
    return {
      extent,
      points: points.map(p => ({ x: 300 + p.re * 240 / extent, y: 200 - p.im * 240 / extent }))
    };
  }

  const api = { parse, calculate, polar, plot, format, complexText, numeric };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ComplexMath = api;
})(globalThis);

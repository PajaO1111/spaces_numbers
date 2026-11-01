(function (root) {
  "use strict";
  const Q = typeof module !== "undefined" && module.exports ? require("./quaternion-math.js") : root.QuaternionMath;
  const triples = Object.freeze([
    [1, 2, 3], [1, 4, 5], [1, 7, 6], [2, 4, 6], [2, 5, 7], [3, 4, 7], [3, 6, 5]
  ].map(triple => Object.freeze(triple)));
  function validate(x) {
    if (!Array.isArray(x) || x.length !== 8 || !x.every(Number.isFinite)) {
      throw new RangeError("Oktonion musí mít osm konečných reálných složek.");
    }
    return x;
  }
  function basis(index) {
    if (!Number.isInteger(index) || index < 0 || index > 7) throw new RangeError("Index báze musí být 0 až 7.");
    return Array.from({ length: 8 }, (_, i) => Number(i === index));
  }
  function subtract(x, y) {
    validate(x); validate(y);
    return x.map((value, i) => value - y[i]);
  }
  function pairProduct(x, y) {
    validate(x); validate(y);
    const a = x.slice(0, 4), b = x.slice(4), c = y.slice(0, 4), d = y.slice(4);
    const ac = Q.multiply(a, c), conjugateDB = Q.multiply(Q.conjugate(d), b);
    const da = Q.multiply(d, a), bConjugateC = Q.multiply(b, Q.conjugate(c));
    return { a, b, c, d, ac, conjugateDB, da, bConjugateC,
      result: [...ac.map((value, i) => value - conjugateDB[i]), ...da.map((value, i) => value + bConjugateC[i])] };
  }
  const multiply = (x, y) => pairProduct(x, y).result;
  const associator = (x, y, z) => subtract(multiply(multiply(x, y), z), multiply(x, multiply(y, z)));
  const norm = x => Math.hypot(...validate(x));
  function normalize(x) {
    validate(x);
    const scale = Math.max(...x.map(Math.abs));
    if (scale === 0) throw new RangeError("Nulový oktonion nelze normalizovat na S⁷.");
    const scaled = x.map(value => value / scale), length = Math.hypot(...scaled);
    return scaled.map(value => value / length);
  }
  function projectUnit(x, axes) {
    if (!Array.isArray(axes) || axes.length !== 3 || new Set(axes).size !== 3 ||
        !axes.every(index => Number.isInteger(index) && index >= 0 && index < 8)) {
      throw new RangeError("Projekce vyžaduje tři různé indexy os 0 až 7.");
    }
    const unit = normalize(x), point = axes.map(index => unit[index]);
    const omittedNorm = Math.hypot(...unit.filter((_, index) => !axes.includes(index)));
    return { unit, point, omittedNorm };
  }
  function associatorTriples() {
    const result = [];
    for (let i = 1; i <= 5; i++) for (let j = i + 1; j <= 6; j++) for (let k = j + 1; k <= 7; k++) {
      const units = [i, j, k], value = associator(...units.map(basis));
      result.push({ units, value, norm: Math.hypot(...value) });
    }
    return result;
  }
  function incidenceModel() {
    const entries = associatorTriples().map((entry, index) => ({ ...entry, layer: Math.floor(index / 7) }));
    const links = [];
    entries.forEach((entry, index) => {
      for (let other = index + 1; other < entries.length; other++) {
        const shared = entry.units.filter(unit => entries[other].units.includes(unit));
        if (shared.length) links.push({ first: index, second: other, shared });
      }
    });
    return { entries, links };
  }
  const api = { triples, basis, multiply, pairProduct, associator, associatorTriples, norm, normalize, projectUnit, incidenceModel };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.OctonionMath = api;
})(globalThis);

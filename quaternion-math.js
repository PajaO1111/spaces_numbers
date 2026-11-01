(function (root) {
  "use strict";

  function validate(q) {
    if (!Array.isArray(q) || q.length !== 4 || !q.every(Number.isFinite)) {
      throw new RangeError("Kvaternion musí mít čtyři konečné reálné složky.");
    }
    return q;
  }

  function multiply(q, p) {
    const [a, b, c, d] = validate(q), [e, f, g, h] = validate(p);
    return [
      a * e - b * f - c * g - d * h,
      a * f + b * e + c * h - d * g,
      a * g - b * h + c * e + d * f,
      a * h + b * g - c * f + d * e
    ];
  }

  const conjugate = q => validate(q).map((value, index) => index === 0 ? value : -value);
  const norm = q => Math.hypot(...validate(q));
  function normalize(q) {
    const length = norm(q);
    if (length === 0) throw new RangeError("Nulový kvaternion nelze normalizovat ani použít pro rotaci.");
    return q.map(value => value / length);
  }
  function inverse(q) {
    const length = norm(q);
    if (length === 0) throw new RangeError("Nulový kvaternion nemá inverzi.");
    return conjugate(q).map(value => value / length / length);
  }
  function axisAngle(axis, degrees) {
    if (!Array.isArray(axis) || axis.length !== 3 || !axis.every(Number.isFinite) || !Number.isFinite(degrees)) {
      throw new RangeError("Osa musí mít tři konečné složky a úhel musí být konečný.");
    }
    const length = Math.hypot(...axis);
    if (length === 0) throw new RangeError("Osa rotace nesmí být nulová.");
    const halfAngle = degrees * Math.PI / 360;
    return [Math.cos(halfAngle), ...axis.map(value => value / length * Math.sin(halfAngle))];
  }
  function rotate(q, vector) {
    if (!Array.isArray(vector) || vector.length !== 3 || !vector.every(Number.isFinite)) {
      throw new RangeError("Vektor musí mít tři konečné složky.");
    }
    const unit = normalize(q);
    return multiply(multiply(unit, [0, ...vector]), conjugate(unit)).slice(1);
  }
  function project(vector) {
    const [x, y, z] = vector;
    return [250 + (x - y) * 55, 170 + (x + y) * 27.5 - z * 56];
  }
  function stereographic(q, pole = 1) {
    if (pole !== 1 && pole !== -1) throw new RangeError("Pól projekce musí být +1 nebo −1.");
    const unit = normalize(q);
    const imaginarySquared = unit.slice(1).reduce((sum, value) => sum + value * value, 0);
    const denominator = pole * unit[0] > 0 ? imaginarySquared / (1 + pole * unit[0]) : 1 - pole * unit[0];
    if (denominator === 0) throw new RangeError("Jednotkový q je vynechaný pól projekce; jeho obraz je v nekonečnu. Změň pól nebo q.");
    const point = unit.slice(1).map(value => value / denominator);
    if (!point.every(Number.isFinite)) throw new RangeError("Obraz je příliš blízko pólu pro číselné zobrazení.");
    return point;
  }
  const api = { multiply, conjugate, norm, normalize, inverse, axisAngle, rotate, project, stereographic };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.QuaternionMath = api;
})(globalThis);

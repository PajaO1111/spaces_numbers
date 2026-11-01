import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const copies = [
  ["node_modules/three/build/three.module.js", "public/assets/vendor/three/three.module.js"],
  ["node_modules/three/build/three.core.js", "public/assets/vendor/three/three.core.js"],
  ["node_modules/gsap/index.js", "public/assets/vendor/gsap/gsap.js"],
  ["node_modules/gsap/gsap-core.js", "public/assets/vendor/gsap/gsap-core.js"],
  ["node_modules/gsap/CSSPlugin.js", "public/assets/vendor/gsap/CSSPlugin.js"],
  ["complex-math.js", "public/assets/vendor/complex-math.js"],
  ["quaternion-math.js", "public/assets/vendor/quaternion-math.js"],
  ["octonion-math.js", "public/assets/vendor/octonion-math.js"]
];

for (const [source, destination] of copies) {
  const target = resolve(root, destination);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(root, source), target);
}
await copyFile(resolve(root, "node_modules/three/LICENSE"), resolve(root, "public/assets/vendor/three/LICENSE"));

const orbitSource = await readFile(resolve(root, "node_modules/three/examples/jsm/controls/OrbitControls.js"), "utf8");
const orbitTarget = resolve(root, "public/assets/vendor/three/addons/controls/OrbitControls.js");
await mkdir(dirname(orbitTarget), { recursive: true });
await writeFile(orbitTarget, orbitSource.replaceAll('from "three"', 'from "../../three.module.js"')
  .replaceAll("from 'three'", "from '../../three.module.js'"), "utf8");

const mathModule = `import "./quaternion-math.js";\nimport "./octonion-math.js";\nexport default globalThis.OctonionMath;\n`;
await writeFile(resolve(root, "public/assets/vendor/octonion-math.mjs"), mathModule, "utf8");

const mainPage = await readFile(resolve(root, "wireframe.html"), "utf8");
await writeFile(resolve(root, "public/index.html"),
  mainPage
    .replaceAll('href="public/octonion-explorer.php"', 'href="octonion-explorer.php"')
    .replaceAll('src="complex-math.js"', 'src="/assets/vendor/complex-math.js"')
    .replaceAll('src="quaternion-math.js"', 'src="/assets/vendor/quaternion-math.js"')
    .replaceAll('src="octonion-math.js"', 'src="/assets/vendor/octonion-math.js"'),
  "utf8");

const dataTarget = resolve(root, "public/assets/data/octonion-data.js");
await mkdir(dirname(dataTarget), { recursive: true });
await copyFile(resolve(root, "data/octonion-data.js"), dataTarget);

const sourceModules = resolve(root, "assets/js");
const publicModules = resolve(root, "public/assets/js");
await mkdir(publicModules, { recursive: true });
for (const filename of await readdir(sourceModules)) {
  if (filename.endsWith(".js")) {
    await copyFile(resolve(sourceModules, filename), resolve(publicModules, filename));
  }
}
console.log("Copied local Three.js, OrbitControls, GSAP, math, data and application modules.");

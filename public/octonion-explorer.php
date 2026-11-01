<?php
declare(strict_types=1);

$title = 'Oktonionový hypergraf | Vesmír čísel';
header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
?>
<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#111827">
  <title><?= htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></title>
  <link rel="stylesheet" href="/assets/css/design-tokens.css">
  <link rel="stylesheet" href="/assets/explorer.css">
  <link rel="stylesheet" href="/assets/css/card-materials.css">
  <script type="importmap">
    {"imports":{"three":"/assets/vendor/three/three.module.js","gsap":"/assets/vendor/gsap/gsap.js"}}
  </script>
  <script type="module" src="/assets/js/explorer.js"></script>
</head>
<body>
  <main class="explorer">
    <header class="topbar">
      <a class="brand" href="/">∑ <span>VESMÍR ČÍSEL · ÚVOD</span></a>
      <div>
        <p class="eyebrow">INTERAKTIVNÍ MATEMATICKÝ ATLAS · VOLITELNÁ AKADEMICKÁ VRSTVA</p>
        <h1>Oktonionový explorátor</h1>
      </div>
      <button id="theme-toggle" class="button button-quiet" type="button" aria-pressed="false">Světlý režim</button>
    </header>

    <p class="lead">Fanoova rovina popisuje sedm orientovaných součinů. Hypergraf C(7,3) obsahuje všech 35 trojic. Incidence, součin a asociátor jsou různé struktury — přepínej mezi nimi, aniž bychom záměnou geometrie předstírali osm prostorových os.</p>

    <nav class="mode-nav" aria-label="Režim vizualizace">
      <button class="mode-button is-active" data-mode="layered" type="button" aria-pressed="true">Layered</button>
      <button class="mode-button" data-mode="incidence" type="button" aria-pressed="false">Incidence</button>
      <button class="mode-button" data-mode="fano" type="button" aria-pressed="false">Fano</button>
      <button class="mode-button" data-mode="octonion" type="button" aria-pressed="false">Oktoniony</button>
      <button class="mode-button" data-mode="associator" type="button" aria-pressed="false">Asociátor</button>
      <button class="mode-button" data-mode="universe" type="button" aria-pressed="false">Universe</button>
    </nav>

    <section class="workspace" aria-label="Interaktivní explorátor">
      <div class="visual-panel vn-card-surface vn-card-surface--workspace">
        <div class="visual-heading">
          <div>
            <p class="eyebrow" id="mode-kicker">ÚPLNÝ 3-UNIFORMNÍ HYPERGRAF</p>
            <h2 id="mode-title">Vrstvené trojice</h2>
          </div>
          <button id="reset-camera" class="button button-quiet" type="button">Obnovit pohled</button>
        </div>
        <div id="scene-host" class="scene-host" role="application" aria-label="3D matematická vizualizace"></div>
        <div class="scene-legend" id="scene-legend"></div>
        <p id="scene-help" class="muted">Levým tlačítkem otáčej, pravým posouvej, kolečkem přibližuj. Dvojklik zaměří výběr.</p>
        <div id="mode-controls" class="mode-controls"></div>
      </div>

      <aside class="inspector vn-card-surface vn-card-surface--reading" aria-label="Matematický panel">
        <h2>Matematický panel</h2>
        <section>
          <h3>Combination Statistics</h3>
          <dl id="combination-statistics" class="stats-grid"></dl>
        </section>
        <section>
          <h3>Fano Relations</h3>
          <div id="fano-relations" class="relation-list"></div>
        </section>
        <section>
          <h3>Incidence Metrics</h3>
          <div id="incidence-metrics" class="inspector-copy"></div>
        </section>
        <section>
          <h3>Octonion Multiplication</h3>
          <div id="multiplication-result" class="inspector-copy">Vyber dvě jednotky.</div>
        </section>
        <section>
          <h3>Associator Results</h3>
          <div id="associator-result" class="inspector-copy">Vyber x, y a z.</div>
        </section>
        <p id="selection-status" class="status" role="status" aria-live="polite">Vyber trojici nebo jednotku ve scéně.</p>
      </aside>
    </section>
    <footer>
      <p>Matematická konvence součinů je společná s atlasem. Projekce a silové rozložení jsou vizualizace incidencí, nikoli fyzický prostor nebo metricky přesná reprezentace.</p>
    </footer>
  </main>
</body>
</html>

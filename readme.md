# Vesmír čísel

Česká interaktivní matematická expozice o tom, proč lidem dosavadní čísla nestačila a co přinášejí další číselné struktury.

> Každé rozšíření vzniklo proto, že předchozí svět přestal stačit.

Projekt rozlišuje **inkluzi množin** ℕ ⊂ ℤ ⊂ ℚ ⊂ ℝ od **algebraických rozšíření** ℝ → ℂ → ℍ → 𝕆. Iracionální čísla ℝ∖ℚ jsou součástí ℝ, ne další svět nad reálnými čísly. Dimenze algebry není dimenzí fyzického prostoru a projekce není samotný objekt.

## Aktuální stav

**Funkční lokální prototyp, nikoli uzavřené produkční vydání.**

- Fáze 0–5 a 6A/6B jsou dokončené pro prototyp; navazují volitelné MVP+ režimy.
- Fáze 5.5 obsahuje původní záznam s nedoloženými podmínkami a modelové/AI profily, včetně dalšího obsahově opakovaného bloku. Modely nejsou návštěvníci; potřebných alespoň 5 nezávislých skutečných průchodů není doloženo. Pro sběr je připraven [čistý dotazník](./overeni-5.5-cisty.md), brána zůstává otevřená.
- Fáze 7 je rozpracovaná: webové vstupy jsou propojené a základní automatické kontroly procházejí. Zbývá odborná revize, návštěvnické ověření, manuální přístupnostní audit, výkonová a závěrečná licenční kontrola.
- Fáze 8 je návrh dalšího rozvoje, ne závazek implementovat celou původní osnovu.
- V 7V.3 byly ověřené materiálové role rozšířeny z pilotu na výkladové/laboratorní sekce atlasu a inspektor/ovladače PHP explorátoru. Uživatel schválil jemný směr; `card-materials.css` a tokeny jsou sdílené, pracovní 3D plocha zůstává neprůhledná. Automatické regrese prošly. Čtečka, skutečný browser zoom a výkon na cílových zařízeních zůstávají otevřené z 7V.2; podrobný stav je v [faze2.md](./faze2.md).

Podrobný plán a průběžné hodnocení: [faze.md](./faze.md). Dosavadní technické ověření: [runtime-validation-report.md](./runtime-validation-report.md).

## Co lze prozkoumat

| Oblast | Implementované možnosti |
|---|---|
| ℕ, ℤ, ℚ, ℝ a ℝ∖ℚ | Klikatelná vnořená mapa, motivace rozšíření, volba konvence o nule v ℕ, reálná osa a ilustrace hustoty. |
| ℂ | Argandova rovina, vstupy a posuvníky, sčítání, násobení a dělení, kroky výpočtu, modul, argument a geometrická interpretace. |
| ℍ | Čtyři sdílené koeficienty, součiny qp/pq, konjugace, norma a inverze; kvaternionová rotace krychle, aplikace v technice a stereografická projekce jednotkových kvaternionů S³. |
| 𝕆 | Pevná orientovaná Fanoova konvence, tabulka násobení, asociátor, alternativita, Cayley–Dicksonova konstrukce a builder; souřadnicová projekce S⁷ a vrstvený model všech 35 trojic. |
| Pohled z orbity | Mapa vztahů, dimenze 1/2/4/8, komutativita a asociativita, přehled získaných možností a klasifikace algebraických a transcendentních reálných čísel. |
| Výklad | Vybraná historická osa, matematické omyly, slovník a odkazy na zdroje; 8 zastávek × 3 hloubky s hlavní myšlenkou, příkladem a hranicemi. |
| PHP explorátor | Samostatná volitelná WebGL laboratoř: Layered, Incidence, Fano, Oktoniony, Asociátor a Universe. |

Úplný hypergraf C(7,3) má **35 trojic**, zatímco Fanoova rovina má pouze **7 přímek**. Odvozený incidenční graf obsahuje 525 vazeb: 315 se společným bodem a 210 se dvěma společnými body. Výška a barvy pěti vrstev jsou prezentační, nikoli algebraické vlastnosti.

### Hranice výpočtů a vizualizací

- Komplexní laboratoř používá přesnou racionální aritmetiku pro podporované vstupy. Modul, argument a kresba jsou aproximace. Složky mají rozsah −10 až 10, desetinný zápis do 3 míst nebo zlomky s absolutní hodnotou jmenovatele nejvýše 1000.
- Kvaternionové a oktonionové výpočty jsou číselné. Oktonionová laboratoř nabízí jednotky a vybrané kombinace, nikoli parser libovolných výrazů.
- Rotovaná krychle je aplikace kvaternionu na 3D objekt; není obrazem celého ℍ. S³/S⁷ režimy uvádějí omezení projekce. Fanoův diagram znázorňuje násobicí vztahy, ne fyzický 8D prostor.
- Web není univerzální kalkulačka, důkazový systém ani výzkumně certifikovaný nástroj.

## Spuštění

### 1. Základní atlas bez instalace

Otevři [wireframe.html](./wireframe.html) v moderním prohlížeči. Ve stejném adresáři musí zůstat:

- [complex-math.js](./complex-math.js)
- [quaternion-math.js](./quaternion-math.js)
- [octonion-math.js](./octonion-math.js)

Zachovej také [assets/css/design-tokens.css](./assets/css/design-tokens.css), [assets/css/card-materials.css](./assets/css/card-materials.css) a [assets/css/pilot-cards.css](./assets/css/pilot-cards.css): společné tokeny, materiálové role karet a atmosféru atlasu. Atlas je načítá relativní cestou bez serveru.

Základní atlas nepotřebuje PHP, Node.js ani WebGL. Odkaz na samostatný PHP explorátor však přes `file:` nefunguje jako aplikace; pro něj použij následující variantu.

### 2. Celý web včetně PHP explorátoru

Potřebuješ Node.js s npm, PHP 8+ a moderní prohlížeč s ES modules/import maps. Lokálně bylo ověřeno Node.js 24.22.2 a PHP 8.2.12; další verze zatím nemají doloženou testovací matici.

V kořeni projektu:

```powershell
npm ci
npm run build
php -S 127.0.0.1:8080 -t public
```

Pokud PHP není na PATH, například s XAMPP:

```powershell
& 'C:\xampp\php\php.exe' -S 127.0.0.1:8080 -t public
```

- Hlavní expozice: <http://127.0.0.1:8080/>
- PHP explorátor: <http://127.0.0.1:8080/octonion-explorer.php>

Server ukonči `Ctrl+C`. Vestavěný PHP server slouží k lokálnímu vývoji, nikoli k produkčnímu provozu.

`npm run build` kopíruje atlas do `public/index.html`, upravuje cesty matematických skriptů, připravuje lokální knihovny/moduly a kompiluje SCSS. Zdroj atlasu upravuj v [wireframe.html](./wireframe.html), ne v generované kopii. Po změně zdrojů znovu spusť build.

### Nasazení

Document root nastav na adresář `public` a zajisti PHP obsluhu. URL assetů začínají `/assets/`, proto současný build očekává nasazení v kořeni webu; podadresář vyžaduje úpravu cest. Původní podklady, vyplněný dotazník a vývojové závislosti do veřejného document root nepatří.

Web nemá databázi, přihlášení ani backend pro ukládání odpovědí. Motiv se ukládá lokálně v prohlížeči. Knihovny se servírují z lokálních assetů, nikoli z CDN; odkazy na odborné zdroje potřebují internet. Při nedostupném WebGL explorátor nabídne návrat k základní expozici.

## Testy

Nejdříve připrav veřejné assety pomocí `npm run build`. Pro browser testy je potřeba také Chromium pro Playwright:

```powershell
npx playwright install chromium
npm test
```

Na Windows bez PHP na PATH:

```powershell
$env:PHP_CLI = 'C:\xampp\php\php.exe'
npm test
```

| Příkaz | Rozsah |
|---|---|
| `npm run test:unit` | Matematická jádra a kombinatorická data. |
| `npm run test:e2e` | Browser průchody; Playwright spouští PHP server na portu 4173. |
| `npm test` | Unit i E2E testy. |
| `php -l public\octonion-explorer.php` | Kontrola PHP syntaxe. |

Poslední zaznamenané ověření dne 1. 11. 2026: **27 unit testů a 14 Playwright scénářů prošlo, exit code 0**; build i PHP syntax check uspěly. Browser testy zahrnují matematické průchody, oba motivy, šířky 320/768/1440 px, WebGL fallback i společné role povrchů ve vstupním atlasu a PHP explorátoru. Pilotní validace přidává 624 vzorků kontrastu skutečně složeného pozadí (minimum 4,822:1), vybraný vstup/fokus alespoň 3:1, 200% root text, CSS layout zoom a simulovaný neprůhledný fallback. Test 7V.3 ověřuje stejné role v obou tématech, pracovní plochu, inset ovladače a zachování scény. Opraveno zalamování dlouhých textů a přepínačů bez skrytí přesahu stránky. Automatické testy nedokládají porozumění návštěvníků ani úplnou přístupnost, skutečný browser zoom a výkon na reálných zařízeních.

## Struktura projektu

| Cesta | Účel |
|---|---|
| `wireframe.html` | Zdroj základní expozice, její CSS, SVG a interakce. |
| `complex-math.js`, `quaternion-math.js`, `octonion-math.js` | Sdílená matematická jádra a jejich sousední `*.test.js` testy. |
| `assets\js\` | ES modules samostatného explorátoru a jednotlivých pohledů. |
| `assets\css\design-tokens.css` | Sdílené materiálové, barevné a typografické role pro atlas i explorátor. |
| `assets\css\pilot-cards.css` | Vzhled pouze dvou pilotních karet 7V.1. |
| `assets\scss\explorer.scss` | Zdroj stylů explorátoru. |
| `data\octonion-data.js` | Data trojic, Fanoových vztahů a incidencí. |
| `scripts\copy-vendor.mjs` | Příprava veřejných assetů a vstupní stránky. |
| `public\` | Document root: sestavený atlas, PHP stránka a assety. |
| `tests\e2e\`, `playwright.config.cjs` | Browser scénáře a konfigurace. |
| `faze.md` | Rozsah, fáze, validační brány a návrh dalšího rozvoje. |
| `overeni-5.5.md` | Archiv původních a modelových odpovědí, ne uzavřená brána. |
| `overeni-5.5-cisty.md` | Čistý dotazník pro skutečné návštěvníky bez odpovědí a klíče. |
| `faze2.md` | Druhá etapa, vizuální podfáze a výběrové obsahové rozšíření. |
| `1.md`, `v1.md`, `prompt_STYLE.md` | Původní náměty, vizualizační zásady a designové zadání; ne seznam již dodaných funkcí. |

Technologie: vanilla HTML/CSS/JavaScript, SVG, PHP, Three.js, OrbitControls, GSAP, Sass a Playwright. Nepoužívá se aplikační framework ani bundler.

## Co zatím chybí a kam směřuje Fáze 8

Stabilizace Fáze 7 již strukturovala tři úrovně výkladu a zpřehlednila výsledky komplexní laboratoře. Před přidáváním nových světů zbývá ověřit účinek těchto úprav a uzavřít ostatní brány Fáze 7. Poté sjednotit styl karet atlasu a explorátoru. Modelové profily nejsou dokladem četnosti problémů skutečných návštěvníků.

Původní osnova je širší než dodané MVP:

- Historie zápisů civilizací, binární/hexadecimální a další soustavy ani jejich převodník nejsou hotové.
- Algebraická a transcendentní čísla mají informační strom, ale ne samostatnou hlubší kapitolu.
- Fraktály, komplexní čísla v elektrotechnice/signálech, Hopfova fibrace, výjimečné symetrie a sedeniony zatím nejsou implementované.
- p-adická, hyperreálná a surreální čísla, Cantorova metoda, obecná observatoř dimenzí a širší filozofický horizont jsou budoucí moduly.
- Univerzální kalkulačka všech množin, vyhledávání ve slovníku a samostatný renderer LaTeXu nejsou součástí prototypu.

Podrobné porovnání s [1.md](./1.md), [v1.md](./v1.md) a hodnocení karet podle [prompt_STYLE.md](./prompt_STYLE.md) je v kapitole Fáze 8 v [faze.md](./faze.md). Návrhy nespojují algebry, hyperkrychle a fyzikální teorie do jedné dimenzionální posloupnosti.

## Zdroje a licence

Odborné zdroje jsou uvedené u výkladů a v závěru expozice. Inspirační obrázky a videa nejsou vložené do webu a jejich přítomnost v adresáři nedává automatické právo je publikovat.

Three.js používá MIT licenci; build ji kopíruje do `public\assets\vendor\three\LICENSE`. GSAP podléhá vlastní standardní licenci, nelze na něj automaticky vztáhnout MIT podmínky Three.js. Před veřejnou redistribucí ověř podmínky všech použitých knihoven a zachování licenčních oznámení.

Při stabilizaci byla ověřena shoda kopie Three.js licence a všech tří veřejných GSAP souborů s nainstalovanými zdroji včetně oznámení. [Standardní licence GSAP](https://gsap.com/community/standard-license/) připouští použití na webu, vyžaduje zachování oznámení a omezuje použití v konkurenčních vizuálních animačních nástrojích; nejde o právní certifikaci projektu. Sass a Playwright slouží k sestavení/testům, ne jako dodávané browser knihovny.

Tento dokument neuděluje licenci k vlastnímu kódu projektu ani k inspiračním médiím; publikační/licenční rozhodnutí je stále otevřené.

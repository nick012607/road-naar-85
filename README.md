# Road naar 85

Voortgangsrapport voor de weddenschap tussen Nick en Victor: wie staat als eerste op 85,0 kg. Inzet €50.

Drie pagina's:

| Pagina | Bestand | Waarvoor |
|---|---|---|
| Vergelijking | `index.html` | Klassement, twee grafieken, laatste invoer van allebei |
| Nick | `nick.html` | Eigen invoer, eigen trend, eigen dagdoel |
| Victor | `victor.html` | Idem |

Geen build, geen dependencies, geen framework. Vanilla JS, statische HTML, klaar voor GitHub Pages.

---

## Opzetten

### 1. Supabase-project aanmaken

Maak een gratis project aan op [supabase.com](https://supabase.com). Ga daarna naar **SQL Editor → New query**, plak de inhoud van `schema.sql` en klik op **Run**.

### 2. Sleutels invullen

Open **`assets/config.js`**. Dit is het enige bestand dat je hoeft aan te passen. Bovenin staat:

```js
const SUPABASE = {
  url:     '',   // hier je Project URL
  anonKey: ''    // hier je anon public key
};
```

Beide waarden vind je in Supabase onder **Project Settings → API**:

- `url` → het veld **Project URL**, bijvoorbeeld `https://abcdefgh.supabase.co`. Zonder slash aan het eind.
- `anonKey` → de sleutel onder **Project API keys** met het label **anon** / **public**. Niet de `service_role` sleutel — die geeft volledige beheerrechten en hoort nooit in een publieke repository.

### 3. Profielen bijwerken

In hetzelfde bestand staan de twee deelnemers, allebei compleet ingevuld. `mode` en `adjust` bepalen het dagdoel.

```js
victor: {
  height: 182,
  age:    20,
  mode:   'bulk',   // moet aankomen naar 85
  adjust: 700       // kcal per dag boven onderhoud
}
```

`mode` bepaalt de richting: `'cut'` rekent met een tekort, `'bulk'` met een overschot.

### 4. Publiceren

```bash
git add .
git commit -m "Road naar 85"
git push -u origin main
```

Zet daarna in de repository **Settings → Pages** de bron op branch `main`, map `/ (root)`. De site staat een paar minuten later op `https://nick012607.github.io/road-naar-85/`.

---

## Hoe het rekent

**7-daags gemiddelde.** Dagelijkse schommelingen van een kilo zijn water, glycogeen en darminhoud. Elke grafiek en elke projectie gebruikt daarom het voortschrijdend gemiddelde over zeven dagen, niet de losse weging. De losse wegingen staan er als lichte stipjes bij.

**Projectie.** Een kleinste-kwadraten helling over de laatste 21 dagen van dat gemiddelde, doorgetrokken naar 85,0. Onder de drie wegingen wordt er niets geprojecteerd, en boven de 400 dagen ook niet — dan is de trend te vlak om iets te betekenen.

**Werkelijk onderhoud.** Zodra iemand tien dagen calorieën heeft gelogd, rekent de app zijn onderhoud terug: het gemiddelde van wat hij at, gecorrigeerd voor de energie in de kilo's die hij in die periode verloor of aankwam (7700 kcal per kilo). Dat getal vervangt vervolgens de Mifflin-St Jeor-schatting in het dagdoel. Het is alleen zo betrouwbaar als de log: olie, sauzen en restaurantporties worden structureel te laag ingeschat.

**Afstand tot 85.** De tweede grafiek op de vergelijkingspagina zet allebei om naar de resterende afstand tot het streefgewicht. Omdat Nick omlaag moet en Victor omhoog, zeggen absolute kilo's weinig; in afstand bewegen ze allebei naar nul en is de race pas echt te vergelijken.

---

## Bestanden

```
index.html          vergelijkingspagina
nick.html           persoonlijke pagina Nick
victor.html         persoonlijke pagina Victor
schema.sql          databaseschema voor Supabase
assets/
  config.js         sleutels, profielen, streefgewicht — het enige dat je invult
  core.js           data, gemiddeldes, trends, energieberekening
  charts.js         SVG-grafieken, handgeschreven, geen library
  person.js         gedrag van de persoonlijke pagina's
  compare.js        gedrag van de vergelijkingspagina
  styles.css        gedeeld stijlblad
```

Zonder ingevulde config draaien alle pagina's gewoon, maar alleen in het geheugen van het tabblad. Handig om rond te klikken, nutteloos om iets te bewaren — er verschijnt dan een waarschuwing bovenaan.

---

## Beveiliging

De anon key staat in een publiek bestand en de RLS-policy laat iedereen met die sleutel lezen en schrijven. Iemand die de key uit de broncode plukt kan dus jullie wegingen bekijken of aanpassen. Voor deze weddenschap is dat een bewuste afweging: geen inlogscherm, geen wachtwoorden, geen gedoe. Gebruik dit Supabase-project niet voor iets waar dat wél uitmaakt.

Wil je het later dichtzetten, dan is de kleinste stap: repository op private, Pages via een eigen domein, of Supabase Auth met twee vaste accounts en een policy op `auth.uid()`.

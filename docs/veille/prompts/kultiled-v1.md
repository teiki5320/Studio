# Prompt — Veille actus sur Kultiled (v1)

> À coller dans une **nouvelle session Claude Code ouverte sur le dépôt de Kultiled** (`/Users/jeanperraudeau/Dev/apps/optiled`, teiki5320/optiled — ancien nom OptiLED). Le fichier `https://teiki5320.github.io/veille/actus/kultiled.json` existe déjà (premier passage le 27/10/2026).

## Contexte

Jean (non technicien, réponses en français simple, choix numérotés) ajoute sur kultiled.com des **actus de la culture en intérieur et de l'éclairage LED horticole, récupérées automatiquement** : un titre reformulé, un résumé réécrit, un lien vers la source et une image libre de droits. **Ce n'est pas un site africain** : les actus viennent du monde entier. Une tâche Claude les prépare 2 fois par jour (12 h et 19 h), dans le dépôt public `teiki5320/veille`. **Le site ne fait que lire et afficher** le fichier JSON, en direct, dans le navigateur du visiteur, sans reconstruction. Il y a peu d'actus (souvent 1 à 3 par passage) : le site doit rester beau avec 1 seule actu ou aucune. Le cannabis et toute drogue sont **toujours exclus** par la veille.

Décisions complètes : `https://github.com/teiki5320/Studio/blob/main/docs/veille/decisions-v1.md` (section « Kultiled »). Lis-les, ainsi que le schéma `https://teiki5320.github.io/veille/schema/actus-schema-v3.json`, et le vrai fichier `https://teiki5320.github.io/veille/actus/kultiled.json`. Modèle visuel : `Studio/docs/veille/maquette-images-v1.html`.

Le site : **pages HTML statiques construites par Vite + TypeScript**, sans framework ni backend, publiées sur **GitHub Pages** (www.kultiled.com). Chaque page (`index.html` = le calculateur, `led.html`, `culture.html`, `legumes.html`, `conseils.html`…) contient des **marqueurs** (`<!--#head-->`, `<!--#header-->`, `<!--#footer-->`, `<!--#orientation-->`…) remplacés au build par le plugin maison `build/site.ts` ; les **pages légumes** `legume-<id>.html` (26) n'existent pas sur le disque : elles sont **générées** par `build/pages-legumes.ts` depuis `src/data/legumes.json`. Couleurs et polices dans `src/theme.css` (thème de nuit : fond `#1b1322`, cartes `#261a2e`, texte `#f6ecf0`, accent ambre `#f7c07a`, orange `#f59b58`). Le site a un **service worker** (`public/sw.js`) qui ignore déjà les autres origines : ne le change pas pour la veille. Il n'y a pas d'en-tête CSP aujourd'hui. **Lis le `CLAUDE.md` (et `AGENTS.md`, sans le modifier) et respecte-les.**

## Ce que tu construis

1. **Fichier public des légumes pour la veille** : `veille/entites.json`, produit **au build** par le plugin, servi sur `https://www.kultiled.com/veille/entites.json`. Contenu : un tableau `{ "tag": "legume:<id>", "nom": "<Nom>", "autres_noms": [...] }` pour chaque culture de `legumes.json`, **sauf `chanvre-cbd`, qui n'y figure jamais**. Ajoute les noms anglais dans `autres_noms` (« lettuce », « basil », « microgreens », « tomato »…) : beaucoup de sources sont en anglais. Ajoute un test Vitest : toutes les cultures sauf `chanvre-cbd`.
2. **`src/veille.ts`** (code navigateur) : le type `Actu` (schéma v3), `URL_VEILLE = "https://teiki5320.github.io/veille/actus/kultiled.json"` et `chargerActus()`.
   - `fetch` avec un délai de 8 s, cache de 15 min dans `sessionStorage` (avec `try/catch`).
   - En cas d'erreur : renvoie `[]`, **sans jamais casser la page** ni le calculateur.
   - Une fonction qui remplit un conteneur `<section data-actus data-limite="4" data-tag="legume:tomate" hidden>` : la 1re actu en **bandeau** (image 16:9, titre, résumé, « Source : [source_nom] ↗ », l'âge, crédit), les suivantes en **vignettes** (image carrée : `-carre.webp` au lieu de `.webp` pour les photos ; la carte SVG recadrée en `object-fit: cover`). Crédit : « Photo : [credit] · [licence] » avec un lien vers `image.page`, ou « Illustration : Kultiled » pour une carte. HTML construit avec `textContent` / `createElement` (jamais `innerHTML` avec le texte du JSON). La section reste cachée s'il n'y a aucune actu.
   - Appelle-la au chargement de chaque page qui a un `[data-actus]` (le script d'entrée commun, sans alourdir le calculateur : chargement différé après l'affichage).
3. **Marqueur** `<!--#actus:4-->` (et `<!--#actus:3:legume:tomate-->`) dans `build/site.ts`, qui insère la section cachée avec son titre. Styles avec les variables de `src/theme.css`.
4. **Emplacements** (choix de Jean) :
   - **Accueil** (`index.html`) : un bloc « Actus de la culture en intérieur » de **4** actus, **sous** le calculateur et ses résultats (près de `<!--#orientation-->`), jamais entre la saisie et les résultats, et sans repousser les emplacements AdSense. Lien « Toutes les actus → ».
   - **Nouvelle page `actus.html`** (« Actus de la culture en intérieur et des LED ») : **20** actus, une phrase d'intro et la date de mise à jour (`genere_le`). Ajoute-la à la navigation, au pied de page et au sitemap, avec son titre, sa description et son Open Graph.
   - **Chaque page légume** (`legume-<id>.html`, générée par `build/pages-legumes.ts`) : un bloc « L'actu de [la tomate] » de **3** actus dont `tags` contient `legume:<id>`. S'il n'y en a aucune, rien n'est affiché. **Jamais de bloc sur `legume-chanvre-cbd.html`.**
5. **Liens vers les sources** : `target="_blank" rel="noopener nofollow"`, toujours visibles.
6. **CSP** : il n'y en a pas aujourd'hui. Si tu en trouves une, ajoute `https://teiki5320.github.io` à `connect-src` et `img-src`, et rien d'autre. N'en crée pas une nouvelle.
7. **Rendu** : `alt` = `image.alt` ; lisible sur le fond sombre ; pas de défilement horizontal sur iPhone et iPad ; `loading="lazy"` partout (le bloc de l'accueil est sous le calculateur).

## Règles

- **Légal** : jamais de titre original, toujours la source avec son lien et le crédit de l'image, aucun texte copié.
- **Jamais de cannabis ni de drogue** dans les textes que tu ajoutes ; pas de bloc d'actus sur la fiche Chanvre CBD.
- **Amazon** : aucun lien Partenaires, aucune lampe ni prix dans un bloc d'actus ou sur `actus.html`.
- **Ne relie jamais kultiled.com à un autre site de Jean.**
- **Git** : branche `main` uniquement, pas de branche, pas de PR. Commits en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ne touche jamais `AGENTS.md`.
- **Fiches du Studio** : mets à jour, dans le **même commit**, `docs/INFRA.md` (service « Veille actus »), `docs/MARKETING.md` (rubrique Actus) et la ligne du README concernée (tableau des pages), comme le demande le `CLAUDE.md`.

## Checklist finale (à rendre à Jean, ✅ / ❌, en français simple)

- [ ] `npm test` et `npm run build` passent.
- [ ] `https://www.kultiled.com/veille/entites.json` est en ligne après la mise en ligne, sans le chanvre.
- [ ] Testé dans un navigateur : accueil (jusqu'à 4, sous le calculateur qui marche toujours), `actus.html` (jusqu'à 20), une page légume avec des actus et une sans (bloc absent), la page Chanvre CBD sans bloc.
- [ ] JSON coupé (adresse fausse, à essayer) : les pages et le calculateur restent intacts, aucun bloc vide.
- [ ] Une photo et une carte générée sont visibles, avec leur crédit. Le lien « Source » marche.
- [ ] Rendu vérifié sur iPhone et iPad (375 et 1024).
- [ ] Fiches et README mis à jour dans le même commit, poussé sur `main`, mise en ligne GitHub Pages au vert.
- [ ] Lien direct vers www.kultiled.com/actus.html donné à Jean.

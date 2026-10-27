# Prompt — Veille actus sur Keur Déco (v1)

> À coller dans une **nouvelle session Claude Code ouverte sur le dépôt de Keur Déco** (`/Users/jeanperraudeau/Dev/apps/keurdeco`, teiki5320/Keurdeco). Le fichier `https://teiki5320.github.io/veille/actus/keurdeco.json` existe déjà (premier passage le 27/10/2026).

## Contexte

Jean (non technicien, réponses en français simple, choix numérotés) ajoute sur keurdeco.com des **actus de la déco, du design et de l'artisanat africains, récupérées automatiquement** : un titre reformulé, un résumé réécrit, un lien vers la source et une image libre de droits. Une tâche Claude les prépare 2 fois par jour (12 h et 19 h), dans le dépôt public `teiki5320/veille`. **Le site ne fait que lire et afficher** le fichier JSON, en direct, dans le navigateur du visiteur, sans reconstruction. Il y a peu d'actus (souvent 1 à 4 par passage) : le site doit rester beau avec 1 seule actu ou aucune.

Décisions complètes : `https://github.com/teiki5320/Studio/blob/main/docs/veille/decisions-v1.md` (section « Keur Déco »). Lis-les, ainsi que le schéma `https://teiki5320.github.io/veille/schema/actus-schema-v3.json`, et le vrai fichier `https://teiki5320.github.io/veille/actus/keurdeco.json`. Modèle visuel : `Studio/docs/veille/maquette-images-v1.html`.

Le site : **site statique multipage Vite + TypeScript**, sans framework ni backend, publié sur **GitHub Pages** (domaine www.keurdeco.com). Les pages HTML (`index.html`, `a-propos.html`…) contiennent des **marqueurs** (`<!--#head-->`, `<!--#header-->`, `<!--#une-->`, `<!--#tops-->`…) remplacés au build par le plugin maison `build/site.ts` ; les pages de rubriques (`piece-<id>.html`, `matiere-<id>.html`, `occasion-<id>.html`) sont **générées** par `build/rubriques.ts` (via `pagesGenerees()`), les matières sont dans `src/taxonomie.ts` (`MATIERES` : wax, bogolan, kente, indigo, raphia-paniers, terre-cuite, bois-sculpte, perles). Le JavaScript du navigateur est dans `src/site.ts`, les styles dans `src/site.css`, **toutes les couleurs et polices dans `src/theme.css`** (palette « Terre de Dakar » : sable `#f7f0e6`, encre `#2a1d15`, terracotta `#a3472a`, ocre `#d49a2a`, indigo `#1e2a47` ; Fraunces pour les titres, Source Sans 3 pour le texte). Le site est **lisible sans JavaScript** et a un **service worker** (`build/sw.js`) qui ignore déjà les autres origines : ne le change pas pour la veille. Il n'y a pas d'en-tête CSP aujourd'hui. **Lis le `CLAUDE.md` (et `AGENTS.md`, sans le modifier) et respecte-les.**

## Ce que tu construis

1. **Fichier public des matières pour la veille** : `veille/entites.json`, produit **au build** par le plugin (même mécanisme que `sitemap.xml`), servi sur `https://www.keurdeco.com/veille/entites.json`. Contenu : un tableau `{ "tag": "matiere:<id>", "nom": "<Nom>", "autres_noms": [...] }` pour **chaque matière** de `MATIERES` (ajoute dans `autres_noms` les variantes utiles : « wax hollandais », « bògòlanfini », « kenté », « adire », « vannerie », « poterie »…). La tâche de veille le lit pour relier une actu à une matière. Ajoute un test Vitest qui vérifie qu'il contient toutes les matières.
2. **`src/veille.ts`** (code navigateur) : le type `Actu` (schéma v3), `URL_VEILLE = "https://teiki5320.github.io/veille/actus/keurdeco.json"` et `chargerActus()`.
   - `fetch` avec un délai de 8 s, cache de 15 min dans `sessionStorage` (avec `try/catch`).
   - En cas d'erreur : renvoie `[]`, **sans jamais casser la page**.
   - Une fonction qui remplit un conteneur `<section data-actus data-limite="4" data-tag="matiere:wax">` : la 1re actu en **bandeau** (image 16:9, titre, résumé, « Source : [source_nom] ↗ », l'âge, crédit), les suivantes en **vignettes** (image carrée : `-carre.webp` au lieu de `.webp` pour les photos ; la carte SVG recadrée en `object-fit: cover`). Crédit : « Photo : [credit] · [licence] » avec un lien vers `image.page`, ou « Illustration : Keur Déco » pour une carte. Construis le HTML avec `textContent` / `createElement` (jamais `innerHTML` avec le texte du JSON). S'il n'y a aucune actu, la section reste **cachée** (attribut `hidden` dans le HTML, retiré seulement s'il y a des actus) : sans JavaScript, rien ne s'affiche.
   - Appelle-la depuis `src/site.ts` pour chaque `[data-actus]` de la page.
3. **Marqueur** `<!--#actus:4-->` (et `<!--#actus:3:matiere:wax-->`) dans `build/site.ts` : il insère la section vide avec son titre, prête à être remplie. Styles dans `src/site.css`, couleurs **uniquement** via les variables de `src/theme.css`.
4. **Emplacements** (choix de Jean) :
   - **Accueil** (`index.html`) : un bloc « Actus de la déco africaine » de **4** actus (1 bandeau + 3 vignettes), avec un lien « Toutes les actus → », après le bloc `<!--#une-->`, sans repousser les emplacements AdSense.
   - **Nouvelle page `actus.html`** (« Actus de la déco africaine ») : **20** actus, une phrase d'intro et la date de mise à jour (`genere_le`). Ajoute-la à la navigation (`NAVIGATION`), au pied de page et au `sitemap.xml`, avec son titre, sa description et son Open Graph.
   - **Chaque page matière** (`matiere-<id>.html`, générée par `build/rubriques.ts`) : un bloc « L'actu du [wax] » de **3** actus dont `tags` contient `matiere:<id>`. S'il n'y en a aucune, rien n'est affiché.
5. **Liens vers les sources** : `target="_blank" rel="noopener nofollow"`, toujours visibles.
6. **CSP** : il n'y en a pas aujourd'hui. Si tu en trouves une (balise `<meta http-equiv>`), ajoute `https://teiki5320.github.io` à `connect-src` et `img-src`, et rien d'autre. N'en crée pas une nouvelle.
7. **Rendu** : `alt` = `image.alt` ; pas de défilement horizontal sur iPhone et iPad ; `loading="lazy"`, sauf le bandeau de l'accueil ; respecte `prefers-reduced-motion` pour d'éventuelles animations d'apparition.

## Règles

- **Légal** : jamais de titre original, toujours la source avec son lien et le crédit de l'image, aucun texte copié.
- **Amazon** : aucun lien Partenaires, aucun produit ni prix dans un bloc d'actus ou sur `actus.html`.
- **Pinterest** : les images de la veille ne sont **pas** nos visuels ; ne crée **aucune épingle** et pas de bouton « Épingler » sur les actus.
- **Ne relie jamais keurdeco.com à un autre site de Jean.**
- **Git** : branche `main` uniquement, pas de branche, pas de PR. Commits en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ne touche jamais `AGENTS.md`.
- **Fiches du Studio** : mets à jour, dans le **même commit**, `docs/INFRA.md` (service « Veille actus »), `docs/MARKETING.md` (rubrique Actus) et la ligne du README concernée, comme le demande le `CLAUDE.md`.

## Checklist finale (à rendre à Jean, ✅ / ❌, en français simple)

- [ ] `npm test`, `npm run build` et `npm run test:e2e` passent (avec un test e2e de la page `actus.html`, JSON simulé).
- [ ] `https://www.keurdeco.com/veille/entites.json` est en ligne après la mise en ligne, avec les 8 matières.
- [ ] Testé dans un navigateur : accueil (jusqu'à 4), `actus.html` (jusqu'à 20), une page matière avec des actus et une sans (bloc absent).
- [ ] Sans JavaScript et avec un JSON coupé (adresse fausse, à essayer) : les pages restent intactes, aucun bloc vide.
- [ ] Une photo et une carte générée sont visibles, avec leur crédit. Le lien « Source » marche.
- [ ] Rendu vérifié sur iPhone et iPad (375 et 1024).
- [ ] Fiches et README mis à jour dans le même commit, poussé sur `main`, mise en ligne GitHub Pages au vert.
- [ ] Lien direct vers www.keurdeco.com/actus.html donné à Jean.

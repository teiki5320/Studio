# Prompt — Veille actus sur Keur Cook (v1)

> À coller dans une **nouvelle session Claude Code ouverte sur le dépôt de Keur Cook** (`/Users/jeanperraudeau/Dev/apps/keurcook`, teiki5320/keurcook). Le fichier `https://teiki5320.github.io/veille/actus/keurcook.json` existe déjà (premier passage le 27/10/2026).

## Contexte

Jean (non technicien, réponses en français simple, choix numérotés) ajoute sur keurcook.com des **actus de la cuisine africaine, récupérées automatiquement** : un titre reformulé, un résumé réécrit, un lien vers la source et une image libre de droits. Une tâche Claude les prépare 2 fois par jour (12 h et 19 h), dans le dépôt public `teiki5320/veille`. **Le site ne fait que lire et afficher** le fichier JSON, en direct, dans le navigateur du visiteur, sans reconstruction. Il y a peu d'actus (souvent 1 à 3 par passage) : le site doit rester beau avec 1 seule actu ou aucune.

Décisions complètes : `https://github.com/teiki5320/Studio/blob/main/docs/veille/decisions-v1.md` (section « Keur Cook »). Lis-les, ainsi que le schéma `https://teiki5320.github.io/veille/schema/actus-schema-v3.json`, et le vrai fichier `https://teiki5320.github.io/veille/actus/keurcook.json`. Modèle visuel : `Studio/docs/veille/maquette-images-v1.html`.

Le site : Next.js 16 en **export statique** (`out/`), React 19, TypeScript, Tailwind 4, publié sur **Cloudflare Pages**. Pages dans `src/app/(shop)/` (accueil `page.tsx`, `recette/[slug]`, `recettes`, `pays/[slug]`, `pays`, `conseils`, `top-10`, `boutique`, `produit`, `favoris`). Pays dans `src/lib/countries.ts` (champs `code` = ISO2 et `slug`). Le site est **sombre** : fond brun très foncé (`#0d0604` à `#2a1810`), texte crème `#fbeee2`, accent orange `#ff7a3d`, jaune `#ffc46b`, titres en Anton (voir `page.tsx` et `src/app/nuage.css`). Il y a un mode maintenance (`getMaintenance()`) : rien ne doit s'afficher pendant la maintenance. **Lis le `CLAUDE.md` (et `AGENTS.md`, sans le modifier) et respecte-les**, en particulier `src/lib/compliance.ts`.

## Ce que tu construis

1. **`src/lib/veille.ts`** : le type `Actu` (schéma v3), `URL_VEILLE = "https://teiki5320.github.io/veille/actus/keurcook.json"` et `chargerActus()`.
   - Côté navigateur seulement : `fetch` avec un délai de 8 s, cache de 15 min dans `sessionStorage` (avec `try/catch`).
   - En cas d'erreur : renvoie `[]`, **sans jamais casser la page**.
2. **Composants** (`src/components/actus/`), en composants client (`"use client"`), **dans le style de Keur Cook** (Anton pour les titres de bloc, point orange final comme les autres titres de section, cartes arrondies) :
   - `ActuBandeau` : image 16:9, titre, résumé, « Source : [source_nom] ↗ » et l'âge (« il y a 3 h »), crédit de l'image.
   - `ActuVignette` : image carrée (`-carre.webp` au lieu de `.webp` pour les photos ; la carte SVG recadrée en `object-fit: cover`), puis le texte en plus compact.
   - `CreditImage` : « Photo : [credit] · [licence] » avec un lien vers `image.page`, ou « Illustration : Keur Cook » pour une carte.
   - `BlocActus` : un `titre`, une `limite` et un filtre `pays` facultatif (code ISO2). La 1re actu est en bandeau, les suivantes en vignettes. Squelette discret pendant le chargement ; s'il n'y a aucune actu, **rien n'est affiché** (ni titre, ni cadre vide).
3. **Emplacements** (choix de Jean) :
   - **Accueil** : un bloc « Actus de la cuisine africaine » de **4** actus (1 bandeau + 3 vignettes), avec un lien « Toutes les actus → ». Place-le après le carrousel « Cuisiner par pays », sans repousser les emplacements AdSense.
   - **Nouvelle page `/actus`** (« Actus de la cuisine africaine ») : **20** actus, une phrase d'intro et la date de mise à jour (`genere_le`). Ajoute-la au menu, au pied de page et au sitemap (`src/app/sitemap.ts`), avec son titre et sa description SEO (`pageMetadata`).
   - **Chaque page pays** (`pays/[slug]`) : un bloc « L'actu de la cuisine [du Sénégal] » (champ `of` du pays) de **3** actus dont `pays` contient le `code` du pays. S'il n'y en a aucune, rien n'est affiché.
4. **Liens vers les sources** : `target="_blank" rel="noopener nofollow"`, toujours visibles.
5. **CSP** (`public/_headers`) : ajoute `https://teiki5320.github.io` à **`connect-src`** et à **`img-src`**, et rien d'autre.
6. **Rendu** : `alt` = `image.alt` ; lisible sur le fond sombre du site ; pas de défilement horizontal sur iPhone et iPad ; `loading="lazy"`, sauf le bandeau de l'accueil.

## Règles

- **Légal** : jamais de titre original, toujours la source avec son lien et le crédit de l'image, aucun texte copié.
- **Conformité Keur Cook** : aucune allégation santé ou nutrition médicale, **aucun vocabulaire de vente** dans les textes que tu ajoutes (pas de « acheter », « prix », « disponible sur »). Les actus elles-mêmes sont déjà filtrées par la veille.
- **Jamais de lien Amazon, de bouton « Acheter » ni de produit de la boutique** dans un bloc d'actus ou sur la page `/actus` ; garde au moins un bloc d'écart avec les annonces AdSense.
- **Ne relie jamais keurcook.com à un autre site de Jean.**
- **Git** : branche `main` uniquement, pas de branche, pas de PR. Commits en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ne touche jamais `AGENTS.md`.
- **Fiches du Studio** : mets à jour, dans le **même commit**, `docs/INFRA.md` (service « Veille actus », dépôt teiki5320/veille, GitHub Pages), `docs/MARKETING.md` (rubrique Actus) et la ligne du README concernée, comme le demande le `CLAUDE.md`.

## Checklist finale (à rendre à Jean, ✅ / ❌, en français simple)

- [ ] `npm run lint`, `npm run typecheck`, `npm test` et `npm run build` passent.
- [ ] Testé dans un navigateur sur la version construite (`out/`) : accueil (jusqu'à 4), `/actus` (jusqu'à 20), une page pays avec des actus et une sans (bloc absent).
- [ ] JSON coupé (adresse fausse, à essayer) : les pages restent intactes, aucun bloc vide.
- [ ] Une photo et une carte générée sont visibles, avec leur crédit. Le lien « Source » marche.
- [ ] Aucune erreur CSP dans la console.
- [ ] Rendu vérifié sur iPhone et iPad (375 et 1024).
- [ ] Fiches et README mis à jour dans le même commit, poussé sur `main`, mise en ligne Cloudflare Pages au vert.
- [ ] Lien direct vers keurcook.com/actus donné à Jean.

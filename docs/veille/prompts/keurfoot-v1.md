# Prompt — Veille actus sur Keur Foot (v1)

> À coller dans une **nouvelle session Claude Code ouverte sur le dépôt de Keur Foot** (`/Users/jeanperraudeau/Dev/apps/Keurfoot`, teiki5320/keurfoot). À lancer **après** le socle (`00-socle-v1.md`) : le fichier `https://teiki5320.github.io/veille/actus/keurfoot.json` doit déjà exister.

## Contexte

Jean (non technicien, réponses en français simple, choix numérotés) ajoute sur keurfoot.com des **actus du football africain récupérées automatiquement** : un titre reformulé, un résumé réécrit, un lien vers la source et une image libre de droits. Une tâche Claude les prépare 2 fois par jour (12 h et 19 h), dans le dépôt public `teiki5320/veille`. **Le site ne fait que lire et afficher** le fichier JSON, en direct, dans le navigateur du visiteur. Le site n'est **pas** reconstruit à chaque passage.

Décisions complètes : `https://github.com/teiki5320/Studio/blob/main/docs/veille/decisions-v1.md`. Lis-les, ainsi que le schéma `https://teiki5320.github.io/veille/schema/actus-schema-v3.json`, et un vrai fichier `https://teiki5320.github.io/veille/actus/keurfoot.json`.

Le site : Next.js 16 en export statique, React 19, Tailwind 4. Il est publié sur un Worker Cloudflare de fichiers statiques par GitHub Actions. Couleurs et polices dans `src/app/globals.css` (Barlow et Barlow Condensed). Pages dans `src/app/(site)/` (accueil `page.tsx`, `selection/[slug]`, `selections`, `joueur(s)`, `can`, `conseils`, `top-10`, `boutique`). Pays dans `src/lib/countries.ts` (champ `iso2`). **Lis le `CLAUDE.md` du dépôt et respecte-le.**

## Ce que tu construis

1. **`src/lib/veille.ts`** : le type `Actu` (d'après le schéma v3), `URL_VEILLE = "https://teiki5320.github.io/veille/actus/keurfoot.json"` et une fonction `chargerActus()`.
   - Côté navigateur seulement : `fetch` avec un délai de 8 s, mise en cache 15 min dans `sessionStorage` (avec `try/catch`).
   - En cas d'erreur : renvoie `[]`, **sans jamais casser la page**. Le bloc s'efface proprement.
2. **Composants** (`src/components/actus/`), tous en composants client (`"use client"`), sur le modèle de `Studio/docs/veille/maquette-images-v1.html` :
   - `ActuBandeau` : image 16:9 (`image.url`), titre, résumé, « Source : [source_nom] ↗ » et l'âge (« il y a 3 h »), crédit de l'image.
   - `ActuVignette` : image carrée (`image.url` avec `-carre.webp` au lieu de `.webp` pour les photos ; pour une carte SVG, la même image recadrée avec `object-fit: cover`), puis le même texte en plus compact.
   - `CreditImage` :
     - photo : « Photo : [credit] · [licence] », avec un lien vers `image.page` ;
     - carte : « Illustration : Keur Foot ».
   - `BlocActus` : un `titre`, une `limite` et un filtre `pays` facultatif. La 1re actu est en bandeau, les suivantes en vignettes. Pendant le chargement, un squelette discret ; s'il n'y a aucune actu, rien n'est affiché.
3. **Emplacements** (choix de Jean) :
   - **Accueil** : un bloc « Actus » de **4** actus (1 bandeau + 3 vignettes), avec un lien « Toutes les actus → ». Place-le après le premier bloc éditorial, sans repousser les emplacements AdSense prévus.
   - **Nouvelle page `/actus`** (« Actus du foot africain ») : **20** actus (1 bandeau + 19 vignettes), une phrase d'intro, et la date de mise à jour (`genere_le`). Ajoute-la au menu et au sitemap. Elle a son titre et sa description SEO. Comme les actus sont chargées dans le navigateur, Google ne les voit pas : c'est voulu.
   - **Chaque fiche sélection** (`selection/[slug]`) : un bloc « L'actu des [gentilé, ex. Lions] » de **3** actus, filtrées sur `pays` qui contient l'`iso2` du pays. S'il n'y en a aucune, rien n'est affiché.
4. **Liens vers les sources** : `target="_blank" rel="noopener nofollow"`. Le lien est **toujours visible**, jamais caché derrière un clic.
5. **CSP** (`public/_headers`) : ajoute `https://teiki5320.github.io` à **`connect-src`** et à **`img-src`**, et rien d'autre. Toutes les images viennent de là.
6. **Accessibilité et rendu** :
   - `alt` = `image.alt` ;
   - lisible en clair et en sombre (le site est sombre : respecte ses couleurs) ;
   - mise en page qui marche sur iPhone et iPad, sans défilement horizontal ;
   - images en `loading="lazy"`, sauf le bandeau de l'accueil.

## Règles

- **Légal** : n'affiche jamais un titre original (il n'est pas dans le JSON). Affiche toujours la source avec son lien, et le crédit de l'image. N'ajoute aucun texte copié.
- **Ne relie jamais keurfoot.com à un autre site de Jean.**
- **Pas d'affiliation ni de publicité** collée aux actus : garde au moins un bloc d'écart avec les annonces.
- **Git** : branche `main` uniquement, pas de nouvelle branche, pas de PR. Commits en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ne touche jamais `AGENTS.md`.
- **Fiches du Studio** : mets à jour, dans le **même commit**, `docs/INFRA.md` (service « Veille actus », dépôt teiki5320/veille, GitHub Pages), `docs/MARKETING.md` (nouvelle rubrique Actus) et la ligne du README concernée, comme le demande le `CLAUDE.md`.

## Checklist finale (à rendre à Jean, ✅ / ❌, en français simple)

- [ ] `npm run build` passe, et les tests du dépôt sont au vert.
- [ ] Testé dans un navigateur sur la version construite : accueil (4 actus), `/actus` (20), une fiche sélection avec des actus et une sans (bloc absent).
- [ ] JSON coupé (adresse fausse, à essayer) : les pages restent intactes et le bloc ne s'affiche pas.
- [ ] Une photo et une carte générée sont visibles, chacune avec son crédit. Le lien « Source » ouvre bien l'article.
- [ ] Aucune erreur CSP dans la console. `_headers` est mis à jour.
- [ ] Rendu vérifié sur iPhone et iPad (tailles 375 et 1024).
- [ ] Fiches du Studio et README mis à jour dans le même commit, poussé sur `main`, mise en ligne GitHub Actions au vert.
- [ ] Lien direct vers keurfoot.com/actus donné à Jean.

# Prompt — Veille actus sur Keurbook (v1)

> À coller dans une **nouvelle session Claude Code ouverte sur le dépôt de Keurbook** (`/Users/jeanperraudeau/Dev/apps/Keurbook`, teiki5320/keurbook). À lancer **après** le socle (`00-socle-v1.md`) : le fichier `https://teiki5320.github.io/veille/actus/keurbook.json` doit déjà exister.

## Contexte

Jean (non technicien, réponses en français simple, choix numérotés) ajoute sur keurbook.com des **actus du livre et de la BD d'Afrique, récupérées automatiquement** : un titre reformulé, un résumé réécrit, un lien vers la source et une image libre de droits. Une tâche Claude les prépare 2 fois par jour (12 h et 19 h), dans le dépôt public `teiki5320/veille`. **Le site ne fait que lire et afficher** le fichier JSON, en direct, dans le navigateur du visiteur, sans reconstruction.

Décisions complètes : `https://github.com/teiki5320/Studio/blob/main/docs/veille/decisions-v1.md`. Lis-les, ainsi que le schéma `https://teiki5320.github.io/veille/schema/actus-schema-v3.json`, et un vrai fichier `https://teiki5320.github.io/veille/actus/keurbook.json`.

Le site : Next.js 16 en export statique, React 19, Tailwind 4, publié sur Cloudflare Pages par GitHub Actions. Couleurs dans `src/app/globals.css` (papier sombre `#141311`, encre `#efe9dd`, accent `#d6a24a`, terracotta `#d9774f`), polices Geist et Instrument Serif. Pages dans `src/app/(site)/` (accueil, `auteur/[slug]`, `auteurs`, `livre(s)`, `bd`, `pays/[slug]`, `conseils`, `top-10`, `pile-a-lire`). Auteurs dans `src/lib/demo/auteurs-*.ts` (champ `slug`, nom, pays). **Lis le `CLAUDE.md` du dépôt et respecte-le.**

## Ce que tu construis

1. **Fichier public des fiches pour la veille** : `public/veille/entites.json`, généré **à la construction** par un petit script (`scripts/veille-entites.mjs`, lancé avant `next build` dans `package.json`). Il contient un tableau `{ "tag": "auteur:<slug>", "nom": "<Prénom Nom>", "autres_noms": [...], "pays": "<ISO2>" }` pour **chaque auteur** du site. La tâche de veille le lit sur `https://www.keurbook.com/veille/entites.json` pour relier une actu à un auteur. Pas de données personnelles autres que le nom public d'auteur.
2. **`src/lib/veille.ts`** : le type `Actu` (schéma v3), `URL_VEILLE = "https://teiki5320.github.io/veille/actus/keurbook.json"` et une fonction `chargerActus()`.
   - Côté navigateur seulement : `fetch` avec un délai de 8 s, cache de 15 min dans `sessionStorage` (avec `try/catch`).
   - En cas d'erreur : renvoie `[]`, **sans jamais casser la page**.
3. **Composants** (`src/components/actus/`), en composants client, sur le modèle de `Studio/docs/veille/maquette-images-v1.html` mais **dans le style de Keurbook** (Instrument Serif pour les titres, accent doré) :
   - `ActuBandeau` : image 16:9, titre, résumé, « Source : [source_nom] ↗ » et l'âge, crédit de l'image.
   - `ActuVignette` : image carrée (`-carre.webp` pour les photos ; la carte SVG recadrée en `object-fit: cover`), puis le texte en plus compact.
   - `CreditImage` : « Photo : [credit] · [licence] » avec un lien vers `image.page`, ou « Illustration : Keurbook » pour une carte.
   - `BlocActus` : un `titre`, une `limite` et un filtre `tag` facultatif. La 1re actu est en bandeau, les suivantes en vignettes. S'il n'y a aucune actu, rien n'est affiché.
4. **Emplacements** (choix de Jean) :
   - **Accueil** : un bloc « Actus du livre » de **4** actus (1 bandeau + 3 vignettes), avec un lien « Toutes les actus → ». Il ne doit pas repousser les emplacements AdSense.
   - **Nouvelle page `/actus`** (« Actus du livre africain ») : **20** actus, une intro et la date de mise à jour. Elle est dans le menu et le sitemap, avec son titre et sa description SEO.
   - **Chaque fiche auteur** (`auteur/[slug]`) : un bloc « L'actu de [Prénom Nom] » de **3** actus dont `tags` contient `auteur:<slug>`. S'il n'y en a aucune, rien n'est affiché.
5. **Liens vers les sources** : `target="_blank" rel="noopener nofollow"`, toujours visibles.
6. **CSP** (`public/_headers`) : ajoute `https://teiki5320.github.io` à **`connect-src`** et à **`img-src`**, et rien d'autre.
7. **Rendu** :
   - `alt` = `image.alt` ;
   - lisible en clair et en sombre (respecte les couleurs du site) ;
   - pas de défilement horizontal sur iPhone et iPad ;
   - `loading="lazy"`, sauf le bandeau de l'accueil.

## Règles

- **Légal** : jamais de titre original, toujours la source avec son lien et le crédit de l'image, aucun texte copié.
- **Ne relie jamais keurbook.com à un autre site de Jean.**
- **Les liens Amazon du site** (« Lien partenaire ») ne doivent jamais apparaître dans un bloc d'actus.
- **Git** : branche `main` uniquement, pas de branche, pas de PR. Commits en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ne touche jamais `AGENTS.md`.
- **Fiches du Studio** : mets à jour, dans le **même commit**, `docs/INFRA.md` (service « Veille actus »), `docs/MARKETING.md` (rubrique Actus) et la ligne du README concernée, comme le demande le `CLAUDE.md`.

## Checklist finale (à rendre à Jean, ✅ / ❌, en français simple)

- [ ] `npm run build` passe (avec la génération de `veille/entites.json`), et les tests sont au vert.
- [ ] `https://www.keurbook.com/veille/entites.json` est en ligne après la mise en ligne, et contient tous les auteurs.
- [ ] Testé dans un navigateur : accueil (4), `/actus` (20), une fiche auteur avec des actus et une sans (bloc absent).
- [ ] JSON coupé (adresse fausse, à essayer) : les pages restent intactes.
- [ ] Une photo et une carte générée sont visibles, avec leur crédit. Le lien « Source » marche.
- [ ] Aucune erreur CSP dans la console.
- [ ] Rendu vérifié sur iPhone et iPad.
- [ ] Fiches et README mis à jour dans le même commit, poussé sur `main`, mise en ligne au vert.
- [ ] Lien direct vers keurbook.com/actus donné à Jean.

# Prompt — Veille actus sur Solelis (v1)

> À coller dans une **nouvelle session Claude Code ouverte sur le dépôt de Solelis** (`/Users/jeanperraudeau/Dev/apps/Solelis`, teiki5320/solelis). Le fichier `https://teiki5320.github.io/veille/actus/solelis.json` existe déjà (premier passage le 27/10/2026).

## Contexte

Jean (non technicien, réponses en français simple, choix numérotés) ajoute sur solelis.com des **actus des entreprises en difficulté en France, récupérées automatiquement** : un titre reformulé, un résumé réécrit, un lien vers la source et une image libre de droits. **France uniquement** : toutes les sources sont des médias français, et les sujets concernent la France. Une tâche Claude les prépare 2 fois par jour (12 h et 19 h), dans le dépôt public `teiki5320/veille`. **Le site ne fait que lire et afficher** le fichier JSON, en direct, dans le navigateur du visiteur.

**Consigne de Jean : AUCUNE actu sur l'accueil de Solelis.** Les actus vont seulement sur une page `/actus` et, quand c'est pertinent, dans les pages situation. Le ton du site est rassurant : un dirigeant en difficulté ne doit pas tomber sur un mur de mauvaises nouvelles.

Décisions complètes : `https://github.com/teiki5320/Studio/blob/main/docs/veille/decisions-v1.md` (section « Solelis »). Lis-les, ainsi que le schéma `https://teiki5320.github.io/veille/schema/actus-schema-v3.json`, et le vrai fichier `https://teiki5320.github.io/veille/actus/solelis.json`. Modèle visuel : `Studio/docs/veille/maquette-images-v1.html`.

Le site : Next.js 16.4 App Router, React 19, TypeScript, Tailwind 3.4, Framer Motion (`LazyMotion`), servi par un **Worker Cloudflare via OpenNext** (`wrangler.jsonc`, `worker.ts`), base D1. Pages dans `app/` (accueil `page.tsx`, `situation/[slug]` avec 4 situations : `dettes-urssaf`, `dettes-fournisseurs`, `credit-bancaire`, `impots-impayes`, `conseils`, `faq`, `outils`…). Couleurs pilotées par variables CSS dans `app/globals.css` (`--c-navy`, `--c-bleu`, `--c-bleu-fonce`… avec thèmes clair, sombre et contraste élevé) et `tailwind.config.js` ; polices Playfair Display et Outfit ; style « verre » (glass). Le **service worker** (`public/sw.js`) ignore déjà les autres origines. La seule CSP aujourd'hui est `frame-ancestors 'none'` (dans `worker.ts` et `public/_headers`) : rien à changer pour la veille, sauf si tu trouves des directives `connect-src` / `img-src` (alors ajoute `https://teiki5320.github.io`, et rien d'autre). **Lis le `CLAUDE.md` et respecte-le.**

## Ce que tu construis

1. **Fichier public des situations pour la veille** : `public/veille/entites.json` (servi sur `https://solelis.com/veille/entites.json`), généré à partir de la liste des situations (pas recopié à la main : un petit script lancé avant `next build`, ou une route statique). Contenu : `{ "tag": "situation:<slug>", "nom": "<Dettes URSSAF…>", "autres_noms": [...] }` pour les 4 situations (`autres_noms` : « cotisations sociales », « échéancier URSSAF », « factures impayées », « médiation du crédit », « Banque de France », « CCSF », « SIE »…). La tâche de veille le lit pour relier une actu à une situation. Ajoute un test Vitest.
2. **`lib/veille.ts`** : le type `Actu` (schéma v3, à valider avec Zod comme le reste du site), `URL_VEILLE = "https://teiki5320.github.io/veille/actus/solelis.json"` et `chargerActus()`.
   - Côté navigateur seulement : `fetch` avec un délai de 8 s, cache de 15 min dans `sessionStorage` (avec `try/catch`).
   - En cas d'erreur : renvoie `[]`, **sans jamais casser la page**.
3. **Composants** (`components/actus/`), en composants client, **dans le style de Solelis** (cartes « verre », Playfair pour les titres, bleus du site, compatibles avec les 3 thèmes) :
   - `ActuBandeau`, `ActuVignette` (image carrée : `-carre.webp` au lieu de `.webp` pour les photos ; la carte SVG recadrée en `object-fit: cover`), `CreditImage` (« Photo : [credit] · [licence] » avec un lien vers `image.page`, ou « Illustration : Solelis »).
   - `BlocActus` : un `titre`, une `limite` et un filtre `tag` facultatif. S'il n'y a aucune actu, **rien n'est affiché**.
4. **Emplacements** (choix de Jean) :
   - **Accueil : rien.** Pas de bloc, pas de lien mis en avant vers les actus sur la page d'accueil.
   - **Nouvelle page `/actus`** (« L'actualité des entreprises en difficulté ») : **20** actus (1 bandeau + vignettes), une phrase d'intro qui rappelle que des solutions existent (lien vers le questionnaire et vers `/parler`), la date de mise à jour (`genere_le`). Dans le menu (`components/Nav.tsx`) et le pied de page, au même niveau que « Conseils », et dans `app/sitemap.ts`, avec son titre et sa description SEO.
   - **Pages situation** (`situation/[slug]`), seulement si c'est pertinent : un bloc discret « Dans l'actualité » de **3** actus dont `tags` contient `situation:<slug>`, placé **après** les étapes et le courrier (jamais en haut de page). S'il n'y en a aucune, rien n'est affiché.
   - **Pas d'actus dans la fiche personnalisée** (`fiche/[token]`), ni dans le questionnaire.
5. **Liens vers les sources** : `target="_blank" rel="noopener nofollow"`, toujours visibles.
6. **Rendu** : `alt` = `image.alt` ; lisible dans les 3 thèmes ; pas de défilement horizontal sur iPhone et iPad ; `loading="lazy"`.

## Règles

- **Légal** : jamais de titre original, toujours la source avec son lien et le crédit de l'image, aucun texte copié.
- **Aucune donnée de dirigeant** : les actus ne sont jamais mêlées aux données d'une fiche (SIRET, réponses, e-mail), et rien n'est envoyé à la veille.
- **Ne relie jamais solelis.com à un autre site de Jean.**
- **Git** : branche `main` uniquement, pas de branche, pas de PR. Commits en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ne touche jamais `AGENTS.md`.
- **Fiches du Studio** : mets à jour, dans le **même commit**, `docs/INFRA.md` (service « Veille actus »), `docs/MARKETING.md` (rubrique Actus) et la ligne du README / du `CLAUDE.md` concernée (architecture `app/actus`), comme le demande le `CLAUDE.md`.

## Checklist finale (à rendre à Jean, ✅ / ❌, en français simple)

- [ ] `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` et `npm run cf:build` passent ; un test e2e Playwright de `/actus` (JSON simulé).
- [ ] `https://solelis.com/veille/entites.json` est en ligne après la mise en ligne, avec les 4 situations.
- [ ] L'accueil n'a **aucune** actu.
- [ ] Testé dans un navigateur : `/actus` (jusqu'à 20), une page situation avec des actus et une sans (bloc absent).
- [ ] JSON coupé (adresse fausse, à essayer) : les pages restent intactes, aucun bloc vide.
- [ ] Une photo et une carte générée sont visibles, avec leur crédit. Le lien « Source » marche.
- [ ] Rendu vérifié dans les 3 thèmes, sur iPhone et iPad (375 et 1024).
- [ ] Fiches et README mis à jour dans le même commit, poussé sur `main`, mise en ligne Cloudflare au vert (ou `npm run cf:deploy` si la mise en ligne automatique n'est pas encore active).
- [ ] Lien direct vers solelis.com/actus donné à Jean.

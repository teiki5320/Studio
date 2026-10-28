# Prompt — Actus : page de l'article complet (v1, 28/10/2026)

> Pour une session ouverte sur le dépôt d'un des 6 sites (Keur Foot, Keurbook, Keur Cook, Keur Déco, Kultiled, Solelis). Le site affiche déjà les actus de la veille (voir `<site>-v1.md`).

## Contexte

Jean (non technicien, réponses en français simple) trouve les actus trop courtes : **quand on touche une actu, il veut lire un article complet sur le site**. Ses choix :
- l'article a **sa propre page** sur le site, que Google peut trouver ;
- **300 à 450 mots** ;
- toutes les actus, y compris celles déjà en ligne.

La tâche de veille (dépôt public `teiki5320/veille`, 12 h et 19 h) écrit désormais, pour chaque actu, un fichier article :
- `https://teiki5320.github.io/veille/actus/<site>.json` : chaque actu qui a un article porte en plus `slug`, `article_url` et `lecture_min` (les anciennes en reçoivent un dans l'heure qui suit ; une actu sans `slug` n'a pas encore d'article) ;
- `https://teiki5320.github.io/veille/articles/<site>/<id>.json` : l'article, schéma `https://teiki5320.github.io/veille/schema/article-schema-v1.json` (`titre`, `chapo`, `blocs: [{ intertitre | null, paragraphes[] }]`, `mots`, `lecture_min`, `theme`, `pays`, `tags`, `source_nom`, `source_url`, `autres_sources`, `publie_le`, `redige_le`, `image` identique à celle de l'actu).

Lis le schéma et un vrai fichier article avant de coder. Si `articles/<site>/` est encore vide quand tu commences, travaille avec un fichier d'exemple local conforme au schéma, puis revérifie avec les vrais fichiers avant de finir.

## Ce que tu construis

1. **Page statique `/actus/<slug>/`**, générée **à la construction** du site.
   - Au build : lis le JSON des actus, puis l'article de chaque actu qui a un `slug`.
   - Si la veille ne répond pas, le build **ne casse pas** : il produit simplement 0 page article.
2. **Page de secours `/actus/article/?id=<id>`**, rendue dans le navigateur à partir de `articles/<site>/<id>.json`.
   - Elle sert aux actus publiées après la dernière construction.
   - Elle porte `noindex` et n'est pas dans le sitemap.
   - Si l'id est inconnu : message simple et lien vers `/actus`.
3. **Cartes d'actus** (accueil, page Actus, blocs des fiches) : **toute la carte ouvre l'article** sur le site.
   - Lien `/actus/<slug>/` si la page a été construite. Écris la liste des slugs construits dans le code au moment du build.
   - Sinon lien vers la page de secours si l'actu a un `article_url`.
   - Sinon (pas encore d'article) : lien vers la source comme aujourd'hui.
   - Le nom de la source reste affiché sur la carte, en texte.
4. **Contenu de la page article**, dans le style du site :
   - fil d'Ariane (Accueil › Actus › titre) ;
   - `h1` = titre, puis le chapô mis en avant ;
   - la date et « N min de lecture » ;
   - l'image 16:9 avec son crédit (même composant `CreditImage` que les cartes) ;
   - les blocs : `h2` pour les intertitres, puis les paragraphes ;
   - un encadré « Sources », qui dit « Article rédigé par [Nom du site] à partir de : [source_nom] ↗ (+ autres sources) ». Liens en `target="_blank" rel="noopener nofollow"` ;
   - les `tags` qui correspondent à une fiche **existante** du site deviennent des liens vers ces fiches (par ex. « Lire la fiche de [auteur] »), les autres sont ignorés ;
   - un bloc « Autres actus » de 3 vignettes.
   - **Publicité** : seulement si le site a déjà des emplacements AdSense sur ses pages de contenu, avec le même modèle et sans en ajouter davantage. Solelis : jamais d'AdSense.
5. **SEO** :
   - `<title>` = titre, meta description = chapô ;
   - canonical vers `/actus/<slug>/` ;
   - Open Graph avec l'image ;
   - JSON-LD `NewsArticle` : `headline`, `datePublished` = `publie_le`, `dateModified` = `redige_le`, `image`, `publisher` = le site, `isBasedOn` = `source_url` ;
   - pages ajoutées au sitemap. Si le site a un envoi IndexNow, il inclut ces pages.
6. **Reconstruction 2 fois par jour**, après la veille : ajoute au déploiement un déclenchement planifié `cron: "50 11,18 * * *"` (UTC, soit 12 h 50 et 19 h 50 l'hiver) avec `workflow_dispatch`.
   - Si l'hébergement ne passe pas par GitHub Actions, trouve l'équivalent **sans ajouter de clé ni de secret**.
   - Si c'est impossible sans secret, ne fais rien et explique-le dans le compte rendu.
7. **CSP** : l'adresse `https://teiki5320.github.io` doit être autorisée en `connect-src` (page de secours) et en `img-src`. Elle l'est déjà normalement.
8. **Rendu** :
   - lisible en clair et en sombre ;
   - aucun défilement horizontal sur iPhone ni iPad ;
   - largeur de lecture confortable (environ 680 px de texte) ;
   - `loading="lazy"` sauf pour l'image principale.

## Règles

- **Lis le `CLAUDE.md` du dépôt et respecte-le.** Branche `main` uniquement, pas de PR. Commits en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ne touche jamais `AGENTS.md`.
- **Légal** :
  - jamais le titre original ni de texte copié (l'article est déjà réécrit par la veille) ;
  - toujours la source avec son lien et le crédit de l'image ;
  - jamais l'image de l'article source.
- **Ne relie jamais le site à un autre site de Jean.**
- Les liens partenaires Amazon n'apparaissent jamais dans une page d'actu.
- Keur Cook : aucune allégation santé, aucun vocabulaire de vente.
- Mets à jour dans le **même commit** les fiches que le `CLAUDE.md` demande (`docs/INFRA.md`, `docs/MARKETING.md`, README…).
- Tests du dépôt au vert, plus des tests pour la page de secours et pour le choix du lien d'une carte.

## Checklist finale (✅ / ❌, en français simple)

- [ ] `npm run build` passe, avec et sans réponse de la veille, et les tests sont au vert.
- [ ] Une page `/actus/<slug>/` construite s'affiche avec son titre, son chapô, l'image et son crédit, les intertitres, les sources et les autres actus.
- [ ] La page de secours affiche un article qui n'a pas de page construite, et elle porte `noindex`.
- [ ] Un toucher sur une carte (accueil, page Actus, fiche) ouvre l'article sur le site.
- [ ] Le sitemap contient les pages d'articles. Le JSON-LD est valide.
- [ ] La reconstruction 2 fois par jour est en place, ou la raison est expliquée.
- [ ] Rendu vérifié sur iPhone et iPad, en clair et en sombre, sans aucune erreur CSP.
- [ ] Commit poussé sur `main`, mise en ligne au vert.
- [ ] Lien direct vers une page d'article en ligne, donné à Jean.

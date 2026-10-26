# Prompt 00 — Socle de la veille actus (v1)

> À coller dans une **nouvelle session Claude Code**, ouverte sur le dossier `/Users/jeanperraudeau/Dev/apps` du Mac mini de Jean. Ce prompt crée le dépôt `veille` et la tâche qui le remplit. Les prompts des sites (`keurfoot-v1.md`, `keurbook-v1.md`…) se lancent **après** celui-ci.

## Contexte

Jean (non technicien, réponses en français simple, choix numérotés) a plusieurs sites éditoriaux sur l'Afrique. Il veut y afficher des **actus récupérées automatiquement** : un titre reformulé, un résumé de 2 à 3 lignes réécrit, un lien vers la source et une image d'illustration libre de droits.

Toutes les décisions sont dans `/Users/jeanperraudeau/Dev/apps/Studio/docs/veille/decisions-v1.md` (dépôt public teiki5320/Studio). **Lis ce fichier en entier avant de commencer, ainsi que `actus-schema-v2.json` du même dossier.** Résumé :

- **Option A** : une **tâche planifiée Claude** (abonnement de Jean, pas d'API payante) tourne sur le Mac mini à **12 h et 19 h**. Elle lit les flux RSS, trie, dédoublonne, réécrit, trouve une image, puis publie **un fichier JSON par site** dans un **dépôt GitHub public dédié `teiki5320/veille`** (branche `main` uniquement).
- **Les sites lisent leur JSON en direct** dans le navigateur. Ils ne sont pas reconstruits.
- **Résumés : Claude seul.** Pas d'Ollama, il n'est pas installé. Si un passage échoue, les JSON précédents restent en ligne et une alerte part dans le Studio de Jean.
- **Pour l'instant, 2 sites seulement : Keur Foot et Keurbook.** Jean veut voir le résultat avant d'ajouter Keur Cook, Keur Déco, Keur Kado, Kultiled et Solelis. Le code doit permettre d'ajouter un site en ajoutant seulement un fichier de configuration.

## Règles légales (non négociables)

1. **Jamais de texte copié.** Titre et résumé sont réécrits avec d'autres mots. Le titre original sert **en interne uniquement** (tri, doublons) et n'est jamais publié.
2. **Jamais l'image de l'article source.**
3. **La source est citée, avec son lien visible** (`source_nom` + `source_url`) sur chaque actu.
4. **Contrôle anti-copie automatique avant publication** : rejette une actu si son titre ou son résumé reprend une suite de **6 mots consécutifs ou plus** du titre ou de la description d'origine (comparaison en minuscules, sans ponctuation). Une actu rejetée est réécrite une fois, puis abandonnée si elle échoue encore.

## Ce que tu construis

### 1. Le dépôt `teiki5320/veille` (public), dans `/Users/jeanperraudeau/Dev/apps/veille`

- Crée-le avec `gh repo create teiki5320/veille --public --clone`. Active **GitHub Pages** sur `main` (racine) avec `gh api`. Les fichiers seront servis sur **`https://teiki5320.github.io/veille/`**.
- Le dépôt ne contient **aucun secret** : il n'en faut d'ailleurs aucun. Wikimedia et Openverse n'ont pas de clé. `.gitignore` exclut `node_modules`, `.env*` et `tmp/`.
- `CLAUDE.md` court en français : rôle du dépôt, branche `main` uniquement (pas de branche, pas de PR), commits en français terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, ne jamais modifier les fichiers `actus/*.json` à la main.
- Arborescence :
  ```
  schema/actus-schema-v3.json      ← schéma (voir § 2)
  sites/keurfoot.json              ← configuration d'un site (voir § 3)
  sites/keurbook.json
  actus/keurfoot.json              ← publié, lu par le site
  actus/keurbook.json
  images/<site>/<id>.webp          ← photos libres, copiées et redimensionnées
  cartes/<site>/<id>.svg           ← cartes générées
  etat/<site>.json                 ← déjà-vus, images récentes, erreurs de flux
  scripts/collecte.mjs             ← étape 1
  scripts/publie.mjs               ← étape 3
  scripts/test.mjs                 ← tests
  ```
- Node 22, sans framework. Dépendances autorisées : `fast-xml-parser` (RSS/Atom), `sharp` (images), `flag-icons` (drapeaux SVG, licence MIT), `ajv` + `ajv-formats` (validation du schéma).

### 2. Le schéma `actus-schema-v3.json`

Pars de `actus-schema-v2.json` (dans `Studio/docs/veille/`) et change :

- `site` : enum `["keurfoot", "keurbook", "keurcook", "keurdeco", "keurkado", "kultiled", "solelis"]`.
- `theme` : ajoute `"livres"`, `"bd"`, `"cuisine"`, `"deco"`, `"cadeaux"`, `"culture-interieur"`, `"entreprises"`.
- Ajoute **`tags`** (tableau de chaînes, facultatif) pour relier une actu à une fiche du site, par exemple `"auteur:marguerite-abouet"`.
- **`image` devient obligatoire** (plus de `null`). `source` vaut `wikimedia | openverse | banque | carte`. `url` pointe **toujours** vers `https://teiki5320.github.io/veille/...`, jamais vers un serveur tiers. Ajoute `largeur` et `hauteur` (entiers).
- `actus` : 60 au plus par fichier (les plus récentes).

### 3. La configuration d'un site (`sites/<site>.json`)

Elle contient :
- `site`, `nom` et `couleurs` de la carte générée (`fond`, `fond2`, `encre`), plus l'`icone` de la carte (`"ballon"`, `"livre"`…) ;
- `sujets`, la description en clair de ce qu'on garde, et `exclusions` ;
- `pays_prioritaires` (codes ISO) ;
- `flux`, une liste de `{ nom, url, langue }` ;
- `entites_url` (facultatif), une URL publique où le site expose ses fiches (ex. `https://www.keurbook.com/veille/entites.json`), pour remplir `tags`.

Remplis `keurfoot.json` et `keurbook.json` avec **exactement** les sujets, exclusions et flux validés dans `decisions-v1.md`. Couleurs :
- Keur Foot : fond `#0f8a43`, fond2 `#0a5e2e`, encre `#ffffff`, icône ballon ;
- Keurbook : fond `#d6a24a`, fond2 `#8a5f22`, encre `#141311`, icône livre.

### 4. Le passage (la tâche planifiée)

**Étape 1, `node scripts/collecte.mjs`** (aucune IA) :
1. Lit les flux de chaque site, avec un délai de 20 s par flux et un User-Agent `VeilleKeur/1.0 (contact: admin@toakeur.com)`.
2. Garde les articles des **72 dernières heures**.
3. Écarte les déjà-vus. L'`id` est le SHA-1 de l'URL normalisée, sans paramètres `utm_*`.
4. Écrit `tmp/candidats-<site>.json` avec : id, titre original, description d'origine (texte seul, 500 caractères au plus), lien, date, source.
5. Gestion des erreurs : un flux en erreur fait `erreurs + 1` dans `etat/<site>.json`. Au bout de **3 échecs de suite**, il est marqué « à vérifier » dans le compte rendu. Un flux en erreur n'arrête jamais le passage.

**Étape 2, toi (Claude), dans la session de la tâche :**
1. Pour chaque site, lis `tmp/candidats-<site>.json` et la config du site.
2. **Trie en lisant** : garde seulement ce qui correspond aux `sujets`, et écarte les `exclusions`.
3. **Fusionne les doublons** : la même info vue dans plusieurs flux devient une seule actu. Garde la source la plus complète en `source_url`, et mets les autres dans `autres_sources`.
4. Pour chaque actu gardée (12 au plus par site et par passage, les plus importantes d'abord), écris dans `tmp/redaction-<site>.json` :
   - `titre` : reformulé, 90 caractères au plus, informatif, sans putaclic ;
   - `resume` : 2 à 3 phrases, 380 caractères au plus, **en français même si la source est en anglais**, ton neutre, les faits seulement, aucune opinion, rien d'inventé ;
   - `theme`, `pays` (ISO), `competition` (Keur Foot seulement) et `tags` (seulement des entités qui existent dans `entites_url`) ;
   - `image_requetes`, du plus précis au plus large :
     - pour Wikimedia : le nom exact de la personne, du lieu ou du club cité ;
     - pour Openverse : 2 à 4 mots-clés **en anglais**, génériques.
   - `image_alt` : une description factuelle de ce qu'on doit voir, 160 caractères au plus.

**Étape 3, `node scripts/publie.mjs`** (aucune IA) :
1. **Contrôle anti-copie** (voir règle 4). Les actus rejetées sont listées dans `tmp/rejets-<site>.json`. Tu les réécris une fois, puis tu relances.
2. **Image**, dans l'ordre :
   1. **Wikimedia Commons** (API `commons.wikimedia.org/w/api.php`, recherche dans l'espace fichiers, `prop=imageinfo`, `iiprop=url|extmetadata`). N'accepte que les licences libres : CC0, domaine public, CC BY, CC BY-SA. Exclus les images de moins de 600 px de large. Lis l'auteur dans `extmetadata.Artist` (sans HTML) et la licence dans `LicenseShortName`.
   2. **Openverse** (`https://api.openverse.org/v1/images/?q=...&license_type=commercial&page_size=10`, sans clé). N'accepte que CC0, PDM, BY et BY-SA, avec un auteur connu.
   3. **Banque perso** (`banque/<site>/`, vide au départ : à prévoir dans le code, rien de plus).
   4. **Carte générée**, en dernier recours : un SVG 1600×900 avec un dégradé `fond` → `fond2` et de fines bandes verticales. Le **grand drapeau** du 1er pays (SVG de `flag-icons`) est au centre. L'**icône** du site est en haut à droite. Le **nom de la compétition ou du thème** est en grand sous le drapeau, en capitales. « [Nom du site] · Actus » est écrit en bas. **Pas le titre de l'actu** (il est déjà affiché dessous). Si aucun pays n'est connu, on met l'icône à la place du drapeau.
   - Chaque photo retenue est **téléchargée**, recadrée en **1600×900 (16:9)**, convertie en WebP de qualité 80, et rangée dans `images/<site>/<id>.webp`. Un **carré 600×600** est créé à côté (`<id>-carre.webp`) pour les vignettes.
   - Vérifie la **pertinence** : le titre et la description de l'image doivent correspondre au sujet. Sinon, passe à la source suivante.
   - **Anti-répétition** : une même image (même URL d'origine) n'est jamais réutilisée dans les **20 dernières actus** du site (suivi dans `etat/<site>.json`).
   - Remplis `image` : `url`, `source`, `credit` (l'auteur), `licence`, `page` (la page d'origine, pour l'attribution), `alt`, `mots_cles`, `largeur`, `hauteur`. Pour une carte : `credit` = « Illustration : [Nom du site] », `licence` = `null`.
3. Fusionne avec les actus déjà publiées, trie de la plus récente à la plus ancienne, garde les 60 dernières, puis supprime les images et cartes devenues orphelines.
4. **Valide** chaque `actus/<site>.json` avec `ajv` (schéma v3). Si un fichier est invalide, **ne le publie pas** : l'ancien reste en ligne.
5. `git add actus images cartes etat`, commit (« Veille du 27/10 à 12 h : 9 actus Keur Foot, 6 Keurbook »), `git pull --rebase`, puis `git push`.

### 5. La tâche planifiée

Crée-la avec l'outil `mcp__scheduled-tasks__create_scheduled_task`, depuis une session lancée **dans l'app Claude, sur le Mac**, avec ces réglages :
- id `veille-actus`, titre « Veille actus (12 h et 19 h) », cron `0 12,19 * * *` ;
- **dossier** `/Users/jeanperraudeau/Dev/apps/veille` ;
- **mode Auto**. ⚠️ Vérifie-le ensuite dans `~/Library/Application Support/Claude/claude-code-sessions/*/*/scheduled-tasks.json`, champ `permissionMode` = `auto`. Une tâche créée pendant qu'un agent tourne ne garde pas le mode : dans ce cas, guide Jean pour le régler dans l'app (crayon de la tâche, petit texte « Manuel » sous les instructions → Auto).

Ses consignes :
1. `cd /Users/jeanperraudeau/Dev/apps/veille && git pull --ff-only`, puis `npm ci` si `package-lock.json` a changé.
2. Lancer `node scripts/collecte.mjs`.
3. Faire l'étape 2 (la rédaction).
4. Lancer `node scripts/publie.mjs` (avec une seule reprise des rejets).
5. **Alerte en cas d'échec** : si un site n'a pas pu être publié, ou si un flux a 3 échecs de suite, envoyer au Studio de Jean :
   `curl -s -X POST http://localhost:4600/api/afaire -H 'Content-Type: application/json' -d '{"source":"veille","site":"<Nom du site>","texte":"Veille actus : <problème en une phrase>","detail":"<détail>","consigne":"<comment le régler>","dossier":"/Users/jeanperraudeau/Dev/apps/veille"}'`
   (JSON construit avec `node -e`).
6. Résumé final en une ligne : le nombre d'actus publiées par site, et les problèmes s'il y en a.

### 6. Tests (`node scripts/test.mjs`)

- Le schéma v3 valide un exemple complet, et refuse une actu sans image ou sans source.
- L'anti-copie rejette 6 mots consécutifs repris, et accepte une vraie reformulation.
- La carte générée produit un SVG valide, avec un drapeau, sans le titre.
- L'anti-répétition refuse une image vue dans les 20 dernières actus.
- Un flux qui ne répond pas n'arrête pas la collecte.

### 7. Premier passage

Lance **un passage complet maintenant**, à la main, sans attendre 12 h. Vérifie ensuite que :
- `https://teiki5320.github.io/veille/actus/keurfoot.json` et `.../keurbook.json` répondent ;
- une image et une carte s'ouvrent ;
- l'en-tête CORS (`access-control-allow-origin: *`) est présent, ce qui est le cas par défaut sur GitHub Pages.

Si Pages n'a pas encore publié, attends quelques minutes, puis revérifie.

## Checklist finale (à rendre à Jean, ✅ / ❌)

- [ ] Dépôt `teiki5320/veille` public, sur `main`, avec Pages actif.
- [ ] Aucun secret dans le dépôt (`git grep -iE "key|token|secret"` ne trouve rien de sensible).
- [ ] Schéma v3 et configurations Keur Foot et Keurbook conformes à `decisions-v1.md`.
- [ ] Tests au vert.
- [ ] Premier passage publié : le nombre d'actus par site, 3 exemples (titre, source, type d'image, crédit).
- [ ] Anti-copie actif : combien d'actus rejetées, puis réécrites.
- [ ] Tâche `veille-actus` à 12 h et 19 h, mode **Auto** vérifié, bon dossier.
- [ ] Alerte vers le Studio testée (une fausse alerte envoyée, puis réglée).
- [ ] Rapport à Jean en français simple, avec les 2 liens JSON.

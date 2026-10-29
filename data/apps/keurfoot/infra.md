# INFRA — fiche technique

Mis à jour le 29 octobre 2026, d'après le code du dépôt et le site en ligne. Aucun secret ici :
uniquement des noms de variables et de consoles.

## En bref

- **Plateforme** : site web éditorial sur le football africain, en français, ordinateur et mobile
- **Stack** : Next.js 16 en export statique, React 19, Tailwind CSS 4
- **Backend** : aucun — site statique, sans base ni compte ; actus lues en direct depuis la veille (GitHub Pages)
- **Distribution** : Worker de fichiers statiques Cloudflare, publié par GitHub Actions
- **Site** : keurfoot.com (145 adresses dans le sitemap au 29 octobre)
- **IA et outils** : illustrations faites avec OpenArt, épingles générées au build

## Parcours

- 🌐 **Web** : 🐙 GitHub — main · publication au vert [ok] → ⚙️ GitHub Actions — lint, types, tests, build [ok] → ☁️ Cloudflare Workers — Worker keurfoot [ok] → 🌍 keurfoot.com — en ligne, réponse 200 le 29 octobre [ok]
- 📝 **Contenu** : ✍️ Conseils — 9 publiés, 24 programmés jusqu'au 23 décembre [ok] → ⚙️ GitHub Actions — publie lundi, mercredi, vendredi [ok] → 🔍 Google — 101 pages dans l'index (rapport du 23 octobre) [ok]
- 🛒 **Affiliation** : 🛍️ Boutique et fiches — boutons Amazon [ok] → 🛒 Amazon Partenaires (affiliation) — tag keurfootfr-21 [ok] → 🌐 Site déclaré chez Amazon — vérifié par Jean le 28 octobre 2026 [ok] → 🔗 Liens directs — 3 maillots vérifiés le 28 octobre (Maroc, Nigeria, Tunisie), recherches ailleurs [ok]
- 🗞️ **Actus** : 🤖 Tâche Claude — 12 h et 19 h [ok] → 🐙 Dépôt teiki5320/veille — actus/keurfoot.json et articles [ok] → 📄 GitHub Pages — fichiers et images [ok] → ⚙️ GitHub Actions — reconstruit le site à 12 h 50 et 19 h 50 [ok] → 🌍 keurfoot.com — accueil, /actus, fiches sélection, pages d'articles [ok]
- 📰 **Publicité** : 📰 AdSense (publicité web) — script et ads.txt en place [ok] → ✅ Examen du site — demandé le 20 octobre, « En préparation » au 29 octobre [à faire] → 🧱 Blocs d'annonces — aucun identifiant renseigné [pas encore]

## Vue d'ensemble

- **Plateforme** : site web éditorial en français sur le football africain : sélections
  nationales, CAN, grands joueurs, classements Top 10, boutique supporter et conseils d'achat.
  Un site TOA KEUR.
- **Stack** : Next.js 16 (export statique) + React 19 + Tailwind CSS 4, TypeScript, Marked pour les
  articles Markdown, Lucide pour les icônes. Données écrites dans `src/lib/data/` (sélections,
  joueurs, CAN, Top 10, boutique), articles « Conseils » dans `content/conseils/`. Base technique
  reprise de Keurbook.
- **Backend** : aucun. Site entièrement statique (dossier `out/`), sans base de données ni compte.
  Seuls cookies possibles : ceux de Google AdSense, après accord dans le bandeau de consentement de
  Google (lien « Cookies » en pied de page).
- **Taille** : 145 adresses dans le sitemap au 29 octobre 2026 : 100 adresses fixes (54 sélections,
  15 joueurs, 10 Top 10, 2 pages CAN, 9 articles Conseils publiés, boutique, page Actus, pages de
  liste et pages légales) et 45 articles d'actus (une adresse par article depuis le 28 octobre 2026,
  le nombre suit la veille).
- **Images** : illustrations originales créées avec OpenArt puis découpées par
  `scripts/decouper-planche.mjs` (voir docs/ILLUSTRATIONS.md) ; depuis le 27 octobre 2026, les conseils
  sans illustration originale ont une photo libre (Wikimedia Commons ou Openverse, crédit sous l'image)
  ou une carte générée, rangée dans `public/illustrations/` (crédits dans `src/lib/data/conseils-images.ts`) ; épingles Pinterest des Top 10
  générées avant chaque build par `scripts/epingles.mts` (satori et resvg), dans `public/epingles/`.
  Depuis le 28 octobre 2026, `scripts/images.mts` fabrique avant chaque build des versions réduites
  (480 et 800 px) de chaque illustration dans `public/reduites/` (non suivi par git) : les pages les
  proposent au navigateur (srcset), un téléphone ne charge plus l'original de 1 600 px.
- **Particularités** : interrupteur de maintenance dans `content/maintenance.json` (désactivé),
  tests de cohérence des contenus dans `tests/`, contrôle du site construit (`tests/sortie/`) lancé par
  `deploy.yml` sur le dossier `out/` publié, avant chaque publication, depuis le 28 octobre 2026 (un h1 par
  page, titres de 60 caractères au plus, pages indexables, liens Amazon…).

## GitHub

- **Rôle** : dépôt du code et des contenus, et quatre workflows :
  - `deploy.yml` (« Publier le site ») : lint, types, tests, build, contrôle du site construit, puis publication sur Cloudflare
    par `npx wrangler deploy` à chaque push sur `main`, chaque lundi, mercredi et vendredi à
    23 h 15 UTC la veille (articles programmés), chaque jour à 11 h 50 et 18 h 50 UTC depuis le
    28 octobre 2026 (pages des articles d'actus, juste après la veille de 12 h et 19 h) et à la main ;
    depuis le 28 octobre 2026, la publication échoue (en rouge) s'il manque un secret Cloudflare, puis
    vérifie pendant 3 minutes au plus que keurfoot.com sert bien la nouvelle version (`/version.txt`) ;
  - `indexnow.yml` (depuis le 28 octobre 2026) : signale toutes les pages du sitemap à IndexNow (Bing…)
    après chaque publication réussie de `main`, chaque lundi à 2 h UTC et à la main ;
  - `maintenance.yml` : met le site en pause ou le rouvre, puis republie ;
  - `pages.yml` : publie sur l'ancienne adresse GitHub Pages une simple page qui renvoie vers
    keurfoot.com.
- **Console** : https://github.com/teiki5320/keurfoot
- **Secrets** : `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`, réglés dans les secrets Actions
  du dépôt, jamais dans le code.

## Hébergement web (GitHub Pages / Cloudflare Pages)

- **Fournisseur** : Cloudflare, Worker de fichiers statiques `keurfoot` (pas Cloudflare Pages),
  décrit dans `wrangler.jsonc` et publié par `npx wrangler deploy` depuis `deploy.yml`. Pas
  d'adresse technique `workers.dev` ni d'aperçus publics : seul keurfoot.com sert le site.
- **En-têtes** : `public/_headers` (politique de sécurité limitée au site lui-même, à Google AdSense,
  à Cloudflare Web Analytics et, depuis le 27 octobre 2026, à `teiki5320.github.io` pour le
  fichier et les images des actus (connect-src et img-src seulement) ; HSTS, cache des images).
- **Redirections** : depuis le 28 octobre 2026, le petit script `worker/index.ts` (lancé avant les
  fichiers, `run_worker_first`) renvoie en 301, en un seul saut, vers l'adresse canonique sans barre
  finale : `/page/` → `/page`, `/page.html` et `/index.html` → la page, anciennes adresses (`/selection`,
  `/joueur`, `/favicon.ico`, gardées aussi dans `public/_redirects`) → leur page finale ; avant, Cloudflare
  répondait en 307 (temporaire).
- **Ancienne adresse** : https://teiki5320.github.io/keurfoot/ (version provisoire du 17 au
  20 octobre 2026) ne sert plus qu'une page de renvoi vers keurfoot.com, en `noindex`.
- **Console** : tableau de bord Cloudflare, rubrique Workers & Pages → `keurfoot`.

## Veille actus

- **Rôle** : actus du football africain (titre reformulé, résumé réécrit, lien vers la source,
  image libre de droits avec son crédit) affichées depuis le 27 octobre 2026 sur l'accueil
  (4 actus), la page `/actus` (20 actus) et chaque fiche sélection (3 actus du pays, bloc absent
  s'il n'y en a aucune).
- **Service** : une tâche Claude prépare le fichier 2 fois par jour (12 h et 19 h) dans le dépôt
  public `teiki5320/veille` ; le site lit ce fichier depuis `teiki5320.github.io` (pages GitHub
  du dépôt de la veille, pas celles du site) :
  https://teiki5320.github.io/veille/actus/keurfoot.json (schéma v3 :
  https://teiki5320.github.io/veille/schema/actus-schema-v3.json). Les images sont copiées au même
  endroit (photos Wikimedia ou Openverse, ou carte générée « Illustration : Keur Foot »).
- **Côté site** : `src/lib/veille.ts` et `src/components/actus/`. Depuis le 28 octobre 2026, le
  fichier est téléchargé avant chaque build (`.veille/actus.json`) et les blocs d'actus (accueil, page
  Actus, fiches sélection) sont écrits dans le HTML : Google voit les actus et leurs liens. Dans le
  navigateur, le fichier est relu (délai 8 s, cache de 15 min dans la session) pour afficher les plus
  récentes ; s'il ne répond pas, les actus du build restent affichées.
- **Articles complets** (depuis le 28 octobre 2026) : la veille écrit aussi, pour chaque actu, un
  article de 300 à 450 mots (https://teiki5320.github.io/veille/articles/keurfoot/<id>.json, schéma
  https://teiki5320.github.io/veille/schema/article-schema-v1.json). Avant chaque build,
  `scripts/articles.mts` lit l'index de tous les articles
  (https://teiki5320.github.io/veille/articles/keurfoot/index.json : les articles ne sont jamais
  supprimés, même quand l'actu sort des 60 plus récentes, donc une page indexée ne disparaît jamais),
  les télécharge dans `.veille/articles.json` (non suivi par git) et le site
  construit une page `/actus/<adresse>` par article, visible par Google (sitemap, données
  NewsArticle). Chaque article a une image de partage JPG 1200 × 630 (`public/og/actus/<id>.jpg`,
  fabriquée par le même script, non suivie par git) : les cartes SVG de la veille ne s'affichent ni sur
  WhatsApp, ni sur Facebook, ni dans Google. Les photos des articles ont aussi des versions de 480 et
  800 px servies par keurfoot.com (`public/reduites/actus/`), proposées au navigateur (srcset). Le site est reconstruit à 12 h 50 et 19 h 50 (heure d'hiver) par `deploy.yml`, sans
  clé ni secret de plus. Un article arrivé entre deux constructions s'ouvre sur la page de secours
  `/actus/article?id=<id>` (lue dans le navigateur, `noindex`, hors sitemap). Toute la carte d'une
  actu ouvre son article ; sans article, elle ouvre la source. Si la veille ne répond pas au build,
  le site se construit quand même, sans page d'article.
- **Console** : https://github.com/teiki5320/veille (onglet Actions pour les passages).

## Nom de domaine

- **Domaine** : `keurfoot.com`, adresse canonique sans www ; depuis le 28 octobre 2026,
  `www.keurfoot.com` renvoie définitivement (301) vers `keurfoot.com`, chemin et paramètres
  compris (règle de redirection Cloudflare « Rediriger de WWW vers la racine »). Tous deux
  restent des domaines personnalisés du Worker (`wrangler.jsonc`).
- **HTTPS forcé** : réglage Cloudflare « Toujours utiliser HTTPS » activé le 28 octobre 2026 ;
  toute adresse en http renvoie (301) vers https.
- **Registraire et DNS** : Cloudflare. Échéance à vérifier dans la console Cloudflare.
- **Adresse de contact** : `keurfoot@toakeur.com`, affichée sur le site
  (`NEXT_PUBLIC_CONTACT_EMAIL`).
- **Console** : tableau de bord Cloudflare, rubrique Domaines → `keurfoot.com`.

## Amazon Partenaires (affiliation)

- **Rôle** : les boutons de la boutique supporter (onze catégories depuis le 28 octobre 2026 : maillots,
  écharpes… puis gants de gardien, protège-tibias, pompes et manomètres, cadres pour maillot), des fiches
  sélections, des Top 10, des fiches joueurs et des Conseils mènent à Amazon.fr (liens construits par
  `src/lib/amazon.ts`, code réglable par `NEXT_PUBLIC_AMAZON_TAG`). Jamais de bouton Amazon sur l'accueil ni dans les actus.
- **Codes de suivi** : chaque lien reçoit son emplacement (fiche, joueur, top, conseil, boutique) et prend son code
  dans une table unique (`AMAZON_TAGS`) ; au 28 octobre 2026, tous les emplacements utilisent `keurfootfr-21`.
- **Fiches vérifiées** : 3 ASIN (maillots domicile du Maroc, du Nigeria et de la Tunisie), vérifiés le 28 octobre 2026
  et listés dans `src/lib/data/produits-amazon.json` ; tous les autres liens ouvrent une recherche Amazon. Les sélections
  dont le maillot n'est pas vendu sur amazon.fr (43 sur 54, vérifié le 28 octobre 2026) mènent à la recherche de leur drapeau.
- **Vérification** : `npm run verifier-produits` (sur le Mac, pas sur GitHub ; `-- --ecrire` pour enregistrer,
  `--lot 30` par petits lots) ouvre chaque fiche vérifiée : bouton d'achat présent → date mise à jour, sinon le produit
  passe « indisponible » et son lien revient à la recherche. Dernier passage : 28 octobre 2026, 3 sur 3 achetables.
- **Identifiant** : `keurfootfr-21` depuis le 20 octobre 2026 (nouveau compte Amazon Partenaires
  du 18 octobre 2026 ; l'ancien `keurfoot-21` est fermé).
- **Site déclaré** : keurfoot.com déclaré dans Amazon Partenaires (keurfootfr-21), vérifié par Jean le 28/10/2026.
- **Console** : https://partenaires.amazon.fr

## AdSense (publicité web)

- **Rôle** : script AdSense chargé sur les pages (identifiant d'éditeur dans `src/lib/config.ts`,
  `ADSENSE_CLIENT`, réglable par `NEXT_PUBLIC_ADSENSE_CLIENT` ; identifiant `ca-pub-2680784147246798`, présent dans le HTML en ligne) ;
  `public/ads.txt` est publié et répond.
- **Emplacements prévus** (composant `AdSlot`) : 1 sur les fiches sélections, 1 sur les fiches
  joueurs, 1 sur la page CAN, 2 dans les Top 10 et 2 dans les Conseils. Aucun identifiant de bloc
  n'est encore renseigné (`ADSENSE_SLOTS`, variables `NEXT_PUBLIC_ADSENSE_SLOT_SELECTION`,
  `_JOUEUR`, `_CAN`, `_TOP`, `_ARTICLE`) : aucune annonce ne s'affiche pour l'instant.
- **Consentement** : bandeau « Confidentialité et messages » d'AdSense, lien « Cookies » en pied
  de page ; la politique de sécurité de `public/_headers` n'ouvre que les domaines Google
  nécessaires.
- **Examen du site** : demandé le 20 octobre 2026 ; « En préparation » dans la console AdSense, ni validé ni refusé (vérifié le 29 octobre 2026).
- **Console** : https://adsense.google.com (compte AdSense de Jean).

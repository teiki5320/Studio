# Keur Cook — recettes africaines & produits rares

Site en français de **recettes de plats africains** (58 recettes, 16 pays), avec une rubrique **Conseils** (trois articles par semaine : lundi, mercredi, vendredi), une **boutique de 126 produits africains rares** en 9 gammes des pages **Top 10** (10 classements de produits) et des **Actus de la cuisine africaine** lues en direct depuis la veille actus. Le site ne vend rien lui-même : les boutons « Voir sur Amazon » mènent à Amazon.fr (programme Partenaires).

- **Site** : https://keurcook.com (`www.keurcook.com` y redirige).
- **Éditeur** : ALOHASH (SAS). Contact : keurcook@toakeur.com.
- **Dépôt** : https://github.com/teiki5320/keurcook.

**Stack** : Next.js 16 (App Router, export statique) · React 19 · TypeScript · Tailwind CSS 4 · Three.js (carte de l'Afrique en particules) · Marked (articles Markdown). Hébergement : Cloudflare Pages.

Le site est **100 % statique** : pas de serveur, pas de base de données. Recettes, produits et articles sont dans le code (`src/lib/demo/`, `content/conseils/`) ; le build produit le dossier `out/`, publié tel quel.

---

## Fonctionnalités

- Accueil : carte de l'Afrique en particules (un point par pays), carrousel des pays, bloc « Nos coups de cœur » (depuis le 28 octobre 2026 : 8 produits des Top 10 avec leur illustration, chacun relié à sa fiche `/produit/…`, lien « Tout voir » vers `/top-10`, aucun lien Amazon ; liste dans `src/lib/coups-de-coeur.ts`, un produit masqué en sort tout seul), rangée « Nos Top 10 » (liens vers les 10 Top 10 et la boutique, sans bouton Amazon, depuis le 28 octobre 2026), carrousels de recettes par type de plat, produits rares.
- Recettes : carrousel des types de plats, filtres (pays, difficulté), **recherche par plat, pays ou ingrédient**.
- Fiche recette : histoire du plat, portions ajustables (quantités recalculées), étapes, astuces, **version imprimable**, **partage WhatsApp**, favori ; ingrédients disponibles en boutique signalés « Produit rare », avec un vrai bouton « Voir sur Amazon » (44 px de haut au moins) ; sur téléphone, encadré « Produits de cette recette » juste après les ingrédients ; liens vers les Top 10 liés (depuis le 28 octobre 2026).
- Pages pays, **favoris sans compte** (stockés dans le navigateur).
- **Conseils** : articles Markdown (`content/conseils/`), trois articles par semaine (lundi, mercredi, vendredi), publication programmée (voir `docs/CONSEILS.md`).
- **Top 10** (`/top-10/<sujet>`) : 10 classements de dix produits de la boutique (voir « Top 10 » ci-dessous).
- **Actus de la cuisine africaine** (`/actus`, 20 actus ; 4 sur l'accueil, 3 par page pays) : lues dans le navigateur depuis `https://teiki5320.github.io/veille/actus/keurcook.json` (`src/lib/veille.ts`, `src/components/actus/`), préparées 2 fois par jour (12 h et 19 h) par la veille actus (dépôt `teiki5320/veille`) ; rien ne s'affiche s'il n'y a pas d'actu. Depuis le 28 octobre 2026, toute la carte d'une actu ouvre son **article complet** (300 à 450 mots) sur le site : page `/actus/<adresse>` construite au build (`scripts/articles-veille.ts` télécharge tous les articles de l'index `articles/keurcook/index.json`, jamais supprimés, dans `.veille/articles.json`, `src/app/(shop)/actus/[slug]/`), sinon page de secours `/actus/article?id=…` lue dans le navigateur (noindex, hors sitemap), sinon la source quand l'article n'est pas encore rédigé. Veille injoignable au build : 0 page article, le build continue.
- Boutique : tout le catalogue affiché d'emblée (une gamme se choisit dans le carrousel, depuis le 28 octobre 2026) ; fiche produit avec « Utilisé dans ces recettes », bouton « Voir sur Amazon » vers Amazon.fr et lien « Il est dans notre top 10 des … » quand il y figure. Chaque carte produit : une ligne « pourquoi » (description courte), le bouton et la ligne « Lien partenaire Amazon… » dessous. Pages pays : 3 produits du pays dès le haut de la page ; conseils : un encadré produit après la première partie, « Les produits » avant « Les recettes » ; actus : lien interne vers la fiche produit ou le Top 10 du sujet (`SUJETS_ACTUS`, `src/lib/veille-articles.ts`), jamais de lien Amazon.
- **Mode maintenance** : écran « On prépare la marmite », activé ou coupé depuis GitHub (voir « Maintenance » ci-dessous).

Recettes et produits se modifient dans le code (`src/lib/demo/`), articles dans `content/conseils/` ; chaque modification envoyée sur `main` republie le site.

Pas de newsletter pour l'instant : le formulaire a été retiré en attendant le choix d'un outil d'envoi.

### Boutique et Amazon Partenaires

- 126 produits en 9 gammes : Épices & aromates, Farines & céréales, Feuilles & fleurs séchées, Poissons & fumés, Huiles & pâtes, Snacks & fruits secs, Cafés & thés, Ustensiles, Livres de cuisine. Produits retenus : plus de 3,5 étoiles sur Amazon.
- Liens construits par `amazonUrl(asin, emplacement)` (`src/lib/amazon.ts`) à partir du champ `amazonAsin` (rempli depuis les offres de `src/lib/demo/catalog*.ts`) ; le code de suivi est choisi dans une table unique, `CODES_SUIVI`, par emplacement (recette, conseil, top, fiche, rubrique = boutique et pays). Depuis le 28 octobre 2026, tous les emplacements utilisent encore le tag partenaire `keurcookfr-21` (`NEXT_PUBLIC_AMAZON_TAG` pour le changer) ; un code par emplacement pourra y être écrit quand il sera créé dans Amazon Partenaires. `tests/amazon.test.ts` et `tests/sortie/` vérifient que chaque lien porte un code de la table. Ce tag vient du nouveau compte Amazon Partenaires ouvert le 18 octobre 2026 (l'ancien compte a été fermé par Amazon).
- Aucun prix affiché sur le site : seul le prix d'Amazon fait foi.
- **Disponibilité** : `npm run verifier-produits` (sur le Mac, pas sur GitHub ; `-- --ecrire` pour enregistrer, `--lot 30` pour un petit lot) ouvre chaque fiche Amazon.fr dans Chrome et note dans `src/lib/demo/verifications-amazon.json` la date et l'état (bouton « Ajouter au panier » présent ou non) ; une offre indisponible n'est plus affichée et revient d'elle-même quand elle redevient disponible. Premier passage sur tout le catalogue le 28 octobre 2026.
- Le site n'encaisse rien et ne gère aucun stock : achat, paiement et livraison se font sur Amazon.

### Top 10

Données dans `src/lib/demo/top10.ts`, vérifiées par `tests/top10.test.ts`. Chaque onglet compte exactement dix produits de la boutique avec un lien Amazon. Règle de classement :

- **Cas général** : note moyenne des acheteurs sur Amazon.fr (relevé du 19 octobre 2026 ; du 28 octobre 2026 pour l'onglet Mixeurs, quand le hachoir Choppeo indisponible a été remplacé par le H.Koenig LEO8) ; à égalité, le produit le plus évalué passe devant. Seuls les produits disponibles avec **au moins 10 évaluations** sont retenus.
- **Onglet Livres** : les livres sont gardés même avec peu d'évaluations (choix de Jean le 19 octobre 2026) ; ceux qui n'ont aucune note sont placés à la fin.
- **Onglet Farines** : classé selon le nombre de recettes du site qui emploient chaque produit.
- Les notes servent seulement à classer : elles ne sont **jamais affichées** (pas de prix non plus).

### Publicité (Google AdSense)

- Compte AdSense `pub-2680784147246798` (comptes de gestion sur `admin@toakeur.com`). Script chargé dans `src/app/layout.tsx`, emplacements « Publicité » (`src/components/ads/AdSlot.tsx`, `src/lib/ads.ts`) et `public/ads.txt` en place.
- **Le site est encore en examen chez Google** (demande faite le 12 octobre 2026 ; « En préparation » dans la console AdSense, ni validé ni refusé (vérifié le 29 octobre 2026)) : aucune annonce ne s'affiche tant que Google n'a pas validé le site.

### Pinterest

Compte « Keur Cook », site revendiqué, bouton « Épingler » sur chaque recette. Images d'épingle dans `public/pins/` (58, créées par `scripts/pin-images.mjs`). 52 recettes ont été épinglées du 2 au 14 octobre 2026 par la routine Claude `keurcook-epingles-pinterest` ; les six recettes de boissons ajoutées le 19 octobre ont leur image depuis le 23 octobre : toutes les six ont été épinglées le 24 octobre 2026 (58 sur 58).

Publication automatique (même système que Keur Déco, depuis le 23 octobre 2026) : `scripts/epingles.ts` écrit au build le manifeste `epingles.json` ; `.github/workflows/pinterest.yml` publie chaque jour à 4 h 17 UTC au plus 5 épingles (`config/pinterest.json`), jamais deux de la même recette le même jour, et note chacune dans `data/pinterest-etat.json`. La clé du compte Keur Cook a été créée le 23 octobre 2026 (`npm run pinterest:auth` puis `npm run pinterest:secrets`, voir `docs/PINTEREST.md`) ; à refaire avant son échéance, environ 60 jours plus tard.

### Conformité

- **Aucune allégation de santé** : liste de termes à risque (« soigne », « bienfaits », « digestion »… — voir `src/lib/compliance.ts`). Cette liste ne remplace pas une relecture humaine.
- **Étiquetage alimentaire** : ingrédients, allergènes et conservation sur chaque fiche produit.
- Pages **conditions d'utilisation** (`/conditions`, CGU ; `/cgv` y redirige), **mentions légales**, **politique de confidentialité** ; consentement aux cookies recueilli par le **message de Google** (Confidentialité et messages, dans AdSense), que le lien « Cookies » du pied de page rouvre (`src/components/compliance/CookieBanner.tsx`). Hébergeur indiqué : Cloudflare, Inc.
- Données structurées Google **Recipe**, **Article**, fil d'Ariane et listes (pas de **Product** sur les fiches produit), sitemap avec les recettes, les pays, les articles publiés et les articles d'actus (NewsArticle).

> ⚠️ Les textes légaux sont des **modèles** à faire valider.

### Logos

Fichiers d'origine dans `assets/logo/` (fond noir, fond blanc, transparent). Versions du site dans `public/brand/` : `keurcook-embleme.webp` (marmite, en-tête et pied de page), `keurcook-logo.webp` (logo complet), `keurcook-partage.jpg` (image de partage 1200 × 630) ; icônes d'onglet `src/app/icon.png` et `src/app/apple-icon.png`.

---

## Démarrage

Prérequis : Node.js ≥ 20.9.

```bash
npm install
npm run dev
```

Ouvrez http://localhost:3000. Aucune variable n'est obligatoire ; pour les régler en local : `cp .env.example .env.local`.

### Variables d'environnement

Toutes publiques (aucun secret dans le site). Liste complète : `.env.example`.

| Variable | Rôle |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | URL publique (SEO, sitemap, liens canoniques) ; `https://keurcook.com` au build de production |
| `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_CONTACT_EMAIL` | Nom du site (Keur Cook), e-mail de contact (keurcook@toakeur.com) |
| `NEXT_PUBLIC_AMAZON_TAG` | Tag Amazon Partenaires (par défaut `keurcookfr-21`) |
| `NEXT_PUBLIC_LEGAL_*` | Informations des mentions légales et des conditions d'utilisation (hébergeur par défaut : Cloudflare) |

---

## Publication

Workflow GitHub Actions `.github/workflows/deploy.yml` (« Publier le site »), lancé :

- à chaque push sur `main` ;
- chaque lundi, mercredi et vendredi à 0 h 15, heure de Paris en hiver (1 h 15 en été ; cron), pour publier les articles « Conseils » programmés ;
- chaque jour à 12 h 50 et 19 h 50, heure de Paris en hiver (13 h 50 et 20 h 50 en été ; cron `50 11,18 * * *`), après la veille actus : chaque nouvel article d'actu devient sa page `/actus/<adresse>` ;
- à la main (onglet **Actions → Publier le site → Run workflow**) ;
- après le bouton « Maintenance ».

Étapes : lint, types, tests, build (`out/`), contrôle du site construit (`npm run test:sortie:controle`), puis `wrangler pages deploy out --project-name=keurcook` vers Cloudflare Pages. La publication n'a lieu que si les secrets GitHub `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` sont présents (**Settings → Secrets and variables → Actions**) ; sinon le workflow affiche un avertissement et ne publie rien.

Les secrets ne sont donnés qu'à l'étape d'envoi ; `wrangler` est figé dans `package-lock.json`. GitHub coupant les tâches programmées d'un dépôt public après 60 jours sans activité, chaque publication programmée réactive elle-même la tâche.

Mise en route restante : voir `docs/PUBLICATION.md`.

### Maintenance

Onglet **Actions → Maintenance → Run workflow** : choisir « Oui, mettre en pause » ou « Non, rouvrir le site », avec un message facultatif. Le workflow `.github/workflows/maintenance.yml` modifie `content/maintenance.json`, l'enregistre sur `main` et republie le site.

Pendant la maintenance : écran « On prépare la marmite », pages en `noindex`, sitemap vide. Les pages légales (`/mentions-legales`, `/confidentialite`, `/conditions`) restent accessibles (groupe de routes `src/app/(legal)`).

### Signaler les pages à Bing (IndexNow)

Après chaque publication réussie de main (depuis le 28 octobre 2026), chaque lundi à 3 h UTC et à la main, le workflow `.github/workflows/indexnow.yml` (« Signaler les pages (IndexNow) ») lit le sitemap publié et envoie toutes ses adresses à IndexNow, qui les transmet à Bing, Yandex, Seznam… Pour le relancer à la main : onglet **Actions → Signaler les pages (IndexNow) → Run workflow**, ou en local `node scripts/indexnow.mjs`. La clé IndexNow (publique par conception) est écrite dans `scripts/indexnow.mjs` et servie à la racine du site (`public/<clé>.txt`). L'état de l'indexation se suit dans Bing Webmaster Tools.

### En-têtes et redirections

Servis par Cloudflare Pages :

- `public/_headers` : politique de sécurité du contenu (CSP), HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, cache long des fichiers `/_next/static/`, `noindex` sur `keurcook.pages.dev` et sur les fichiers `.txt` internes de Next.js (sauf `ads.txt`, `robots.txt` et la clé IndexNow, depuis le 28 octobre 2026).
- `public/_redirects` : `/cgv` → `/conditions`, `/categorie/<gamme>` → `/boutique?gamme=<gamme>` (une règle par gamme : Cloudflare ne recopie pas les variables après « ? »), anciennes pages (`/panier`, `/commande`, `/accessoires`, `/avertissements`, `/admin`…) vers la boutique, les conditions ou l'accueil.

---

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build statique (dossier `out/`) ; crée d'abord les images de partage JPEG dans `public/og/` (`scripts/og-images.mjs`, non versionné) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests (`tests/*.test.ts`) |
| `npm run verifier-produits` | Vérifie sur amazon.fr que chaque produit est toujours achetable (sur le Mac ; `-- --ecrire` pour enregistrer) |
| `npm run test:sortie` | Construit le site comme en production puis contrôle le dossier `out/` (`tests/sortie/sortie.test.ts`) ; `npm run test:sortie:controle` contrôle un `out/` déjà construit |

**Avant chaque envoi** : `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:sortie` (build compris).

**Vitesse** (depuis le 28 octobre 2026) : 2 polices servies par le site (`next/font`, `display: swap`) : Anton en une seule graisse pour les titres et Manrope variable (un seul fichier) pour le texte ; Inter et Fraunces, qui n'étaient plus visibles, ont été retirées. Les très grosses listes (`/recettes`, `/boutique`, `/favoris`, `/conseils`) et les liens du menu et du pied de page ne sont pas préchargés (`prefetch={false}`, `src/lib/liens.ts`). Titres de page limités à 60 caractères : `seoTitle` court sur les fiches concernées, coupe propre en fin de mot en dernier recours (`couperTexte`, `src/lib/metadata.ts`), contrôlé par `tests/sortie/`. Le CSS écrit dans la page (`experimental.inlineCss`) a été essayé puis écarté : pages et navigation bien plus lourdes pour un gain d'affichage faible.

## Structure

```
.github/workflows/
  deploy.yml           publication sur Cloudflare Pages (push, lundi/mercredi/vendredi, 2 fois par jour après la veille, à la main, après maintenance)
  maintenance.yml      bouton « Maintenance » (modifie content/maintenance.json et republie)
  indexnow.yml         signale les pages à Bing via IndexNow (après chaque publication réussie, lundi 3 h UTC et à la main)
content/
  conseils/            articles « Conseils » en Markdown (date de publication dans l'en-tête)
  maintenance.json     mode maintenance (activé ou non, message affiché)
public/
  _headers             en-têtes de sécurité (Cloudflare Pages)
  _redirects           redirections (Cloudflare Pages)
  recipes/, products/, conseils/   photos (WebP)
src/
  app/(shop)/          site : accueil, recettes (?type= / ?pays= / ?q=), recette/, pays/, favoris,
                       boutique (?gamme= / ?q=), produit/, conseils/
  app/(legal)/         pages légales, accessibles même en maintenance
  components/          UI (recipe/, conseils/, nuage/ = thème, carte et carrousels, product/, shop/, layout/, compliance/)
  lib/data/            accès aux données (recettes, catalogue, gammes, conseils, réglages de maintenance)
  lib/demo/            recettes, produits et Top 10
  lib/amazon.ts        liens « Voir sur Amazon » vers Amazon.fr (tag partenaire)
  lib/conseils/        lecture des articles et thèmes
  lib/countries.ts     pays (nom, « de … », position sur la carte)
  lib/recipe-utils.ts  types de plats, durées, quantités, recherche
  lib/compliance.ts    détection des allégations de santé
docs/                  INFRA, MARKETING, PUBLICATION, CONSEILS, CONSEILS-CALENDRIER
tests/                 tests (articles « Conseils », contenus) ; tests/sortie/ = contrôle du site construit
```

Photos (`public/recipes/*.webp`, `public/products/*.webp`, `public/conseils/`) : photos OpenArt.

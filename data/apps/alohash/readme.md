# Keur Cook — recettes africaines & produits rares

Site en français de **recettes de plats africains** (58 recettes, 16 pays), avec une rubrique **Conseils** (trois articles par semaine : lundi, mercredi, vendredi), une **boutique de 128 produits africains rares** en 9 gammes et des pages **Top 10** (10 classements de produits). Le site ne vend rien lui-même : les boutons « Acheter · prix » mènent à Amazon.fr (programme Partenaires).

- **Site** : https://keurcook.com (`www.keurcook.com` y redirige).
- **Éditeur** : ALOHASH (SAS). Contact : keurcook@toakeur.com.
- **Dépôt** : https://github.com/teiki5320/keurcook.

**Stack** : Next.js 16 (App Router, export statique) · React 19 · TypeScript · Tailwind CSS 4 · Three.js (carte de l'Afrique en particules) · Marked (articles Markdown). Hébergement : Cloudflare Pages.

Le site est **100 % statique** : pas de serveur, pas de base de données. Recettes, produits et articles sont dans le code (`src/lib/demo/`, `content/conseils/`) ; le build produit le dossier `out/`, publié tel quel.

---

## Fonctionnalités

- Accueil : carte de l'Afrique en particules (un point par pays), carrousels de recettes par type de plat, produits rares.
- Recettes : carrousel des types de plats, filtres (pays, difficulté), **recherche par plat, pays ou ingrédient**.
- Fiche recette : histoire du plat, portions ajustables (quantités recalculées), étapes, astuces, **version imprimable**, **partage WhatsApp**, favori ; ingrédients disponibles en boutique signalés « Produit rare », avec bouton d'achat Amazon.
- Pages pays, **favoris sans compte** (stockés dans le navigateur).
- **Conseils** : articles Markdown (`content/conseils/`), trois articles par semaine (lundi, mercredi, vendredi), publication programmée (voir `docs/CONSEILS.md`).
- **Top 10** (`/top-10/<sujet>`) : 10 classements de dix produits de la boutique (voir « Top 10 » ci-dessous).
- Boutique par gammes, fiche produit avec « Utilisé dans ces recettes », bouton « Acheter · prix » vers Amazon.fr.
- **Mode maintenance** : écran « On prépare la marmite », activé ou coupé depuis GitHub (voir « Maintenance » ci-dessous).

Recettes et produits se modifient dans le code (`src/lib/demo/`), articles dans `content/conseils/` ; chaque modification envoyée sur `main` republie le site.

Pas de newsletter pour l'instant : le formulaire a été retiré en attendant le choix d'un outil d'envoi.

### Boutique et Amazon Partenaires

- 128 produits en 9 gammes : Épices & aromates, Farines & céréales, Feuilles & fleurs séchées, Poissons & fumés, Huiles & pâtes, Snacks & fruits secs, Cafés & thés, Ustensiles, Livres de cuisine. Produits retenus : plus de 3,5 étoiles sur Amazon.
- Liens construits par `src/lib/amazon.ts` à partir du champ `amazonAsin` (rempli depuis les offres de `src/lib/demo/catalog*.ts`) et du tag partenaire `keurcookfr-21` (`NEXT_PUBLIC_AMAZON_TAG` pour le changer). Ce tag vient du nouveau compte Amazon Partenaires ouvert le 18 octobre 2026 (l'ancien compte a été fermé par Amazon).
- Prix **indicatifs**, relevés le 27/09/2026 : le prix affiché par Amazon fait foi.
- Le site n'encaisse rien et ne gère aucun stock : achat, paiement et livraison se font sur Amazon.

### Top 10

Données dans `src/lib/demo/top10.ts`, vérifiées par `tests/top10.test.ts`. Chaque onglet compte exactement dix produits de la boutique avec un lien Amazon. Règle de classement :

- **Cas général** : note moyenne des acheteurs sur Amazon.fr (relevé du 19 octobre 2026) ; à égalité, le produit le plus évalué passe devant. Seuls les produits disponibles avec **au moins 10 évaluations** sont retenus.
- **Onglet Livres** : les livres sont gardés même avec peu d'évaluations (choix de Jean le 19 octobre 2026) ; ceux qui n'ont aucune note sont placés à la fin.
- **Onglet Farines** : classé selon le nombre de recettes du site qui emploient chaque produit.
- Les notes servent seulement à classer : elles ne sont **jamais affichées** (pas de prix non plus).

### Publicité (Google AdSense)

- Compte AdSense `pub-2680784147246798` (comptes de gestion sur `admin@toakeur.com`). Script chargé dans `src/app/layout.tsx`, emplacements « Publicité » (`src/components/ads/AdSlot.tsx`, `src/lib/ads.ts`) et `public/ads.txt` en place.
- **Le site est encore en examen chez Google** (demande faite le 12 octobre 2026) : aucune annonce ne s'affiche tant que Google n'a pas validé le site.

### Pinterest

Compte « Keur Cook », site revendiqué, bouton « Épingler » sur chaque recette. Images d'épingle dans `public/pins/` (58, créées par `scripts/pin-images.mjs`). 52 recettes ont été épinglées du 2 au 14 octobre 2026 par la routine Claude `keurcook-epingles-pinterest` ; les six recettes de boissons ajoutées le 19 octobre ont leur image depuis le 23 octobre : cinq ont été épinglées le 24 octobre 2026 (57 sur 58), le rooibos glacé reste à partir.

Publication automatique (même système que Keur Déco, depuis le 23 octobre 2026) : `scripts/epingles.ts` écrit au build le manifeste `epingles.json` ; `.github/workflows/pinterest.yml` publie chaque jour à 4 h 17 UTC au plus 5 épingles (`config/pinterest.json`), jamais deux de la même recette le même jour, et note chacune dans `data/pinterest-etat.json`. La clé du compte Keur Cook a été créée le 23 octobre 2026 (`npm run pinterest:auth` puis `npm run pinterest:secrets`, voir `docs/PINTEREST.md`) ; à refaire avant son échéance, environ 60 jours plus tard.

### Conformité

- **Aucune allégation de santé** : liste de termes à risque (« soigne », « bienfaits », « digestion »… — voir `src/lib/compliance.ts`). Cette liste ne remplace pas une relecture humaine.
- **Étiquetage alimentaire** : ingrédients, allergènes et conservation sur chaque fiche produit.
- Pages **conditions d'utilisation** (`/conditions`, CGU ; `/cgv` y redirige), **mentions légales**, **politique de confidentialité** ; consentement aux cookies recueilli par le **message de Google** (Confidentialité et messages, dans AdSense), que le lien « Cookies » du pied de page rouvre (`src/components/compliance/CookieBanner.tsx`). Hébergeur indiqué : Cloudflare, Inc.
- Données structurées Google **Recipe**, **Article**, fil d'Ariane et listes (pas de **Product** sur les fiches produit), sitemap avec les recettes, les pays et les articles publiés.

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
- à la main (onglet **Actions → Publier le site → Run workflow**) ;
- après le bouton « Maintenance ».

Étapes : lint, types, tests, build (`out/`), puis `wrangler pages deploy out --project-name=keurcook` vers Cloudflare Pages. La publication n'a lieu que si les secrets GitHub `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` sont présents (**Settings → Secrets and variables → Actions**) ; sinon le workflow affiche un avertissement et ne publie rien.

Les secrets ne sont donnés qu'à l'étape d'envoi ; `wrangler` est figé dans `package-lock.json`. GitHub coupant les tâches programmées d'un dépôt public après 60 jours sans activité, chaque publication programmée réactive elle-même la tâche.

Mise en route restante : voir `docs/PUBLICATION.md`.

### Maintenance

Onglet **Actions → Maintenance → Run workflow** : choisir « Oui, mettre en pause » ou « Non, rouvrir le site », avec un message facultatif. Le workflow `.github/workflows/maintenance.yml` modifie `content/maintenance.json`, l'enregistre sur `main` et republie le site.

Pendant la maintenance : écran « On prépare la marmite », pages en `noindex`, sitemap vide. Les pages légales (`/mentions-legales`, `/confidentialite`, `/conditions`) restent accessibles (groupe de routes `src/app/(legal)`).

### Signaler les pages à Bing (IndexNow)

Chaque lundi à 3 h UTC, après la publication de la nuit, le workflow `.github/workflows/indexnow.yml` (« Signaler les pages (IndexNow) ») lit le sitemap publié et envoie toutes ses adresses à IndexNow, qui les transmet à Bing, Yandex, Seznam… Pour le relancer à la main : onglet **Actions → Signaler les pages (IndexNow) → Run workflow**, ou en local `node scripts/indexnow.mjs`. La clé IndexNow (publique par conception) est écrite dans `scripts/indexnow.mjs` et servie à la racine du site (`public/<clé>.txt`). L'état de l'indexation se suit dans Bing Webmaster Tools.

### En-têtes et redirections

Servis par Cloudflare Pages :

- `public/_headers` : politique de sécurité du contenu (CSP), HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, cache long des fichiers `/_next/static/`.
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

**Avant chaque envoi** : `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Structure

```
.github/workflows/
  deploy.yml           publication sur Cloudflare Pages (push, lundi/mercredi/vendredi, à la main, après maintenance)
  maintenance.yml      bouton « Maintenance » (modifie content/maintenance.json et republie)
  indexnow.yml         signale les pages à Bing via IndexNow (lundi 3 h UTC et à la main)
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
  lib/amazon.ts        liens « Acheter » vers Amazon.fr (tag partenaire)
  lib/conseils/        lecture des articles et thèmes
  lib/countries.ts     pays (nom, « de … », position sur la carte)
  lib/recipe-utils.ts  types de plats, durées, quantités, recherche
  lib/compliance.ts    détection des allégations de santé
docs/                  INFRA, MARKETING, PUBLICATION, CONSEILS, CONSEILS-CALENDRIER
tests/                 tests (articles « Conseils », contenus)
```

Photos (`public/recipes/*.webp`, `public/products/*.webp`, `public/conseils/`) : photos OpenArt.

# INFRA — fiche technique

Mis à jour le 26 octobre 2026, d'après le code du dépôt et le site en ligne. Aucun secret ici :
uniquement des noms de variables et de consoles.

## En bref

- **Plateforme** : site web éditorial sur le football africain, en français, ordinateur et mobile
- **Stack** : Next.js 16 en export statique, React 19, Tailwind CSS 4
- **Backend** : aucun — site statique, sans base ni compte
- **Distribution** : Worker de fichiers statiques Cloudflare, publié par GitHub Actions
- **Site** : keurfoot.com (98 adresses dans le sitemap)
- **IA et outils** : illustrations faites avec OpenArt, épingles générées au build

## Parcours

- 🌐 **Web** : 🐙 GitHub — main · publication au vert [ok] → ⚙️ GitHub Actions — lint, types, tests, build [ok] → ☁️ Cloudflare Workers — Worker keurfoot [ok] → 🌍 keurfoot.com — en ligne, réponse 200 [ok]
- 📝 **Contenu** : ✍️ Conseils — 8 publiés, 13 programmés jusqu'au 25 novembre 2026 [ok] → ⚙️ GitHub Actions — publie lundi, mercredi, vendredi [ok] → 🔍 Google — 95 sur 97 indexées au 25 octobre [ok]
- 🛒 **Affiliation** : 🛍️ Boutique et fiches — boutons Amazon [ok] → 🛒 Amazon Partenaires (affiliation) — tag keurfootfr-21 [ok] → 🌐 Site déclaré chez Amazon — à vérifier dans la console [à faire] → 🔗 Liens directs — aucun ASIN, recherches seulement [pas encore]
- 📰 **Publicité** : 📰 AdSense (publicité web) — script et ads.txt en place [ok] → ✅ Examen du site — demandé le 20 octobre [à faire] → 🧱 Blocs d'annonces — aucun identifiant renseigné [pas encore]

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
- **Taille** : 98 adresses dans le sitemap au 26 octobre 2026 (54 sélections, 15 joueurs,
  10 Top 10, 2 pages CAN, 8 articles Conseils publiés, boutique, pages de liste et pages légales).
- **Images** : illustrations originales créées avec OpenArt puis découpées par
  `scripts/decouper-planche.mjs` (voir docs/ILLUSTRATIONS.md) ; épingles Pinterest des Top 10
  générées avant chaque build par `scripts/epingles.mts` (satori et resvg), dans `public/epingles/`.
- **Particularités** : interrupteur de maintenance dans `content/maintenance.json` (désactivé),
  tests de cohérence des contenus dans `tests/`, contrôle de la sortie par `npm run test:sortie`.

## GitHub

- **Rôle** : dépôt du code et des contenus, et trois workflows :
  - `deploy.yml` (« Publier le site ») : lint, types, tests, build, puis publication sur Cloudflare
    par `npx wrangler deploy` à chaque push sur `main`, chaque lundi, mercredi et vendredi à
    23 h 15 UTC la veille (articles programmés) et à la main ;
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
- **En-têtes** : `public/_headers` (politique de sécurité limitée au site lui-même, à Google AdSense
  et à Cloudflare Web Analytics, HSTS, cache des images).
- **Redirections** : `public/_redirects`.
- **Ancienne adresse** : https://teiki5320.github.io/keurfoot/ (version provisoire du 17 au
  20 octobre 2026) ne sert plus qu'une page de renvoi vers keurfoot.com, en `noindex`.
- **Console** : tableau de bord Cloudflare, rubrique Workers & Pages → `keurfoot`.

## Nom de domaine

- **Domaine** : `keurfoot.com`, adresse canonique sans www ; `www.keurfoot.com` sert aussi le site,
  avec une adresse canonique qui pointe vers `keurfoot.com`. Tous deux sont des domaines
  personnalisés du Worker (`wrangler.jsonc`).
- **Registraire et DNS** : Cloudflare. Échéance à vérifier dans la console Cloudflare.
- **Adresse de contact** : `keurfoot@toakeur.com`, affichée sur le site
  (`NEXT_PUBLIC_CONTACT_EMAIL`).
- **Console** : tableau de bord Cloudflare, rubrique Domaines → `keurfoot.com`.

## Amazon Partenaires (affiliation)

- **Rôle** : les boutons de la boutique supporter (sept catégories : maillots, écharpes…), des
  fiches sélections et des Conseils mènent à Amazon.fr avec le tag `keurfootfr-21` (construits par
  `src/lib/amazon.ts`, réglable par `NEXT_PUBLIC_AMAZON_TAG`). Aucun ASIN n'est encore renseigné :
  tous les liens ouvrent une recherche Amazon.
- **Identifiant** : `keurfootfr-21` depuis le 20 octobre 2026 (nouveau compte Amazon Partenaires
  du 18 octobre 2026 ; l'ancien `keurfoot-21` est fermé).
- **Site déclaré** : `keurfoot.com` parmi les sites du compte : à vérifier dans la console.
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
- **Examen du site** : demandé le 20 octobre 2026 ; avis de Google à vérifier dans la console.
- **Console** : https://adsense.google.com (compte AdSense de Jean).

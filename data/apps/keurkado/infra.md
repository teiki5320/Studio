# INFRA — fiche technique

Mis à jour le 25 octobre 2026, d'après le code du dépôt et le site en ligne. Aucun secret ici :
uniquement des noms de variables et de consoles.

## En bref

- **Plateforme** : site web d'idées cadeaux, en français, sur ordinateur et mobile
- **Stack** : Next.js 16 en export statique, React 19, Tailwind CSS 4
- **Backend** : aucun — site statique, sans base ni compte
- **Distribution** : Worker de fichiers statiques Cloudflare, publié par GitHub Actions
- **Site** : keurkado.com (61 adresses dans le sitemap)
- **IA et outils** : 95 illustrations créées par IA (OpenArt), épingles Pinterest générées au build

## Parcours

- 🌐 **Web** : 🐙 GitHub — main · publication au vert [ok] → ⚙️ GitHub Actions — lint, types, tests, build [ok] → ☁️ Hébergement web — Worker Cloudflare « keurkado » [ok] → 🌍 keurkado.com — en ligne, réponse 200 [ok]
- 🛒 **Affiliation** : 🎁 Fiche cadeau — bouton « Voir sur Amazon » [ok] → 🛒 Amazon Partenaires (affiliation) — tag keurkadofr-21 [ok] → 🔗 Liens directs — 53 ASIN sur 95 cadeaux [à faire]
- 📰 **Publicité** : 📰 AdSense (publicité web) — script et ads.txt en ligne [ok] → 🧱 Blocs d'annonces — pas encore créés [à faire] → 💶 Revenus — aucun constaté [pas encore]
- 📝 **Contenu** : ✍️ Articles Conseils — 4 publiés, 8 programmés [ok] → ⚙️ GitHub Actions — republie lun., mer., ven. [ok] → 🔍 Google — 9 pages indexées sur 61 [à faire]

## Vue d'ensemble

- **Plateforme** : site web en français d'idées cadeaux africains pour la diaspora africaine en
  France : par occasion (Tabaski, Korité, Noël, mariage, baptême, Saint-Valentin…), par
  destinataire, par budget et par univers, avec un quiz « Trouve le cadeau », des Top 10, une
  rubrique Conseils et un calendrier des fêtes africaines. Le site ne vend rien.
- **Stack** : Next.js 16 (App Router, export statique) + React 19 + Tailwind CSS 4, TypeScript,
  Marked pour les articles Markdown, sharp pour les épingles. Base technique reprise de Keurbook.
- **Contenus** : catalogue de 95 cadeaux dans `src/lib/catalogue/` (7 univers), 21 Top 10 dans
  `src/lib/tops/`, 12 articles Conseils dans `content/conseils/` (publiés à leur date),
  calendrier dans `src/lib/calendrier.ts`.
- **Backend** : aucun. Site entièrement statique (dossier `out/`), sans base de données, sans
  compte, sans formulaire. Seuls cookies : ceux de Google AdSense, après accord dans le bandeau de
  consentement de Google.
- **Images** : une illustration par cadeau (95), créée par IA avec OpenArt en octobre 2026 pendant
  les séances de rédaction (aucun appel depuis le site) ; chaque carte porte la mention
  « Illustration créée par IA ». Détail : `docs/IMAGES.md`.
- **Particularités** : tests de cohérence des contenus dans `tests/` ; épingles Pinterest
  (une par Top 10), manifeste `/epingles.json` et fichier d'import `/epingles-pinterest.csv`
  générés à chaque build par `scripts/epingles.mts` ; publication automatique par l'API Pinterest
  (même système que Keur Déco) depuis le 23 octobre 2026, clé du compte créée le même jour ; voir GitHub ci-dessous.

## GitHub

- **Rôle** : dépôt du code et des contenus, et trois workflows :
  - `deploy.yml` (« Publier le site ») : lint, types, tests, build, puis publication par
    `npx wrangler deploy` à chaque push sur `main`, chaque lundi, mercredi et vendredi (0 h 15 heure de Paris, pour les
    articles programmés) et à la main ; dernière exécution réussie le 25 octobre 2026 ;
  - `pages.yml` : publie sur l'ancienne adresse GitHub Pages une page qui renvoie vers keurkado.com ;
  - `pinterest.yml` (« Publier les épingles Pinterest ») : chaque jour à 4 h 17 UTC, au plus 5 épingles
    du manifeste (`config/pinterest.json`), jamais deux du même Top le même jour, dans le tableau de sa
    rubrique, puis enregistre `data/pinterest-etat.json` sur `main` (les 21 épingles programmées à la
    main y sont notées). Clé du compte en place : les exécutions des 24 et 25 octobre 2026 se sont connectées à
    Pinterest et n'ont rien publié, les 21 épingles actuelles étant déjà programmées à la main.
- **Console** : https://github.com/teiki5320/keurkado (branche `main` uniquement).
- **Secrets** : `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`, réglés dans les secrets
  Actions du dépôt, jamais dans le code. Variable sans secret : `PINTEREST_VERIFY`. Pinterest :
  `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET` (application « TOA CORP publication », la même que
  Keur Déco, accès standard) et `PINTEREST_REFRESH_TOKEN` (clé du compte Keur Kado, environ 60 jours),
  créés le 23 octobre 2026, clé à refaire vers mi-décembre 2026 ; procédure dans `docs/PINTEREST.md`.

## Hébergement web (GitHub Pages / Cloudflare Pages)

- **Fournisseur** : Cloudflare, Worker de fichiers statiques « keurkado » sans code serveur
  (comme Keur Foot), configuré dans `wrangler.jsonc` : sert `out/`, page 404, pas d'adresse
  `workers.dev` ni d'aperçus publics, domaines `keurkado.com` et `www.keurkado.com`.
- **Ne pas utiliser** `wrangler pages …` : la commande convertit le projet en application OpenNext.
- **En-têtes** : `public/_headers` (politique de sécurité limitée au site et aux domaines Google
  nécessaires à AdSense, HSTS, cache des images) ; redirections : `public/_redirects`.
- **Ancienne adresse** : `teiki5320.github.io/keurkado` (GitHub Pages) ne sert plus qu'une page de
  redirection vers la même page sur keurkado.com, depuis le 20 octobre 2026.
- **Console** : tableau de bord Cloudflare, rubrique Workers & Pages → `keurkado`.
- **Détail** : `docs/DEPLOIEMENT.md`.

## Nom de domaine

- **Domaine** : `keurkado.com`, enregistré le 20 octobre 2026 ; `www.keurkado.com` sert les mêmes
  pages, avec l'adresse canonique sans www.
- **Registraire et DNS** : Cloudflare (Cloudflare Registrar, serveurs de noms Cloudflare).
  Échéance : 20 octobre 2027.
- **Adresse de contact** : `keurkado@toakeur.com`, affichée sur le site
  (`NEXT_PUBLIC_CONTACT_EMAIL`) ; le domaine keurkado.com ne reçoit pas de courrier.
- **Console** : tableau de bord Cloudflare, rubrique Domaines → `keurkado.com`.

## Amazon Partenaires (affiliation)

- **Rôle** : les boutons « Voir sur Amazon » mènent à Amazon.fr avec le tag `keurkadofr-21`
  (construits par `src/lib/amazon.ts`, réglable par `NEXT_PUBLIC_AMAZON_TAG`). 53 cadeaux sur 95 ont
  un ASIN relevé à la main et mènent directement à leur fiche ; les autres ouvrent une recherche
  Amazon. Aucun prix saisi à la main (règle du programme).
- **Contrôle** : la routine « Vérifier les liens Amazon » du Studio a contrôlé 40 liens le
  21 octobre 2026, tous valides.
- **Site déclaré** : keurkado.com dans la liste des sites du compte — à vérifier dans la console.
- **Console** : https://partenaires.amazon.fr (compte Amazon Partenaires créé le 18 octobre 2026).

## AdSense (publicité web)

- **Rôle** : script AdSense et balise `google-adsense-account` chargés dans `src/app/layout.tsx`
  (même identifiant d'éditeur que Keurbook, `ADSENSE_CLIENT` dans `src/lib/config.ts`) ;
  `public/ads.txt` est publié et répond.
- **Emplacements prévus** (composant `AdSlot`) : 2 dans un Top 10, 1 en bas des pages occasion,
  destinataire, budget et univers, 2 dans un article Conseils. Les identifiants des blocs
  (`NEXT_PUBLIC_ADSENSE_SLOT_TOP`, `_RUBRIQUE`, `_ARTICLE`) sont vides : aucune annonce ne
  s'affiche tant que les blocs ne sont pas créés.
- **Consentement** : bandeau « Confidentialité et messages » d'AdSense, lien « Gérer mes cookies »
  en pied de page.
- **Validation du site** : examen demandé le 20 octobre 2026, réponse à vérifier dans la console.
- **Console** : https://adsense.google.com (compte AdSense de Jean).

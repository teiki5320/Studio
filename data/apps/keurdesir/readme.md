# Keur Désir

Le guide du djongué, l'art sénégalais et ouest-africain de la séduction : bine-bine, thiouraye et encens,
encensoirs, karité et soins, petits pagnes et tenues de nuit, coffrets cadeaux, avec des sélections de produits.
Site statique Next.js publié sur Cloudflare Pages (keurdesir.com). Un site [TOA KEUR](https://toakeur.com).

Base technique reprise de Keurbook (structure et code seulement : aucun contenu éditorial).

## Pages

| Page | Adresse |
|---|---|
| Accueil | `/` |
| 7 rubriques | `/djongue`, `/bine-bine`, `/thiouraye-encens`, `/encensoirs`, `/karite-soins`, `/tenues-de-nuit`, `/coffrets-cadeaux` |
| Articles | `/conseils`, `/conseils/<slug>` |
| Top 10 | `/top-10`, `/top-10/<slug>` |
| Fiches produits | `/produit/<slug>` |
| Lexique, À propos | `/lexique`, `/a-propos` |
| Liste d'envies | `/mes-envies` (non indexée) |
| Pages légales | `/mentions-legales`, `/confidentialite`, `/conditions` |

Détail de chaque page : docs/CONTENU.md. Plan validé : docs/PLAN.md.

## Design

Design « Néon Dakar · Rubis », validé par Jean le 29 octobre 2026 : nuit bordeaux presque noire, néons rouge rubis et or,
écriture néon « Désir », motif de wax en cercles qui tourne dans le haut de l'accueil, bandeaux qui défilent, lueurs animées.
Couleurs et animations dans `src/app/globals.css` (coupées pour les visiteurs qui demandent moins d'animations).
Polices Unbounded, DM Sans, Space Mono et Mr Dafoe, hébergées avec le site dans `src/fonts/` (licences : `src/fonts/LICENCES.md`).

## Logo

Logo de Jean (lèvres rouge et or à motifs, nom « Keur Désir ») : originaux dans `docs/logos/`. `node scripts/marque.mjs` en tire le logo détouré, l'emblème de l'en-tête, l'icône et l'image de partage ; composant `src/components/layout/Logo.tsx`.

## Où sont les contenus

- Rubriques : `src/lib/rubriques.ts`
- Produits : `src/lib/catalogue/<rubrique>.ts`, réunis par `produits.ts` (106 au 29 octobre 2026)
- Top 10 : `src/lib/top10/*.ts`, réunis par `sujets.ts` (10 au 29 octobre 2026)
- Articles : `content/conseils/<slug>.md` (5 programmés du 30 octobre au 9 novembre 2026)
- Guides des rubriques : `content/rubriques/<slug>.md` (7)
- Lexique : `src/lib/lexique.ts` (18 mots)

## Liens partenaires

- **Amazon** : tag `keurdesir-21` (`src/lib/liens.ts`). Mention « En tant que Partenaire Amazon… » dans le pied de page et les pages légales.
- **Etsy via Awin** : liens profonds Awin, actifs dès que `NEXT_PUBLIC_AWIN_AFFID` et `NEXT_PUBLIC_AWIN_ETSY_MID` sont réglés.
- Chaque produit choisit ses boutiques (`boutiques: ["amazon", "etsy"]`). ASIN relevés dans `src/lib/catalogue/asins.json` (54 sur 106 au 29 octobre 2026) ; sans ASIN, le bouton mène à une recherche Amazon.

## Règle absolue de contenu

Aucun contenu sexuel, aucun produit « pour adultes », aucune image de corps dénudé (docs/REDACTION.md).
`tests/mots-interdits.test.ts` et le contrôle du site construit bloquent la publication si un mot interdit apparaît.

## À compléter à la main

- ASIN (`amazon: { asin, verifie_le }`) et annonces Etsy (`etsy: { url, boutique, verifie_le }`), après ouverture de la page.
- Identifiants Awin (variables dans `.env.example`). Blocs AdSense créés le 29 octobre 2026 (docs/PUBLICITE.md).

## Démarrage

```bash
npm install
npm run dev
```

## Scripts

| Commande | Rôle |
|---|---|
| `npm run lint` · `npm run typecheck` · `npm test` | vérifications du code et des contenus |
| `npm run build` | dates du plan du site, vignettes, export statique dans `out/` |
| `npm run test:sortie` | contrôle du site construit (h1, titres, descriptions, canoniques, JSON-LD, liens partenaires, mots interdits…) |
| `npm run verifier-produits` | ouvre chaque fiche Amazon (Mac seulement) |
| `node scripts/marque.mjs` | images de marque provisoires |

## Publication

GitHub Actions (`.github/workflows/deploy.yml`) : à chaque push sur `main` et chaque lundi, mercredi, vendredi (articles programmés),
puis IndexNow. Secrets `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` réglés dans GitHub (29 octobre 2026).

## Publicité

AdSense (compte TOA KEUR, 3 blocs créés le 29 octobre 2026, détail dans docs/PUBLICITE.md) : 1 bloc en fin de fiche produit, 1 sur les rubriques, 2 dans les articles ; aucun sur l'accueil, les Top 10,
la liste d'envies et les pages légales. Consentement par le bandeau de Google.

## État de la mise en route (29 octobre 2026)

- ✅ Plan validé, base technique prête, contrôles au vert (33 tests, 14 vérifications du site construit).
- ✅ Contenus de lancement écrits (106 produits, 10 Top 10, 7 guides, lexique, 5 articles programmés).
- ✅ Dépôt GitHub public teiki5320/keurdesir (29 octobre 2026).
- ✅ Projet Cloudflare Pages, secrets GitHub et domaine : site en ligne sur https://keurdesir.com depuis le 29 octobre 2026.

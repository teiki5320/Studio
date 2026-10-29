# Keur Foot

Le football africain pour tous les passionnés : sélections nationales, CAN, grands joueurs, classements Top 10,
boutique supporter (liens Amazon Partenaires), conseils d'achat et actus du foot africain (depuis le 27 octobre 2026,
lues en direct depuis https://teiki5320.github.io/veille/actus/keurfoot.json, voir `src/lib/veille.ts` ; depuis le 28 octobre 2026,
chaque actu a son article complet sur le site, page `/actus/<adresse>` construite 2 fois par jour, voir `scripts/articles.mts`). Un site TOA KEUR, construit sur la base technique
de Keurbook (Next.js 16 statique, Tailwind 4, données dans le code).

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Site en local sur http://localhost:3000 |
| `npm run lint`, `npm run typecheck`, `npm test` | Vérifications |
| `npm run build` | Site statique dans `out/` (génère d'abord les épingles Pinterest) |
| `npm run test:sortie` | Construit le site comme pour keurfoot.com et contrôle les pages, les titres, les liens et les épingles (`npm run test:sortie:controle` : contrôle seul, lancé par `deploy.yml` avant chaque publication) |
| `node scripts/logos.mjs` | Régénère icônes, logo et image de partage depuis `docs/brand/` |
| `npm run verifier-produits` | Sur le Mac : vérifie sur amazon.fr que chaque fiche Amazon vérifiée (`src/lib/data/produits-amazon.json`, 3 maillots au 28 octobre 2026) a encore son bouton d'achat (`-- --ecrire` pour enregistrer) |

## Publication

- **keurfoot.com** (depuis le 20 octobre 2026) : Worker de fichiers statiques Cloudflare « keurfoot » (`wrangler.jsonc`),
  publié par `.github/workflows/deploy.yml` à chaque push sur `main`, les lundis, mercredis et vendredis (conseils programmés), chaque jour à 12 h 50 et 19 h 50 (articles d'actus)
  et après le bouton « Maintenance ». Secrets GitHub nécessaires : `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` (sans eux, la publication échoue). Redirections 301 en un seul saut : `worker/index.ts`. IndexNow automatique : `.github/workflows/indexnow.yml`.
  Publication à la main depuis un Mac connecté à Cloudflare : `NEXT_PUBLIC_SITE_URL=https://keurfoot.com npm run build`, puis `npx wrangler deploy`.
  Ne pas utiliser `wrangler pages …` : la commande convertit le projet en application OpenNext et modifie les fichiers.
- **Ancienne adresse** https://teiki5320.github.io/keurfoot/ : `.github/workflows/pages.yml` y publie seulement une page
  qui redirige vers la même page sur keurfoot.com.
- AdSense : examen du site demandé le 20 octobre 2026, « En préparation » dans la console au 29 octobre 2026, aucune annonce affichée pour l'instant. Reste à faire : créer les blocs AdSense
  et renseigner `ADSENSE_SLOTS` (`src/lib/config.ts`).

## Règles

Voir `CLAUDE.md`, `docs/REDACTION.md` et `docs/CONTENU.md`.

# Keurbook — les livres des auteurs d'Afrique subsaharienne

Site en français qui présente des **livres et BD d'auteurs d'Afrique subsaharienne** (et de leur diaspora), écrits en français ou traduits : fiches livres, fiches auteurs, littérature de chaque pays et une rubrique **Conseils** (articles le lundi, le mercredi et le vendredi) et des pages **Top 10** (11 onglets). Le site ne vend rien : les boutons « Acheter sur Amazon » mènent à Amazon.fr (programme Partenaires).

- **Site** : https://keurbook.com (`www.keurbook.com` sert le même site ; adresse canonique sans www). Publié sur Cloudflare Pages (projet `keurbook`).
- **Dépôt** : https://github.com/teiki5320/keurbook.
- **Base technique** : reprise de [Keur Cook](https://github.com/teiki5320/keurcook).

**Stack** : Next.js 16 (App Router, export statique) · React 19 · TypeScript · Tailwind CSS 4 · Marked (articles Markdown). Hébergement : Cloudflare Pages (en ligne depuis le 1er octobre 2026).

Le site est **100 % statique** : pas de serveur, pas de base de données. Livres, auteurs et pays sont dans le code, les articles dans `content/conseils/` ; le build produit le dossier `out/`.

> Le **design est provisoire** (habillage neutre) : le design définitif sera fait à part. Contenu de chaque page : [`docs/CONTENU.md`](docs/CONTENU.md).

---

## Pages

| Page | Adresse |
| --- | --- |
| Accueil | `/` |
| Livres (recherche, filtres pays, genre, public, thème, époque) | `/livres`, `/livre/<slug>` |
| BD (recherche, filtres pays et public) | `/bd`, `/bd/<slug>` |
| Auteurs | `/auteurs`, `/auteur/<slug>` |
| Pays (seulement ceux qui ont au moins un livre) | `/pays`, `/pays/<slug>` |
| Conseils (lundi, mercredi et vendredi) | `/conseils`, `/conseils/<slug>` |
| Top 10 (11 onglets thématiques ; `/top-10` ouvre le premier) | `/top-10`, `/top-10/<slug>` |
| Ma pile à lire (dans le navigateur, sans compte, partageable par lien) | `/pile-a-lire` |
| Pages légales | `/mentions-legales`, `/confidentialite`, `/conditions` |

## Logo

- Originaux (1254 × 1254) : `docs/brand/` — `keurbook-logo-couleur.png` (fond blanc), `keurbook-logo-noir.png` (noir sur blanc), `keurbook-logo-nuit.png` (transparent, pour fond sombre, avec la devise).
- Utilisés sur le site : `public/brand/` (logo du pied de page, emblème de l'en-tête, logo des données structurées, image de partage 1200 × 630) et `src/app/icon.png`, `src/app/apple-icon.png` (emblème couleur).

## Où sont les contenus

| Contenu | Fichier |
| --- | --- |
| Livres | `src/lib/demo/livres-ouest.ts`, `src/lib/demo/livres-centre-est-sud.ts` |
| BD | `src/lib/demo/bd.ts` |
| Auteurs | `src/lib/demo/auteurs-*.ts` |
| Pays | `src/lib/countries.ts` |
| Thèmes, genres, publics | `src/lib/themes.ts` |
| Articles Conseils | `content/conseils/<slug>.md` (paraissent à leur date : lundi, mercredi ou vendredi) |
| Top 10 | `src/lib/top10/sujets.ts` (11 onglets) |

Règles de rédaction : [`docs/REDACTION.md`](docs/REDACTION.md). Champs exacts : `src/lib/types.ts`. Les tests (`npm test`) vérifient la cohérence : chaque auteur a un pays d'Afrique subsaharienne, chaque livre une fiche auteur, chaque lien d'article une page existante, etc.

### Amazon Partenaires

- Liens construits par `src/lib/amazon.ts` avec le tag `keurbookfr-21` (`NEXT_PUBLIC_AMAZON_TAG` pour le changer). Ce tag vient du nouveau compte Amazon Partenaires ouvert le 18 octobre 2026 (l'ancien compte a été fermé par Amazon).
- Si le champ `amazonAsin` d'un livre est rempli (ASIN vérifié sur Amazon.fr), le bouton mène à la fiche ; sinon à une **recherche Amazon** (ISBN, ou titre + auteur, rayon Livres).
- `priceCents` : prix indicatif relevé à la main (affiché seulement s'il est rempli).
- Mention obligatoire dans le pied de page et les pages légales.

### À compléter à la main

- `amazonAsin` et `priceCents` de chaque livre (depuis Amazon Partenaires).
- Couvertures (`public/covers/<slug>.webp`, champ `cover`) : uniquement via les outils Amazon Partenaires ou fournies par les éditeurs.
- Photos d'auteurs (`photo`, `photoCredit`) : uniquement libres de droits.

---

## Démarrage

Prérequis : Node.js ≥ 20.9.

```bash
npm install
npm run dev
```

Ouvrez http://localhost:3000. Variables facultatives : `cp .env.example .env.local`.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build statique (dossier `out/`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification des types |
| `npm test` | Tests des contenus et des articles |

## Publication

Même fonctionnement que Keur Cook : le workflow `.github/workflows/deploy.yml` vérifie, construit et publie sur Cloudflare Pages (projet `keurbook`) à chaque push sur `main`, chaque lundi, mercredi et vendredi (articles programmés) et à la main. Il ne publie que si les secrets GitHub `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` sont présents. Le workflow « Maintenance » met le site en pause ou le rouvre (`content/maintenance.json`).

**IndexNow (Bing, Yandex, Seznam…)** : le workflow `.github/workflows/indexnow.yml` lit le sitemap publié et signale toutes ses pages, chaque lundi à 2 h UTC et à la demande (onglet Actions → « IndexNow » → « Run workflow »). En local : `node scripts/indexnow.mjs`. La clé, publique par conception, est dans `public/86e162766f5615ec8020869f4b66761d.txt` et dans le script.

### Publicité (Google AdSense)

- Compte AdSense `pub-2680784147246798` (comptes de gestion sur `admin@toakeur.com`). Le script est chargé sur les pages (`src/app/layout.tsx`, identifiant dans `src/lib/config.ts`) et `public/ads.txt` est publié.
- **Le site n'est pas encore validé par Google** : première demande le 12 octobre 2026, refusée le 21 octobre (contenu jugé trop mince) ; fiches rallongées, nouvel examen demandé le 22 octobre 2026 (état à vérifier dans la console). Aucune annonce ne s'affiche tant que Google n'a pas validé le site. Détail : [`docs/PUBLICITE.md`](docs/PUBLICITE.md).

### État de la mise en route

Tout est en place : site publié sur Cloudflare Pages et relié au domaine `keurbook.com`, secrets Cloudflare dans GitHub, tag Amazon `keurbookfr-21`, adresse de contact `keurbook@toakeur.com`, informations légales (éditeur : ALOHASH, variables `NEXT_PUBLIC_LEGAL_*`). Reste à attendre la validation AdSense.

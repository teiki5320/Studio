# Keur Bible — objets chrétiens pour la maison et à offrir

Boutique-guide en français d'**objets chrétiens pour la maison et à offrir** : Bibles, croix et crucifix, chapelets et objets de prière, art chrétien (dont l'**art chrétien afro** : Jésus noir, Vierge noire, crèches africaines, croix éthiopiennes), statues, crèches et Noël, livres et coloriages, avec des idées de cadeaux par occasion, 10 pages **Top 10**, 12 **Psaumes** (carrousel de l'accueil), des articles **Conseils** (lundi, mercredi, vendredi) et les **actus** de la culture chrétienne en Afrique. Pour les chrétiens francophones de toutes les Églises, en priorité la diaspora africaine en France. Le site ne vend rien : les boutons « Voir sur Amazon » mènent à Amazon.fr (programme Partenaires).

- **Site** : https://keurbible.com, en ligne depuis le 29 octobre 2026 (`www.keurbible.com` redirige vers elle en 301 ; adresse canonique sans www). Publié sur Cloudflare Pages (projet `keurbible`).
- **Dépôt** : https://github.com/teiki5320/keurbible (public, branche `main` uniquement).
- **Base technique** : reprise de [Keurbook](https://github.com/teiki5320/keurbook) (code et structure seulement, aucun contenu).

**Stack** : Next.js 16 (App Router, export statique) · React 19 · TypeScript · Tailwind CSS 4 · Marked (articles Markdown). Hébergement : Cloudflare Pages (projet `keurbible`, en ligne depuis le 29 octobre 2026).

Le site est **100 % statique** : pas de serveur, pas de base de données. Tous les contenus sont dans le code ; le build produit le dossier `out/`.

> **Design « Lumière »** (en place depuis le 29 octobre 2026, à la place du design provisoire clair) : fond nuit presque noir, or et ambre du logo, titres en Cinzel, texte en Mulish. Accueil : orbe de lumière entouré d'un nuage de points qui passe tout seul de la sphère à la carte de l'Afrique puis à la croix (`src/components/accueil/HeroLumiere.tsx`), Psaume du jour qui change toutes les 7 secondes (`src/components/psaumes/PsaumeDuJour.tsx`), apparitions au défilement et effets de survol (classes `kb-…` de `src/app/globals.css`). Contenu de chaque page : [`docs/CONTENU.md`](docs/CONTENU.md).

## Logo

- Originaux de Jean (1254 × 1254, l'Afrique lumineuse et la croix) : `docs/logos/` — `keurbible-logo-fond-blanc.png`, `keurbible-logo-fond-noir.png`, `keurbible-logo-transparent.png` (pour fond sombre), `keurbible-icone-sans-texte.png` (1024 × 1024) ; premières versions dans `docs/logos/originaux/`.
- Utilisés sur le site (`npm run marque`, qui les produit depuis `docs/logos/`) : `public/brand/keurbible-embleme.webp` (en-tête), `public/brand/keurbible-logo.webp` (pied de page), `public/brand/keurbible-logo.png` (données structurées), `public/brand/keurbible-partage.jpg` (image de partage 1200 × 630), `src/app/icon.png` et `src/app/apple-icon.png`.

---

## Pages

| Page | Adresse |
| --- | --- |
| Accueil (accroche, carrousel des 12 Psaumes, coups de cœur (n° 1 des Top 10), rubriques, art afro, occasions, Top 10, conseils, actus ; aucun lien Amazon) | `/` |
| 7 rubriques et 31 sous-rubriques (objets, filtre « Pour quelle tradition ? ») | `/<rubrique>`, `/<rubrique>/<sous-rubrique>` |
| Cadeaux par occasion (10 occasions) | `/cadeaux`, `/cadeaux/<occasion>` |
| Art chrétien afro (page phare) | `/afro` |
| Top 10 (10 onglets ; `/top-10` ouvre le premier) | `/top-10`, `/top-10/<slug>` |
| Psaumes (12, Louis Segond 1910, numérotation « 23 (22) ») | `/psaumes`, `/psaumes/<slug>` |
| Conseils (lundi, mercredi et vendredi) | `/conseils`, `/conseils/<slug>` |
| Actus (lues en direct depuis la veille) | `/actus`, `/actus/<adresse>`, `/actus/article?id=<id>` |
| Ma liste d'envies (dans le navigateur, sans compte, partageable ; non indexée) | `/ma-liste` |
| Notre démarche, pages légales | `/notre-demarche`, `/mentions-legales`, `/confidentialite`, `/conditions` |

## Où sont les contenus

| Contenu | Fichier |
| --- | --- |
| Plan du site (adresses fixes) | `src/lib/contenus/plan.ts` |
| Rubriques, sous-rubriques et objets (178) | `src/lib/contenus/rubriques/<rubrique>.ts` |
| Occasions | `src/lib/contenus/occasions.ts` |
| Top 10 | `src/lib/contenus/top10/<slug>.ts` (ordre des onglets : `PLAN_TOP10`) |
| Psaumes | `src/lib/contenus/psaumes.ts` |
| Articles Conseils | `content/conseils/<slug>.md` (paraissent à leur date) |
| ASIN vérifiés | `src/lib/contenus/amazon-asins.json` |
| Actus | lues dans le navigateur depuis `https://teiki5320.github.io/veille/actus/keurbible.json` (Keur Bible est dans la tâche de veille depuis le 29 octobre 2026) ; `public/veille/entites.json` (rubriques et occasions, tags `rubrique:<slug>` et `occasion:<slug>`) est généré au build |

Règles de rédaction : [`docs/REDACTION.md`](docs/REDACTION.md). Champs exacts : `src/lib/types.ts`. Les tests (`npm test`) vérifient la cohérence : plan suivi, chaque objet dans une sous-rubrique, 10 objets existants par Top 10, longueurs, liens internes, double numérotation des Psaumes, etc.

### Amazon Partenaires

- Liens construits par `src/lib/amazon.ts` avec le tag `keurbible-21` (`NEXT_PUBLIC_AMAZON_TAG` pour le changer). Code de suivi par emplacement (rubrique, occasion, top, conseil) : table unique `AMAZON_TAGS` (tous à `keurbible-21` pour l'instant).
- Si l'objet a un ASIN vérifié (`src/lib/contenus/amazon-asins.json` : fiche ouverte, titre conforme, bouton d'achat présent, date de vérification), le bouton mène à la fiche ; sinon à une **recherche Amazon** avec les mots de l'objet (rayon Livres pour les Bibles et les livres). Au 31 octobre 2026 : 55 ASIN vérifiés, tous pour des objets des Top 10 (55 sur 90 ; 56 au 29 octobre, la statue de la Vierge de la médaille miraculeuse est revenue à la recherche le 31 octobre) ; les 123 autres objets ouvrent une recherche. L'art chrétien afro artisanal (crèches en wax, Vierges noires sculptées, croix éthiopiennes) est rare sur Amazon : 2 objets sur 10 du Top 10 afro ont un lien direct.
- Recherche de produits : `npm run chercher-produits` (relève les premiers résultats Amazon dans `.amazon/candidats.json`, rien n'est choisi automatiquement) ; vérification : `npm run verifier-produits -- --ecrire --ajouter .amazon/choix.json` (ajout d'ASIN choisis) ou `npm run verifier-produits -- --ecrire --lot 30` (contrôle des liens déjà vérifiés). À lancer sur le Mac (Chrome + Playwright) ; le script s'arrête de lui-même si Amazon demande un captcha.
- Aucun prix affiché. Mention obligatoire dans le pied de page et les pages légales.

### Publicité (Google AdSense)

- Même compte AdSense que Keurbook (`pub-2680784147246798`) : script chargé sur les pages, `public/ads.txt` publié. Site ajouté dans AdSense et propriété validée le 29 octobre 2026, bandeau de consentement européen publié, blocs « Keur Bible - Page rubrique » (6721406659) et « Keur Bible - Article conseil » (1239521829) créés le même jour. Examen du site demandé le 29 octobre 2026, toujours « En préparation » (vérifié dans la console le 31 octobre 2026) : aucune annonce ne s'affiche avant la validation.
- Emplacements prévus : 1 en bas des rubriques, sous-rubriques et occasions ; 2 dans les articles Conseils, 1 en fin d'article d'actu. Aucune sur l'accueil, les Top 10, les Psaumes, la liste d'envies et les pages légales.

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
| `npm test` | Tests des contenus, des conseils, des liens Amazon et de la veille |
| `npm run test:sortie` | Contrôle du site construit (`out/`), après `npm run build` |
| `npm run marque` | Régénère les icônes et l'image de partage depuis l'emblème |

## Publication

Même fonctionnement que Keurbook : le workflow `.github/workflows/deploy.yml` vérifie, construit, contrôle le site construit et publie sur Cloudflare Pages (projet `keurbible`, créé à la première publication s'il n'existe pas) à chaque push sur `main`, chaque lundi, mercredi et vendredi (articles programmés), deux fois par jour après la veille actus et à la main. Il échoue (en rouge) si les secrets GitHub `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` manquent, puis vérifie que `https://keurbible.com/version.txt` sert la nouvelle version. Le workflow « Maintenance » met le site en pause ou le rouvre (`content/maintenance.json`). `indexnow.yml` signale le sitemap à Bing et aux autres moteurs IndexNow après chaque publication et chaque lundi.

**Dates du plan du site** : `src/lib/lastmod.json`, mis à jour tout seul avant chaque construction (`prebuild` → `scripts/lastmod.mjs`).

### État de la mise en route (29 octobre 2026)

- Fait : code, contenus de lancement (7 rubriques, 31 sous-rubriques, 178 objets, 10 occasions, 10 Top 10, 12 Psaumes, 8 articles Conseils au lancement ; 24 articles ajoutés le 29 octobre 2026, soit 32 au total : 6 publiés au 31 octobre 2026, 26 programmés lundi, mercredi et vendredi jusqu'au 30 décembre 2026), tests, workflows, tag Amazon `keurbible-21`, 56 liens Amazon directs vérifiés, veille actus branchée (dépôt `teiki5320/veille`, 15 flux).
- Fait le 29 octobre 2026 : secrets `CLOUDFLARE_API_TOKEN` (jeton « Keur Bible - publication GitHub », Cloudflare Pages en modification) et `CLOUDFLARE_ACCOUNT_ID` dans le dépôt, projet Pages `keurbible` créé par la première publication, domaines `keurbible.com` et `www.keurbible.com` reliés, règle de redirection Cloudflare de www vers l'adresse sans www (301, chaîne de requête conservée). Adresse de contact `keurbible@toakeur.com` confirmée par Jean.
- Search Console : propriété de domaine créée et sitemap lu par Google le 29 octobre 2026 (85 pages découvertes).
- Bing Webmaster Tools : site vérifié (balise `msvalidate.01`, `BING_VERIFICATION` dans `src/lib/config.ts`) et sitemap envoyé le 29 octobre 2026.
- Cloudflare : règle de cache « Pages HTML en cache 10 min » (comme Keurbook) et Web Analytics (sans cookie, configuration automatique) depuis le 29 octobre 2026.
- Images des objets : 159 illustrations créées par IA (OpenArt, Kling 3 Omni, et GPT Image 2 pour 3 reprises) pour 159 des 178 objets, le 29 octobre 2026, dans `public/objets/` ; méthode et état : [`docs/IMAGES.md`](docs/IMAGES.md). Affichées en haut des cartes objets et dans les Top 10 depuis le 29 octobre 2026, avec la mention « Illustration créée par IA ».
- Studio : Keur Bible ajouté le 29 octobre 2026 aux routines Fiches du jour, Point du matin et Sites du jour (articles, référencement le dimanche des semaines paires, vérification des liens Amazon) et au code du Studio (Indexation, Planning).
- Amazon Partenaires et AdSense : keurbible.com déclaré sur les deux comptes (vérifié le 29 octobre 2026), blocs d'annonces créés et branchés ; examen AdSense demandé le 29 octobre 2026, toujours « En préparation » (vérifié le 31 octobre 2026).
- Ensuite : épingles Pinterest, ASIN des autres objets.

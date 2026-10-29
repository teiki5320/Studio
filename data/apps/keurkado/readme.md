# Keur Kado — les idées cadeaux africains

Site en français d'**idées cadeaux africains pour la diaspora africaine en France** : par occasion (Tabaski, Korité, Noël, mariage, baptême…), par destinataire, par budget et par univers (wax, bijoux, beauté afro, déco, jeux), avec un quiz « Trouve le cadeau », des Top 10, une rubrique Conseils et un calendrier des fêtes africaines. Le site ne vend rien : les boutons « Voir sur Amazon » mènent à Amazon.fr (programme Partenaires, tag `keurkadofr-21`).

- **Site** : https://keurkado.com — Worker Cloudflare « keurkado » (`wrangler.jsonc`), comme Keur Foot : fichiers statiques de `out/` et petit script `worker/index.ts` qui redirige en 301 http, www et les adresses sans barre finale. Voir `docs/DEPLOIEMENT.md`.
- **Dépôt** : https://github.com/teiki5320/keurkado (branche `main` uniquement).
- **Base technique** : reprise de [Keurbook](https://github.com/teiki5320/keurbook) ; épingles Pinterest à la manière de Keur Déco.

**Stack** : Next.js 16 (App Router, export statique) · React 19 · TypeScript · Tailwind CSS 4 · Marked (articles Markdown) · sharp (épingles). 100 % statique : pas de serveur, pas de base de données.

## Démarrer

```bash
npm install
npm run epingles   # épingles Pinterest et image de partage (public/epingles/), utiles aussi en développement
npm run dev        # http://localhost:3000
npm run build      # épingles + site statique dans out/
npm test           # cohérence des contenus
npm run test:sortie  # après npm run build : contrôle du HTML de chaque page (aussi avant chaque publication)
```

## Pages

| Page | Adresse |
| --- | --- |
| Accueil (en haut : 8 cadeaux illustrés du Top 10 de la prochaine fête, liens internes seulement) | `/` |
| Quiz « Trouve le cadeau » (occasion → personne → budget) | `/quiz` (`?occasion=…&pour=…&budget=…&voyage=1`) |
| Par occasion, destinataire, budget, univers | `/occasion/<slug>`, `/pour/<slug>`, `/budget/<slug>`, `/univers/<slug>` |
| Livres et cuisine (rubriques comme les autres, avec leurs produits ; plus aucun renvoi vers un autre site du groupe depuis le 28 octobre 2026) | `/univers/livres`, `/univers/cuisine` |
| Cadeaux à envoyer au pays | `/envoyer-au-pays` |
| Top 10 (+ épingle Pinterest) | `/top`, `/top/<slug>` |
| Conseils | `/conseils`, `/conseils/<slug>` |
| Calendrier des fêtes africaines | `/calendrier` |
| Pages légales | `/mentions-legales`, `/confidentialite`, `/conditions` |

## Où sont les contenus

| Contenu | Fichier |
| --- | --- |
| Occasions, destinataires, budgets, univers | `src/lib/taxonomie.ts` |
| Catalogue des idées cadeaux | `src/lib/catalogue/<univers>.ts` |
| Top 10 | `src/lib/tops/<slug>.ts` (liste et ordre : `src/lib/tops/index.ts`) |
| Articles Conseils | `content/conseils/<slug>.md` |
| Calendrier des fêtes | `src/lib/calendrier.ts` |

Règles de rédaction : [`docs/REDACTION.md`](docs/REDACTION.md). Pinterest : [`docs/PINTEREST.md`](docs/PINTEREST.md) (21 épingles programmées à la main à partir du 21 octobre 2026 ; publication automatique par l'API, même système que Keur Déco, en place depuis le 23 octobre 2026, clé du compte créée le même jour ; à refaire vers mi-décembre : `npm run pinterest:auth` puis `npm run pinterest:secrets`). Déploiement : [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md).

## Amazon Partenaires

- Liens construits par `src/lib/amazon.ts` avec le tag `keurkadofr-21` (`NEXT_PUBLIC_AMAZON_TAG` pour le changer). Le code de suivi se choisit selon l'emplacement du lien dans la table `CODES_SUIVI` (top, rubrique, conseil, quiz) ; pour l'instant, tous gardent `keurkadofr-21`.
- Si `amazonAsin` est rempli (ASIN vérifié sur Amazon.fr), le bouton mène à la fiche ; sinon à une **recherche Amazon** (champ `recherche`, rayon `rayon`).
- `amazonAsin` : relevé à la main sur Amazon.fr (produit non sponsorisé, bien noté, fidèle à la description et à la tranche de budget). 58 produits sur 98 en ont un au 28 octobre 2026 au soir (56 le matin, 53 sur 95 le 21 octobre) ; les autres mènent volontairement à une recherche.
- Disponibilité : `npm run verifier-produits -- --ecrire` (sur le Mac, avec Chrome ; `--lot 20` pour un petit lot) vérifie que chaque fiche Amazon a encore son bouton d'achat et l'inscrit dans `src/lib/catalogue/verifications.json` ; une fiche indisponible masque le produit jusqu'à son remplacement.
- `priceCents` : **jamais saisi à la main** (règle du programme Partenaires : un prix affiché doit venir de l'API Amazon et être rafraîchi toutes les 24 h). Tant qu'il est vide, on affiche la tranche de budget ; la conversion en FCFA n'apparaît qu'avec un vrai prix.
- Mention obligatoire dans le pied de page et les pages légales.

## Publicité et cookies

Même fonctionnement que Keurbook : code AdSense (même identifiant d'éditeur, `public/ads.txt`), chargé après l'affichage de la page (`src/components/ads/AdsenseScript.tsx`), et bandeau de consentement de Google, lien « Gérer mes cookies » dans le pied de page. Examen du site par AdSense demandé le 20 octobre 2026 (« En préparation » dans la console au 28 octobre 2026) : aucune annonce affichée pour l'instant, et les blocs d'annonces restent à créer (voir `docs/DEPLOIEMENT.md`).

## Logo

- Originaux : `docs/brand/` — `keurkado-logo-fond-blanc.png`, `keurkado-logo-transparent.png` (et la planche des propositions).
- `npm run visuels-marque` en tire toutes les versions du site (versionnées) : logo du pied de page et des données structurées (`public/brand/keurkado-logo.*`), paquet cadeau seul de l'en-tête (`public/brand/keurkado-embleme.webp`) et des épingles (`assets/marque/embleme.png`), icônes `src/app/icon.png` et `src/app/apple-icon.png`.
- L'image de partage (`public/brand/keurkado-partage.jpg`) et les épingles sont refaites à chaque build.

# MARKETING — plan marketing & rémunération

Mis à jour le 29 octobre 2026. Un canal n'est coché que s'il est prouvé (compte branché et
publications réelles, ou routine qui publie).

## Positionnement

- **Angle** : le football africain pour tous les passionnés, en français : les 54 sélections, la
  CAN, les grands joueurs, des classements Top 10 et l'équipement de supporter.
- **Publics** : les supporters des sélections africaines, la diaspora francophone, les amateurs de
  football et ceux qui cherchent un maillot ou un cadeau.
- **Différenciation** : des fiches écrites par nous et sourcées (rien d'inventé, statistiques
  datées), sans logo officiel ni photo de joueur, avec des illustrations originales.

## Rémunération par phases

- [fait] **Aujourd'hui** : affiliation Amazon Partenaires (tag `keurfootfr-21`) sur la boutique et les fiches ; le site ne vend rien.
- [en cours] **Examen AdSense** : demandé le 20 octobre ; « En préparation » dans la console AdSense, ni validé ni refusé (vérifié le 29 octobre 2026).
- **Blocs d'annonces** : créer les blocs AdSense et renseigner leurs identifiants pour afficher les 7 emplacements prévus.
- **Liens Amazon directs** : 3 maillots en fiche produit vérifiée depuis le 28 octobre 2026 (Maroc, Nigeria, Tunisie, vendus par Amazon) ; les autres grands pays n'ont pas de fiche fidèle vendue par Amazon, ils gardent la recherche.
- **Codes de suivi par type de page** : la table est prête (`AMAZON_TAGS` dans `src/lib/amazon.ts`) ; tous les emplacements utilisent encore `keurfootfr-21` en attendant que Jean crée les codes dans la console.
- **Partenariats** : équipementiers ou boutiques de supporters, une fois l'audience mesurée.

## Points forts

- 🌍 **Toute l'Afrique** : les 54 sélections nationales ont leur fiche, classées par région, avec leur palmarès.
- 🏆 **Top 10 et légendes** : 10 classements et 15 fiches joueurs, avec 9 épingles Pinterest déjà prêtes.
- 🗞️ **Actus** : depuis le 27 octobre 2026, les actus du foot africain résumées en français 2 fois par jour, sur l'accueil, la page /actus et les fiches sélection, chacune avec le lien vers sa source ; depuis le 28 octobre 2026, un toucher sur une actu ouvre son article complet (300 à 450 mots) sur sa propre page du site, que Google peut trouver.
- 🎨 **Images maison** : illustrations originales sans logo ni visage, qui évitent tout souci de droits ; depuis le 27 octobre 2026, les conseils sans illustration ont une photo libre créditée (Wikimedia, Openverse) ou une carte aux couleurs du site.

## Canaux

- ✅ Site en ligne sur `keurfoot.com` depuis le 20 octobre 2026.
- ✅ Contenu régulier : articles Conseils publiés automatiquement le lundi, le mercredi et le
  vendredi (9 publiés et 24 programmés jusqu'au 23 décembre 2026, au 29 octobre 2026).
- ✅ Référencement naturel : propriété keurfoot.com vérifiée dans la Search Console, sitemap envoyé
  le 20 octobre 2026 et relu par Google le 28 octobre (139 pages découvertes) ; 101 pages dans l'index de Google
  (rapport Indexation daté du 23 octobre, lu le 29 octobre 2026) ; Google montre déjà des pages joueurs ; signalement IndexNow
  (Bing…) par `scripts/indexnow.mjs` depuis le 24 octobre 2026, automatique depuis le 28 octobre 2026
  (après chaque publication et chaque lundi) ; site validé dans Bing Webmaster
  Tools (balise `msvalidate.01`) et sitemap envoyé à Bing le 28 octobre 2026 ; suivi dans
  `docs/referencement.md`.
- ✅ Rubrique Actus : page `/actus` (dans le menu) et blocs sur l'accueil et les fiches sélection
  depuis le 27 octobre 2026, mis à jour automatiquement à 12 h et 19 h ; depuis le 28 octobre 2026,
  chaque actu a son article complet sur sa propre page `/actus/<adresse>`, construite à 12 h 50 et
  19 h 50, dans le sitemap et visible par Google (45 articles au 29 octobre 2026).
- ⬜ Pinterest : 9 épingles et leurs textes prêts (docs/pinterest-epingles.md), mais aucun compte
  Keur Foot branché au Studio et aucune publication constatée.
- ⬜ TikTok, YouTube, Instagram : aucun compte Keur Foot.
- ⬜ Newsletter : aucune.
- ⬜ Mesure d'audience : la politique de sécurité autorise Cloudflare Web Analytics, mais aucune
  balise n'est constatée sur le site le 29 octobre 2026.

## Mesures

- **Adresses dans le sitemap** : 145 au 29 octobre 2026 (100 fixes, dont la page Actus, et 45 articles d'actus)
- **Pages indexées par Google** : 101 (rapport Indexation de la Search Console daté du 23 octobre, lu le 29 octobre 2026)
- **Articles Conseils** : 9 publiés, 24 programmés jusqu'au 23 décembre 2026 (29 octobre 2026)
- **Liens Amazon directs** : 3 sélections sur 54 (Maroc, Nigeria, Tunisie) depuis le 28 octobre 2026 ; avant : aucune
- **Pages de contenu avec un produit Amazon** : toutes les fiches sélection, les 9 Top 10 et les 15 fiches joueurs depuis le 28 octobre 2026 (Top 10 et joueurs : aucun avant) ; l'accueil n'a aucun bouton Amazon
- **Visites** : à instrumenter
- **Clics et revenus Amazon** : à vérifier dans la console
- **Revenus AdSense** : aucun (aucun bloc d'annonces en place)

## Les 3 priorités

- Ouvrir un compte Pinterest Keur Foot, le brancher au Planning du Studio et publier les
  9 épingles déjà prêtes.
- Brancher une mesure d'audience (Cloudflare Web Analytics, déjà permise par la politique de sécurité)
  pour savoir quelles pages attirent et rapportent : aucune balise sur le site au 29 octobre 2026.
- Décider du sort des articles d'actus pendant l'examen AdSense : les enrichir, ou les sortir de
  l'index le temps de l'examen (risque « contenu à faible valeur », audit du 28 octobre 2026).

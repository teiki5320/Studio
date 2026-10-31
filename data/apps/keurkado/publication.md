# PUBLICATION — état de la mise en ligne

> Mis à jour le 31 octobre 2026, d'après le site en ligne, la Search Console et les exécutions GitHub Actions.
>
> Aucun secret ici — uniquement des références.

## En bref

- **Production** : en ligne sur keurkado.com depuis le 20 octobre 2026
- **Domaine & SSL** : Cloudflare, certificat valide jusqu'au 18 janvier 2027, renouvelé seul
- **Visibilité** : 61 pages indexées par Google sur 63 envoyées (vérifié le 31 octobre 2026)
- **Contact** : keurkado@toakeur.com

## Boutiques

| | 🌐 Site |
|---|---|
| État | [ok] En ligne, réponse 200 |
| Hébergement | [ok] Worker Cloudflare « keurkado » (fichiers statiques et redirections 301) |
| Domaine | [ok] keurkado.com ; http et www redirigent en 301 depuis le 28 octobre 2026 |
| SSL | [ok] Certificat Cloudflare, HSTS actif |
| Indexation | [ok] 61 / 63 pages indexées par Google (31 octobre 2026) |
| Mesure d'audience | [pas encore] Aucune mesure sur le site |

## Ce qui reste, dans l'ordre

1. ✅ **Mise en ligne** : site publié sur keurkado.com par Cloudflare le 20 octobre 2026.
2. ✅ **Ancienne adresse** : teiki5320.github.io/keurkado renvoie vers keurkado.com.
3. ✅ **Search Console** : propriété keurkado.com, sitemap envoyé le 20 octobre 2026.
4. ✅ **Amazon Partenaires** : keurkado.com déclaré dans les sites du compte, vérifié par Jean le 28 octobre 2026.
5. **Publicité** : site ajouté dans AdSense, examen demandé le 20 octobre 2026, « En préparation » au 31 octobre 2026 ; créer les blocs d'annonces et attendre la validation.
6. **Indexation complète** : faire entrer dans Google les deux dernières pages encore absentes (61 sur 63 au 31 octobre 2026).
7. ✅ **Pinterest** : compte Keur Kado créé, domaine revendiqué, 21 épingles programmées dans Pinterest (une par jour à partir du 21 octobre 2026). Publication automatique par l'API en place depuis le 23 octobre 2026, clé du compte créée le même jour (`docs/PINTEREST.md`).
8. ✅ **Carte sur toakeur.com** : la carte Keur Kado mène à https://keurkado.com (vérifié le 28 octobre 2026).

## Web · Production

| | |
|---|---|
| Adresse | **En ligne** sur https://keurkado.com (vérifié le 31 octobre 2026 : réponse 200) |
| Hébergeur | Cloudflare, Worker `keurkado` (fichiers statiques et script de redirections), workflow `deploy.yml` |
| Dernière publication | 31 octobre 2026 (4 h 30 UTC, après un envoi sur main), publication réussie |
| Mise en ligne | 20 octobre 2026 |
| Dépôt | https://github.com/teiki5320/keurkado |
| Taille publiée | 63 adresses dans le sitemap, dont 6 articles Conseils |
| Contact affiché | `keurkado@toakeur.com` |

## Domaine & SSL

- **Domaine** : `keurkado.com` (adresse canonique), enregistré le 20 octobre 2026, échéance le
  20 octobre 2027 ; `www.keurkado.com` redirige en 301 vers keurkado.com depuis le 28 octobre 2026
  (du 20 au 28 octobre, il servait les mêmes pages avec l'adresse canonique sans www).
- **Registraire et DNS** : Cloudflare.
- **SSL** : certificat fourni et renouvelé par Cloudflare (valide jusqu'au 18 janvier 2027) ;
  HSTS activé dans `public/_headers`.
- **Ancienne adresse** : `https://teiki5320.github.io/keurkado/` ne sert plus qu'une page de
  redirection vers keurkado.com (`noindex`).

## Visibilité

- **Sitemap** : https://keurkado.com/sitemap.xml répond (63 adresses, dont 6 articles Conseils, vérifié le 31 octobre 2026) ; `robots.txt` répond. Depuis le
  28 octobre 2026, la date des rubriques, du quiz et des pages fixes est celle du dernier commit de leurs
  fichiers (plus de date à changer à la main) ; Top 10 et conseils gardent leur champ « maj ».
- **Google Search Console** : propriété de domaine `keurkado.com`, sitemap envoyé et lu le
  20 octobre 2026, sans erreur, relu le 23 octobre. Sitemap renvoyé le 28 octobre 2026, relu le 30 octobre (63 adresses). Au 31 octobre 2026 (vérifié dans la console) : 61 pages
  indexées sur 63, 2 pas encore (inconnues de Google), aucune refusée ; 61 sur 62 le 30 octobre, et seulement 9 sur 61 au 21 octobre.
- **Bing et autres moteurs (IndexNow)** : depuis le 25 octobre 2026, `node scripts/indexnow.mjs`
  (lancé par GitHub depuis le 28 octobre 2026 : `.github/workflows/indexnow.yml`, après chaque publication
  réussie sur main et chaque lundi) signale les pages du sitemap à Bing, DuckDuckGo, Ecosia et Yandex (clé publique servie à la
  racine du site). Bing Webmaster Tools : site ajouté le 28 octobre 2026, vérifié par la balise
  `msvalidate.01` du layout, sitemap envoyé le même jour. Journal du référencement page par page :
  `docs/referencement.md`.
- **Pinterest** : compte Keur Kado créé, domaine revendiqué (balise publiée sur le site) ;
  21 épingles programmées dans Pinterest, une par jour à partir du 21 octobre 2026. Publication
  automatique (`.github/workflows/pinterest.yml`, chaque jour à 4 h 17 UTC, 5 épingles au plus) en
  place depuis le 23 octobre 2026 ; secrets `PINTEREST_*` créés le même jour, connexion au compte
  réussie chaque jour du 24 au 31 octobre 2026 (aucune épingle de plus à publier : les 21 sont déjà programmées).
- **Mesure d'audience** : aucune (la page Confidentialité l'indique).
- **Publicité** : script AdSense chargé après l'affichage de la page (depuis le 28 octobre 2026), `https://keurkado.com/ads.txt` répond ; aucun bloc
  d'annonce créé ; examen du site demandé le 20 octobre 2026, « En préparation » dans la console AdSense, ni validé ni refusé (vérifié le 31 octobre 2026) ; la console y affiche
  encore `ads.txt` « Introuvable » alors que le fichier répond (200) : elle ne l'a pas revérifié ; aucune
  annonce affichée pour l'instant.

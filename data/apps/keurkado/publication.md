# PUBLICATION — état de la mise en ligne

> Mis à jour le 28 octobre 2026, d'après le site en ligne, la Search Console et les exécutions GitHub Actions.
>
> Aucun secret ici — uniquement des références.

## En bref

- **Production** : en ligne sur keurkado.com depuis le 20 octobre 2026
- **Domaine & SSL** : Cloudflare, certificat valide jusqu'au 18 janvier 2027, renouvelé seul
- **Visibilité** : 61 pages indexées par Google sur 62 (relevé du 27 octobre 2026)
- **Contact** : keurkado@toakeur.com

## Boutiques

| | 🌐 Site |
|---|---|
| État | [ok] En ligne, réponse 200 |
| Hébergement | [ok] Worker de fichiers statiques Cloudflare « keurkado » |
| Domaine | [ok] keurkado.com, www sert les mêmes pages |
| SSL | [ok] Certificat Cloudflare, HSTS actif |
| Indexation | [ok] 61 / 62 pages indexées par Google (27 octobre 2026) |
| Mesure d'audience | [pas encore] Aucune mesure sur le site |

## Ce qui reste, dans l'ordre

1. ✅ **Mise en ligne** : site publié sur keurkado.com par Cloudflare le 20 octobre 2026.
2. ✅ **Ancienne adresse** : teiki5320.github.io/keurkado renvoie vers keurkado.com.
3. ✅ **Search Console** : propriété keurkado.com, sitemap envoyé le 20 octobre 2026.
4. **Amazon Partenaires** : déclarer keurkado.com dans les sites du compte (à vérifier dans la console).
5. **Publicité** : site ajouté dans AdSense, examen demandé le 20 octobre 2026, « En préparation » au 28 octobre 2026 ; créer les blocs d'annonces et attendre la validation.
6. **Indexation complète** : faire entrer dans Google la dernière page encore absente (61 sur 62 au 27 octobre 2026).
7. ✅ **Pinterest** : compte Keur Kado créé, domaine revendiqué, 21 épingles programmées dans Pinterest (une par jour à partir du 21 octobre 2026). Publication automatique par l'API en place depuis le 23 octobre 2026, clé du compte créée le même jour (`docs/PINTEREST.md`).
8. ✅ **Carte sur toakeur.com** : la carte Keur Kado mène à https://keurkado.com (vérifié le 28 octobre 2026).

## Web · Production

| | |
|---|---|
| Adresse | **En ligne** sur https://keurkado.com (vérifié le 28 octobre 2026 : réponse 200) |
| Hébergeur | Cloudflare, Worker de fichiers statiques `keurkado`, workflow `deploy.yml` |
| Dernière publication | 28 octobre 2026 (2 h 20 UTC, republication programmée du mercredi), publication réussie |
| Mise en ligne | 20 octobre 2026 |
| Dépôt | https://github.com/teiki5320/keurkado |
| Taille publiée | 62 adresses dans le sitemap |
| Contact affiché | `keurkado@toakeur.com` |

## Domaine & SSL

- **Domaine** : `keurkado.com` (adresse canonique), enregistré le 20 octobre 2026, échéance le
  20 octobre 2027 ; `www.keurkado.com` sert les mêmes pages avec l'adresse canonique sans www.
- **Registraire et DNS** : Cloudflare.
- **SSL** : certificat fourni et renouvelé par Cloudflare (valide jusqu'au 18 janvier 2027) ;
  HSTS activé dans `public/_headers`.
- **Ancienne adresse** : `https://teiki5320.github.io/keurkado/` ne sert plus qu'une page de
  redirection vers keurkado.com (`noindex`).

## Visibilité

- **Sitemap** : https://keurkado.com/sitemap.xml répond (62 adresses) ; `robots.txt` répond.
- **Google Search Console** : propriété de domaine `keurkado.com`, sitemap envoyé et lu le
  20 octobre 2026, sans erreur, relu le 23 octobre. Au 27 octobre 2026 (relevé du Studio) : 61 pages
  indexées sur 62, 1 pas encore (inconnue de Google) ; il n'y en avait que 9 sur 61 au 21 octobre.
- **Bing et autres moteurs (IndexNow)** : depuis le 25 octobre 2026, `node scripts/indexnow.mjs`
  signale les pages du sitemap à Bing, DuckDuckGo, Ecosia et Yandex (clé publique servie à la
  racine du site). Journal du référencement page par page : `docs/referencement.md`.
- **Pinterest** : compte Keur Kado créé, domaine revendiqué (balise publiée sur le site) ;
  21 épingles programmées dans Pinterest, une par jour à partir du 21 octobre 2026. Publication
  automatique (`.github/workflows/pinterest.yml`, chaque jour à 4 h 17 UTC, 5 épingles au plus) en
  place depuis le 23 octobre 2026 ; secrets `PINTEREST_*` créés le même jour, connexion au compte
  réussie chaque jour du 24 au 28 octobre 2026 (aucune épingle de plus à publier : les 21 sont déjà programmées).
- **Mesure d'audience** : aucune (la page Confidentialité l'indique).
- **Publicité** : script AdSense chargé, `https://keurkado.com/ads.txt` répond ; aucun bloc
  d'annonce créé ; examen du site demandé le 20 octobre 2026, « En préparation » dans la console AdSense, ni validé ni refusé (vérifié le 28 octobre 2026) ; la console y affiche
  encore `ads.txt` « Introuvable » alors que le fichier répond (200) : elle ne l'a pas revérifié ; aucune
  annonce affichée pour l'instant.

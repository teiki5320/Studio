# PUBLICATION — état de la mise en ligne

> Mis à jour le 24 octobre 2026, d'après le site en ligne et les exécutions GitHub Actions.
>
> Aucun secret ici — uniquement des références.

## En bref

- **Production** : en ligne sur keurfoot.com depuis le 20 octobre 2026
- **Domaine & SSL** : Cloudflare, certificat valide jusqu'au 18 janvier 2027, renouvelé seul
- **Visibilité** : sitemap de 97 adresses ; indexation Google à vérifier dans la console
- **Contact** : keurfoot@toakeur.com

## Boutiques

| | 🌐 Site |
|---|---|
| État | [ok] En ligne, réponse 200 |
| Hébergement | [ok] Worker de fichiers statiques Cloudflare « keurfoot » |
| Domaine | [ok] keurfoot.com, www sert le même site |
| SSL | [ok] Certificat Cloudflare, HSTS actif |
| Indexation | [à faire] Search Console à vérifier dans la console |
| Mesure d'audience | [pas encore] Aucune balise constatée |

## Ce qui reste, dans l'ordre

1. ✅ **Version provisoire** : site publié sur GitHub Pages, non indexé, le 17 octobre 2026.
2. ✅ **Mise en ligne** : site publié sur keurfoot.com par un Worker Cloudflare le 20 octobre 2026.
3. ✅ **Ancienne adresse redirigée** : GitHub Pages renvoie chaque visiteur vers keurfoot.com.
4. **Search Console** : vérifier la propriété keurfoot.com et envoyer le sitemap à Google.
5. **Mesure d'audience** : activer Cloudflare Web Analytics, déjà permis par `public/_headers`.
6. **Validation AdSense** : suivre l'examen demandé le 20 octobre, puis créer les blocs d'annonces.

## Web · Production

| | |
|---|---|
| Adresse | **En ligne** sur https://keurfoot.com (vérifié le 24 octobre 2026 : réponse 200) |
| Hébergeur | Cloudflare, Worker de fichiers statiques `keurfoot` (`wrangler.jsonc`), workflow `deploy.yml` |
| Dernière publication | 24 octobre 2026, publication réussie |
| Mise en ligne | 20 octobre 2026 (version provisoire sur GitHub Pages depuis le 17 octobre) |
| Dépôt | https://github.com/teiki5320/keurfoot |
| Taille publiée | 97 adresses dans le sitemap (24 octobre 2026) |
| Contact affiché | `keurfoot@toakeur.com` |
| Maintenance | désactivée (`content/maintenance.json`) |

## Domaine & SSL

- **Domaine** : `keurfoot.com` (adresse canonique) ; `www.keurfoot.com` sert le même site, avec une
  adresse canonique qui pointe vers `keurfoot.com`.
- **Registraire et DNS** : Cloudflare ; échéance à vérifier dans la console.
- **SSL** : certificat fourni et renouvelé par Cloudflare (valide jusqu'au 18 janvier 2027) ;
  HSTS activé dans `public/_headers`.
- **Ancienne adresse** : https://teiki5320.github.io/keurfoot/ ne sert plus qu'une page de renvoi
  vers keurfoot.com, en `noindex`.

## Visibilité

- **Sitemap** : https://keurfoot.com/sitemap.xml répond (97 adresses, dont 7 articles Conseils, le 24 octobre 2026) ; `robots.txt` autorise tout
  et cite le sitemap.
- **Google Search Console** : propriété, envoi du sitemap et pages indexées à vérifier dans la
  console.
- **IndexNow** : clé publique servie à la racine du site et script `scripts/indexnow.mjs` (24 octobre 2026),
  lancé à la main après une publication ; journal du référencement dans `docs/referencement.md`.
- **Mesure d'audience** : aucune balise Cloudflare Web Analytics constatée sur le site le
  21 octobre 2026, bien que la politique de sécurité l'autorise.
- **Publicité** : Google AdSense en place (script chargé sur les pages,
  `https://keurfoot.com/ads.txt` répond) ; examen du site demandé le 20 octobre 2026, aucun bloc
  d'annonces renseigné.

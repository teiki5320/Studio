# PUBLICATION — état de la mise en ligne

> Mis à jour le 29 octobre 2026, d'après le site en ligne et les exécutions GitHub Actions.
>
> Aucun secret ici — uniquement des références.

## En bref

- **Production** : en ligne sur keurfoot.com depuis le 20 octobre 2026
- **Domaine & SSL** : Cloudflare, certificat valide jusqu'au 18 janvier 2027, renouvelé seul
- **Visibilité** : sitemap de 145 adresses au 29 octobre (100 fixes et 45 articles d'actus) ; 101 pages dans l'index de Google (rapport du 23 octobre)
- **Contact** : keurfoot@toakeur.com

## Boutiques

| | 🌐 Site |
|---|---|
| État | [ok] En ligne, réponse 200 (29 octobre) |
| Hébergement | [ok] Worker de fichiers statiques Cloudflare « keurfoot » |
| Domaine | [ok] keurfoot.com ; www renvoie vers keurfoot.com (301) depuis le 28 octobre |
| SSL | [ok] Certificat Cloudflare, HSTS actif, http renvoie vers https (28 octobre) |
| Indexation | [ok] Search Console : 101 pages dans l'index (rapport du 23 octobre), sitemap relu le 28 octobre ; Bing Webmaster Tools : site validé et sitemap envoyé (28 octobre) |
| Mesure d'audience | [pas encore] Aucune balise constatée (29 octobre) |

## Ce qui reste, dans l'ordre

1. ✅ **Version provisoire** : site publié sur GitHub Pages, non indexé, le 17 octobre 2026.
2. ✅ **Mise en ligne** : site publié sur keurfoot.com par un Worker Cloudflare le 20 octobre 2026.
3. ✅ **Ancienne adresse redirigée** : GitHub Pages renvoie chaque visiteur vers keurfoot.com.
4. ✅ **Search Console** : propriété keurfoot.com vérifiée et sitemap envoyé à Google le 20 octobre 2026 ;
   même chose dans Bing Webmaster Tools le 28 octobre 2026 (balise `msvalidate.01` dans `src/app/layout.tsx`).
5. **Mesure d'audience** : activer Cloudflare Web Analytics, déjà permis par `public/_headers`.
6. **Validation AdSense** : suivre l'examen demandé le 20 octobre (« En préparation » au 29 octobre 2026), puis créer les blocs d'annonces.

## Web · Production

| | |
|---|---|
| Adresse | **En ligne** sur https://keurfoot.com (vérifié le 29 octobre 2026 : réponse 200) |
| Hébergeur | Cloudflare, Worker de fichiers statiques `keurfoot` (`wrangler.jsonc`), workflow `deploy.yml` |
| Dernière publication | 29 octobre 2026 vers 5 h 30 (publication après un envoi sur `main`, GitHub Actions au vert) ; le site se republie aussi chaque jour à 12 h 50 et 19 h 50 pour les articles d'actus (pages d'articles mises en ligne le 28 octobre à 1 h 47) |
| Mise en ligne | 20 octobre 2026 (version provisoire sur GitHub Pages du 17 au 20 octobre, remplacée par Cloudflare) |
| Dépôt | https://github.com/teiki5320/keurfoot |
| Taille publiée | 145 adresses dans le sitemap (29 octobre 2026 : 100 fixes, 45 articles d'actus) |
| Contact affiché | `keurfoot@toakeur.com` |
| Maintenance | désactivée (`content/maintenance.json`) |

## Domaine & SSL

- **Domaine** : `keurfoot.com` (adresse canonique) ; depuis le 28 octobre 2026, `www.keurfoot.com`
  renvoie définitivement (301) vers `keurfoot.com` (règle de redirection Cloudflare).
- **Registraire et DNS** : Cloudflare ; échéance à vérifier dans la console.
- **SSL** : certificat fourni et renouvelé par Cloudflare (valide jusqu'au 18 janvier 2027) ;
  HSTS activé dans `public/_headers` ; « Toujours utiliser HTTPS » activé dans Cloudflare le
  28 octobre 2026 (http renvoie vers https).
- **Une seule adresse par page** : depuis le 28 octobre 2026, `worker/index.ts` renvoie en 301, en un
  seul saut, les adresses avec barre finale, en `.html` ou anciennes vers l'adresse canonique sans barre
  finale (avant : 307, temporaire).
- **Contrôle avant publication** : depuis le 28 octobre 2026, `deploy.yml` contrôle le site construit
  (`tests/sortie/`) avant de le publier, échoue s'il manque un secret Cloudflare et vérifie ensuite en
  ligne que keurfoot.com sert la nouvelle version (`/version.txt`, 3 minutes au plus).
- **Ancienne adresse** : https://teiki5320.github.io/keurfoot/ ne sert plus qu'une page de renvoi
  vers keurfoot.com, en `noindex`.

## Visibilité

- **Sitemap** : https://keurfoot.com/sitemap.xml répond (145 adresses le 29 octobre 2026, dont 9 articles Conseils, la page Actus et 45 articles d'actus, une adresse par article depuis le 28 octobre 2026 ; la page de secours `/actus/article` n'y est jamais) ; `robots.txt` autorise tout
  et cite le sitemap.
- **Google Search Console** : propriété `keurfoot.com` vérifiée ; sitemap envoyé le 20 octobre 2026,
  sans erreur, relu par Google le 28 octobre (139 pages découvertes) ; 101 pages dans l'index de
  Google (rapport Indexation daté du 23 octobre, lu le 29 octobre 2026).
- **IndexNow** : clé publique servie à la racine du site et script `scripts/indexnow.mjs` (24 octobre 2026),
  lancé automatiquement depuis le 28 octobre 2026 par `.github/workflows/indexnow.yml` après chaque publication
  réussie et chaque lundi (il lit le sitemap, donc signale aussi les articles d'actus) ; journal du référencement dans `docs/referencement.md`.
- **Mesure d'audience** : aucune balise Cloudflare Web Analytics constatée sur le site le
  29 octobre 2026, bien que la politique de sécurité l'autorise.
- **Publicité** : Google AdSense en place (script chargé sur les pages,
  `https://keurfoot.com/ads.txt` répond) ; examen du site demandé le 20 octobre 2026, « En préparation » dans la
  console au 29 octobre 2026 ; la console y affiche encore `ads.txt` « Introuvable » alors que le
  fichier répond (200) : elle ne l'a pas revérifié. Aucun bloc d'annonces renseigné.

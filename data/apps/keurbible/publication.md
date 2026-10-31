# PUBLICATION — état de la mise en ligne

> Mis à jour le 31 octobre 2026, d'après le site en ligne, la console Cloudflare et les exécutions GitHub Actions.
>
> Aucun secret ici — uniquement des références.

## En bref

- **Production** : en ligne sur keurbible.com depuis le 29 octobre 2026
- **Domaine & SSL** : keurbible.com sur Cloudflare, relié au projet Pages, www redirigé (301), certificat Cloudflare
- **Visibilité** : Search Console et Bing Webmaster Tools le 29 octobre 2026 (sitemap lu par Google, 85 pages découvertes ; envoyé à Bing) ; IndexNow après chaque publication et chaque lundi
- **Contact** : keurbible@toakeur.com

## Boutiques

| | 🌐 Site |
|---|---|
| État | [ok] En ligne, réponse 200 |
| Hébergement | [ok] Cloudflare Pages, projet keurbible |
| Domaine | [ok] keurbible.com, www redirigé (301) |
| SSL | [ok] Certificat Cloudflare, HSTS actif |
| Indexation | [pas encore] Sitemap lu le 29/10, rapport en traitement (31/10) |
| Mesure d'audience | [ok] Cloudflare Web Analytics, sans cookie (depuis le 29/10) |

## Ce qui reste, dans l'ordre

1. ✅ **Code et contenus** : site construit et contrôlé le 29 octobre 2026 (85 adresses), sur le Mac et par GitHub Actions (tout au vert jusqu'à l'étape des secrets Cloudflare) ; 56 liens Amazon directs vérifiés.
2. ✅ **Secrets Cloudflare** : `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` ajoutés au dépôt le 29 octobre 2026 ; première publication réussie le même jour.
3. ✅ **Domaine** : `keurbible.com` et `www.keurbible.com` reliés au projet le 29 octobre 2026, règle de redirection de www vers l'adresse sans www (301).
4. **Search Console** : propriété de domaine `keurbible.com` créée et sitemap envoyé le 29 octobre 2026, lu par Google le même jour (« Opération effectuée », 85 pages découvertes) ; indexation demandée pour l'accueil, /afro et /top-10/creches-de-noel ; rapport d'indexation encore en traitement le 31 octobre 2026.
5. **Amazon Partenaires et AdSense** : keurbible.com déclaré sur les deux comptes (vérifié le 29 octobre 2026) ; bandeau de consentement et 2 blocs d'annonces créés le même jour ; examen AdSense demandé le 29 octobre 2026, toujours « En préparation » (vérifié dans la console le 31 octobre 2026).
6. ✅ **Veille actus** : Keur Bible ajouté à la tâche de veille le 29 octobre 2026 (`sites/keurbible.json`, 15 flux) ; premier passage le 29 octobre à 19 h ; 6 actus en ligne au 31 octobre 2026.
7. ✅ **Design définitif** et illustrations : design « Lumière » validé par Jean le 29 octobre 2026 ; 159 illustrations d'objets (159 objets sur 178) affichées dans les cartes objets et les Top 10 depuis le 29 octobre 2026 (mention « Illustration créée par IA »).

## Web · Production

| | |
|---|---|
| Adresse | **En ligne** sur https://keurbible.com (vérifié le 31 octobre 2026 : réponse 200, `version.txt` à jour) |
| Hébergeur | Cloudflare Pages (projet `keurbible`), workflow `deploy.yml` |
| Dernière publication | 31 octobre 2026, après la vérification des produits Amazon (« Publier le site », réussie) |
| Mise en ligne | 29 octobre 2026 |
| Dépôt | https://github.com/teiki5320/keurbible |
| Taille | 92 adresses dans le sitemap (31 octobre 2026 ; 85 au lancement) |
| Contact affiché | `keurbible@toakeur.com` |
| Maintenance | désactivée (`content/maintenance.json`) |

## Domaine & SSL

- **Domaine** : `keurbible.com` (adresse canonique, sans www).
- **Registraire et DNS** : Cloudflare (serveurs de noms Cloudflare) ; CNAME de `keurbible.com` et `www` vers `keurbible.pages.dev`.
- **SSL** : fourni et renouvelé par Cloudflare ; HSTS activé dans `public/_headers`.

## Visibilité

- **Sitemap** : `https://keurbible.com/sitemap.xml` (92 adresses au 31 octobre 2026) ; `robots.txt` autorise tout et cite le sitemap.
- **Google Search Console** : propriété de domaine `keurbible.com` créée le 29 octobre 2026, sitemap lu le même jour (85 pages découvertes), indexation demandée pour l'accueil, /afro et /top-10/creches-de-noel.
- **Bing Webmaster Tools** : keurbible.com ajouté et vérifié le 29 octobre 2026 (balise `msvalidate.01` dans chaque page, `BING_VERIFICATION` dans `src/lib/config.ts`), sitemap envoyé le même jour (en traitement).
- **IndexNow** : tout le sitemap signalé après chaque publication réussie de `main` et chaque lundi (première exécution réussie le 29 octobre 2026).
- **Publicité** : script AdSense et `ads.txt` publiés avec le site ; site ajouté dans AdSense et examen demandé le 29 octobre 2026, toujours « En préparation » (vérifié le 31 octobre 2026), aucune annonce.

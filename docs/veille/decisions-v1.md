# Veille actus — décisions validées (v1)

Validées par Jean le 26 octobre 2026. Les schémas de référence sont dans ce dossier : `schema-architecture-v1.html`, `actus-schema-v2.json` (avec le champ `image`), `d1-schema-v2.sql` (inutile en option A).

## Sites concernés

Sites web seulement, pas les applis.

| Site | Domaine | Retenu |
|---|---|---|
| Keur Foot | keurfoot.com | oui |
| Keurbook | keurbook.com | oui |
| Keur Cook | keurcook.com | oui — jamais d'actus santé ni de vocabulaire de vente |
| Keur Déco | keurdeco.com | oui — peu d'actualité : sources larges |
| Keur Kado | keurkado.com | oui — peu d'actualité : sources larges |
| Kultiled | kultiled.com | oui — peu d'actualité : sources larges |
| Solelis | solelis.com | oui |
| toakeur.com | toakeur.com | non |
| Palabre | appli et palabre.toakeur.com | non, mis de côté |

Les schémas listent encore `keurfoot` et `palabre` dans `site` : il faudra y mettre les 7 sites retenus.

## Décisions globales

1. **Architecture : option A.** Une tâche planifiée Claude (abonnement, sur le Mac mini) lit les flux RSS, trie, dédoublonne, résume, puis écrit un JSON par site.
2. **Fréquence : 2 passages par jour, à 12 h et 19 h** (en dehors des tâches du matin, 5 h 05 à 7 h).
3. **Stockage : un dépôt GitHub dédié « veille »**, public, sur la branche main, avec un fichier par site (`keurfoot.json`…). Chaque site lit son fichier en direct dans le navigateur ; les sites ne sont pas reconstruits.
4. **Résumés : Claude seul.** En cas d'échec, le JSON du passage précédent reste en place et le Studio le signale dans « À faire ». Pas d'Ollama (non installé sur le Mac).
5. **Diffusion : sur les sites seulement** pour commencer. Telegram pourra venir après 2 semaines d'essai.

## Règles légales (non négociables)

- Jamais de texte ni d'image copiés depuis la source.
- Titre reformulé et résumé de 2 à 3 lignes réécrits par Claude.
- Source citée, avec un lien visible sur chaque actu.
- Le titre original ne sert qu'en interne.

## Images

- **Jamais l'image de l'article source.**
- **Sources, dans l'ordre :**
  1. **Wikimedia Commons** : personne, lieu ou club cité, licence libre vérifiée. Très bon pour les joueurs, plus faible pour les stades précis.
  2. **Openverse** (api.openverse.org) : uniquement les licences qui permettent un usage commercial (`license_type=commercial` : CC0, CC BY, CC BY-SA), puisque les sites ont de la publicité.
  3. **Banque perso** : plus tard, vide au départ.
  4. **Carte générée par code**, en dernier recours.
- **Écartées :**
  - **Pexels** : création de nouvelles clés en pause depuis le 30/09/2026, sans date de reprise. À vérifier régulièrement, et à ajouter quand ça rouvrira.
  - **Unsplash** : ses règles interdisent la publicité près de ses photos, et les applications de type « spam ». Or les sites affichent AdSense et des liens Amazon.
- **Clés API : aucune.** Wikimedia et Openverse n'en demandent pas. Si une clé devient nécessaire, elle ira dans le **trousseau du Mac**, jamais dans un dépôt.
- **Anti-répétition :** jamais la même image dans les 20 dernières actus d'un site.
- **Crédit obligatoire** : auteur, licence et lien vers la page d'origine. Le texte `alt` est obligatoire.
- **Recherche :** mots-clés en anglais pour Openverse. Vérifier que l'image correspond bien au sujet (sinon, prendre la carte générée).
- **Maquette :** `maquette-images-v1.html`, aux couleurs de Keur Foot.
- **Format Keur Foot :** les deux. Un bandeau 16:9 pour la 1re actu, puis des vignettes carrées pour les suivantes.
- **Carte générée :** sans le titre (il est déjà écrit en dessous). Fond aux couleurs du site, grand drapeau du pays, ballon (icône du thème), nom de la compétition, mention « [Site] · Actus ».

Tests du 26/10/2026 :
- Openverse, « african football stadium » : 233 résultats en usage commercial. Exemple : « Senegal 1 - Cameroon 0 - Stade Léopold Sédar Senghor », Jeff Attaway, CC BY 2.0, Flickr.
- Wikimedia, « Sadio Mané » : « Dribble de Sadio Mane », Happiraphael, CC BY-SA 4.0.

## Par site

### Keur Foot
- **Sujets :** sélections nationales ; CAN et qualifications au Mondial ; joueurs africains en Europe ; championnats et clubs africains.
- **Pays :** surtout l'Afrique francophone (Sénégal, Côte d'Ivoire, Cameroun, Maroc, Mali, Guinée, RD Congo…), plus les grandes équipes (Nigeria, Égypte, Algérie, Ghana, Afrique du Sud…).
- **Emplacement :** un bloc sur l'accueil (bandeau pour la 1re actu, puis des vignettes), une page « Actus », et les actus du pays sur chaque fiche sélection.
- **Encore à faire :** les flux RSS (page à cocher), les mots-clés de filtre, le nombre d'actus affichées.

### Keurbook, Keur Cook, Keur Déco, Keur Kado, Kultiled, Solelis
À définir.

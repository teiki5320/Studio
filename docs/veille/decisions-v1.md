# Veille actus — décisions validées (v1)

Validées par Jean le 26 octobre 2026. Les schémas de référence sont dans ce dossier : `schema-architecture-v1.html`, `actus-schema-v2.json` (avec le champ `image`), `d1-schema-v2.sql` (inutile en option A).

## Sites concernés

Sites web seulement, pas les applis.

| Site | Domaine | Retenu |
|---|---|---|
| Keur Foot | keurfoot.com | oui |
| Keurbook | keurbook.com | oui |
| Keur Cook | keurcook.com | oui — jamais d'actus santé ni de vocabulaire de vente (en ligne depuis le 27/10) |
| Keur Déco | keurdeco.com | oui — peu d'actualité : sources larges (en ligne depuis le 27/10) |
| Keur Kado | keurkado.com | à discuter avec Jean (rien de lancé) |
| Kultiled | kultiled.com | oui — sources larges, pas seulement l'Afrique, jamais de cannabis (en ligne depuis le 27/10) |
| Solelis | solelis.com | oui — France seulement, pas d'actus sur l'accueil (en ligne depuis le 27/10) |
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
- **Nombre d'actus :** 4 sur l'accueil (1 bandeau + 3 vignettes), 20 sur la page « Actus », 3 sur chaque fiche sélection.
- **Flux RSS (14, tous validés par Jean le 26/10/2026, liste dans `flux-keurfoot-v1.html`) :** Afrik-Foot, Africa Top Sports, L'Équipe Football Afrique, Camfoot, Wiwsport, Senego Sport, Kawowo Sports (EN), RFI Sports, L'Équipe Football, Foot Mercato, ESPN FC (EN), BBC Afrique, France 24 Afrique, Jeune Afrique Sport. Les sources en anglais sont résumées en français.
- **Tri :** Claude trie en lisant (pas de liste de mots-clés). Il garde un article s'il parle d'une sélection, d'un joueur ou d'un club africain, ou de la CAN et des qualifications au Mondial. **Exclusions :** paris sportifs, faits divers violents, rumeurs non confirmées, autres sports.
- **Keur Foot : complet.**

### Keurbook
- **Sujets :** prix littéraires, sorties de livres d'auteurs africains et afrodescendants, auteurs (interviews, portraits, hommages), BD africaine, salons et festivals du livre.
- **Zone :** surtout l'Afrique francophone, avec les grands noms anglophones (Adichie, Ngũgĩ…).
- **Emplacement :** un bloc sur l'accueil, une page « Actus », et les actus de l'auteur sur chaque fiche auteur.
- **Format, nombre et carte : comme Keur Foot.** Bandeau pour la 1re actu puis vignettes ; 4 sur l'accueil, 20 sur la page, 3 par fiche auteur ; carte aux couleurs de Keurbook, avec le drapeau du pays de l'auteur et un livre comme icône.
- **Tri :** Claude trie en lisant. Exclusions : polémiques politiques, faits divers.
- **Flux RSS (10, tous validés par Jean le 26/10/2026) :** Africultures, Jeune Afrique Culture, RFI Culture, France 24 Culture, Le Monde Afrique, SenePlus, Livres Hebdo, Le Monde des livres, ActuaBD, BDZoom.
- **Keurbook : complet.**

### Keur Cook
Défini le 27/10/2026 (Jean ne valide pas les flux un par un : toutes les bonnes sources testées sont prises).
- **Sujets :** cuisine africaine et de la diaspora : plats, recettes et traditions ; chefs et restaurants africains ; produits et ingrédients du continent vus sous l'angle du goût (fonio, mil, bissap, vanille, huile d'olive, épices, café, cacao…) ; fêtes et repas ; festivals, salons, prix et livres de cuisine ; patrimoine culinaire.
- **Exclusions (strictes) :** **jamais d'actu santé ni de nutrition médicale** (régimes, maladies, effets d'un aliment sur le corps) ; **aucun vocabulaire de vente** (prix, promotions, « acheter », « disponible sur », bons plans) ; crises alimentaires, famines, intoxications et faits divers ; politique et conflits ; alcool mis en avant ; cuisine non africaine.
- **Emplacement :** un bloc sur l'accueil (**4** actus : 1 bandeau + 3 vignettes), une page **`/actus`** (**20**), et sur chaque **page pays** (`/pays/<slug>`) **3** actus filtrées sur le code pays (`pays` contient le code ISO du pays, ex. `SN`). Pas de fichier de fiches à exposer (le filtre se fait sur `pays`).
- **Carte générée :** dégradé `#c9531f` → `#2a1810`, encre `#fbeee2` (les couleurs du site), **icône marmite**, grand drapeau du pays.
- **Flux RSS (15, testés le 27/10/2026) :** Le Monde Afrique, RFI Afrique, RFI Culture, France 24 Afrique, France 24 Culture, BBC Afrique, Africanews, Jeune Afrique, SenePlus, Le Soleil (Sénégal), Mondafrique, Nofi, Le Figaro Gastronomie, AllAfrica (FR), The Guardian Food (EN). Il n'existe presque pas de flux « cuisine africaine » : ce sont des sources larges que Claude trie en lisant. Volume attendu faible (1 à 3 actus par passage).
- **Premier passage (27/10/2026, 9 h) :** 2 actus (vanille de São Tomé, huile d'olive tunisienne), 2 photos Wikimedia.

### Keur Déco
Défini le 27/10/2026.
- **Sujets :** décoration, design et artisanat africains : designers, architectes d'intérieur et artisans d'Afrique et de la diaspora ; textiles (wax, bogolan, kente, indigo…), vannerie et raphia, terre cuite, bois sculpté, perles ; salons, foires et expositions de design ou d'art africain ; maisons et intérieurs inspirés de l'Afrique.
- **Exclusions :** politique et conflits, faits divers, ventes aux enchères et cotes du marché de l'art, vocabulaire de vente, people sans rapport, déco sans lien avec l'Afrique ou sa diaspora.
- **Emplacement :** un bloc sur l'accueil (**4**), une page **`actus.html`** (**20**), et sur chaque **page matière** (`matiere-<id>.html`) **3** actus avec le tag `matiere:<id>` (wax, bogolan, kente, indigo, raphia-paniers, terre-cuite, bois-sculpte, perles). Le site exposera ses matières dans `https://www.keurdeco.com/veille/entites.json`.
- **Carte générée :** dégradé `#a3472a` (terracotta) → `#2a1d15`, encre `#fdf9f3`, **icône jarre**, grand drapeau du pays.
- **Flux RSS (15, testés le 27/10/2026), sources larges :** AD Magazine, Ideat, Connaissance des Arts, Beaux Arts, Le Journal des Arts, Le Monde Arts, Le Monde Afrique, Africultures, RFI Culture, France 24 Culture, Dezeen (EN), Designboom (EN), Wallpaper* (EN), Design Milk (EN), Design Indaba (EN).
- **Premier passage :** 4 actus (Ibrahim Mahama à la Fondation Cartier, foire AKAA, quilts de Gee's Bend, art contemporain à Marrakech), 4 photos Wikimedia.

### Kultiled
Défini le 27/10/2026. **Pas centré sur l'Afrique** (consigne de Jean) : toute l'actualité de la culture en intérieur.
- **Sujets :** culture de plantes en intérieur, partout dans le monde : potagers d'intérieur, aromatiques, micro-pousses, semis ; éclairage LED horticole (spectre, efficacité, nouveautés) ; hydroponie, serres et fermes verticales ; recherche sur les plantes sous lumière artificielle ; agriculture urbaine en intérieur.
- **Exclusions (strictes) :** **toujours le cannabis, le chanvre, le CBD et toute drogue**, même légal ou médical ; pesticides de synthèse mis en avant ; vocabulaire de vente et tests de produits ; levées de fonds et rachats sans rapport direct ; jardinage d'extérieur seul ; politique et faits divers.
- **Emplacement :** un bloc sur l'accueil (**4**, sous le calculateur), une page **`actus.html`** (**20**), et sur chaque **page légume** (`legume-<id>.html`) **3** actus avec le tag `legume:<id>`. La fiche « Chanvre CBD » n'a **jamais** de bloc d'actus et n'est pas exposée. Le site exposera ses légumes dans `https://www.kultiled.com/veille/entites.json`.
- **Carte générée :** dégradé `#3a2140` → `#1b1322` (la nuit du site), encre ambre `#f7c07a`, **icône plante sous une lampe**, **sans drapeau** (`"drapeau": false`).
- **Flux RSS (14, testés le 27/10/2026), français d'abord :** Gerbeaud, Le Figaro Jardin, Futura Maison, Végétable, Sciences et Avenir (nature), Le Monde Planète, Terre-net ; puis en anglais : Greenhouse Grower, Greenhouse Management, Produce Grower, Greenhouse Canada, AgFunderNews, Phys.org (plantes), ScienceDaily (botanique). Peu de sources françaises sur le sujet (Rustica, Jardiner Malin, Hortidaily, LEDs Magazine : pas de flux qui marche).
- **Premier passage :** 3 actus (achats de plantes d'intérieur, un radis original, la « fleur du diable »), 2 photos Wikimedia, 1 carte.

### Solelis
Défini le 27/10/2026. **France uniquement** (consigne de Jean) : sources françaises, en français, et sujets français.
- **Sujets :** entreprises en difficulté en France, du point de vue du dirigeant de TPE ou PME : chiffres des défaillances ; procédures (mandat ad hoc, conciliation, sauvegarde, redressement, liquidation, rétablissement professionnel) et réformes ; tribunaux des activités économiques ; dettes URSSAF, impôts, fournisseurs, banques ; aides et dispositifs publics (CODEFI, CCSF, Médiation du crédit, Médiateur des entreprises) ; prévention et accompagnement des dirigeants ; redressement d'une enseigne connue quand cela éclaire la situation.
- **Exclusions :** actualité hors de France, politique partisane, bourse et placements, faits divers et procès pénaux, noms de dirigeants ou de petites entreprises qui ne sont pas connus, levées de fonds, rumeurs.
- **Emplacement : AUCUNE actu sur l'accueil** (consigne de Jean). Les actus vont seulement sur une page **`/actus`** (**20**) et, si c'est pertinent, sur les **4 pages situation** (`/situation/<slug>` : dettes-urssaf, dettes-fournisseurs, credit-bancaire, impots-impayes), **3** actus avec le tag `situation:<slug>`, bloc absent s'il n'y en a pas. Le site exposera ses situations dans `https://solelis.com/veille/entites.json`.
- **Carte générée :** dégradé `#1e3d82` → `#0a1628` (bleus du site), encre blanche, **icône soleil**, **sans drapeau** (`"drapeau": false`).
- **Flux RSS (14, tous français, testés le 27/10/2026) :** Service-Public.fr (actualités professionnelles), Le Monde Entreprises, Le Monde Économie française, Le Figaro Entrepreneur, Le Figaro Sociétés, BFM Business Entreprises, Franceinfo Entreprises, La Tribune, L'Usine Nouvelle, Sud Ouest Économie, 20 Minutes Économie, Village de la Justice, Les Affiches Parisiennes, Échos Judiciaires. (Les Échos ne répondaient pas le 27/10 : à réessayer plus tard.)
- **Premier passage :** 4 actus (Forges de Tarbes, Alizé Group, E-Totem en redressement ; aides aux commerces dégradés), 2 photos Wikimedia, 2 cartes.

### Keur Kado
**Rien de lancé** : Jean veut en parler d'abord.

## Mise en œuvre technique (précisée dans les prompts)

- Les fichiers sont servis par GitHub Pages : `https://teiki5320.github.io/veille/actus/<site>.json`.
- Les photos libres sont **copiées** dans le dépôt veille (WebP, 16:9 et carré), pour ne dépendre d'aucun serveur tiers. La CSP des sites n'autorise donc que `teiki5320.github.io`.
- Schéma v3 : 7 sites, champ `tags` (ex. `auteur:<slug>`), image obligatoire.
- Contrôle anti-copie automatique : 6 mots consécutifs repris = actu rejetée.
- Icônes de la carte : `ballon`, `livre`, `marmite`, `jarre`, `plante`, `soleil`. Option `"drapeau": false` dans `sites/<site>.json` : jamais de drapeau sur la carte (Kultiled, Solelis).
- Prompts : `prompts/00-socle-v1.md`, `prompts/keurfoot-v1.md`, `prompts/keurbook-v1.md`, `prompts/keurcook-v1.md`, `prompts/keurdeco-v1.md`, `prompts/kultiled-v1.md`, `prompts/solelis-v1.md`.

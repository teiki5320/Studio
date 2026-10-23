#!/usr/bin/env node
// =============================================================================
// Vérifie que ce que le Dashboard affiche sur chaque app est VRAI.
//
// Trois contrôles, tous fondés sur des faits vérifiables, jamais sur une
// impression :
//   1. le dépôt déclaré dans app.json existe vraiment, et c'est bien celui-là
//      (pas une redirection de renommage, qui casserait le jour où quelqu'un
//      recrée l'ancien nom) ;
//   2. chaque adresse citée dans les fiches répond ;
//   3. chaque service déclaré est documenté par une section de infra.md, et
//      aucune section de service n'est oubliée dans la liste ;
//   4. une version annoncée « en ligne » dans les fiches est bien celle que
//      l'App Store et Google Play servent (status.json → boutiques, lu par
//      apps-sync dans les boutiques elles-mêmes) ;
//   5. le site en ligne (adresse lue dans la ligne « Site » des fiches) est
//      comparé aux quatre fichiers (infra, marketing, publication, readme) :
//      - code Amazon Partenaires (…-21) cité au présent = l'un des tag=…-21
//        des liens Amazon de la page d'accueil et d'une ou deux pages produits ;
//      - identifiant AdSense (pub-…) cité = celui du HTML du site ou de ads.txt
//        (pour une appli AdMob : app-ads.txt, s'il existe) ;
//      - hébergeur cité (GitHub Pages, Cloudflare Pages/Workers…) = celui que
//        trahissent les en-têtes HTTP du site ;
//      - nombre d'articles Conseils « en ligne » ≈ sitemap (AVERTISSEMENT
//        seulement : ces chiffres datés bougent tous les jours).
//
// Règles : l'historique au passé (« ancien », « fermé », « remplacé »…) est
// juste ; un échec réseau donne « non vérifiable », jamais « faux ».
//
// Le résultat est aussi écrit dans studio/verification.json (ignoré par git) :
//   { le, problemes: [{ app, texte }], avertissements: [{ app, texte }] }
// lu par l'Accueil du Studio. Avec un filtre (une seule app), seules les
// lignes de cette app y sont remplacées.
//
// Usage :  node tool/verifier-fiches.js          (tout)
//          node tool/verifier-fiches.js kultiva  (une seule app)
//
// Sort en 1 si un contrôle échoue : utilisable dans la routine quotidienne.
// Aucun secret, aucun jeton requis ; seule écriture : studio/verification.json.
// =============================================================================
'use strict';

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const APPS = path.join(RACINE, 'data', 'apps');
const { SERVICES } = require(path.join(RACINE, 'data', 'catalog', 'services.cjs'));

// Titres qui n'annoncent aucun service : les ignorer dans le contrôle inverse.
// Titres de section qui n'annoncent AUCUN compte de service externe : il ne
// faut donc pas reprocher à app.json de ne pas les déclarer.
const TITRES_HORS_SERVICE = [
  // Sections d'organisation de la fiche
  /^(en bref|parcours|prevu mais pas branche|vue d ensemble|sommaire|services?( externes?)?|notes?|recapitulatif|valeurs publiques|checklist|a faire|a verifier|en attente|annexes?|couts?)/,
  /^(ou vit chaque secret|reprise du projet|format .*source des donnees|routine )/,
  // Dépendances techniques sans compte : registres de paquets, polices web
  /^(registres? de paquets|google fonts|polices)/,
  // Le titre dit lui-même que le service n'est pas en place
  /(non souscrit|pas souscrit|non utilise|a souscrire|\(?optionnel\)?$)/,
  // Sections de synthèse en fin de fiche
  /^(limites connues|ce qui reste a faire|points de vigilance)/,
];

const horsService = (t) => TITRES_HORS_SERVICE.some((re) => re.test(t));

// Toutes les façons de nommer un service : son identifiant, son nom, ce qu'il y
// a entre parenthèses, et ses alias de fournisseurs (ionos, openart, plausible…).
function aiguillesDe(svc, id) {
  const out = [normalise(id), ...svc.nom.replace(/\s*\(.*\)$/, '').split('/').map(normalise)];
  const paren = svc.nom.match(/\(([^)]+)\)/);
  if (paren) paren[1].split(/[/,]/).forEach((x) => out.push(normalise(x)));
  (svc.alias || []).forEach((a) => out.push(normalise(a)));
  return out;
}

// Un jeton de LECTURE lève la limite de 60 appels par heure de l'API GitHub.
// Facultatif : sans lui, le contrôle des dépôts est simplement « non vérifiable »
// quand le quota est épuisé — jamais « faux ».
const JETON = (process.env.APPS_READ_TOKEN || process.env.GITHUB_TOKEN || '').trim();

const seulement = process.argv[2];
// Chaque constat est rangé avec son app : { app, texte }.
const problemes = [];
const avertissements = [];
const probleme = (app, texte) => problemes.push({ app, texte });
const avertir = (app, texte) => avertissements.push({ app, texte });

const lire = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);
const normalise = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^\s*\d+[.)]\s*/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

async function essai(url, redirections) {
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), 15000);
  try {
    const entetes = { 'User-Agent': 'dash-verif' };
    if (JETON && url.startsWith('https://api.github.com/')) {
      entetes.Authorization = `Bearer ${JETON}`;
    }
    const r = await fetch(url, {
      method: 'GET',
      redirect: redirections ? 'follow' : 'manual',
      signal: ctrl.signal,
      headers: entetes,
    });
    return { ok: r.status < 400, status: r.status, url: r.url };
  } catch (e) {
    return { ok: false, status: 0, erreur: e.name === 'AbortError' ? 'délai dépassé' : e.message };
  } finally {
    clearTimeout(minuteur);
  }
}

// Une adresse n'est déclarée morte qu'après DEUX échecs réseau espacés : sans
// cela, une coupure de deux secondes fait dire au Dashboard qu'un service a
// disparu. Un vrai code HTTP (404, 500…) est définitif et ne se rejoue pas.
async function teste(url, { redirections = true } = {}) {
  const premier = await essai(url, redirections);
  if (premier.ok || premier.status > 0) {
    return premier;
  }
  await new Promise((r) => setTimeout(r, 2000));
  const second = await essai(url, redirections);
  if (!second.ok && second.status === 0) {
    second.erreur = `${second.erreur} (deux essais)`;
  }
  return second;
}

// Les adresses citées dans une fiche, en ne gardant que ce qui est censé
// répondre à un visiteur : ni gabarit, ni console privée, ni point d'entrée
// d'API (qui répond 401 ou 404 sans clé, ce qui ne prouve rien).
function adressesDe(md) {
  const brut = md.match(/https?:\/\/[^\s)>"'`\]]+/g) || [];
  const ignorees = /(console|dashboard|admin|supabase\.com|cloudflare\.com|appstoreconnect|play\.google\.com\/console|github\.com\/[^/]+\/[^/]+\/(actions|settings)|example\.|localhost|127\.0\.0\.1)/i;
  const gabarit = /[<>{}]|\bASIN\b|VOTRE|XXXX/i;
  const pointApi = /^https?:\/\/(api|mcp)\.|googleapis\.com|\/api\//i;
  return [...new Set(brut.map((u) => u.replace(/[.,;:]+$/, '')))]
    .filter((u) => !ignorees.test(u) && !gabarit.test(u) && !pointApi.test(u));
}

// ── 5. Le site en ligne ↔ ce que disent les quatre fichiers ─────────────────
// Rien ici ne conclut « faux » sur un échec réseau : on ne compare que ce que
// le site a réellement servi.

// Récupère une page (deux essais espacés en cas d'échec réseau).
async function page(url) {
  for (let essaiN = 0; essaiN < 2; essaiN++) {
    const ctrl = new AbortController();
    const minuteur = setTimeout(() => ctrl.abort(), 20000);
    try {
      const r = await fetch(url, {
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; studio-verif)' },
      });
      return { status: r.status, entetes: r.headers, texte: await r.text() };
    } catch (e) {
      if (essaiN === 1) return { status: 0, erreur: e.name === 'AbortError' ? 'délai dépassé' : e.message };
      await new Promise((ok) => setTimeout(ok, 2000));
    } finally {
      clearTimeout(minuteur);
    }
  }
}

// Un fichier texte (ads.txt, app-ads.txt) : une page HTML servie à sa place
// (page 404 d'un site) ne compte pas.
async function texteBrut(url) {
  const r = await page(url);
  if (r.status !== 200 || /^\s*</.test(r.texte || '')) return { status: r.status, texte: null, erreur: r.erreur };
  return { status: 200, texte: r.texte };
}

// L'adresse du site : ligne « Site » (ou « Production ») des fiches.
function siteDe(infra, publication) {
  for (const md of [infra, publication]) {
    for (const lab of ['Site', 'Production']) {
      const l = (md || '').split('\n').find((x) => new RegExp(`^\\s*-\\s*\\*\\*${lab}\\*\\*\\s*:`).test(x));
      const d = l && l.replace(/^[^:]*:/, '').match(/(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?=[\s/`)>,;]|$)/i);
      if (d) return `https://${d[1].toLowerCase()}`;
    }
  }
  return null;
}

// Mots qui renvoient une mention à l'historique (passé, fermé, remplacé…).
const PASSE = /\b(provisoire|ancien(ne)?s?|anciennement|ferm[ée]e?s?|remplac[ée]e?s?|retir[ée]e?s?|[ée]tait|d[ée]pendait|abandonn[ée]e?s?|supprim[ée]e?s?|n'est plus|ne sert plus|plus utilis[ée]e?s?|jusqu'au|avant le|migr[ée]e?s?|quitt[ée]e?s?)\b/i;
const autour = (ligne, i, n = 50) => ligne.slice(Math.max(0, i - n), i + n);

// Les hébergeurs, reconnus dans une ligne de fiche.
const HEBERGEURS = [
  { famille: 'github', nom: 'GitHub Pages', re: /github pages|github\.io/i },
  { famille: 'cloudflare', nom: 'Cloudflare (Pages ou Workers)', re: /cloudflare pages|cloudflare workers?|worker[^.|]{0,40}cloudflare|\.pages\.dev|\.workers\.dev/i },
  { famille: 'autre', nom: 'Vercel', re: /\bvercel\b/i },
  { famille: 'autre', nom: 'Netlify', re: /\bnetlify\b/i },
  { famille: 'autre', nom: 'Firebase Hosting', re: /firebase hosting/i },
];
// Lignes qui disent OÙ le site est servi (pas le registrar, pas le DNS).
const LIGNE_HEBERGEMENT = /h[ée]berg|distribution|production|d[ée]ploi|publi[ée]|servi|mise en ligne|mis en ligne|\*\*site\*\*/i;

function familleServie(entetes) {
  if (!entetes) return null;
  if (entetes.get('x-github-request-id') || /github/i.test(entetes.get('server') || '')) return 'github';
  if (/cloudflare/i.test(entetes.get('server') || '')) return 'cloudflare';
  if (entetes.get('x-vercel-id')) return 'vercel';
  if (/netlify/i.test(entetes.get('server') || '')) return 'netlify';
  return null;
}

async function verifieSite(id, manifeste, fichiers) {
  const site = siteDe(fichiers.infra, fichiers.publication);
  if (!site) {
    console.log('   · pas d\'adresse de site dans les fiches : contrôles du site sautés');
    return;
  }
  const accueil = await page(site);
  if (accueil.status === 0 || accueil.status >= 400) {
    const cause = accueil.status ? `HTTP ${accueil.status}` : accueil.erreur;
    avertir(id, `site ${site} non vérifiable (${cause}) : codes Amazon, AdSense et hébergeur non contrôlés`);
    console.log(`   · ${site} → non vérifiable (${cause})`);
    return;
  }
  console.log(`   ✔ site ${site} lu`);
  const lignes = [];
  for (const [nomF, md] of Object.entries(fichiers)) {
    (md || '').split('\n').forEach((l, i) => lignes.push({ f: nomF, n: i + 1, l }));
  }
  const ou = (x) => `${x.f}.md:${x.n}`;

  // Plan du site : sert aux pages produits et au compte des articles.
  const plan = await page(`${site}/sitemap.xml`);
  const locs = plan.status === 200 ? [...plan.texte.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]) : [];

  // a) Amazon Partenaires
  const cites = [];
  for (const x of lignes) {
    for (const m of x.l.matchAll(/\b([a-z][a-z0-9]{2,}-21)\b/g)) {
      if (PASSE.test(autour(x.l, m.index))) continue;
      cites.push({ code: m[1], x });
    }
  }
  if (cites.length) {
    const pagesProduits = [
      ...locs.filter((u) => /top-10/.test(u)).slice(0, 1),
      ...locs.filter((u) => /\/(boutique|produits?|lampes|livres?|cadeaux?)(\/|\.html|$)/.test(u)).slice(0, 1),
    ];
    if (!pagesProduits.length) pagesProduits.push(...locs.filter((u) => /\/(conseils?|top)/.test(u)).slice(0, 1));
    const tags = new Set();
    let lues = 0;
    for (const t of [accueil, ...(await Promise.all(pagesProduits.map(page)))]) {
      if (t.status !== 200) continue;
      lues++;
      for (const m of t.texte.matchAll(/tag(?:=|\\u003d|%3D)([a-z0-9][a-z0-9-]*-2\d)\b/gi)) tags.add(m[1].toLowerCase());
    }
    const codes = [...new Set(cites.map((c) => c.code))];
    if (!tags.size) {
      avertir(id, `code Amazon ${codes.join(', ')} cité, mais aucun lien Amazon trouvé sur ${lues} page(s) de ${site} (non vérifiable)`);
      console.log(`   · Amazon : aucun tag trouvé sur le site (non vérifiable)`);
    } else {
      const faux = codes.filter((c) => !tags.has(c));
      for (const c of faux) {
        const o = cites.filter((y) => y.code === c).map((y) => ou(y.x));
        probleme(id, `code Amazon « ${c} » cité au présent (${o.join(', ')}), mais le site utilise ${[...tags].join(', ')}`);
      }
      console.log(faux.length ? `   ✖ Amazon : ${faux.join(', ')} ≠ site (${[...tags].join(', ')})` : `   ✔ Amazon : ${codes.join(', ')} = site`);
    }
  }

  // b) AdSense (site) ou AdMob (appli : app-ads.txt)
  const pubs = [];
  for (const x of lignes) {
    for (const m of x.l.matchAll(/\b(ca-app-pub|ca-pub|pub)-(\d{16})\b/g)) {
      if (PASSE.test(autour(x.l, m.index))) continue;
      pubs.push({ num: m[2], x });
    }
  }
  if (pubs.length) {
    const services = manifeste.services || [];
    const web = services.includes('adsense');
    const fichierTxt = web ? 'ads.txt' : 'app-ads.txt';
    const txt = await texteBrut(`${site}/${fichierTxt}`);
    const sur = new Set();
    if (web) for (const m of accueil.texte.matchAll(/ca-pub-(\d{16})/g)) sur.add(m[1]);
    if (txt.texte) for (const m of txt.texte.matchAll(/pub-(\d{16})/g)) sur.add(m[1]);
    const nums = [...new Set(pubs.map((p) => p.num))];
    if (!sur.size) {
      if (txt.status === 0) avertir(id, `${fichierTxt} de ${site} non vérifiable (${txt.erreur})`);
      else if (web) avertir(id, `identifiant AdSense pub-${nums.join(', pub-')} cité, mais ni le HTML de ${site} ni ads.txt n'en contiennent`);
      console.log(`   · ${web ? 'AdSense' : 'AdMob'} : aucun identifiant publié sur le site (${fichierTxt} ${txt.status === 200 ? 'vide' : 'absent'})`);
    } else {
      const faux = nums.filter((n) => !sur.has(n));
      for (const n of faux) {
        const o = pubs.filter((p) => p.num === n).map((p) => ou(p.x));
        probleme(id, `identifiant ${web ? 'AdSense' : 'AdMob'} pub-${n} cité (${o.join(', ')}), mais le site publie pub-${[...sur].join(', pub-')}`);
      }
      console.log(faux.length ? `   ✖ ${web ? 'AdSense' : 'AdMob'} : pub-${faux.join(', pub-')} ≠ site` : `   ✔ ${web ? 'AdSense' : 'AdMob'} : pub-${nums.join(', pub-')} = site`);
    }
  }

  // c) Hébergeur
  const servi = familleServie(accueil.entetes);
  if (!servi) {
    console.log('   · hébergeur : en-têtes muets (non vérifiable)');
  } else {
    const fausses = [];
    for (const x of lignes) {
      if (!LIGNE_HEBERGEMENT.test(x.l)) continue;
      // Étape déjà faite d'une liste (« 1. ✅ … ») : historique.
      if (/^\s*(\d+\.|[-*])\s*✅/.test(x.l)) continue;
      // Une phrase qui parle d'un autre site (adresse différente) ne compte pas.
      const domaine = site.replace(/^https:\/\/(www\.)?/, '');
      const autresDomaines = (x.l.match(/\b(?:[a-z0-9-]+\.)+(?:com|fr|net|org|io|dev|app)\b/gi) || [])
        .map((d) => d.toLowerCase().replace(/^www\./, ''))
        .filter((d) => !/github\.io|pages\.dev|workers\.dev|toakeur\.com$/.test(d) && d !== domaine && !d.endsWith(`.${domaine}`));
      if (autresDomaines.length && !x.l.toLowerCase().includes(domaine)) continue;
      const cites2 = HEBERGEURS.filter((h) => {
        const m = x.l.match(h.re);
        return m && !PASSE.test(autour(x.l, m.index, 40));
      });
      if (!cites2.length) continue;
      if (cites2.some((h) => h.famille === servi)) continue;
      fausses.push(`${ou(x)} cite ${cites2.map((h) => h.nom).join(' et ')}`);
    }
    const nomServi = servi === 'github' ? 'GitHub Pages' : servi === 'cloudflare' ? 'Cloudflare' : servi;
    if (fausses.length) {
      probleme(id, `le site est servi par ${nomServi}, mais ${fausses.join(' ; ')}`);
      console.log(`   ✖ hébergeur : ${nomServi} servi, ${fausses.length} ligne(s) disent autre chose`);
    } else {
      console.log(`   ✔ hébergeur : ${nomServi}`);
    }
  }

  // d) Articles Conseils en ligne ≈ sitemap (avertissement seulement)
  if (locs.length) {
    const articles = locs.filter((u) => {
      const p = u.replace(/^https?:\/\/[^/]+/, '');
      return /^\/conseils?\/[^/?#]+\/?$/.test(p) || /^\/conseil-[^/]+\.html$/.test(p);
    }).length;
    if (articles) {
      const ecarts = [];
      for (const x of lignes) {
        if (!/conseil/i.test(x.l)) continue;
        const re = /(\d+)\s+(?:articles?\s+)?(?:(?:«\s*)?(?:de\s+)?conseils?(?:\s*»)?\s+)?(publi[ée]s|en ligne)\b/gi;
        for (const m of x.l.matchAll(re)) {
          // Le mot « conseil » doit qualifier CE nombre (dans la formule ou
          // juste avant) : « Articles et conseils… 39 articles, dont 24 en
          // ligne » parle d'autre chose.
          if (!/conseil/i.test(m[0]) && !/conseil/i.test(x.l.slice(Math.max(0, m.index - 40), m.index))) continue;
          if (+m[1] !== articles) ecarts.push(`${m[1]} (${ou(x)})`);
        }
      }
      if (ecarts.length) {
        avertir(id, `le sitemap compte ${articles} articles Conseils, les fiches disent ${[...new Set(ecarts)].join(' ; ')}`);
        console.log(`   ⚠ Conseils : ${articles} dans le sitemap, fiches ${ecarts.length} écart(s)`);
      } else {
        console.log(`   ✔ Conseils : ${articles} dans le sitemap`);
      }
    }
  }
}

async function verifieApp(id) {
  const dossier = path.join(APPS, id);
  const manifeste = JSON.parse(lire(path.join(dossier, 'app.json')) || '{}');
  const nom = manifeste.name || id;
  const infra = lire(path.join(dossier, 'infra.md'));
  const publication = lire(path.join(dossier, 'publication.md'));
  const marketing = lire(path.join(dossier, 'marketing.md'));
  const readme = lire(path.join(dossier, 'readme.md'));
  console.log(`\n── ${nom} (${id})`);

  // 1. Le dépôt déclaré existe-t-il sous CE nom ?
  if (manifeste.repo) {
    const r = await teste(`https://api.github.com/repos/${manifeste.repo}`);
    if (r.status === 403 || r.status === 429 || r.status === 0) {
      const cause = r.status === 0 ? r.erreur : `HTTP ${r.status} — quota GitHub épuisé ou droit manquant`;
      avertir(id, `dépôt ${manifeste.repo} non vérifiable (${cause})`);
      console.log(`   · dépôt ${manifeste.repo} → non vérifiable (${cause})`);
    } else if (!r.ok) {
      probleme(id, `dépôt ${manifeste.repo} introuvable (HTTP ${r.status})`);
      console.log(`   ✖ dépôt ${manifeste.repo} introuvable`);
    } else {
      // GitHub suit la redirection d'un dépôt renommé : on compare le nom servi.
      const servi = r.url.replace('https://api.github.com/repos/', '');
      if (servi.toLowerCase() !== manifeste.repo.toLowerCase()) {
        probleme(id, `app.json dit ${manifeste.repo}, le dépôt s'appelle ${servi}`);
        console.log(`   ✖ dépôt renommé : ${manifeste.repo} → ${servi}`);
      } else {
        console.log(`   ✔ dépôt ${manifeste.repo}`);
      }
    }
  } else {
    console.log('   · aucun dépôt déclaré');
  }

  // 2. Les adresses citées répondent-elles ?
  const adresses = [...new Set([...adressesDe(infra || ''), ...adressesDe(publication || '')])];
  for (const u of adresses) {
    const r = await teste(u);
    if (r.ok) { console.log(`   ✔ ${u}`); continue; }
    // 401 et 403 : la page existe, elle refuse juste un visiteur anonyme.
    // 429 : le site limite les visites répétées (Apple le fait) ; ce n'est pas une panne.
    if (r.status === 401 || r.status === 403 || r.status === 429) {
      console.log(`   · ${u} → ${r.status}, protégé ou limité (non vérifiable)`);
      continue;
    }
    probleme(id, `${u} ne répond pas (${r.status || r.erreur})`);
    console.log(`   ✖ ${u} → ${r.status || r.erreur}`);
  }

  // 4. Versions « en ligne » ↔ versions réellement servies par les boutiques
  const boutiques = JSON.parse(lire(path.join(dossier, 'status.json')) || '{}').boutiques;
  if (boutiques) {
    const magasins = [
      ['App Store', boutiques.appStore, /app store|ios|🍎/i],
      ['Google Play', boutiques.googlePlay, /google play|android|🤖/i],
    ];
    for (const [nomB, b, motif] of magasins) {
      if (!b?.version) continue;
      const fausses = [];
      // Un ÉTAT présent (« en ligne depuis… », « est en ligne »), pas un événement passé
      // (« a été mise en ligne le 15 octobre »), qui reste vrai dans l'historique.
      const etat = /(en ligne|en production) depuis|(est|sont) (en ligne|en production)|\[ok\][^|→]*en ligne/i;
      for (const ligne of [infra, publication, marketing, readme].map((t) => t || '').join('\n').split('\n')) {
        if (!etat.test(ligne) || !motif.test(ligne)) continue;
        // Étape déjà faite d'une liste (« 3. ✅ … ») : c'est de l'historique daté.
        if (/^\s*(\d+\.|[-*])\s*✅/.test(ligne)) continue;
        // Une ligne qui cite la bonne version (même avec l'historique) est juste.
        if (ligne.includes(b.version)) continue;
        // Cellule ou étape propre à cette boutique : on ne regarde que ce segment.
        const segments = ligne.split(/→|\||;/).filter((s) => motif.test(s) && etat.test(s));
        for (const s of segments) {
          // « depuis la 1.0.2 », « avec la 1.0.2 » : le point de départ d'un
          // fait (la pub est en ligne depuis la 1.0.2), pas la version servie.
          const v = [...s.matchAll(/\b\d+\.\d+\.\d+\b/g)]
            .find((m) => !/(depuis|avec|d[èe]s)\s+(la\s+)?(version\s+)?$/i.test(s.slice(0, m.index)));
          if (v && v[0] !== b.version) fausses.push(`${v[0]} (« ${s.trim().slice(0, 70)} »)`);
        }
      }
      if (fausses.length) {
        probleme(id, `${nomB} sert la ${b.version}, les fiches annoncent ${[...new Set(fausses)].join(' ; ')}`);
        console.log(`   ✖ ${nomB} : ${b.version} en ligne, fiches en retard`);
      } else {
        console.log(`   ✔ ${nomB} : ${b.version} en ligne, fiches à jour`);
      }
    }
  }

  // 3. Services déclarés ↔ sections documentées
  if (infra) {
    const titres = (infra.match(/^#{2,4} .*/gm) || []).map((t) => normalise(t.replace(/^#+\s*/, '')));
    const declares = manifeste.services || [];
    const sansSection = [];
    for (const id2 of declares) {
      const svc = SERVICES.find((s) => s.id === id2);
      if (!svc) {
        probleme(id, `service inconnu « ${id2} » dans app.json`);
        continue;
      }
      const aiguilles = aiguillesDe(svc, id2);
      const trouve = titres.some((t) => aiguilles.some((a) => a.length > 2 && (t.includes(a) || a.includes(t))));
      if (!trouve) sansSection.push(id2);
    }
    if (sansSection.length) {
      avertir(id, `déclaré sans section dans infra.md → ${sansSection.join(', ')}`);
      console.log(`   ⚠ sans section : ${sansSection.join(', ')}`);
    } else if (declares.length) {
      console.log(`   ✔ ${declares.length} service(s), tous documentés`);
    }

    // Le contrôle inverse : une section qui documente un service que le
    // manifeste ne déclare pas. Sans lui, un service bien réel reste
    // invisible sur la carte de l'app.
    const sansDeclaration = [];
    for (const t of titres) {
      if (horsService(t)) {
        continue;
      }
      const couvert = declares.some((id2) => {
        const svc = SERVICES.find((s) => s.id === id2);
        return svc && aiguillesDe(svc, id2).some((a) => a.length > 2 && (t.includes(a) || a.includes(t)));
      });
      if (!couvert) {
        sansDeclaration.push(t);
      }
    }
    if (sansDeclaration.length) {
      avertir(id, `section documentée sans service déclaré → ${sansDeclaration.join(' | ')}`);
      console.log(`   ⚠ section sans service déclaré : ${sansDeclaration.join(' | ')}`);
    }
  }

  // 5. Le site en ligne ↔ les quatre fichiers
  await verifieSite(id, manifeste, { infra, marketing, publication, readme });
}

// Résultat lu par l'Accueil du Studio (studio/ est ignoré par git). Un passage
// limité à une app ne remplace que les lignes de cette app.
function ecrisResultat(ids) {
  const fichier = path.join(RACINE, 'studio', 'verification.json');
  let garde = { problemes: [], avertissements: [] };
  if (seulement) {
    try {
      const ancien = JSON.parse(fs.readFileSync(fichier, 'utf8'));
      const autre = (x) => x && !ids.includes(x.app);
      garde = {
        problemes: (ancien.problemes || []).filter(autre),
        avertissements: (ancien.avertissements || []).filter(autre),
      };
    } catch { /* pas encore de fichier : on part de rien */ }
  }
  const resultat = {
    le: new Date().toISOString(),
    problemes: [...garde.problemes, ...problemes],
    avertissements: [...garde.avertissements, ...avertissements],
  };
  try {
    fs.mkdirSync(path.dirname(fichier), { recursive: true });
    fs.writeFileSync(fichier, JSON.stringify(resultat, null, 2) + '\n');
    console.log(`\n📝 Résultat écrit dans studio/verification.json`);
  } catch (e) {
    console.warn(`\n⚠️  studio/verification.json non écrit (${e.message})`);
  }
}

(async () => {
  const ids = fs
    .readdirSync(APPS)
    .filter((d) => fs.existsSync(path.join(APPS, d, 'app.json')))
    .filter((d) => !seulement || d === seulement)
    .sort();
  if (!ids.length) {
    console.error(`Aucune app « ${seulement} ».`);
    process.exit(1);
  }
  console.log(`Vérification de ${ids.length} app(s) — faits contrôlés, pas d'impressions.`);
  for (const id of ids) await verifieApp(id);

  ecrisResultat(ids);

  console.log('\n═══════════════════════════════════════');
  if (avertissements.length) {
    console.log(`\n⚠ ${avertissements.length} point(s) à surveiller :`);
    avertissements.forEach((a) => console.log(`   ${a.app} : ${a.texte}`));
  }
  if (problemes.length) {
    console.log(`\n✖ ${problemes.length} donnée(s) fausse(s) :`);
    problemes.forEach((p) => console.log(`   ${p.app} : ${p.texte}`));
    process.exit(1);
  }
  console.log('\n✅ Tout ce que le Dashboard affiche est vérifié exact.');
})();

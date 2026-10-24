// ---------- À faire : tout ce qu'il reste à faire, pour tous les sites et applis ----------
// Une seule liste, triée (à décider, puis problèmes graves, puis le reste),
// assemblée à partir de ce que les autres modules savent déjà :
//  - problèmes d'indexation ouverts (onglet Indexation, mêmes id, même file) ;
//  - tâches planifiées bloquées, sans compte rendu, ou pas passées (routines.js) ;
//  - tests GitHub en échec (data/apps/<id>/status.json) ;
//  - données fausses et avertissements du vérificateur de fiches (studio/verification.json) ;
//  - produits Amazon indisponibles (studio/amazon-verifs.json, tenu par « Sites du jour ») ;
//  - lignes « à faire » de Comptes & adresses (studio/comptes.json) ;
//  - applis en pause : décider si elles repartent (fiches des applis) ;
//  - vidéos validées qui attendent d'être placées dans le planning ;
//  - décisions et problèmes du Point du matin (studio/point-du-matin.json) ;
//  - éléments déposés par les tâches (POST /api/afaire → studio/afaire.json).
//
// « Envoyer à Claude » (ou « Oui » pour une décision) met l'élément dans UNE
// file commune (fileAfaire), que la routine « Sites du jour » (5 h 05, partie
// référencement) applique avant de rendre compte (retourAfaire). Le Studio ne
// lance jamais Claude lui-même. Tout ce qui est personnel reste dans studio/,
// hors dépôt.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ROOT } from './config.js';
import { STUDIO_DIR } from './studio.js';
import { etatIndexation, envoyerAClaude, fileClaude, retourClaude, consigneClaude, depotDe } from './indexation.js';
import { routines, passageManque } from './routines.js';
import { pointDuMatin, repondre, fileActions, retourAction } from './point.js';
import { comptes } from './comptes.js';
import { applis } from './applis.js';
import { planning } from './planning.js';

const FICHIER = path.join(STUDIO_DIR, 'afaire.json');
const VERIFICATION = path.join(STUDIO_DIR, 'verification.json');
const AMAZON = path.join(STUDIO_DIR, 'amazon-verifs.json');
const APPS = path.join(ROOT, 'data', 'apps');
const DEV = path.join(os.homedir(), 'Dev', 'apps');
const JOUR = 86400000;
const FAITS_VISIBLES = 3 * JOUR; // un élément fait reste affiché 3 jours, avec son compte rendu

const lireJson = (f, defaut) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return defaut;
  }
};
const lire = () => {
  const d = lireJson(FICHIER, {});
  return { elements: d.elements || {}, suivi: d.suivi || {} };
};
const ecrire = (d) => {
  // On oublie ce qui est fait depuis plus de 7 jours.
  const vieux = Date.now() - 7 * JOUR;
  for (const [id, s] of Object.entries(d.suivi)) {
    if (s.statut === 'fait' && new Date(s.retour || s.le).getTime() < vieux) {
      delete d.suivi[id];
      delete d.elements[id];
    }
  }
  fs.mkdirSync(STUDIO_DIR, { recursive: true });
  fs.writeFileSync(FICHIER, JSON.stringify(d, null, 2));
};
const maintenant = () => new Date().toISOString();
const court = (s, n = 1500) => String(s || '').trim().slice(0, n);
const date = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '');

// ---------- Sites et applis : un nom, un dossier ----------
const SITES = [
  ['Keur Cook', 'keurcook', ['alohash', 'keurcook', 'keurcook.com', 'keur cook']],
  ['Keurbook', 'Keurbook', ['keurbook', 'keurbook.com']],
  ['Keur Déco', 'keurdeco', ['keurdeco', 'keurdeco.com', 'keur deco']],
  ['Kultiled', 'optiled', ['optiled', 'kultiled', 'kultiled.com', 'optiled.fr']],
  ['Solelis', 'Solelis', ['solelis', 'solelis.com']],
  ['Keur Foot', 'Keurfoot', ['keurfoot', 'keurfoot.com', 'keur foot']],
  ['Keur Kado', 'keurkado', ['keurkado', 'keurkado.com', 'keur kado']],
  ['Erea', 'erea', ['erea', 'erea.toakeur.com']],
  ['Palabre', 'palabre', ['palabre']],
  ['Kultiva', 'kultiva', ['kultiva']],
  ['Studio', 'Studio', ['studio']],
];
const normal = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .trim();
const GENERAL = 'Général';
export function nomSite(s) {
  const k = normal(s);
  if (!k) return GENERAL;
  const t = SITES.find(([nom, , cles]) => normal(nom) === k || cles.some((c) => normal(c) === k || normal(c).replace(/ /g, '') === k.replace(/ /g, '')));
  return t ? t[0] : String(s).trim();
}
// Devine le site dont parle un texte (nom d'une tâche, résumé…).
function siteDans(...textes) {
  const t = normal(textes.join(' ')).replace(/[-_]/g, ' ');
  const trouve = SITES.find(([nom, , cles]) => [nom, ...cles].some((c) => !c.includes('.') && t.includes(normal(c))));
  return trouve ? trouve[0] : GENERAL;
}
const tilde = (d) => (d ? String(d).replace(/^~(?=\/|$)/, os.homedir()) : '');
function dossierDe(site) {
  const t = SITES.find(([nom]) => nom === site);
  const d = t && path.join(DEV, t[1]);
  return d && fs.existsSync(d) ? d : '';
}

// ---------- Les sources ----------
function deIndexation() {
  let etat;
  try {
    etat = etatIndexation();
  } catch {
    return [];
  }
  const liste = [];
  for (const s of etat.sites) {
    const site = nomSite(s.domaine);
    for (const p of s.problemes) {
      const ouvert = !p.corrige || p.corrige.statut === 'echec';
      const parClaude = p.corrige && /^Corrigé par Claude/.test(p.corrige.compteRendu || '') && Date.now() - new Date(p.corrige.le).getTime() < FAITS_VISIBLES;
      if (!ouvert && !parClaude) continue;
      const n = p.urls.length;
      const etatEl = !ouvert ? 'fait' : p.envoi?.statut === 'envoye' ? 'envoye' : p.envoi?.statut === 'bloque' ? 'bloque' : 'a-faire';
      liste.push({
        id: p.id,
        source: 'indexation',
        type: 'probleme',
        grave: p.gravite >= 3,
        site,
        texte: `Google : ${p.titre.charAt(0).toLowerCase()}${p.titre.slice(1)}${n ? ` (${n} page${n > 1 ? 's' : ''})` : ''}.`,
        detail: `${p.explication} Solution : ${p.solution}${p.corrige?.statut === 'echec' ? ' (déjà corrigé une fois, toujours pas réglé)' : ''}`,
        consigne: consigneClaude(p, s.domaine),
        dossier: depotDe(s.domaine) || '',
        action: p.action === 'plan' ? 'plan' : 'claude',
        etat: etatEl,
        compteRendu: etatEl === 'fait' ? p.corrige.compteRendu.replace(/^Corrigé par Claude : /, '') : etatEl === 'bloque' ? p.envoi.message || '' : '',
        le: p.envoi?.le || null,
      });
    }
  }
  return liste;
}

function deRoutines() {
  let liste;
  try {
    liste = routines();
  } catch {
    return [];
  }
  const sortie = [];
  for (const r of liste.filter((x) => x.active)) {
    const site = siteDans(r.id, r.nom, r.detail, r.aFaire);
    const manque = passageManque(r);
    if (r.statut === 'bloquee') {
      sortie.push({
        id: `routine:${r.id}`,
        source: 'routine',
        type: 'probleme',
        grave: true,
        site,
        texte: `La tâche « ${r.nom} » s'est arrêtée${r.dernierPassage ? ` le ${date(r.dernierPassage)}` : ''}.`,
        detail: [r.detail, r.aFaire].filter(Boolean).join(' — '),
        consigne: `La tâche planifiée « ${r.nom} » (${r.id}) s'est arrêtée à son dernier passage${r.dernierPassage ? ` (${date(r.dernierPassage)})` : ''}.
Résumé du passage : ${r.detail || '(aucun)'}
Ce qu'elle demande : ${r.aFaire || '(rien de précis)'}
Relis ses instructions dans ~/.claude/scheduled-tasks/${r.id}/SKILL.md, puis termine ce qui manque si c'est sans risque, en respectant ces instructions. Si cela demande une action de Jean (compte, paiement, réglage, message…), ne fais rien et explique-lui pas à pas ce qu'il doit faire.`,
        dossier: dossierDe(site),
        depuis: r.dernierPassage,
      });
    } else if (manque) {
      // Elle aurait dû passer aujourd'hui (Mac éteint ou en veille, appli Claude fermée…).
      sortie.push({
        id: `routine-absente:${r.id}:${manque.slice(0, 10)}`,
        source: 'routine',
        type: 'probleme',
        grave: true,
        site,
        texte: `La tâche « ${r.nom} » n'est pas passée ce matin (prévue ${r.horaire.replace(/^tous les jours /, '')}).`,
        detail: `Dernier passage connu : ${r.dernierPassage ? new Date(r.dernierPassage).toLocaleString('fr-FR') : 'aucun'}. Souvent : le Mac était éteint ou en veille, ou l'appli Claude fermée. Pour la lancer tout de suite : appli Claude → Routines → la tâche → « Exécuter maintenant ».`,
        consigne: `La tâche planifiée « ${r.nom} » (${r.id}) n'est pas passée aujourd'hui à l'heure prévue (${r.horaire}). Lis ses instructions dans ~/.claude/scheduled-tasks/${r.id}/SKILL.md et fais ce passage maintenant, en respectant ces instructions, puis rends compte en une ou deux phrases simples.`,
        dossier: dossierDe(site),
        depuis: manque,
      });
    } else if (r.statut === 'inconnu' && r.dernierPassage) {
      sortie.push({
        id: `routine-muette:${r.id}:${r.dernierPassage.slice(0, 10)}`,
        source: 'routine',
        type: 'probleme',
        grave: false,
        site,
        texte: `La tâche « ${r.nom} » est passée le ${date(r.dernierPassage)} sans laisser de compte rendu.`,
        detail: 'Elle a peut-être été interrompue (Mac en veille, appli fermée). Réglages → Routines montre son dernier passage.',
        consigne: `La tâche planifiée « ${r.nom} » (${r.id}) est passée le ${date(r.dernierPassage)} sans laisser de compte rendu. Lis ses instructions dans ~/.claude/scheduled-tasks/${r.id}/SKILL.md, vérifie (sans rien casser) si son travail a bien été fait — dépôts, fichiers ou Studio qu'elle met à jour — et termine ce qui manque si c'est sans risque. Rends compte en une ou deux phrases simples ; si cela demande une action de Jean, explique-lui pas à pas.`,
        dossier: dossierDe(site),
        depuis: r.dernierPassage,
      });
    }
  }
  return sortie;
}

function infoApps() {
  let ids = [];
  try {
    ids = fs.readdirSync(APPS).filter((id) => fs.existsSync(path.join(APPS, id, 'app.json')));
  } catch {}
  return ids.map((id) => {
    const app = lireJson(path.join(APPS, id, 'app.json'), {});
    const status = lireJson(path.join(APPS, id, 'status.json'), {});
    const nom = app.name || nomSite(id);
    const depot = String(app.repo || '').split('/')[1] || '';
    const dossier = dossierDe(nomSite(nom)) || (depot && fs.existsSync(path.join(DEV, depot)) ? path.join(DEV, depot) : '');
    return { id, nom: nomSite(nom), repo: app.repo || '', dossier, ci: status.ci || null };
  });
}

function deTests(apps) {
  return apps
    .filter((a) => a.ci?.conclusion === 'failure')
    .map((a) => ({
      id: `tests:${a.id}`,
      source: 'tests',
      type: 'probleme',
      grave: true,
      site: a.nom,
      texte: `Les tests automatiques de ${a.nom} échouent sur GitHub.`,
      detail: `Dernier passage le ${date(a.ci.updatedAt)}.`,
      lien: a.ci.url || '',
      consigne: `Les tests automatiques GitHub (GitHub Actions) du dépôt ${a.repo} échouent depuis le ${date(a.ci.updatedAt)}${a.ci.url ? ` (${a.ci.url})` : ''}.
Lis le CLAUDE.md du dépôt, puis : git checkout main && git pull --ff-only ; lis le journal du passage en échec (gh run view --log-failed -R ${a.repo}) ; trouve la cause et corrige-la à la source, sans désactiver ni affaiblir un test ; vérifie en local que les tests et la construction passent ; commit en français sur main et push. Vérifie ensuite avec « gh run list -R ${a.repo} -L 3 » que le nouveau passage est vert.`,
      dossier: a.dossier,
      depuis: a.ci.updatedAt,
    }));
}

function deVerification(apps) {
  const v = lireJson(VERIFICATION, null);
  if (!v || !Array.isArray(v.problemes)) return [];
  return v.problemes
    .filter((p) => p && p.texte)
    .map((p) => {
      const app = apps.find((a) => normal(a.id) === normal(p.app) || normal(a.nom) === normal(nomSite(p.app))) || null;
      const site = app ? app.nom : nomSite(p.app);
      const h = crypto.createHash('sha1').update(`${p.app}|${p.texte}`).digest('hex').slice(0, 10);
      return {
        id: `fiches:${normal(p.app) || 'studio'}:${h}`,
        source: 'fiches',
        type: 'probleme',
        grave: true,
        site,
        texte: `Donnée fausse dans la fiche : ${court(p.texte, 300)}`,
        detail: `Trouvée par la vérification des fiches${v.le ? ` du ${date(v.le)}` : ''}.`,
        consigne: `La vérification des fiches du Studio a trouvé une donnée fausse dans la fiche de ${site} : « ${p.texte} ».
Les fiches viennent du dépôt ${app?.repo || site} : infra.md = docs/INFRA.md, marketing.md = docs/MARKETING.md, publication.md = docs/PUBLICATION.md (les numéros de ligne cités sont ceux de ces fichiers). Lis le CLAUDE.md du dépôt, git pull --ff-only, puis corrige la donnée dans le bon fichier avec la valeur vraie, vérifiée à la source (App Store, Google Play, site en ligne, code du dépôt) ; n'invente rien ; si la valeur vraie est introuvable, écris « à vérifier » plutôt qu'une valeur fausse. Commit en français sur main et push : le Studio rapatriera la fiche à sa prochaine synchro.`,
        dossier: app?.dossier || dossierDe(site),
        depuis: v.le || null,
      };
    });
}

// Les avertissements du vérificateur qui demandent une vraie correction. Les
// écarts d'un article Conseils (le sitemap a un article de plus que la fiche)
// se rattrapent seuls à la tâche des fiches (6 h 30) : on ne les montre pas.
function deAvertissements(apps) {
  const v = lireJson(VERIFICATION, null);
  if (!v || !Array.isArray(v.avertissements)) return [];
  return v.avertissements
    .filter((p) => p && p.texte && !/articles? conseils/i.test(p.texte))
    .map((p) => {
      const app = apps.find((a) => normal(a.id) === normal(p.app) || normal(a.nom) === normal(nomSite(p.app))) || null;
      const site = app ? app.nom : nomSite(p.app);
      const h = crypto.createHash('sha1').update(`${p.app}|${p.texte}`).digest('hex').slice(0, 10);
      return {
        id: `fiches-avert:${normal(p.app) || 'studio'}:${h}`,
        source: 'fiches',
        type: 'probleme',
        grave: false,
        site,
        texte: `Fiche à compléter : ${court(p.texte, 300)}`,
        detail: `Avertissement de la vérification des fiches${v.le ? ` du ${date(v.le)}` : ''}.`,
        consigne: `La vérification des fiches du Studio signale, pour ${site} : « ${p.texte} ».
Les fiches viennent du dépôt ${app?.repo || site} : infra.md = docs/INFRA.md, marketing.md = docs/MARKETING.md, publication.md = docs/PUBLICATION.md. Lis le CLAUDE.md du dépôt, git pull --ff-only, puis complète la fiche pour que la section et la liste des services déclarés concordent, avec des faits vérifiés à la source (code du dépôt, console du service) ; n'invente rien ; si un fait est introuvable, écris « à vérifier ». Commit en français sur main et push.`,
        dossier: app?.dossier || dossierDe(site),
        depuis: v.le || null,
      };
    });
}

// ---------- Produits Amazon indisponibles ----------
// « Sites du jour » (partie Amazon) note chaque produit vérifié dans
// studio/amazon-verifs.json ; une ligne par site, avec les produits à
// remplacer. Un produit qui n'est plus cité dans le dépôt (déjà remplacé) ou
// déjà déposé à part par la tâche (amazon:<dépôt>:<ASIN>) n'est pas recompté.
// Produits masqués exprès, à remettre dès leur retour sur Amazon.fr (décision
// de Jean du 19/10/2026 : guedj et café Touba de Keur Cook).
const MASQUES = { keurcook: { B0DK3SVDJN: 'guedj', B0B52RYJS8: 'café Touba' } };
const AMAZON_TAGS = { keurcook: 'keurcookfr-21', keurbook: 'keurbookfr-21', keurfoot: 'keurfootfr-21', keurkado: 'keurkadofr-21' };
let citesCache = { at: 0, data: new Map() };
// Les ASIN encore cités dans le dépôt (git grep : rapide, suit .gitignore).
function encoreCites(dossier, asins) {
  if (Date.now() - citesCache.at > 10 * 60 * 1000) citesCache = { at: Date.now(), data: new Map() };
  const cle = `${dossier}|${asins.join(',')}`;
  if (citesCache.data.has(cle)) return citesCache.data.get(cle);
  let cites = null;
  try {
    const sortie = execFileSync('git', ['-C', dossier, 'grep', '-h', '-o', '-F', ...asins.flatMap((a) => ['-e', a])], { encoding: 'utf8', maxBuffer: 8 << 20, timeout: 10000 });
    cites = new Set(sortie.split('\n').filter(Boolean));
  } catch (e) {
    // git grep sort en code 1 quand rien n'est trouvé ; une autre erreur = on ne sait pas.
    cites = e.status === 1 ? new Set() : null;
  }
  citesCache.data.set(cle, cites);
  return cites;
}

function deAmazon(d) {
  const verifs = lireJson(AMAZON, null);
  if (!verifs || typeof verifs !== 'object') return [];
  const liste = [];
  for (const [depot, produits] of Object.entries(verifs)) {
    const masques = MASQUES[depot.toLowerCase()] || {};
    const site = nomSite(depot);
    const dossier = fs.existsSync(path.join(DEV, depot)) ? path.join(DEV, depot) : dossierDe(site);
    const mauvais = Object.entries(produits || {}).filter(
      ([asin, p]) => ['indisponible', 'introuvable'].includes(p?.etat) && !masques[asin] && !d.elements[`amazon:${depot}:${asin}`],
    );
    const cites = dossier && mauvais.length ? encoreCites(dossier, mauvais.map(([a]) => a)) : null;
    const aRemplacer = cites ? mauvais.filter(([a]) => cites.has(a)) : mauvais;
    if (aRemplacer.length) {
      const n = aRemplacer.length;
      const tag = AMAZON_TAGS[depot.toLowerCase()];
      liste.push({
        id: `amazon-lot:${depot}`,
        source: 'produits-amazon',
        type: 'probleme',
        grave: false,
        site,
        texte: `${n} produit${n > 1 ? 's' : ''} Amazon plus disponible${n > 1 ? 's' : ''} à remplacer.`,
        detail: aRemplacer.map(([a, p]) => `${a} : ${p.etat} (vu le ${p.le})`).join('\n'),
        consigne: `Dans le dépôt ${dossier || site}, ces produits Amazon ne sont plus achetables (relevé de la vérification quotidienne) :
${aRemplacer.map(([a, p]) => `- ${a} : ${p.etat} le ${p.le}`).join('\n')}
Lis le CLAUDE.md du dépôt, git pull --ff-only, puis retrouve où chacun est cité (git grep). Pour chacun : vérifie d'abord sur amazon.fr avec le navigateur intégré qu'il est toujours indisponible (s'il est revenu, laisse-le) ; sinon remplace-le par un produit équivalent bien noté (même usage et même gamme de prix, au moins 4 étoiles et 50 avis, proposé à l'achat), en suivant les règles du site${tag ? ` et en gardant l'identifiant partenaire ${tag}` : ''} ; n'invente jamais un ASIN, une note, un avis ou un prix. Si aucun équivalent fiable n'existe, retire proprement le produit sans casser un top ni une liste. Mets à jour ${AMAZON} (état « ok » pour les nouveaux produits vérifiés). Tests et construction doivent passer avant le push sur main ; commit en français.`,
        dossier,
        depuis: aRemplacer.map(([, p]) => p.le).sort().pop(),
      });
    }
    // Les produits masqués : en attente de leur retour, ou de retour (à remettre).
    const vus = Object.entries(masques).map(([asin, nom]) => [asin, nom, produits?.[asin]]);
    if (vus.length) {
      const revenus = vus.filter(([, , p]) => p?.etat === 'ok' && p.le >= '2026-10-19');
      const noms = (l) => l.map(([, nom]) => nom).join(' et ');
      liste.push({
        id: `amazon-masques:${depot}`,
        source: 'produits-amazon',
        type: 'probleme',
        grave: false,
        site,
        texte: revenus.length
          ? `De retour sur Amazon : ${noms(revenus)} — à remettre sur ${site}.`
          : `${noms(vus).charAt(0).toUpperCase()}${noms(vus).slice(1)} masqués exprès le 19/10 : à remettre dès leur retour sur Amazon.`,
        detail: vus.map(([a, nom, p]) => `${nom} (${a}) : ${p ? `${p.etat}, vu le ${p.le}` : 'pas encore revérifié'}`).join('\n'),
        consigne: `Sur ${site} (dépôt ${dossier}), ${noms(vus)} ont été masqués le 19/10/2026 parce qu'ils n'étaient plus achetables sur Amazon.fr (commit 5db14fb). Vérifie sur amazon.fr avec le navigateur intégré (${vus.map(([a]) => a).join(', ')}) qu'ils sont de nouveau proposés à l'achat ; si oui, remets leur offre (guedj dans amazonOffers de src/lib/demo/catalog.ts, café Touba dans amazon de catalog-nouveautes.ts) et les liens /produit/guedj et /produit/cafe-touba dans les articles content/conseils retouchés par 5db14fb, avec l'identifiant partenaire ${AMAZON_TAGS[depot.toLowerCase()] || 'du site'}. Lis le CLAUDE.md du dépôt ; tests et construction avant le push sur main ; commit en français. S'ils sont toujours indisponibles, ne change rien et dis-le.`,
        dossier,
        // Tant qu'ils ne sont pas revenus, il n'y a rien à faire : la ligne attend.
        attente: !revenus.length,
        depuis: vus.map(([, , p]) => p?.le).filter(Boolean).sort().pop() || null,
      });
    }
  }
  return liste;
}

// ---------- Comptes & adresses : ce qu'il reste à faire ----------
// Les lignes « à faire » du récapitulatif (Réglages → Comptes & adresses).
// « C'est fait » les coche là-bas ; une date dépassée les rend graves.
const dateDepassee = (txt) => {
  const m = String(txt || '').match(/(\d{1,2})\/(\d{1,2})/);
  if (!m) return false;
  const d = new Date();
  const ech = new Date(d.getFullYear(), Number(m[2]) - 1, Number(m[1]), 23, 59);
  return ech < d && d - ech < 300 * JOUR;
};
function deComptes() {
  let d;
  try {
    d = comptes();
  } catch {
    return [];
  }
  return d.sections
    .flatMap((s) => s.lignes)
    .filter((l) => l.etat === 'a_faire')
    .map((l) => {
      const site = siteDans(l.quoi);
      return {
        id: `comptes:${l.id}`,
        source: 'comptes',
        type: 'probleme',
        grave: dateDepassee(l.quand),
        site,
        texte: `${l.quoi}${l.apres ? ` → ${l.apres}` : ''}`,
        detail: [l.quand ? `Quand : ${l.quand}` : '', l.note || ''].filter(Boolean).join('\n'),
        consigne: `Dans le récapitulatif « Comptes & adresses » du Studio de Jean, il reste à faire : « ${l.quoi} » (but : ${l.apres || '—'} ; quand : ${l.quand || '—'} ; note : ${l.note || '—'}).
Regarde où en est cette chose, sans rien changer dans un compte (pas de connexion, pas de réglage, pas de paiement, pas de message). Si c'est déjà fait, dis-le simplement dans le compte rendu (Jean touchera « C'est fait » sur l'Accueil). Sinon, explique à Jean pas à pas ce qu'il doit faire lui-même, et où.`,
        dossier: dossierDe(site),
        action: 'comptes',
        compte: l.id,
      };
    });
}

// ---------- Applis en pause : décider si elles repartent ----------
// Une appli dont une boutique dit « en pause » est une décision, pas une panne.
function dePause() {
  let a;
  try {
    a = applis();
  } catch {
    return [];
  }
  return (a?.apps || [])
    .map((app) => {
      const etats = (app.publicationPlateformes || [])
        .map((p) => [p.titre, p.faits?.find((f) => /^[ée]tat$/i.test(String(f.label).trim()))?.value || ''])
        .filter(([, v]) => /en pause/i.test(v));
      if (!etats.length) return null;
      const priorite = (app.marketingSummary?.nextActions || [])[0] || `Décider si ${app.name} repart.`;
      const nom = nomSite(app.name);
      return {
        id: `pause:${app.id}`,
        source: 'pause',
        type: 'decision',
        grave: false,
        site: nom,
        texte: `${app.name} est en pause. ${court(priorite, 300)}`,
        detail: etats.map(([t, v]) => `${t} : ${v}`).join('\n'),
        consigne: `Jean a répondu Oui : ${app.name} repart. Première priorité de sa fiche : « ${priorite} »
Lis le CLAUDE.md du dépôt ${app.repo || nom} et ses fiches (docs/INFRA.md, docs/MARKETING.md, docs/PUBLICATION.md). Fais dans le dépôt seulement ce qui est sans risque pour préparer la reprise (sans toucher à aucun compte, aucun service payant, aucune clé). Puis explique à Jean, pas à pas et en français simple, ce qu'il doit faire lui-même (par exemple rallumer un service en pause, recréer des clés de connexion), dans quel ordre et où.`,
        dossier: dossierDe(nom),
      };
    })
    .filter(Boolean);
}

// ---------- Vidéos validées qui attendent une place dans le planning ----------
function dePlanning() {
  let p;
  let lignes = [];
  try {
    p = planning();
    lignes = comptes().sections.flatMap((s) => s.lignes);
  } catch {
    return [];
  }
  return (p?.aPlacer || []).map((v) => {
    // Le récapitulatif dit peut-être déjà ce qu'est devenue cette vidéo.
    const mot = String(v.titre).split(/\s+/).find((m) => m.length >= 5);
    const note = mot && lignes.find((l) => normal(l.quoi).includes(normal(mot)));
    return {
      id: `planning:${v.projectId}:${v.number}`,
      source: 'planning',
      type: 'probleme',
      grave: false,
      site: nomSite(v.depot === 'recettes' ? 'keurcook' : v.depot),
      texte: `Vidéo à placer dans le planning : « ${court(v.titre, 120)} » (${v.appli}).`,
      detail: `Validée, mais prévue sur aucun compte. « Placer » ouvre la page de l'appli ; « Retirer » la remet « à valider » (le fichier reste sur le Bureau).${note ? `\nComptes & adresses : ${note.quoi} — ${note.resultat || note.apres || ''}.` : ''}`,
      lien: `#/appli/${v.depot === 'recettes' ? 'keurcook' : v.depot}`,
      action: 'planning',
      projectId: v.projectId,
      number: v.number,
    };
  });
}

const etatPoint = (x) => (x.etat === 'demande' ? 'envoye' : x.etat === 'fait' ? 'fait' : x.etat === 'bloque' ? 'bloque' : 'a-faire');
function dePoint() {
  const p = pointDuMatin();
  if (!p?.date) return [];
  // Un point de plus de 3 jours n'a plus cours.
  if (Date.now() - new Date(`${p.date}T12:00:00`).getTime() > 3 * JOUR) return [];
  const el = (x, type) => ({
    id: `point:${p.date}:${x.id}`,
    source: 'point',
    type,
    grave: type === 'probleme',
    site: nomSite(x.site),
    texte: x.texte,
    detail: x.detail || '',
    consigne: x.consigne || x.texte,
    dossier: tilde(x.dossier) || dossierDe(nomSite(x.site)),
    etat: etatPoint(x),
    compteRendu: x.compteRendu || '',
    le: x.le || null,
  });
  return [...(p.decisions || []).map((x) => el(x, 'decision')), ...(p.problemes || []).map((x) => el(x, 'probleme'))].filter(
    (x) => x.etat !== 'fait' || !x.le || Date.now() - new Date(x.le).getTime() < FAITS_VISIBLES,
  );
}

// Les éléments dont l'état est tenu ici (tout sauf indexation et Point du matin).
function deposes(d) {
  return Object.values(d.elements).map((e) => ({ ...e, site: nomSite(e.site), dossier: tilde(e.dossier) || dossierDe(nomSite(e.site)) }));
}

// L'état d'un élément suivi ici, d'après studio/afaire.json.
//  - si la source a changé après le compte rendu (nouveau passage en échec), c'est à refaire ;
//  - un élément déposé de nouveau après avoir été fait est à refaire.
//  - un élément « en attente » (rien à faire tant qu'un fait extérieur n'arrive pas) reste en attente.
function appliquerSuivi(e, s) {
  const base = e.attente ? 'attente' : 'a-faire';
  if (!s) return { ...e, etat: base, compteRendu: '' };
  const depuis = e.depuis || e.majLe;
  if (s.statut !== 'envoye' && depuis && s.retour && new Date(depuis) > new Date(s.retour)) return { ...e, etat: base, compteRendu: '' };
  if (s.statut === 'fait' && Date.now() - new Date(s.retour || s.le).getTime() > FAITS_VISIBLES) return null;
  return { ...e, etat: s.statut, compteRendu: s.compteRendu || '', le: s.le };
}

const ORDRE_ETAT = { 'a-faire': 0, bloque: 1, envoye: 2, attente: 2, fait: 3 };
const rang = (e) => (e.etat === 'fait' ? 9 : e.type === 'decision' ? 0 : e.grave ? 1 : 2);

export function listeAfaire() {
  const d = lire();
  const apps = infoApps();
  const suivis = [
    ...deRoutines(),
    ...deTests(apps),
    ...deVerification(apps),
    ...deAvertissements(apps),
    ...deAmazon(d),
    ...deComptes(),
    ...dePause(),
    ...dePlanning(),
    ...deposes(d),
  ].map((e) => [e.id, appliquerSuivi(e, d.suivi[e.id])]);
  const presents = new Set(suivis.map(([id]) => id));
  const visibles = suivis.map(([, e]) => e).filter(Boolean);
  // Envoyés ou faits récemment, mais que la source ne signale plus : réglés.
  for (const [id, s] of Object.entries(d.suivi)) {
    if (presents.has(id) || !s.copie) continue;
    const quand = s.retour || s.le;
    if (Date.now() - new Date(quand).getTime() > FAITS_VISIBLES) continue;
    if (s.statut === 'envoye') visibles.push({ ...s.copie, id, etat: 'fait', compteRendu: 'Réglé tout seul avant le passage de Claude.' });
    else if (s.statut === 'fait') visibles.push({ ...s.copie, id, etat: 'fait', compteRendu: s.compteRendu || '' });
  }
  // « Laisser en attente » (choix de Jean) : vaut pour toutes les sources, Point du matin et Google compris.
  const misDeCote = (e) => (d.suivi[e.id]?.statut === 'attente' && ['a-faire', 'bloque', 'attente'].includes(e.etat) ? { ...e, etat: 'attente', parJean: true, compteRendu: '' } : e);
  const tout = [...dePoint(), ...deIndexation(), ...visibles]
    .map(misDeCote)
    // eslint-disable-next-line no-unused-vars
    .map(({ depuis, majLe, attente, ...e }) => ({ detail: '', consigne: '', dossier: '', compteRendu: '', ...e }))
    .sort((a, b) => rang(a) - rang(b) || ORDRE_ETAT[a.etat] - ORDRE_ETAT[b.etat] || a.site.localeCompare(b.site, 'fr'));
  const compte = (f) => tout.filter(f).length;
  return {
    le: maintenant(),
    compteurs: {
      aFaire: compte((e) => e.etat === 'a-faire' || e.etat === 'bloque'),
      aDecider: compte((e) => e.type === 'decision' && e.etat === 'a-faire'),
      graves: compte((e) => e.grave && e.type !== 'decision' && (e.etat === 'a-faire' || e.etat === 'bloque')),
      envoyes: compte((e) => e.etat === 'envoye'),
      enAttente: compte((e) => e.etat === 'attente'),
      bloques: compte((e) => e.etat === 'bloque'),
      faits: compte((e) => e.etat === 'fait'),
    },
    elements: tout,
  };
}

// ---------- Déposé par une tâche ----------
// { source, site, texte, detail, consigne, dossier, id?, type? ('decision'|'probleme'), grave? }
// ou, pour dire qu'un élément est réglé : { id, etat: 'fait', compteRendu }.
export function deposer(b) {
  if (!b || typeof b !== 'object') throw new Error('Élément invalide');
  const d = lire();
  const fait = b.etat === 'fait' || b.fait === true;
  if (fait && b.id && !b.texte) {
    const id = String(b.id);
    const actuel = listeAfaire().elements.find((e) => e.id === id);
    if (!actuel && !d.elements[id]) throw new Error('Élément introuvable');
    if (actuel?.source === 'indexation' || actuel?.source === 'point') {
      retourAfaire(id, true, b.compteRendu || 'Réglé.');
      return { ok: true, id };
    }
    d.suivi[id] = { ...(d.suivi[id] || {}), statut: 'fait', retour: maintenant(), le: d.suivi[id]?.le || maintenant(), compteRendu: court(b.compteRendu || 'Réglé.', 600), copie: d.suivi[id]?.copie || (actuel && copie(actuel)) };
    ecrire(d);
    return { ok: true, id };
  }
  if (!b.texte || !String(b.texte).trim()) throw new Error('Il faut au moins un texte');
  const source = court(b.source || 'tache', 60);
  const id = court(b.id, 200) || `${source}:${crypto.createHash('sha1').update(`${b.site}|${b.texte}`).digest('hex').slice(0, 12)}`;
  if (/\|/.test(id) || /^(point|routine|routine-muette|routine-absente|tests|fiches|fiches-avert|comptes|pause|planning|amazon-lot|amazon-masques):/.test(id)) throw new Error('Cet identifiant est réservé');
  const ancien = d.elements[id];
  d.elements[id] = {
    id,
    source,
    type: b.type === 'decision' ? 'decision' : 'probleme',
    grave: Boolean(b.grave),
    site: court(b.site, 80),
    texte: court(b.texte, 400),
    detail: court(b.detail, 1500),
    consigne: court(b.consigne || b.texte, 6000),
    dossier: court(b.dossier, 300),
    lien: court(b.lien, 500),
    cree: ancien?.cree || maintenant(),
    majLe: maintenant(),
  };
  if (fait) d.suivi[id] = { statut: 'fait', le: maintenant(), retour: maintenant(), compteRendu: court(b.compteRendu || 'Réglé.', 600), copie: copie(d.elements[id]) };
  ecrire(d);
  return { ok: true, id };
}

const copie = (e) => ({ source: e.source, type: e.type, grave: e.grave, site: e.site, texte: e.texte, detail: e.detail, dossier: e.dossier, lien: e.lien || '' });
const idPoint = (id) => {
  const m = /^point:([^:]+):(.+)$/.exec(id);
  return m ? { date: m[1], id: m[2] } : null;
};

// ---------- « Envoyer à Claude », « Oui », « Non », « Laisser en attente » ----------
export function envoyer(id, choix = 'oui') {
  if (!['oui', 'non', 'attente', 'reprendre'].includes(choix)) throw new Error('Réponse attendue : oui, non, attente ou reprendre');
  if (choix === 'attente' || choix === 'reprendre') {
    const d = lire();
    const e = listeAfaire().elements.find((x) => x.id === id);
    if (!e) throw new Error('Élément introuvable (déjà réglé ?)');
    if (choix === 'attente') d.suivi[id] = { statut: 'attente', le: maintenant(), copie: copie(e) };
    else if (d.suivi[id]?.statut === 'attente') delete d.suivi[id];
    ecrire(d);
    return listeAfaire();
  }
  const e = listeAfaire().elements.find((x) => x.id === id);
  if (!e) throw new Error('Élément introuvable (déjà réglé ?)');
  if (e.etat === 'fait') throw new Error('Déjà fait');
  if (e.source === 'point') {
    const p = idPoint(id);
    if (pointDuMatin()?.date !== p.date) throw new Error('Ce point du matin a été remplacé');
    repondre(p.id, choix);
  } else if (e.source === 'indexation') {
    if (choix === 'non') throw new Error('Un problème Google ne se refuse pas : il disparaît quand Google voit la page réparée');
    envoyerAClaude(id);
  } else {
    const d = lire();
    d.suivi[id] =
      choix === 'non'
        ? { statut: 'fait', le: maintenant(), retour: maintenant(), compteRendu: 'Noté : on ne fait rien.', copie: copie(e) }
        : { statut: 'envoye', le: maintenant(), copie: copie(e) };
    ecrire(d);
  }
  return listeAfaire();
}

// ---------- La file commune, lue par la routine du matin ----------
export function fileAfaire() {
  const { elements } = listeAfaire();
  const indexation = new Map(
    fileClaude()
      .filter((f) => !f.disparu)
      .map((f) => [f.id, f]),
  );
  const file = elements
    .filter((e) => e.etat === 'envoye')
    .map((e) => {
      const ix = indexation.get(e.id);
      return {
        id: e.id,
        source: e.source,
        type: e.type,
        site: e.site,
        texte: e.texte,
        consigne: ix ? ix.consigne : e.consigne,
        dossier: ix ? ix.dossier || '' : e.dossier,
        envoyeLe: e.le || null,
      };
    });
  // Mails que Jean a cochés pour la corbeille (Point du matin).
  for (const a of fileActions()) {
    if (a.type === 'corbeille') file.push({ id: a.id, source: 'point', type: 'corbeille', site: GENERAL, texte: 'Mettre ces mails à la corbeille', groupes: a.groupes });
  }
  return file;
}

// Compte rendu de la routine : { id, reussi, compteRendu }.
export function retourAfaire(id, reussi, compteRendu) {
  if (!id) throw new Error('Il faut un id');
  if (id.includes('|')) {
    retourClaude(id, compteRendu, reussi);
    return { ok: true };
  }
  if (/^corbeille-/.test(id)) {
    retourAction(id, reussi, compteRendu);
    return { ok: true };
  }
  const p = idPoint(id);
  if (p) {
    if (pointDuMatin()?.date !== p.date) throw new Error('Ce point du matin a été remplacé');
    retourAction(p.id, reussi, compteRendu);
    return { ok: true };
  }
  const d = lire();
  const s = d.suivi[id];
  if (!s || s.statut !== 'envoye') throw new Error('Cet élément n’est pas dans la file');
  d.suivi[id] = { ...s, statut: reussi ? 'fait' : 'bloque', retour: maintenant(), compteRendu: court(compteRendu, 1500) };
  ecrire(d);
  return { ok: true };
}

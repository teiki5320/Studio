// ---------- À faire : tout ce qu'il reste à faire, pour tous les sites et applis ----------
// Une seule liste, triée (à décider, puis problèmes graves, puis le reste),
// assemblée à partir de ce que les autres modules savent déjà :
//  - problèmes d'indexation ouverts (onglet Indexation, mêmes id, même file) ;
//  - tâches planifiées bloquées (routines.js) ;
//  - tests GitHub en échec (data/apps/<id>/status.json) ;
//  - données fausses du vérificateur de fiches (studio/verification.json) ;
//  - décisions et problèmes du Point du matin (studio/point-du-matin.json) ;
//  - éléments déposés par les tâches (POST /api/afaire → studio/afaire.json).
//
// « Envoyer à Claude » (ou « Oui » pour une décision) met l'élément dans UNE
// file commune (fileAfaire), que la routine « Référencement du jour » (6 h)
// applique avant de rendre compte (retourAfaire). Le Studio ne lance jamais
// Claude lui-même. Tout ce qui est personnel reste dans studio/, hors dépôt.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT } from './config.js';
import { STUDIO_DIR } from './studio.js';
import { etatIndexation, envoyerAClaude, fileClaude, retourClaude, consigneClaude, depotDe } from './indexation.js';
import { routines } from './routines.js';
import { pointDuMatin, repondre, fileActions, retourAction } from './point.js';

const FICHIER = path.join(STUDIO_DIR, 'afaire.json');
const VERIFICATION = path.join(STUDIO_DIR, 'verification.json');
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
  return liste
    .filter((r) => r.active && r.statut === 'bloquee')
    .map((r) => {
      const site = siteDans(r.id, r.nom, r.detail, r.aFaire);
      return {
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
      };
    });
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
function appliquerSuivi(e, s) {
  if (!s) return { ...e, etat: 'a-faire', compteRendu: '' };
  const depuis = e.depuis || e.majLe;
  if (s.statut !== 'envoye' && depuis && s.retour && new Date(depuis) > new Date(s.retour)) return { ...e, etat: 'a-faire', compteRendu: '' };
  if (s.statut === 'fait' && Date.now() - new Date(s.retour || s.le).getTime() > FAITS_VISIBLES) return null;
  return { ...e, etat: s.statut, compteRendu: s.compteRendu || '', le: s.le };
}

const ORDRE_ETAT = { 'a-faire': 0, bloque: 1, envoye: 2, fait: 3 };
const rang = (e) => (e.etat === 'fait' ? 9 : e.type === 'decision' ? 0 : e.grave ? 1 : 2);

export function listeAfaire() {
  const d = lire();
  const apps = infoApps();
  const suivis = [...deRoutines(), ...deTests(apps), ...deVerification(apps), ...deposes(d)].map((e) => [e.id, appliquerSuivi(e, d.suivi[e.id])]);
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
  const tout = [...dePoint(), ...deIndexation(), ...visibles]
    // eslint-disable-next-line no-unused-vars
    .map(({ depuis, majLe, ...e }) => ({ detail: '', consigne: '', dossier: '', compteRendu: '', ...e }))
    .sort((a, b) => rang(a) - rang(b) || ORDRE_ETAT[a.etat] - ORDRE_ETAT[b.etat] || a.site.localeCompare(b.site, 'fr'));
  const compte = (f) => tout.filter(f).length;
  return {
    le: maintenant(),
    compteurs: {
      aFaire: compte((e) => e.etat === 'a-faire' || e.etat === 'bloque'),
      aDecider: compte((e) => e.type === 'decision' && e.etat === 'a-faire'),
      graves: compte((e) => e.grave && e.type !== 'decision' && (e.etat === 'a-faire' || e.etat === 'bloque')),
      envoyes: compte((e) => e.etat === 'envoye'),
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
  if (/\|/.test(id) || /^(point|routine|tests|fiches):/.test(id)) throw new Error('Cet identifiant est réservé');
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

// ---------- « Envoyer à Claude », « Oui », « Non » ----------
export function envoyer(id, choix = 'oui') {
  if (!['oui', 'non'].includes(choix)) throw new Error('Réponse attendue : oui ou non');
  const e = listeAfaire().elements.find((x) => x.id === id);
  if (!e) throw new Error('Élément introuvable (déjà réglé ?)');
  if (e.etat === 'fait') throw new Error('Déjà fait');
  if (e.source === 'point') {
    const p = idPoint(id);
    if (pointDuMatin()?.date !== p.date) throw new Error('Ce point du matin a été remplacé');
    repondre(p.id, choix);
  } else if (e.source === 'indexation') {
    if (choix === 'non') throw new Error('Pour un problème Google, utilise « C’est corrigé » dans Indexation');
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

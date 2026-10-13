// ---------- Accueil : ce qui se lit d'un coup d'œil ----------
// Assemble, pour la page d'ouverture, ce que les autres modules savent déjà :
// les sites répondent-ils, quand chaque dépôt a-t-il reçu un envoi, et un
// compteur par entrée du rail. Rien n'est écrit ici ; tout est relu.
// Un échec réseau n'est pas un constat : un site injoignable donne
// « non vérifiable », jamais « en panne », tant qu'on n'a pas de réponse.

import { listRepos } from './github.js';
import { listQueue } from './queue.js';
import { planning } from './planning.js';
import { etatIndexation } from './indexation.js';
import { audience, etatCloudflare } from './audience.js';
import { routines, routinesDuJour } from './routines.js';
import { applis } from './applis.js';

// L'adresse publique de chaque site suivi (clé = dossier data/apps/<id>).
const SITES = {
  alohash: 'https://www.keurcook.com',
  optiled: 'https://www.optiled.fr',
  keurdeco: 'https://www.keurdeco.com',
  keurbook: 'https://www.keurbook.com',
  solelis: 'https://solelis.com',
};

// Gardé 10 minutes. Au-delà, on montre tout de suite le dernier état connu et
// on le rafraîchit en arrière-plan : la connexion peut mettre 10 s par site.
let cacheSites = { at: 0, data: null };
let enVol = null;
function etatSites() {
  const frais = Date.now() - cacheSites.at < 10 * 60 * 1000;
  if (!frais && !enVol) enVol = sonderSites().finally(() => { enVol = null; });
  return cacheSites.data || enVol;
}

// Préchauffe : sites et audience sont relus toutes les 9 minutes, pour que
// l'Accueil n'attende jamais le réseau.
function prechauffer() {
  etatSites();
  if (etatCloudflare().configure) for (const n of [7, 30]) audience(n).catch(() => {});
}
setTimeout(prechauffer, 5000).unref?.();
setInterval(prechauffer, 9 * 60 * 1000).unref?.();

async function sonderSites() {
  const data = {};
  await Promise.all(
    Object.entries(SITES).map(async ([id, url]) => {
      try {
        const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(10000) });
        data[id] = { url, code: res.status, etat: res.ok ? 'ok' : 'ko' };
      } catch {
        data[id] = { url, code: null, etat: 'inconnu' };
      }
    }),
  );
  cacheSites = { at: Date.now(), data };
  return data;
}

async function envois() {
  try {
    const { repos } = await listRepos();
    return Object.fromEntries(repos.map((r) => [r.fullName.toLowerCase(), r.updatedAt]));
  } catch {
    return {};
  }
}

async function vues7j() {
  if (!etatCloudflare().configure) return null;
  try {
    const a = await audience(7);
    const parJour = new Map();
    for (const s of a.sites.filter((x) => x.source === 'Web Analytics')) for (const j of s.jours) parJour.set(j.date, (parJour.get(j.date) || 0) + (j.visiteurs || 0));
    const jours = [...parJour.entries()].sort(([x], [y]) => x.localeCompare(y)).map(([date, n]) => ({ date, n }));
    return { total: jours.reduce((t, j) => t + j.n, 0), jours };
  } catch {
    return null;
  }
}

// La fraîcheur de chaque source d'information : quand a-t-elle été relue
// pour la dernière fois, et au bout de combien d'heures c'est anormal.
// Une source qui ne se met plus à jour se voit tout de suite sur l'Accueil.
function fraicheur(ix, toutes, vues) {
  const a = applis();
  const plusVieilleFiche = (a?.apps || [])
    .map((x) => Object.values(x.fiches || {}).filter(Boolean).sort()[0])
    .filter(Boolean)
    .sort()[0];
  const ficheRoutine = toutes.find((r) => r.id === 'fiches-mes-apps');
  const bloquees = toutes.filter((r) => r.active && r.statut === 'bloquee');
  const dernierRun = toutes.map((r) => r.dernierPassage).filter(Boolean).sort().pop();
  const derniereVue = (vues?.jours || []).map((j) => j.date).sort().pop();
  const ixErreurs = ix.sites.filter((s) => s.erreur).length;
  return [
    { cle: 'code', ic: '🐙', nom: 'Code (GitHub)', le: a?.synchro?.le, seuilH: 7, lien: '#/reglages/depots', erreur: a?.synchro?.ok === false ? a.synchro.erreur || 'synchro en échec' : null },
    { cle: 'fiches', ic: '📄', nom: 'Fiches des applis', le: plusVieilleFiche ? `${plusVieilleFiche}T12:00:00Z` : null, seuilH: 50, lien: '#/applis', detail: ficheRoutine?.dernierPassage ? 'la plus ancienne' : null },
    { cle: 'indexation', ic: '🔎', nom: 'Indexation Google', le: ix.dernierPassage, seuilH: 26, lien: '#/indexation', erreur: ixErreurs ? `${ixErreurs} site(s) en erreur` : null },
    { cle: 'sites', ic: '🌐', nom: 'Sites en ligne', le: cacheSites.at ? new Date(cacheSites.at).toISOString() : null, seuilH: 1, lien: '#/accueil' },
    { cle: 'audience', ic: '📈', nom: 'Audience', le: derniereVue ? `${derniereVue}T12:00:00Z` : null, seuilH: 50, lien: '#/audience', erreur: etatCloudflare().configure ? null : 'clé Cloudflare absente' },
    { cle: 'routines', ic: '⏰', nom: 'Routines', le: dernierRun, seuilH: 26, lien: '#/reglages/routines', erreur: bloquees.length ? `${bloquees.length} bloquée${bloquees.length > 1 ? 's' : ''}` : null },
  ];
}

export async function accueil() {
  const [sites, pushs, vues] = await Promise.all([etatSites(), envois(), vues7j()]);
  const file = listQueue();
  const hier = new Date();
  hier.setDate(hier.getDate() - 1);
  hier.setHours(0, 0, 0, 0);
  const ix = etatIndexation();
  const problemes = ix.sites.flatMap((s) => s.problemes);
  const toutes = routines();
  const auj = new Date().toISOString().slice(0, 10);
  const pubs = planning().publications || [];
  return {
    sites,
    envois: pushs,
    vues,
    fraicheur: fraicheur(ix, toutes, vues),
    compteurs: {
      pagesGoogle: ix.sites.reduce((t, s) => t + (s.indexees || 0), 0),
      pagesTotal: ix.sites.reduce((t, s) => t + (s.total || 0), 0),
      indexation: problemes.filter((p) => !p.corrige || p.corrige.statut === 'echec').length,
      indexationEnvoyes: problemes.filter((p) => p.envoi?.statut === 'envoye').length,
      enCours: file.filter((it) => it.status === 'running' || it.status === 'waiting').length,
      videosHier: file.filter((it) => it.status === 'done' && new Date(it.createdAt) >= hier).length,
      programmees: pubs.filter((p) => !p.publie && p.date >= auj).length,
      routinesDuJour: routinesDuJour(toutes).length,
      routinesBloquees: toutes.filter((r) => r.active && r.statut === 'bloquee').length,
    },
  };
}

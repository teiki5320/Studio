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

// L'adresse publique de chaque site suivi (clé = dossier data/apps/<id>).
const SITES = {
  alohash: 'https://www.keurcook.com',
  optiled: 'https://www.optiled.fr',
  keurdeco: 'https://www.keurdeco.com',
  keurbook: 'https://www.keurbook.com',
  solelis: 'https://solelis.com',
};

let cacheSites = { at: 0, data: {} };
async function etatSites() {
  if (Date.now() - cacheSites.at < 10 * 60 * 1000) return cacheSites.data;
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
    for (const s of a.sites) for (const j of s.jours) parJour.set(j.date, (parJour.get(j.date) || 0) + (j.visiteurs || 0));
    const jours = [...parJour.entries()].sort(([x], [y]) => x.localeCompare(y)).map(([date, n]) => ({ date, n }));
    return { total: jours.reduce((t, j) => t + j.n, 0), jours };
  } catch {
    return null;
  }
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

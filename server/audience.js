// ---------- Audience des sites, lue chez Cloudflare ----------
// Une clé Cloudflare EN LECTURE SEULE (collée dans Réglages) rangée dans
// studio/cloudflare.json — jamais dans le dépôt. Deux sources :
//  - Web Analytics (le petit code de mesure) : visites, pages, pays, sources ;
//  - à défaut, les statistiques de la zone (domaine chez Cloudflare).

import fs from 'node:fs';
import path from 'node:path';
import { STUDIO_DIR } from './studio.js';

const FICHIER = path.join(STUDIO_DIR, 'cloudflare.json');
const API = 'https://api.cloudflare.com/client/v4';

function lire() {
  try {
    return JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
  } catch {
    return {};
  }
}

export function etatCloudflare() {
  return { configure: Boolean(lire().token) };
}

export function enregistrerCle(token) {
  const t = String(token || '').trim();
  if (t.length < 30 || /\s/.test(t)) {
    throw new Error('Clé Cloudflare invalide.');
  }
  fs.writeFileSync(FICHIER, JSON.stringify({ token: t }, null, 2), { mode: 0o600 });
  cache.clear();
}

export function oublierCle() {
  fs.rmSync(FICHIER, { force: true });
  cache.clear();
}

async function rest(chemin) {
  const res = await fetch(`${API}${chemin}`, { headers: { Authorization: `Bearer ${lire().token}` } });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.success === false) {
    const msg = j.errors?.[0]?.message || res.status;
    throw new Error(`Cloudflare a refusé (${chemin.split('?')[0]}) : ${msg}`);
  }
  return j.result;
}

async function graphql(query, variables) {
  const res = await fetch(`${API}/graphql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${lire().token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const j = await res.json().catch(() => ({}));
  if (j.errors?.length) {
    throw new Error(`Cloudflare : ${j.errors[0].message}`);
  }
  if (!j.data) {
    throw new Error(`Cloudflare : réponse vide (${res.status})`);
  }
  return j.data;
}

const RUM = `query ($acc: String!, $hote: String!, $debut: Date!, $fin: Date!) {
  viewer { accounts(filter: {accountTag: $acc}) {
    parJour: rumPageloadEventsAdaptiveGroups(limit: 400, filter: {requestHost: $hote, date_geq: $debut, date_leq: $fin}, orderBy: [date_ASC]) { count sum { visits } dimensions { date } }
    pages: rumPageloadEventsAdaptiveGroups(limit: 15, filter: {requestHost: $hote, date_geq: $debut, date_leq: $fin}, orderBy: [count_DESC]) { count dimensions { requestPath } }
    pays: rumPageloadEventsAdaptiveGroups(limit: 10, filter: {requestHost: $hote, date_geq: $debut, date_leq: $fin}, orderBy: [count_DESC]) { count dimensions { countryName } }
    sources: rumPageloadEventsAdaptiveGroups(limit: 10, filter: {requestHost: $hote, date_geq: $debut, date_leq: $fin}, orderBy: [count_DESC]) { count dimensions { refererHost } }
  } }
}`;

const HOTES = `query ($acc: String!, $debut: Date!) {
  viewer { accounts(filter: {accountTag: $acc}) {
    hotes: rumPageloadEventsAdaptiveGroups(limit: 50, filter: {date_geq: $debut}, orderBy: [count_DESC]) { count dimensions { requestHost } }
  } }
}`;

const ZONE = `query ($zone: String!, $debut: Date!) {
  viewer { zones(filter: {zoneTag: $zone}) {
    httpRequests1dGroups(limit: 400, filter: {date_geq: $debut}, orderBy: [date_ASC]) {
      dimensions { date }
      sum { pageViews countryMap { clientCountryName requests } }
      uniq { uniques }
    }
  } }
}`;

const PAYS = new Intl.DisplayNames(['fr'], { type: 'region' });
const nomPays = (code) => {
  try {
    return code && code.length === 2 ? PAYS.of(code) : code || '—';
  } catch {
    return code || '—';
  }
};

// Cloudflare ne garde le détail précis que sur les 7 derniers jours : une
// demande qui remonte plus loin passe sur un résumé échantillonné, qui perd
// des visites (Solelis : 32 visiteurs cette semaine, 10 « sur 30 jours »).
// On prend donc les jours récents dans le détail précis, et les jours plus
// anciens dans le résumé.
const jourIso = (decalage) => new Date(Date.now() - decalage * 86400000).toISOString().slice(0, 10);
const lireRum = (a, nom) => ({
  jours: (a.parJour || []).map((g) => ({ date: g.dimensions.date, visiteurs: g.sum.visits, vues: g.count })),
  pages: (a.pages || []).map((g) => ({ nom: g.dimensions.requestPath || '/', vues: g.count })),
  pays: (a.pays || []).map((g) => ({ nom: nomPays(g.dimensions.countryName), vues: g.count })),
  // La navigation d'une page à l'autre du même site n'est pas une provenance.
  sources: (a.sources || [])
    .filter((g) => String(g.dimensions.refererHost || '').replace(/^www\./, '') !== nom)
    .map((g) => ({ nom: g.dimensions.refererHost || 'Accès direct', vues: g.count })),
});

async function siteRum(acc, hote, debut) {
  const nom = hote.replace(/^www\./, '');
  const fin = jourIso(0);
  const recent = jourIso(6);
  const precis = lireRum((await graphql(RUM, { acc, hote, debut: debut > recent ? debut : recent, fin })).viewer.accounts[0] || {}, nom);
  if (debut >= recent) return { nom, source: 'Web Analytics', ...precis };
  const resume = lireRum((await graphql(RUM, { acc, hote, debut, fin })).viewer.accounts[0] || {}, nom);
  return {
    nom,
    source: 'Web Analytics',
    jours: [...resume.jours.filter((j) => j.date < recent), ...precis.jours].sort((x, y) => x.date.localeCompare(y.date)),
    pages: resume.pages,
    pays: resume.pays,
    sources: resume.sources,
  };
}

async function siteZone(z, debut) {
  const d = await graphql(ZONE, { zone: z.id, debut });
  const groupes = d.viewer.zones[0]?.httpRequests1dGroups || [];
  const pays = new Map();
  for (const g of groupes) {
    for (const c of g.sum.countryMap || []) {
      pays.set(c.clientCountryName, (pays.get(c.clientCountryName) || 0) + c.requests);
    }
  }
  return {
    nom: z.name,
    source: 'Domaine',
    jours: groupes.map((g) => ({ date: g.dimensions.date, visiteurs: g.uniq.uniques, vues: g.sum.pageViews })),
    pages: [],
    pays: [...pays.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([c, n]) => ({ nom: nomPays(c), vues: n })),
    sources: [],
  };
}

// Pas des sites publics : le Studio lui-même et les anciennes adresses qui
// ne font plus que rediriger (optiled.fr, remplacé par kultiled.com le
// 16/10/2026 et supprimé le 22/10).
const PRIVES = /^(studio|gestion)\.|^avelor\.toakeur\.com$|^(www\.)?optiled\.fr$/;

// Tous les sites, sur la période (en jours). Gardé 10 minutes en mémoire.
const cache = new Map();
export async function audience(jours = 30) {
  if (!lire().token) {
    return { configure: false, sites: [] };
  }
  const n = [7, 30, 90].includes(Number(jours)) ? Number(jours) : 30;
  const deja = cache.get(n);
  if (deja && Date.now() - deja.at < 10 * 60 * 1000) {
    return deja.data;
  }
  const debutD = new Date(Date.now() - (n - 1) * 86400000);
  const debut = debutD.toISOString().slice(0, 10);
  const sites = [];
  const erreurs = [];
  const couverts = new Set();
  let zones = [];
  try {
    zones = await rest('/zones?per_page=50');
  } catch (e) {
    erreurs.push(e.message);
  }
  // Le compte : celui des domaines (la liste des comptes peut rester vide
  // avec une clé en lecture seule).
  const acc = zones[0]?.account?.id || (await rest('/accounts?per_page=5').catch(() => []))[0]?.id;
  // Web Analytics : les sites mesurés, retrouvés par leur nom.
  let hotes = [];
  try {
    // Les sites mesurés : Cloudflare en oublie une partie quand on demande
    // une longue période (au-delà de 30 jours, la liste revient même vide).
    // On réunit donc les sites vus sur 7 jours et sur 30 jours.
    const il = (j) => new Date(Date.now() - (j - 1) * 86400000).toISOString().slice(0, 10);
    const listes = acc ? await Promise.all([7, 30].map((j) => graphql(HOTES, { acc, debut: il(j) }))) : [];
    hotes = [...new Set(listes.flatMap((d) => (d?.viewer.accounts[0]?.hotes || []).map((g) => g.dimensions.requestHost)))]
      .filter((h) => h && !/localhost|pages\.dev$|^\d/.test(h) && !PRIVES.test(h));
  } catch (e) {
    erreurs.push(e.message);
  }
  // Toutes les demandes en même temps : un par un, la page attendait 15 s.
  await Promise.all(hotes.map(async (h) => {
    try {
      const site = await siteRum(acc, h, debut);
      sites.push(site);
      couverts.add(site.nom);
    } catch (e) {
      erreurs.push(`${h} : ${e.message}`);
    }
  }));
  await Promise.all((zones || []).filter((z) => !couverts.has(z.name) && !PRIVES.test(z.name)).map(async (z) => {
    try {
      const site = await siteZone(z, debut);
      if (site.jours.length) sites.push(site);
    } catch (e) {
      erreurs.push(`${z.name} : ${e.message}`);
    }
  }));
  // « www.toakeur.com » et « toakeur.com » sont le même site : on les réunit.
  const fusion = new Map();
  const ajoute = (liste, cle, champ) => {
    const m = new Map(liste.map((x) => [x[cle], { ...x }]));
    return (autre) => {
      for (const x of autre) {
        const y = m.get(x[cle]);
        if (y) for (const c of champ) y[c] = (y[c] || 0) + (x[c] || 0);
        else m.set(x[cle], { ...x });
      }
      return [...m.values()];
    };
  };
  for (const site of sites) {
    const deja = fusion.get(site.nom);
    if (!deja || deja.source !== site.source) {
      if (!deja) fusion.set(site.nom, site);
      continue;
    }
    deja.jours = ajoute(deja.jours, 'date', ['visiteurs', 'vues'])(site.jours).sort((a, b) => a.date.localeCompare(b.date));
    deja.pages = ajoute(deja.pages, 'nom', ['vues'])(site.pages).sort((a, b) => b.vues - a.vues).slice(0, 15);
    deja.pays = ajoute(deja.pays, 'nom', ['vues'])(site.pays).sort((a, b) => b.vues - a.vues);
    deja.sources = ajoute(deja.sources, 'nom', ['vues'])(site.sources).sort((a, b) => b.vues - a.vues);
  }
  sites.splice(0, sites.length, ...fusion.values());
  sites.sort((a, b) => total(b) - total(a));
  const data = { configure: true, jours: n, debut, sites, erreurs };
  // Une réponse incomplète (erreur ou aucun site mesuré) n'est pas gardée :
  // elle afficherait « 0 visiteur » pendant 10 minutes.
  if (!erreurs.length && hotes.length) cache.set(n, { at: Date.now(), data });
  return data;
}

const total = (s) => s.jours.reduce((t, j) => t + (j.visiteurs || 0), 0);

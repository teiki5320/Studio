// Planning des sites : ce qui sortira chaque jour sur chaque site, lu dans
// les dépôts du Mac (~/Dev/apps). Deux sortes d'entrées :
// - les articles déjà écrits et datés dans le futur (le site les montre le
//   jour venu, une page est publique quand sa date est passée) ;
// - les épingles Pinterest prévues (Keur Déco : déjà programmées dans
//   Pinterest puis 5 par jour par la publication automatique ; Keur Cook :
//   les jours « à faire » du plan de la routine Claude).
// Lecture seule : les dates se changent dans les sites eux-mêmes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEV = path.join(os.homedir(), 'Dev/apps');

// champ = nom du champ de date, titre = nom du champ de titre, url(slug) = adresse publique.
const SITES = [
  { cle: 'keurbook', nom: 'Keurbook', domaine: 'keurbook.com', dossier: 'Keurbook', articles: [{ dir: 'content/conseils', champ: 'date', titre: 'title', url: (s) => `https://keurbook.com/conseils/${s}` }] },
  { cle: 'keurcook', nom: 'Keur Cook', domaine: 'keurcook.com', dossier: 'keurcook', articles: [{ dir: 'content/conseils', champ: 'date', titre: 'title', url: (s) => `https://keurcook.com/conseils/${s}` }], pinterest: 'keurcook' },
  {
    cle: 'keurdeco',
    nom: 'Keur Déco',
    domaine: 'keurdeco.com',
    dossier: 'keurdeco',
    articles: [
      { dir: 'contenu/articles', champ: 'publie_le', titre: 'titre', url: (s) => `https://www.keurdeco.com/${s}.html` },
      { dir: 'contenu/conseils', champ: 'publie_le', titre: 'titre', url: (s) => `https://www.keurdeco.com/conseil-${s}.html` },
    ],
    pinterest: 'keurdeco',
  },
  { cle: 'optiled', nom: 'Kultiled', domaine: 'kultiled.com', dossier: 'optiled', articles: [{ dir: 'contenu/conseils', champ: 'publie_le', titre: 'titre', url: (s) => `https://www.kultiled.com/conseil-${s}.html` }] },
  { cle: 'solelis', nom: 'Solelis', domaine: 'solelis.com', dossier: 'Solelis', articles: [{ dir: 'content/conseils', champ: 'date', titre: 'title', url: (s) => `https://solelis.com/conseils/${s}` }] },
  { cle: 'keurfoot', nom: 'Keur Foot', domaine: 'keurfoot.com', dossier: 'Keurfoot', articles: [{ dir: 'content/conseils', champ: 'date', titre: 'title', url: (s) => `https://keurfoot.com/conseils/${s}` }] },
  { cle: 'keurkado', nom: 'Keur Kado', domaine: 'keurkado.com', dossier: 'keurkado', articles: [{ dir: 'content/conseils', champ: 'date', titre: 'title', url: (s) => `https://keurkado.com/conseils/${s}` }] },
];

const lireJson = (f, defaut) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return defaut;
  }
};

// Jour à Paris (AAAA-MM-JJ), comme les sites.
export const jourParis = (d = new Date()) => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(d);
const decaler = (j, n) => {
  const d = new Date(`${j}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const nettoyer = (v) => String(v || '').trim().replace(/^["']|["']$/g, '');

// En-tête d'un article : bloc --- … --- (Markdown) ou commentaire <!-- … --> en tête (HTML).
function entete(texte) {
  const bloc = texte.match(/^---\n([\s\S]*?)\n---/) || texte.match(/^\s*<!--([\s\S]*?)-->/);
  const champs = {};
  for (const ligne of (bloc?.[1] || '').split('\n')) {
    const m = ligne.match(/^\s*([A-Za-z_]+)\s*:\s*(.*)$/);
    if (m && !(m[1] in champs)) champs[m[1]] = nettoyer(m[2]);
  }
  return champs;
}

function articlesDe(site, aujourdhui) {
  const sortie = [];
  for (const a of site.articles) {
    const dir = path.join(DEV, site.dossier, a.dir);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => /\.(md|mdx|html)$/.test(x))) {
      const c = entete(fs.readFileSync(path.join(dir, f), 'utf8'));
      const date = (c[a.champ] || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < aujourdhui || c.brouillon === 'true') continue;
      const slug = c.slug || f.replace(/\.(md|mdx|html)$/, '');
      sortie.push({ date, type: 'article', titre: c[a.titre] || slug, lien: a.url(slug) });
    }
  }
  return sortie;
}

// Keur Déco : épingles déjà programmées dans Pinterest (import CSV), puis
// simulation de la publication automatique (même règle que
// scripts/pinterest-lib.mjs → choisirEpingles), chaque jour à 9 h 17.
function epinglesKeurdeco(site, aujourdhui, jusquA) {
  const racine = path.join(DEV, site.dossier);
  const manifeste = lireJson(path.join(racine, 'public/epingles.json'), { epingles: [] });
  const etat = lireJson(path.join(racine, 'data/pinterest-etat.json'), { publiees: [] });
  const max = Number(lireJson(path.join(racine, 'config/pinterest.json'), {}).max_par_execution || 5);
  const parId = Object.fromEntries((manifeste.epingles || []).map((e) => [e.id, e]));
  const sortie = [];
  const publiees = [...(etat.publiees || [])];
  for (const p of publiees) {
    if (p.publie_le >= aujourdhui) {
      const e = parId[p.id];
      sortie.push({ date: p.publie_le, type: 'epingle', titre: e?.titre || p.slug, lien: e?.lien || null, image: e?.image || null });
    }
  }
  const faites = new Set(publiees.map((p) => p.id));
  // Le passage du jour a déjà eu lieu après 9 h 17 (heure de Paris) : la prévision commence demain.
  const heure = parseInt(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(new Date()), 10);
  for (let j = heure >= 10 ? decaler(aujourdhui, 1) : aujourdhui; j <= jusquA; j = decaler(j, 1)) {
    const slugsDuJour = new Set(publiees.filter((p) => p.publie_le === j).map((p) => p.slug));
    const candidates = (manifeste.epingles || [])
      .filter((e) => !faites.has(e.id) && e.publie_le <= j)
      .sort((a, b) => a.numero - b.numero || b.publie_le.localeCompare(a.publie_le) || a.id.localeCompare(b.id));
    let n = 0;
    for (const e of candidates) {
      if (n >= max) break;
      if (slugsDuJour.has(e.slug)) continue;
      slugsDuJour.add(e.slug);
      faites.add(e.id);
      publiees.push({ id: e.id, slug: e.slug, publie_le: j });
      sortie.push({ date: j, type: 'epingle', titre: e.titre, lien: e.lien, image: e.image, prevision: true });
      n++;
    }
  }
  return sortie;
}

// Keur Cook : les jours « à faire » du plan de la routine Claude (10 h 30), un jour par matin.
function epinglesKeurcook(aujourdhui) {
  const plan = (() => {
    try {
      return fs.readFileSync(path.join(os.homedir(), '.claude/keurcook-pinterest-plan.md'), 'utf8');
    } catch {
      return '';
    }
  })();
  const sortie = [];
  let j = aujourdhui;
  for (const section of plan.split(/^## /m).filter((s) => /^Jour \d+ \(à faire\)/.test(s))) {
    for (const m of section.matchAll(/^\d+\.\s+(.+?)\s+→ tableau[\s\S]*?url=([^&\s]+)/gm)) {
      sortie.push({ date: j, type: 'epingle', titre: m[1], lien: decodeURIComponent(m[2]), prevision: true });
    }
    j = decaler(j, 1);
  }
  return sortie;
}

let cache = null;
export function planningSites() {
  if (cache && cache.le > Date.now() - 5 * 60 * 1000) return cache.donnees;
  const aujourdhui = jourParis();
  const jusquA = decaler(aujourdhui, 60);
  const sites = SITES.filter((s) => fs.existsSync(path.join(DEV, s.dossier))).map((s) => {
    const entrees = [...articlesDe(s, aujourdhui)];
    if (s.pinterest === 'keurdeco') entrees.push(...epinglesKeurdeco(s, aujourdhui, jusquA));
    if (s.pinterest === 'keurcook') entrees.push(...epinglesKeurcook(aujourdhui));
    const jours = {};
    for (const e of entrees.sort((a, b) => a.date.localeCompare(b.date))) (jours[e.date] = jours[e.date] || []).push(e);
    return { cle: s.cle, nom: s.nom, domaine: s.domaine, pinterest: Boolean(s.pinterest), jours };
  });
  const donnees = { aujourdhui, sites };
  cache = { le: Date.now(), donnees };
  return donnees;
}

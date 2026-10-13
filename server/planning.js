// ---------- Planning des réseaux sociaux ----------
// Les vidéos VALIDÉES de toutes les applis arrivent « à placer ». Une
// publication = une vidéo sur UN compte (TikTok, YouTube, Pinterest…), un
// jour : une même vidéo peut donc partir sur plusieurs comptes, à des jours
// différents. On coche « publiée » compte par compte (YouTube : publication
// directe sur la chaîne connectée). Rangé dans studio/planning.json.
//
// Ancien format (une entrée par vidéo, { reseaux: { tiktok: { publie } } }) :
// converti tout seul au premier passage, chaque réseau allant sur le premier
// compte de ce réseau (créé au besoin).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { STUDIO_DIR } from './studio.js';
import { listProjects, loadProject } from './projects.js';
import { tiktokCaption } from '../shared/catalog.js';
import { appLook } from '../src/apps.js';
import { listeComptes, compteParDefaut, comptesProposes } from './reseaux.js';

const FICHIER = path.join(STUDIO_DIR, 'planning.json');
const nouvelId = () => `pl_${crypto.randomBytes(5).toString('hex')}`;
const cle = (x) => `${x.projectId}:${Number(x.number)}`;

function ecrire(pubs) {
  const tmp = `${FICHIER}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(pubs, null, 2));
  fs.renameSync(tmp, FICHIER);
}

function lire() {
  let d;
  try {
    d = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
  } catch {
    return [];
  }
  if (!Array.isArray(d)) {
    return [];
  }
  if (!d.some((e) => e.reseaux)) {
    return d;
  }
  const out = [];
  for (const e of d) {
    if (!e.reseaux) {
      out.push(e);
      continue;
    }
    for (const [reseau, info] of Object.entries(e.reseaux)) {
      out.push({
        id: nouvelId(),
        projectId: e.projectId,
        number: Number(e.number),
        compte: compteParDefaut(reseau).id,
        date: e.date,
        publie: Boolean(info && info.publie),
        ...(info && info.url ? { url: info.url } : {}),
        ...(info && info.prive !== undefined ? { prive: info.prive } : {}),
      });
    }
  }
  ecrire(out);
  return out;
}

// Une vidéo du Studio, telle que le planning l'affiche.
function fiche(p, ep) {
  const depot = String(p.repo || '').split('/').pop().toLowerCase();
  const nomAppli = p.mode === 'recette' ? 'Recettes Keur Cook' : p.kind === 'pub' ? appLook(depot, p.title).name : p.title;
  const vignette = (ep.scenes || []).find((s) => s.image && !s.image.startsWith('erea-'))?.image || null;
  const d = p.mode === 'recette' ? 'recettes' : depot;
  return {
    projectId: p.id,
    number: ep.number,
    appli: nomAppli,
    depot: d,
    titre: String(ep.title || ep.topic || `Vidéo ${ep.number}`),
    vignette: vignette ? `/files/${p.id}/${vignette}` : null,
    video: `/files/${p.id}/${ep.renderedFile}`,
    legende: tiktokCaption(p, ep),
    proposes: comptesProposes(d),
  };
}

// Toutes les vidéos validées, à jour (une vidéo supprimée ou remise « à
// valider » sort du planning toute seule).
function videosValidees() {
  const out = new Map();
  for (const s of listProjects()) {
    const p = loadProject(s.id);
    if (!p || !(p.kind === 'pub' || p.mode === 'recette' || p.mode === 'chaine')) {
      continue;
    }
    for (const ep of p.episodes || []) {
      if (ep.renderedFile && ep.validation === 'validee') {
        out.set(`${p.id}:${ep.number}`, fiche(p, ep));
      }
    }
  }
  return out;
}

export function planning() {
  const videos = videosValidees();
  const comptes = listeComptes();
  const connus = new Set(comptes.map((c) => c.id));
  const pubs = lire();
  const valides = pubs.filter((p) => videos.has(cle(p)) && connus.has(p.compte));
  if (valides.length !== pubs.length) {
    ecrire(valides);
  }
  const placees = new Set(valides.map(cle));
  return {
    comptes,
    aPlacer: [...videos.entries()].filter(([k]) => !placees.has(k)).map(([, v]) => v),
    publications: valides.map((p) => ({ ...p, video: videos.get(cle(p)) })),
  };
}

const jourValide = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));

function compteValide(id) {
  if (!listeComptes().some((c) => c.id === id)) {
    throw new Error('Compte inconnu (Réglages → Comptes des réseaux).');
  }
}

// Place une vidéo sur un ou plusieurs comptes, le même jour. Un compte où
// elle est déjà prévue est ignoré.
export function placer({ projectId, number, comptes, date }) {
  if (!videosValidees().has(`${projectId}:${Number(number)}`)) {
    throw new Error('Seule une vidéo validée peut aller au planning.');
  }
  if (!jourValide(date)) {
    throw new Error('Jour invalide.');
  }
  const choisis = [...new Set(Array.isArray(comptes) ? comptes : [])];
  if (!choisis.length) {
    throw new Error('Choisis au moins un compte.');
  }
  choisis.forEach(compteValide);
  const pubs = lire();
  const k = `${projectId}:${Number(number)}`;
  const nouvelles = choisis
    .filter((c) => !pubs.some((p) => cle(p) === k && p.compte === c))
    .map((compte) => ({ id: nouvelId(), projectId, number: Number(number), compte, date, publie: false }));
  ecrire([...pubs, ...nouvelles]);
  return nouvelles;
}

// Changer le jour, le compte, ou l'état « publiée » d'une publication.
export function modifier(id, { date, compte, publie }) {
  const pubs = lire();
  const p = pubs.find((x) => x.id === id);
  if (!p) {
    throw new Error('Introuvable dans le planning.');
  }
  if (date !== undefined) {
    if (!jourValide(date)) {
      throw new Error('Jour invalide.');
    }
    p.date = date;
  }
  if (compte !== undefined && compte !== p.compte) {
    compteValide(compte);
    if (pubs.some((x) => x.id !== p.id && cle(x) === cle(p) && x.compte === compte)) {
      throw new Error('Cette vidéo est déjà prévue sur ce compte.');
    }
    p.compte = compte;
  }
  if (publie !== undefined) {
    p.publie = Boolean(publie);
  }
  ecrire(pubs);
  return p;
}

export function retirer(id) {
  ecrire(lire().filter((p) => p.id !== id));
}

// Retire une vidéo de tous ses comptes (elle revient « à placer »).
export function retirerVideo(projectId, number) {
  const k = `${projectId}:${Number(number)}`;
  ecrire(lire().filter((p) => cle(p) !== k));
}

// Nombre de publications encore rattachées à un compte (avant de le supprimer).
export function publicationsDuCompte(compte) {
  return lire().filter((p) => p.compte === compte).length;
}

// Une publication (pour la publier).
export function entree(id) {
  return lire().find((p) => p.id === id) || null;
}

// Publiée par le Studio : coche + lien.
export function noterPublication(id, infos) {
  const pubs = lire();
  const p = pubs.find((x) => x.id === id);
  if (!p) {
    return;
  }
  Object.assign(p, infos, { publie: true });
  ecrire(pubs);
}

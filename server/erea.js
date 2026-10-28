// ---------- Erea : la frise et les époques du jeu ----------
// Reprend l'échelle NON linéaire de la frise du jeu
// (erea_flutter/lib/core/timeline_scale.dart) et ses six époques, pour que
// la frise des pubs soit celle de l'appli. Décors d'époque :
// erea_flutter/assets/img/bg-<époque>.webp. Dépôt : EREA_REPO (défaut
// ~/Dev/apps/erea).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function ereaRepo() {
  const raw = (process.env.EREA_REPO || '').trim();
  const dir = raw ? (raw.startsWith('~/') ? path.join(os.homedir(), raw.slice(2)) : raw) : path.join(os.homedir(), 'Dev', 'apps', 'erea');
  if (!fs.existsSync(path.join(dir, 'erea_flutter', 'assets', 'events.json'))) {
    throw new Error("Le dépôt d'Erea est introuvable (~/Dev/apps/erea, ou EREA_REPO dans .env).");
  }
  return dir;
}

// Les six époques du jeu et le fichier de décor de chacune.
export const EREA_EPOQUES = [
  { from: -3000, to: -1200, nom: 'Âge du bronze', decor: 'bg-bronze.webp' },
  { from: -1200, to: -500, nom: 'Âge du fer', decor: 'bg-fer.webp' },
  { from: -500, to: 476, nom: 'Antiquité', decor: 'bg-antiquite.webp' },
  { from: 476, to: 1492, nom: 'Moyen Âge', decor: 'bg-moyenage.webp' },
  { from: 1492, to: 1789, nom: 'Époque moderne', decor: 'bg-moderne.webp' },
  { from: 1789, to: 2026, nom: 'Époque contemporaine', decor: 'bg-contemporaine.webp' },
];

export function epoqueDe(annee) {
  return EREA_EPOQUES.find((e) => annee >= e.from && annee < e.to) || EREA_EPOQUES[EREA_EPOQUES.length - 1];
}

export function decorEpoque(annee) {
  const f = path.join(ereaRepo(), 'erea_flutter', 'assets', 'img', epoqueDe(annee).decor);
  return fs.existsSync(f) ? f : '';
}

export function iconeErea() {
  const dir = ereaRepo();
  for (const rel of ['erea_flutter/assets/icon/icon.png', 'icon.png']) {
    const f = path.join(dir, rel);
    if (fs.existsSync(f)) {
      return f;
    }
  }
  return '';
}

// Sujets que les pubs Erea n'abordent jamais (choix de Jean) : personnes visées par des affaires
// ces dernières années. Ajouter ici une expression par sujet.
export const SUJETS_EVITES = [/abb[ée]\s+pierre/i, /emma[üu]s/i];
export const sujetEvite = (texte) => SUJETS_EVITES.some((re) => re.test(String(texte || '')));
const carteEvitee = (e) => sujetEvite([e.titre, e.description, e.anecdote].join(' '));

// Quelques événements du jeu, pour inspirer Claude (personnages célèbres).
export function evenementsCelebres(n = 80) {
  const ev = JSON.parse(fs.readFileSync(path.join(ereaRepo(), 'erea_flutter/assets/events.json'), 'utf8'));
  const liste = Array.isArray(ev) ? ev : ev.events || [];
  return liste
    .filter((e) => (e.niveau || 3) <= 2 && !carteEvitee(e))
    .sort(() => Math.random() - 0.5)
    .slice(0, n)
    .map((e) => `${e.annee} — ${e.titre}`);
}

// Fichiers de l'appli utilisés par la frise des pubs : décors et personnages
// des six époques (dans l'ordre), polices Baloo 2 et Nunito.
const ORDRE = ['bronze', 'fer', 'antiquite', 'moyenage', 'moderne', 'contemporaine'];
export function fichiersFrise() {
  const a = path.join(ereaRepo(), 'erea_flutter', 'assets');
  const f = (rel) => {
    const p = path.join(a, rel);
    return fs.existsSync(p) ? p : null;
  };
  return {
    bg: ORDRE.map((e) => f(`img/bg-${e}.webp`)),
    anim: ORDRE.map((e) => f(`img/anim-${e}.webp`)),
    // Le cliquetis de la frise : « tic » puis « tac » (lib/core/sons.dart).
    sons: { tic: f('sfx/tic.wav'), tac: f('sfx/tac.wav') },
    fonts: {
      baloo: f('fonts/Baloo2-ExtraBold.ttf'),
      nunito: f('fonts/Nunito-ExtraBold.ttf'),
      nunitoBlack: f('fonts/Nunito-Black.ttf'),
    },
  };
}

// Les cartes du jeu (id, année, titre, description, anecdote, emoji), pour
// les pubs « Petite histoire » : le sujet est TOUJOURS une vraie carte d'Erea.
export function cartesDuJeu() {
  const ev = JSON.parse(fs.readFileSync(path.join(ereaRepo(), 'erea_flutter/assets/events.json'), 'utf8'));
  return (Array.isArray(ev) ? ev : ev.events || []).filter((e) => Number.isFinite(Number(e.annee)) && e.titre && !carteEvitee(e));
}

// ---------- Point du matin ----------
// La routine « Point du matin » (7 h, sur le Mac) dépose ici le point du jour :
// décisions, problèmes, agenda, mails, état de chaque site et appli. Jean le lit
// dans l'Accueil ; décisions et problèmes s'affichent dans le bloc « À faire »
// (afaire.js). Ses réponses (Oui / Non, mails à mettre à la corbeille) passent
// par la file commune (GET /api/afaire/file), que la routine « Sites du jour »
// (5 h 05, partie référencement) applique, puis elle rend compte
// (POST /api/afaire/retour, qui revient ici par retourAction). Le Studio ne
// lance jamais Claude lui-même.
// Données personnelles (agenda, mails) : dans studio/, jamais dans le dépôt public.
import fs from 'node:fs';
import path from 'node:path';
import { STUDIO_DIR } from './studio.js';

const FICHIER = path.join(STUDIO_DIR, 'point-du-matin.json');

const lire = () => {
  try {
    return JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
  } catch {
    return null;
  }
};
const ecrire = (p) => {
  fs.mkdirSync(STUDIO_DIR, { recursive: true });
  fs.writeFileSync(FICHIER, JSON.stringify(p, null, 2));
};

export const pointDuMatin = () => lire();

// La routine envoie le point complet ; on garde les réponses déjà données pour
// les décisions du même jour (si la routine est relancée).
export function deposerPoint(p) {
  if (!p || typeof p !== 'object' || !p.date) throw new Error('Point invalide : il faut au moins une date');
  const ancien = lire();
  const memeJour = ancien?.date === p.date;
  const garder = (liste, anciens) =>
    (Array.isArray(liste) ? liste : []).map((x, i) => {
      const id = String(x.id || `${i + 1}`);
      const a = memeJour ? (anciens || []).find((y) => y.id === id) : null;
      return { ...x, id, ...(a?.choix ? { choix: a.choix, etat: a.etat, compteRendu: a.compteRendu, le: a.le } : {}) };
    });
  const point = {
    date: p.date,
    pretLe: new Date().toISOString(),
    decisions: garder(p.decisions, ancien?.decisions),
    problemes: garder(p.problemes, ancien?.problemes),
    agenda: p.agenda || null,
    mails: p.mails || null,
    sites: Array.isArray(p.sites) ? p.sites : [],
    corbeille: memeJour ? ancien?.corbeille || [] : [],
  };
  ecrire(point);
  return point;
}

const maintenant = () => new Date().toISOString();

// Oui / Non sur une décision, ou « Oui » sur un problème que Claude propose de régler.
export function repondre(id, choix) {
  const p = lire();
  if (!p) throw new Error('Aucun point du matin');
  const x = [...p.decisions, ...p.problemes].find((y) => y.id === id);
  if (!x) throw new Error('Élément introuvable');
  if (!['oui', 'non'].includes(choix)) throw new Error('Réponse attendue : oui ou non');
  if (x.etat === 'fait') throw new Error('Déjà fait');
  x.choix = choix;
  x.etat = choix === 'non' ? 'fait' : 'demande';
  x.compteRendu = choix === 'non' ? 'Noté : on ne fait rien.' : '';
  x.le = maintenant();
  ecrire(p);
  return p;
}

// Groupes de mails cochés : leurs conversations partent à la corbeille (récupérables 30 jours).
export function demanderCorbeille(groupes) {
  const p = lire();
  if (!p?.mails?.groupes) throw new Error('Aucun mail dans le point du jour');
  const choisis = p.mails.groupes.filter((g) => groupes.includes(g.id) && !g.protege);
  if (!choisis.length) throw new Error('Aucun groupe choisi');
  const demande = { id: `corbeille-${Date.now()}`, groupes: choisis.map((g) => g.id), etat: 'demande', le: maintenant(), compteRendu: '' };
  p.corbeille = [...(p.corbeille || []), demande];
  for (const g of choisis) g.etat = 'demande';
  ecrire(p);
  return p;
}

// Ce qui attend Claude (repris dans la file commune d'afaire.js).
export function fileActions() {
  const p = lire();
  if (!p) return [];
  const actions = [];
  for (const x of [...p.decisions, ...p.problemes]) {
    if (x.etat === 'demande' && x.choix === 'oui') actions.push({ id: x.id, type: 'decision', site: x.site || '', texte: x.texte, consigne: x.consigne || x.texte, dossier: x.dossier || '' });
  }
  for (const c of p.corbeille || []) {
    if (c.etat !== 'demande') continue;
    const groupes = p.mails.groupes.filter((g) => c.groupes.includes(g.id));
    actions.push({ id: c.id, type: 'corbeille', groupes: groupes.map((g) => ({ nom: g.nom, ids: g.ids || [] })) });
  }
  return actions;
}

// Compte rendu de la routine (via /api/afaire/retour).
export function retourAction(id, reussi, compteRendu) {
  const p = lire();
  if (!p) throw new Error('Aucun point du matin');
  const etat = reussi ? 'fait' : 'bloque';
  const x = [...p.decisions, ...p.problemes].find((y) => y.id === id);
  if (x) Object.assign(x, { etat, compteRendu: String(compteRendu || '').slice(0, 600), le: maintenant() });
  const c = (p.corbeille || []).find((y) => y.id === id);
  if (c) {
    Object.assign(c, { etat, compteRendu: String(compteRendu || '').slice(0, 600), le: maintenant() });
    for (const g of p.mails.groupes) if (c.groupes.includes(g.id)) g.etat = etat;
  }
  if (!x && !c) throw new Error('Élément introuvable');
  ecrire(p);
  return p;
}

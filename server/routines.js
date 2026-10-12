// ---------- Routines : ce que Claude fait tout seul, vu depuis le Studio ----------
// Les routines tournent dans l'appli Claude (tâches programmées), pas dans le
// Studio : faire lancer Claude par le Studio pour modifier du code sans
// personne pour regarder est refusé par sécurité. Le Studio se contente de
// LIRE, sans jamais rien y écrire :
//  - ~/.claude/scheduled-tasks/<id>/SKILL.md : la description ;
//  - …/claude-code-sessions/*/*/scheduled-tasks.json : horaire, activée, dernier passage ;
//  - …/claude-code-sessions/*/*/local_*.json : le résumé du dernier passage
//    (terminé, bloqué et pourquoi).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TACHES = path.join(os.homedir(), '.claude', 'scheduled-tasks');
const SESSIONS = path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude-code-sessions');

const lireJson = (f) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
};
const dossiers = (d) => {
  try {
    return fs.readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => path.join(d, e.name));
  } catch {
    return [];
  }
};

// Les dossiers de comptes de l'appli Claude (un par compte et par organisation).
const comptes = () => dossiers(SESSIONS).flatMap(dossiers);

function description(id) {
  try {
    const txt = fs.readFileSync(path.join(TACHES, id, 'SKILL.md'), 'utf8');
    return txt.match(/^description:\s*(.+)$/m)?.[1]?.trim() || '';
  } catch {
    return '';
  }
}

// « 17 7 * * * » → « tous les jours à 7 h 17 » (les cas utilisés ici).
export function horaire(t) {
  if (t.fireAt) {
    const d = new Date(t.fireAt);
    return `une fois, le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  const c = String(t.cronExpression || '').trim().split(/\s+/);
  if (c.length !== 5) return t.cronExpression ? `programmée (${t.cronExpression})` : 'à la demande';
  const [mi, h, jm, , js] = c;
  const heures = h
    .split(',')
    .map((x) => `${Number(x)} h${mi === '0' ? '' : ` ${mi.padStart(2, '0')}`}`)
    .join(', ');
  if (jm !== '*' && js === '*') return `le ${jm === '1' ? '1er' : jm} du mois à ${heures}`;
  if (js === '0') return `le dimanche à ${heures}`;
  if (js === '1-5') return `en semaine à ${heures}`;
  return `tous les jours à ${heures}`;
}

// Le dernier passage connu de chaque routine, d'après les conversations.
function derniersPassages() {
  const par = {};
  for (const compte of comptes()) {
    let fichiers = [];
    try {
      fichiers = fs.readdirSync(compte).filter((f) => f.startsWith('local_') && f.endsWith('.json'));
    } catch {}
    for (const f of fichiers) {
      const j = lireJson(path.join(compte, f));
      if (!j?.scheduledTaskId) continue;
      const debut = Number(j.createdAt) || 0;
      if ((par[j.scheduledTaskId]?.debut || 0) >= debut) continue;
      const r = j.postTurnSummary || {};
      par[j.scheduledTaskId] = {
        debut,
        activite: Number(j.lastActivityAt) || debut,
        etat: r.status_category || null,
        detail: r.status_detail || '',
        aFaire: r.needs_action || '',
      };
    }
  }
  return par;
}

export function routines() {
  const taches = new Map();
  for (const compte of comptes()) {
    const j = lireJson(path.join(compte, 'scheduled-tasks.json'));
    for (const t of j?.scheduledTasks || []) taches.set(t.id, t);
  }
  const passages = derniersPassages();
  const maintenant = Date.now();
  return [...taches.values()]
    .map((t) => {
      const p = passages[t.id];
      // Un passage sans résumé depuis moins d'une heure : il tourne encore.
      const enCours = p && !p.etat && maintenant - p.activite < 3600 * 1000;
      const statut = !p ? 'jamais' : p.etat === 'completed' ? 'ok' : p.etat === 'blocked' ? 'bloquee' : enCours ? 'encours' : 'inconnu';
      return {
        id: t.id,
        nom: t.displayName || t.id,
        description: description(t.id),
        horaire: horaire(t),
        recurrente: Boolean(t.cronExpression),
        active: t.enabled !== false,
        prevue: t.fireAt || null,
        dernierPassage: p ? new Date(p.debut).toISOString() : t.lastRunAt || null,
        statut,
        detail: p?.detail || '',
        aFaire: p?.aFaire || '',
      };
    })
    .sort((a, b) => Number(b.active) - Number(a.active) || Number(b.recurrente) - Number(a.recurrente) || a.nom.localeCompare(b.nom));
}

// Les routines qui tournent aujourd'hui (pour l'accueil).
export function routinesDuJour(liste = routines()) {
  const auj = new Date().toDateString();
  return liste.filter((r) => {
    if (!r.active) return false;
    if (r.prevue) return new Date(r.prevue).toDateString() === auj;
    return /tous les jours|en semaine/.test(r.horaire) || (/le 1er du mois/.test(r.horaire) && new Date().getDate() === 1);
  });
}

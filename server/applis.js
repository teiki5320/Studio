// ---------- Mes applis : les huit apps suivies (repris du Dashboard) ----------
// Les fiches de chaque app vivent dans data/apps/<id>/ (app.json décidé à la
// main ; infra.md, marketing.md, publication.md et status.json rapatriés de
// leurs dépôts). tool/apps-sync.cjs les rapatrie, tool/apps-build.cjs en tire
// data/applis.json (hors dépôt), que le Studio sert tel quel.
//
// La synchro tourne ici, sur le Mac, avec le jeton de « gh » (lecture des
// dépôts privés) gardé en mémoire le temps de la commande, jamais écrit.
// Un échec réseau n'est pas un constat : apps-sync garde les valeurs connues.

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { ROOT } from './config.js';
import { STUDIO_DIR } from './studio.js';

const DONNEES = path.join(ROOT, 'data', 'applis.json');
const ETAT = path.join(STUDIO_DIR, 'applis-sync.json');
// Le dernier passage du vérificateur des fiches (tâche « Fiches des applis », 6 h 30) :
// c'est la date à laquelle les fiches ont été relues, même si rien n'a changé.
const VERIFICATION = path.join(STUDIO_DIR, 'verification.json');
const TOUTES_LES = 6 * 3600 * 1000;

const lireJson = (f, defaut) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return defaut;
  }
};

function lancer(fichier, env = {}) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [path.join(ROOT, 'tool', fichier)], { cwd: ROOT, env: { ...process.env, ...env }, maxBuffer: 8 << 20 }, (err, stdout, stderr) => {
      if (err) reject(new Error(String(stderr || stdout || err.message).trim().split('\n').slice(-3).join(' ')));
      else resolve(String(stdout));
    });
  });
}

function jetonGh() {
  return new Promise((resolve) => {
    const gh = ['/opt/homebrew/bin/gh', '/usr/local/bin/gh'].find((p) => fs.existsSync(p)) || 'gh';
    execFile(gh, ['auth', 'token'], (err, stdout) => resolve(err ? '' : String(stdout).trim()));
  });
}

export function applis() {
  if (!fs.existsSync(DONNEES)) {
    return null;
  }
  const v = lireJson(VERIFICATION, {});
  return { ...lireJson(DONNEES, {}), synchro: lireJson(ETAT, {}), verification: { le: v.le || null } };
}

export async function construireApplis() {
  await lancer('apps-build.cjs');
}

// Rapatrie les fiches puis régénère les données.
export async function synchroniserApplis() {
  const debut = new Date().toISOString();
  try {
    const jeton = await jetonGh();
    await lancer('apps-sync.cjs', jeton ? { GITHUB_TOKEN: jeton } : {});
    await construireApplis();
    fs.writeFileSync(ETAT, JSON.stringify({ le: debut, ok: true }));
  } catch (e) {
    fs.writeFileSync(ETAT, JSON.stringify({ le: debut, ok: false, erreur: e.message.slice(0, 500) }));
    // Les données déjà connues restent affichées.
    if (!fs.existsSync(DONNEES)) await construireApplis().catch(() => {});
    throw e;
  }
}

export function synchroDue() {
  const { le } = lireJson(ETAT, {});
  const age = le ? Date.now() - new Date(le).getTime() : Infinity;
  // Une vérification du code était en cours au dernier passage : on repasse
  // vite (20 min) plutôt que d'afficher « en cours » pendant 6 heures.
  const dossier = path.join(ROOT, 'data', 'apps');
  const enCours = fs.existsSync(dossier) && fs.readdirSync(dossier).some((id) => {
    const ci = lireJson(path.join(dossier, id, 'status.json'), {}).ci;
    return ci && (ci.enCours || (ci.status && ci.status !== 'completed'));
  });
  return age > TOUTES_LES || (enCours && age > 20 * 60 * 1000);
}

// L'état d'un projet (actif, en pause, archivé) se décide UNIQUEMENT ici, par
// Jean, dans Mes applis. Les fiches et la tâche du matin s'y alignent ; rien ne
// le déduit plus d'une phrase. On l'écrit dans app.json et on l'enregistre tout
// de suite dans git (ce seul fichier), pour qu'il ne se perde pas.
export const ETATS = ['actif', 'pause', 'archive'];
export async function changerEtat(id, etat) {
  if (!/^[a-z0-9-]+$/.test(id) || !ETATS.includes(etat)) throw new Error('état ou appli inconnus');
  const fichier = path.join(ROOT, 'data', 'apps', id, 'app.json');
  const app = lireJson(fichier, null);
  if (!app) throw new Error(`pas d'appli « ${id} »`);
  if (app.etat === etat) return { ok: true, inchange: true };
  app.etat = etat;
  fs.writeFileSync(fichier, JSON.stringify(app, null, 2) + '\n');
  await construireApplis();
  const git = (...a) => new Promise((resolve) => execFile('git', ['-C', ROOT, ...a], (err) => resolve(!err)));
  const libelle = { actif: 'actif', pause: 'en pause', archive: 'archivé' }[etat];
  const commit = await git('commit', '-m', `${app.name} : état « ${libelle} », choisi par Jean dans Mes applis\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, '--', path.relative(ROOT, fichier));
  // Si l'envoi échoue (pas de réseau), la tâche du matin l'enverra avec les fiches.
  if (commit) await git('push', '-q');
  return { ok: true };
}

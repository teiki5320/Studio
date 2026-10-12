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
  return { ...lireJson(DONNEES, {}), synchro: lireJson(ETAT, {}) };
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

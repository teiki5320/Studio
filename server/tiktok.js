// ---------- TikTok : publication directe depuis le Planning ----------
// Appli « Toa Studio » (TikTok for Developers, organisation TOA CORP). Clés et
// jetons rangés dans studio/tiktok.json — jamais dans le dépôt (studio/ est
// ignoré). Un jeton par compte du Planning (erea.jeu, toa.afrotok…) : on
// connecte chaque compte une fois depuis les Réglages.
// Tant que TikTok n'a pas audité l'appli, il n'accepte que des vidéos privées
// (« moi uniquement ») : le Studio essaie en public et retombe en privé.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { STUDIO_DIR } from './studio.js';

const FICHIER = path.join(STUDIO_DIR, 'tiktok.json');
const SCOPES = ['user.info.basic', 'video.publish', 'video.upload'];
const API = 'https://open.tiktokapis.com/v2';
// Adresse de retour déclarée dans l'appli TikTok (une seule, en https).
export const RETOUR_TIKTOK = 'https://studio.toakeur.com/api/tiktok/retour';

function lire() {
  try {
    return JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
  } catch {
    return {};
  }
}
function ecrire(c) {
  fs.writeFileSync(FICHIER, JSON.stringify(c, null, 2), { mode: 0o600 });
}

// Comptes du Planning branchés : { idDuCompte: nom TikTok }.
export function etatTiktok() {
  const c = lire();
  const comptes = Object.fromEntries(Object.entries(c.comptes || {}).filter(([, v]) => v.refreshToken).map(([k, v]) => [k, v.nom || '']));
  return { configure: Boolean(c.clientKey && c.clientSecret), comptes };
}

export function enregistrerClesTiktok({ clientKey, clientSecret }) {
  const key = String(clientKey || '').trim();
  const secret = String(clientSecret || '').trim();
  if (!/^[a-z0-9]{10,40}$/i.test(key) || secret.length < 16) {
    throw new Error('Client key ou Client secret invalide (copie-les depuis l’appli Toa Studio sur developers.tiktok.com).');
  }
  ecrire({ ...lire(), clientKey: key, clientSecret: secret });
}

export function deconnecterTiktok(compte) {
  const c = lire();
  if (c.comptes) {
    delete c.comptes[compte];
  }
  ecrire(c);
}

const enCours = new Map();
export function urlConnexionTiktok(compte) {
  const c = lire();
  if (!c.clientKey) {
    throw new Error('Colle d’abord le Client key et le Client secret dans les Réglages.');
  }
  const state = crypto.randomBytes(12).toString('hex');
  enCours.set(state, { compte, at: Date.now() });
  const p = new URLSearchParams({ client_key: c.clientKey, scope: SCOPES.join(','), response_type: 'code', redirect_uri: RETOUR_TIKTOK, state });
  return `https://www.tiktok.com/v2/auth/authorize/?${p}`;
}

async function jeton(params) {
  const res = await fetch(`${API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) {
    throw new Error(`TikTok a refusé : ${j.error_description || j.error || res.status}`);
  }
  return j;
}

function garder(c, compte, t, extra = {}) {
  c.comptes = c.comptes || {};
  c.comptes[compte] = {
    ...(c.comptes[compte] || {}),
    ...extra,
    openId: t.open_id || c.comptes[compte]?.openId,
    accessToken: t.access_token,
    expire: Date.now() + (Number(t.expires_in) || 3600) * 1000 - 60000,
    refreshToken: t.refresh_token,
  };
  ecrire(c);
}

export async function terminerConnexionTiktok(code, state) {
  const attente = enCours.get(state);
  enCours.delete(state);
  if (!attente || Date.now() - attente.at > 15 * 60 * 1000) {
    throw new Error('Connexion expirée : recommence depuis les Réglages.');
  }
  const c = lire();
  const t = await jeton({ client_key: c.clientKey, client_secret: c.clientSecret, code, grant_type: 'authorization_code', redirect_uri: RETOUR_TIKTOK });
  let nom = '';
  try {
    const r = await fetch(`${API}/user/info/?fields=open_id,display_name`, { headers: { Authorization: `Bearer ${t.access_token}` } });
    nom = (await r.json())?.data?.user?.display_name || '';
  } catch {
    // le nom n'est qu'un repère dans les Réglages
  }
  garder(c, attente.compte, t, { nom });
  return nom;
}

async function accessToken(compte) {
  const c = lire();
  const k = c.comptes?.[compte];
  if (!k?.refreshToken) {
    throw new Error('Ce compte TikTok n’est pas connecté (Réglages → TikTok).');
  }
  if (k.accessToken && k.expire > Date.now()) {
    return k.accessToken;
  }
  const t = await jeton({ client_key: c.clientKey, client_secret: c.clientSecret, grant_type: 'refresh_token', refresh_token: k.refreshToken });
  garder(c, compte, t);
  return t.access_token;
}

async function appel(token, chemin, corps) {
  const r = await fetch(`${API}${chemin}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(corps || {}),
  });
  const j = await r.json().catch(() => ({}));
  const err = j.error && j.error.code && j.error.code !== 'ok' ? j.error : null;
  if (!r.ok || err) {
    const e = new Error(`TikTok : ${err?.message || err?.code || r.status}`);
    e.code = err?.code;
    throw e;
  }
  return j.data || {};
}

// Envoi par fichier : blocs de 10 Mo (le dernier prend le reste) au-delà de 64 Mo.
async function initialiser(token, legende, prive, taille) {
  const bloc = taille <= 64 * 1024 * 1024 ? taille : 10 * 1024 * 1024;
  const nb = Math.max(1, Math.floor(taille / bloc));
  const d = await appel(token, '/post/publish/video/init/', {
    post_info: {
      title: String(legende || '').slice(0, 2200),
      privacy_level: prive ? 'SELF_ONLY' : 'PUBLIC_TO_EVERYONE',
      disable_comment: false,
      disable_duet: false,
      disable_stitch: false,
      video_cover_timestamp_ms: 1000,
    },
    source_info: { source: 'FILE_UPLOAD', video_size: taille, chunk_size: bloc, total_chunk_count: nb },
  });
  return { ...d, bloc, nb };
}

export async function publierTiktok(compte, fichier, legende, update = () => {}) {
  const token = await accessToken(compte);
  update('Préparation de l’envoi à TikTok…', 0.05);
  const info = await appel(token, '/post/publish/creator_info/query/');
  const taille = fs.statSync(fichier).size;
  let prive = !(info.privacy_level_options || []).includes('PUBLIC_TO_EVERYONE');
  let init;
  try {
    init = await initialiser(token, legende, prive, taille);
  } catch (e) {
    // Appli pas encore auditée : TikTok n'accepte que le privé.
    if (prive || !/unaudited|private/i.test(`${e.code} ${e.message}`)) {
      throw e;
    }
    prive = true;
    init = await initialiser(token, legende, true, taille);
  }
  const donnees = fs.readFileSync(fichier);
  for (let i = 0; i < init.nb; i++) {
    const debut = i * init.bloc;
    const fin = i === init.nb - 1 ? taille - 1 : debut + init.bloc - 1;
    update('Envoi de la vidéo à TikTok…', 0.1 + (0.7 * i) / init.nb);
    const r = await fetch(init.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(fin - debut + 1), 'Content-Range': `bytes ${debut}-${fin}/${taille}` },
      body: donnees.subarray(debut, fin + 1),
    });
    if (!r.ok) {
      throw new Error(`L’envoi à TikTok a échoué (bloc ${i + 1}/${init.nb} : ${r.status}).`);
    }
  }
  // TikTok traite la vidéo : on attend la fin (10 min au plus).
  for (let n = 0; n < 60; n++) {
    update('TikTok traite la vidéo…', 0.85);
    await new Promise((ok) => setTimeout(ok, 10000));
    const s = await appel(token, '/post/publish/status/fetch/', { publish_id: init.publish_id });
    if (s.status === 'PUBLISH_COMPLETE') {
      const id = (s.publicaly_available_post_id || [])[0];
      return { id: init.publish_id, url: id ? `https://www.tiktok.com/video/${id}` : null, prive };
    }
    if (s.status === 'FAILED') {
      throw new Error(`TikTok a refusé la vidéo : ${s.fail_reason || 'raison inconnue'}`);
    }
  }
  throw new Error('TikTok n’a pas fini de traiter la vidéo après 10 minutes.');
}

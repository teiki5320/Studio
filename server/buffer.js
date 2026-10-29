// ---------- Buffer : publication TikTok en public ----------
// TikTok refuse les applis « maison » non auditées (comptes privés seulement) :
// on passe par Buffer, déjà autorisé par TikTok. La clé API (publish.buffer.com
// → Réglages → API) est rangée dans studio/buffer.json — jamais dans le dépôt.
// Buffer va chercher la vidéo sur une adresse publique : videos.toakeur.com
// ne sert que les fichiers déposés ici, sous un nom impossible à deviner, et
// les oublie une fois la publication faite.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { STUDIO_DIR } from './studio.js';

const FICHIER = path.join(STUDIO_DIR, 'buffer.json');
const PUBLIQUES = path.join(STUDIO_DIR, 'videos-publiques.json');
const API = 'https://api.buffer.com';
export const HOTE_VIDEOS = 'videos.toakeur.com';

function lire(f) {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return {};
  }
}
function ecrire(f, c) {
  fs.writeFileSync(f, JSON.stringify(c, null, 2), { mode: 0o600 });
}

async function requete(query, variables, cle = lire(FICHIER).cle) {
  if (!cle) {
    throw new Error('Colle d’abord la clé Buffer dans les Réglages.');
  }
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cle}` },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.errors?.length) {
    throw new Error(`Buffer : ${j.errors?.[0]?.message || r.status}`);
  }
  return j.data;
}

// Comptes TikTok branchés dans Buffer : { nom: channelId }.
async function chainesTiktok(cle) {
  const d = await requete('{ account { organizations { id } } }', {}, cle);
  const chaines = {};
  for (const o of d.account?.organizations || []) {
    const c = await requete('query($o: OrganizationId!) { channels(input: { organizationId: $o }) { id name service isDisconnected } }', { o: o.id }, cle);
    for (const ch of c.channels || []) {
      if (ch.service === 'tiktok' && !ch.isDisconnected) {
        chaines[ch.name.toLowerCase()] = ch.id;
      }
    }
  }
  return chaines;
}

export function etatBuffer() {
  const c = lire(FICHIER);
  return { configure: Boolean(c.cle), comptes: Object.keys(c.chaines || {}) };
}

export async function enregistrerCleBuffer(cle) {
  const k = String(cle || '').trim();
  if (k.length < 16) {
    throw new Error('Clé Buffer invalide (copie-la depuis publish.buffer.com → Réglages → API).');
  }
  const chaines = await chainesTiktok(k);
  ecrire(FICHIER, { cle: k, chaines });
}

// Le compte TikTok du Planning (par son nom, ex. « erea.jeu ») est-il dans Buffer ?
// (« Afrotok » retrouve aussi « toa.afrotok »).
export function chaineBuffer(nom) {
  const chaines = lire(FICHIER).chaines || {};
  const n = String(nom || '').toLowerCase().replace(/^@/, '');
  const proche = n.length >= 5 ? Object.keys(chaines).find((k) => k.includes(n)) : null;
  return chaines[n] || (proche && chaines[proche]) || null;
}

// ---- Adresses publiques des vidéos ----
export function videoPublique(jeton) {
  const v = lire(PUBLIQUES)[jeton];
  return v && v.expire > Date.now() && fs.existsSync(v.fichier) ? v.fichier : null;
}
function rendrePublique(fichier) {
  const toutes = Object.fromEntries(Object.entries(lire(PUBLIQUES)).filter(([, v]) => v.expire > Date.now()));
  const jeton = crypto.randomBytes(16).toString('hex');
  toutes[jeton] = { fichier, expire: Date.now() + 2 * 24 * 3600 * 1000 };
  ecrire(PUBLIQUES, toutes);
  return jeton;
}
function oublier(jeton) {
  const toutes = lire(PUBLIQUES);
  delete toutes[jeton];
  ecrire(PUBLIQUES, toutes);
}

export async function publierViaBuffer(nom, fichier, legende, update = () => {}) {
  const chaine = chaineBuffer(nom);
  if (!chaine) {
    throw new Error(`« ${nom} » n’est pas branché dans Buffer.`);
  }
  const jeton = rendrePublique(fichier);
  try {
    update('Envoi à Buffer…', 0.1);
    const d = await requete(
      `mutation($i: CreatePostInput!) { createPost(input: $i) {
        ... on PostActionSuccess { post { id status } }
        ... on MutationError { message } } }`,
      {
        i: {
          channelId: chaine,
          text: String(legende || '').slice(0, 2200),
          schedulingType: 'automatic',
          mode: 'shareNow',
          assets: [{ video: { url: `https://${HOTE_VIDEOS}/v/${jeton}.mp4`, metadata: { thumbnailOffset: 1000 } } }],
        },
      },
    );
    const res = Array.isArray(d.createPost) ? d.createPost[0] : d.createPost;
    if (!res?.post) {
      throw new Error(`Buffer a refusé : ${res?.message || 'raison inconnue'}`);
    }
    // Buffer récupère la vidéo puis l'envoie à TikTok : on attend le verdict (20 min au plus).
    for (let n = 0; n < 80; n++) {
      update('Buffer publie sur TikTok…', 0.5);
      await new Promise((ok) => setTimeout(ok, 15000));
      const s = (await requete('query($i: PostId!) { post(input: { id: $i }) { status error { message } } }', { i: res.post.id })).post;
      const statut = String(s?.status || '').toLowerCase();
      if (statut === 'sent') {
        return { id: res.post.id, url: null, prive: false };
      }
      if (statut === 'error' || s?.error) {
        throw new Error(`Buffer n’a pas pu publier : ${s?.error?.message || statut}`);
      }
    }
    throw new Error('Buffer n’a pas fini de publier après 20 minutes (regarde sur publish.buffer.com).');
  } finally {
    oublier(jeton);
  }
}

// ---------- Les choix de chaque carte « À trier » ----------
// Jean, 28/10 : « il faut que Claude me donne des choix comme si on était dans
// la conversation ». Pour chaque carte, Claude écrit 2 à 4 réponses concrètes
// (la première = celle qu'il conseille). Jean en touche une, ou écrit la sienne
// (« Autre chose… ») ; la routine de 5 h 05 applique exactement ce choix.
//
// Les choix sont préparés en arrière-plan, une carte à la fois, et gardés dans
// studio/afaire-options.json tant que la carte ne change pas. Un seul essai par
// carte (règle de Jean) : si Claude échoue, la carte garde ses anciens boutons.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { STUDIO_DIR } from './studio.js';
import { askClaudeForJson } from './claudegen.js';

const FICHIER = path.join(STUDIO_DIR, 'afaire-options.json');
// Ce que chaque choix déclenche, côté Studio.
const ACTIONS = ['routine', 'fait', 'rien', 'ensemble', 'attendre'];

const lire = () => {
  try {
    return JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
  } catch {
    return {};
  }
};
const ecrire = (d) => {
  fs.writeFileSync(`${FICHIER}.tmp`, JSON.stringify(d, null, 2));
  fs.renameSync(`${FICHIER}.tmp`, FICHIER);
};
const cle = (e) => crypto.createHash('sha1').update(`${e.texte}|${e.detail}|${e.etat}|${e.compteRendu || ''}`).digest('hex').slice(0, 16);

// Une carte qui a déjà ses propres boutons (planning, plan du site) n'en a pas besoin.
// Les cartes « Comptes & adresses » ont leurs choix comme les autres (Jean, 31/10).
const concernee = (e) => !e.action || e.action === 'comptes';
// Ce qu'une source accepte : un problème Google ne se « règle » ni ne se refuse à la main.
const permises = (e) => (e.source === 'indexation' ? ['routine', 'ensemble', 'attendre'] : ACTIONS);

export function optionsDe(e) {
  const o = lire()[e.id];
  return o && o.cle === cle(e) && o.options ? o.options : null;
}

function prompt(e) {
  return `Tu aides Jean, qui n'est pas technicien, à trier les cartes « À faire » de son Studio (ses sites et applis). Pour LA carte ci-dessous, propose 2 à 4 réponses concrètes, comme si tu lui parlais dans une conversation : chacune dit précisément ce qui sera fait, en mots simples (12 mots au plus), sans jargon.
La PREMIÈRE est celle que tu conseilles. Les choix doivent être vraiment différents. N'invente aucun fait : si une info manque, un choix peut être « Vérifier d'abord … ».
Chaque choix a une « action » :
- "routine" : Claude le fait demain à 5 h 05 sur le Mac (code, sites, navigateur avec les comptes de Jean, sans rien payer ni signer) ;
- "fait" : Jean l'a déjà réglé lui-même ;
- "rien" : on ne fait rien, la carte est classée ;
- "ensemble" : Jean et Claude le font dans une conversation (pour ce qui demande Jean : mot de passe, paiement, signature, décision longue) ;
- "attendre" : on remet à dans 2 jours.
Actions permises ici : ${permises(e).join(', ')}.
Pour une action "routine", « consigne » dit exactement ce que la routine doit faire (1 à 3 phrases) ; sinon « consigne » est vide.

La carte :
- Site ou appli : ${e.site}
- Origine : ${e.source}${e.type === 'decision' ? ' (une décision)' : ''}
- Titre : ${e.texte}
${e.detail ? `- Détail : ${e.detail}\n` : ''}${e.etat === 'bloque' && e.compteRendu ? `- La routine a déjà échoué : ${e.compteRendu}\n` : ''}${e.consigne && e.consigne !== e.texte ? `- Consigne prévue jusqu'ici : ${String(e.consigne).slice(0, 1500)}\n` : ''}
Réponds UNIQUEMENT avec ce JSON : {"options":[{"texte":"…","action":"routine","consigne":"…"}]}`;
}

let enCours = false;
// Prépare, une par une, les cartes à trier qui n'ont pas encore leurs choix.
export function preparerOptions(cartes) {
  if (enCours) return;
  const d = lire();
  const suivante = cartes.find((e) => concernee(e) && d[e.id]?.cle !== cle(e));
  if (!suivante) return;
  enCours = true;
  const k = cle(suivante);
  askClaudeForJson(prompt(suivante))
    .then((r) => {
      const ok = permises(suivante);
      const options = (Array.isArray(r?.options) ? r.options : [])
        .map((o) => ({ texte: String(o.texte || '').trim().slice(0, 140), action: String(o.action || ''), consigne: String(o.consigne || '').trim().slice(0, 1200) }))
        .filter((o) => o.texte && ok.includes(o.action))
        .slice(0, 4);
      const d2 = lire();
      d2[suivante.id] = options.length >= 2 ? { cle: k, options, le: new Date().toISOString() } : { cle: k, echec: 'choix inutilisables' };
      ecrire(d2);
    })
    .catch((err) => {
      const d2 = lire();
      d2[suivante.id] = { cle: k, echec: String(err.message).slice(0, 200) };
      ecrire(d2);
      console.error(`À trier — choix de « ${suivante.texte.slice(0, 60)} » :`, err.message);
    })
    .finally(() => {
      enCours = false;
      preparerOptions(cartes);
    });
}

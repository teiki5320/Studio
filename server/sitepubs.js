// ---------- Pubs des sites : un format validé par site (Jean, 30/10) ----------
// Chaque format écrit la consigne de la pub (l'« angle ») à partir de vrais
// contenus du site quand il y en a (recettes, articles…), puis la fabrication
// est celle des pubs ordinaires (script par Claude, images, voix, montage).
// Un site ne vend rien : jamais « disponible sur… », on invite à visiter.
// Aucun lien d'un site vers un autre : la pub commune finit sur toakeur.com.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chargeRecettes } from './keurcook.js';

const DEV = path.join(os.homedir(), 'Dev/apps');
const auHasard = (l) => l[Math.floor(Math.random() * l.length)];
const aujourdhui = () => new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric' });

// Un article publié (date passée) des conseils d'un site : titre + début du texte.
function articleConseil(dossier, deja) {
  const dir = path.join(DEV, dossier, 'content/conseils');
  const jour = new Date().toISOString().slice(0, 10);
  const articles = (fs.existsSync(dir) ? fs.readdirSync(dir) : [])
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => {
      const t = fs.readFileSync(path.join(dir, f), 'utf8');
      const date = (t.match(/^date:\s*"?(\d{4}-\d{2}-\d{2})/m) || [])[1] || '';
      const titre = ((t.match(/^title:\s*"?(.+?)"?\s*$/m) || [])[1] || f).trim();
      const corps = t.replace(/^---[\s\S]*?\n---\n/, '').replace(/\s+/g, ' ').trim();
      return { slug: f.replace(/\.md$/, ''), date, titre, corps };
    })
    .filter((a) => a.date && a.date <= jour && !deja.includes(a.slug));
  return articles.length ? auHasard(articles) : null;
}

// Les sites et leur format. `site` : domaine annoncé dans la pub (et seul
// lien donné). `brief(state)` rend { angle, sujet, cle } — `cle` évite de
// refaire deux fois le même contenu.
export const SITE_PUBS = {
  'teiki5320/keurcook': {
    site: 'keurcook.com',
    formats: {
      devine: {
        label: '🥘 3 ingrédients, devine le plat',
        brief(deja) {
          const r = auHasard(chargeRecettes().filter((x) => !deja.includes(x.slug) && (x.ingredients || []).length >= 3 && !/^(jus|bissap|boisson|thé|café)/i.test(x.name)));
          if (!r) throw new Error('Toutes les recettes ont déjà eu leur « devine le plat ».');
          const ingr = r.ingredients.map((i) => i.name).slice(0, 8).join(', ');
          return {
            cle: r.slug,
            sujet: r.name,
            angle: `FORMAT « 3 INGRÉDIENTS, DEVINE LE PLAT ». Le plat à faire deviner : « ${r.name} » (${r.country}) — ${r.shortDescription}. Ses ingrédients (la recette du site) : ${ingr}.
DÉROULÉ : scène 1, l'accroche « Trois ingrédients… tu devines le plat ? » ; scènes 2, 3 et 4 : UN ingrédient de la liste chacun, en gros plan appétissant (badge = le nom de l'ingrédient), choisis les 3 plus parlants, du moins évident au plus évident ; scène 5 : la réponse, le plat fini servi, fumant (badge = « ${r.name} ») ; dernière scène : la recette complète est sur keurcook.com.
Aucun personnage à l'image : des mains et les aliments seulement.`,
          };
        },
      },
    },
  },
  'teiki5320/solelis': {
    site: 'solelis.com',
    formats: {
      signes: {
        label: '🚦 3 signes qu’il faut demander de l’aide',
        brief(deja) {
          const a = articleConseil('Solelis', deja);
          if (!a) throw new Error('Aucun nouvel article publié de Solelis à adapter.');
          return {
            cle: a.slug,
            sujet: a.titre,
            angle: `FORMAT « 3 SIGNES QU'IL FAUT DEMANDER DE L'AIDE MAINTENANT », pour des chefs d'entreprise français en difficulté. Appuie-toi UNIQUEMENT sur cet article de solelis.com (aucun chiffre ni règle qui n'y figure pas) — « ${a.titre} » : ${a.corps.slice(0, 2500)}
DÉROULÉ : scène 1, accroche qui parle au dirigeant inquiet ; 3 scènes, un signe d'alerte concret chacune (badge = « Signe 1 », « Signe 2 », « Signe 3 ») ; une scène qui rassure (des solutions existent, plus on s'y prend tôt, plus il y en a) ; dernière scène : tout est expliqué simplement sur solelis.com.
TON : sérieux, calme et rassurant, on VOUVOIE ; ni humour, ni dramatisation, ni promesse de résultat. Images : dirigeants et commerces français réalistes, lumière douce.`,
          };
        },
      },
    },
  },
  'teiki5320/keurfoot': {
    site: 'keurfoot.com',
    formats: {
      interro: {
        label: '⚽ Interro foot africain — 3 questions',
        brief(deja) {
          return {
            cle: null, // Claude choisit : on retiendra le titre de la pub
            sujet: 'Interro foot africain',
            angle: `FORMAT « INTERRO FOOT AFRICAIN » : 3 questions sur le football africain (CAN, sélections, grands joueurs africains, records), chacune suivie de sa réponse.
RÈGLES : uniquement des faits VRAIS, classiques et vérifiables (palmarès officiels) ; au moindre doute, une autre question. Varie les pays et les époques.${deja.length ? ` Sujets déjà faits, à ne pas reprendre : ${deja.slice(-20).join(' ; ')}.` : ''}
DÉROULÉ : scène 1, accroche « Interro foot africain ! 3 questions, t'es prêt ? » ; puis pour chaque question DEUX scènes : la question (badge = « Question 1/3 »…), puis la réponse ultra courte (badge = la réponse) ; dernière scène : encore plus de foot africain sur keurfoot.com.
Images : ambiance de stade et de supporters africains, maillots sans logo ni marque, aucun joueur réel reconnaissable.`,
          };
        },
      },
    },
  },
  'teiki5320/keurkado': {
    site: 'keurkado.com',
    formats: {
      petitprix: {
        label: '🎁 Une idée cadeau petit budget pour la prochaine fête',
        brief(deja) {
          return {
            cle: null, // Claude choisit : on retiendra le titre de la pub
            sujet: 'Idée cadeau petit budget',
            angle: `FORMAT « UNE IDÉE CADEAU PETIT BUDGET » pour la diaspora africaine en France. Nous sommes le ${aujourdhui()} : choisis la PROCHAINE fête qui arrive parmi Noël, la Saint-Valentin, la fête des mères, la fête des pères, Korité, Tabaski, la rentrée, un mariage ou un baptême (de préférence une fête datée qui approche), et UNE idée de cadeau africain (wax, bijoux, beauté afro, déco, jeux) à petit prix.${deja.length ? ` Idées déjà faites : ${deja.slice(-20).join(' ; ')}.` : ''}
DÉROULÉ : scène 1, accroche « Pas d'idée pour <la fête> ? » ; 2 ou 3 scènes qui montrent le cadeau et la joie de celui qui le reçoit ; dernière scène : d'autres idées par fête et par budget sur keurkado.com.
RÈGLES : AUCUN prix précis (dis « petit budget ») ; aucune marque ; on ne vend rien, on donne une idée.`,
          };
        },
      },
    },
  },
  'teiki5320/keurbible': {
    site: 'keurbible.com',
    formats: {
      psaume: {
        label: '🕊️ Un psaume pour ta journée',
        brief(deja) {
          return {
            cle: null, // Claude choisit : on retiendra le titre de la pub
            sujet: 'Un psaume pour ta journée',
            angle: `FORMAT « UN PSAUME POUR TA JOURNÉE » : quelques versets d'UN psaume très connu et réconfortant (ex. 23, 27, 91, 121, 139…), cités EXACTEMENT dans la traduction Louis Segond 1910 (domaine public).${deja.length ? ` Déjà faits : ${deja.slice(-20).join(' ; ')}.` : ''}
DÉROULÉ : scène 1, accroche douce « Un psaume pour ta journée » (badge = « Psaume N ») ; 3 ou 4 scènes, un verset (ou demi-verset) chacune, lus lentement ; dernière scène : d'autres psaumes à méditer sur keurbible.com.
TON : paisible et lumineux, on tutoie avec douceur. Images : lumière du matin, nature, mains jointes, foyer chaleureux, familles africaines et européennes ; aucun visage de Jésus.`,
          };
        },
      },
    },
  },
  'teiki5320/keurdesir': {
    site: 'keurdesir.com',
    formats: {
      djongue: {
        label: '🌸 C’est quoi, le djongué ?',
        brief(deja) {
          return {
            cle: null, // Claude choisit : on retiendra le titre de la pub
            sujet: 'C’est quoi, le djongué ?',
            angle: `FORMAT « C'EST QUOI, LE DJONGUÉ ? » : l'art sénégalais et ouest-africain de la séduction, expliqué en 20 secondes, avec élégance. Un angle différent à chaque pub (un des secrets : le thiouraye et l'encens, les bine-bine, le petit pagne, le karité, l'art de recevoir…).${deja.length ? ` Déjà faits : ${deja.slice(-20).join(' ; ')}.` : ''}
DÉROULÉ : scène 1, accroche « Tu connais le djongué ? » ; 3 scènes qui montrent le secret choisi (badge = son nom) ; dernière scène : tous les secrets du djongué sur keurdesir.com.
RÈGLES STRICTES : suggestion et élégance uniquement, RIEN de cru ni de sexuel, aucune nudité ; femmes sénégalaises élégantes et dignes, tenues traditionnelles, gros plans d'objets (encensoir fumant, perles, tissus), lumière tamisée et chaude.`,
          };
        },
      },
    },
  },
  'teiki5320/toakeur': {
    site: 'toakeur.com',
    formats: {
      maison: {
        label: '🏠 TOA KEUR, la maison de la culture africaine',
        brief() {
          return {
            cle: null, // Claude choisit : on retiendra le titre de la pub
            sujet: 'La maison de la culture africaine',
            angle: `FORMAT « TOA KEUR, LA MAISON DE LA CULTURE AFRICAINE » : un défilé rythmé, une scène par univers, comme les pièces d'une même maison : les livres d'auteurs africains (Keurbook), la cuisine africaine (Keur Cook), la déco africaine (Keur Déco), le foot africain (Keur Foot), les cadeaux africains (Keur Kado), les objets chrétiens et l'art chrétien afro (Keur Bible). Badge de chaque scène = le nom du site, SANS adresse.
DÉROULÉ : scène 1, accroche « Keur, en wolof, ça veut dire maison. » ; une scène courte par univers ; dernière scène : toute la maison sur toakeur.com (la SEULE adresse dite dans la pub).
Images : une même maison africaine chaleureuse, une pièce par univers, lumière dorée.`,
          };
        },
      },
    },
  },
};

export const sitePubDe = (project) => SITE_PUBS[String(project?.repo || '').toLowerCase()] || null;

export function sitePubPlan(project) {
  const s = sitePubDe(project);
  return { formats: s ? Object.entries(s.formats).map(([id, f]) => ({ id, label: f.label })) : [] };
}

// La consigne de la pub : à passer au script (createChannelVideo).
export function briefSitePub(project, format) {
  const s = sitePubDe(project);
  const f = s && s.formats[format];
  if (!f) {
    throw new Error('Format de pub inconnu pour ce site.');
  }
  const state = project.sitePubs || (project.sitePubs = {});
  const deja = state[format] || (state[format] = []);
  const b = f.brief(deja);
  return { ...b, site: s.site, label: f.label };
}

// Une fois la pub écrite : on retient son contenu (ou, quand Claude l'a
// choisi, le titre de la pub) pour ne pas le refaire.
export function noterSitePub(project, format, cle) {
  const state = project.sitePubs || (project.sitePubs = {});
  state[format] = [...(state[format] || []), String(cle).slice(0, 120)].slice(-200);
}

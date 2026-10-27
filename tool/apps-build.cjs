#!/usr/bin/env node
// =============================================================================
// Build du dashboard — AUCUNE dépendance externe.
//
//   node tool/apps-build.cjs
//
// 1. Vérifie qu'aucun secret ne traîne dans apps/ et catalog/ (sinon ÉCHEC).
// 2. Lit catalog/services.js et chaque apps/<id>/ (app.json, infra.md, marketing.md,
//    et publication.md si elle existe).
// 3. Convertit le Markdown en HTML (ancres par section) via tool/markdown.js.
// 4. Calcule le résumé marketing (modèle actuel, canaux ✅/⬜, prochaines actions).
// 5. Génère data/applis.json, lu par le Studio (server/applis.js).
//
// ⚠️ RAPPEL SÉCURITÉ : ce dépôt ne doit JAMAIS contenir de secret ni de mot de
// passe — uniquement des références (noms de variables, de projets, liens).
// =============================================================================
'use strict';

const fs = require('fs');
const path = require('path');
const { mdToHtml, slugify, stripInline } = require('./markdown.cjs');

const ROOT = path.join(__dirname, '..');
const APPS_DIR = path.join(ROOT, 'data', 'apps');
const LOGOS_DIR = path.join(ROOT, 'public', 'logos');
const { CATEGORIES, SERVICES } = require(path.join(ROOT, 'data', 'catalog', 'services.cjs'));

// ── 1. Scan anti-secrets ─────────────────────────────────────────────────────
// Motifs à haute confiance : leur présence fait ÉCHOUER le build.
const SECRET_PATTERNS = [
  { nom: 'jeton GitHub', re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { nom: 'jeton GitHub (PAT fine-grained)', re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { nom: 'clé API OpenAI/Stripe (sk-…)', re: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { nom: 'clé secrète Stripe (rk_live/sk_live)', re: /\b[rs]k_live_[A-Za-z0-9]{16,}\b/ },
  { nom: 'clé AWS', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { nom: 'clé Google (AIza…)', re: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  { nom: 'jeton Slack', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { nom: 'clé privée', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { nom: 'JWT', re: /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\b/ },
];
// Motifs "souples" : simple avertissement (faux positifs possibles).
const WARN_PATTERNS = [
  { nom: 'mot de passe en clair ?', re: /\b(password|passwd|mot de passe)\s*[:=]\s*[^\s*_`<{$][^\s]{7,}/i },
];

function scanSecrets() {
  const targets = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(md|json|js|txt|yml|yaml)$/i.test(entry.name)) targets.push(p);
    }
  };
  walk(APPS_DIR);
  walk(path.join(ROOT, 'data', 'catalog'));

  const found = [];
  const warned = [];
  for (const file of targets) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      for (const p of SECRET_PATTERNS) {
        if (p.re.test(line)) found.push({ file, line: idx + 1, type: p.nom });
      }
      for (const p of WARN_PATTERNS) {
        if (p.re.test(line)) warned.push({ file, line: idx + 1, type: p.nom });
      }
    });
  }
  for (const w of warned) {
    console.warn(`⚠️  Avertissement : possible ${w.type} — ${path.relative(ROOT, w.file)}:${w.line}`);
  }
  if (found.length) {
    console.error('\n🛑 SECRET DÉTECTÉ — build refusé. Ce dépôt ne doit contenir AUCUN secret,');
    console.error('   uniquement des références (noms de variables, de projets, liens).\n');
    for (const f of found) {
      console.error(`   • ${f.type} → ${path.relative(ROOT, f.file)}:${f.line}`);
    }
    console.error('');
    process.exit(1);
  }
}

// ── Utilitaires d'extraction (marketing.md) ──────────────────────────────────
function normalize(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Retourne les lignes de la section dont le titre matche `re`
// (jusqu'au prochain titre de niveau inférieur ou égal).
// Les titres h2+ sont prioritaires : le h1 est le titre du document
// (« Plan marketing & rémunération ») et matcherait presque tout.
function sectionLines(lines, re) {
  let start = -1;
  let level = 0;
  for (const minLevel of [2, 1]) {
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(#{1,6})\s+(.*)$/);
      if (m && m[1].length >= minLevel && re.test(normalize(m[2]))) {
        start = i + 1; level = m[1].length; break;
      }
    }
    if (start !== -1) break;
  }
  if (start === -1) return null;
  const out = [];
  for (let i = start; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s/);
    if (m && m[1].length <= level) break;
    out.push(lines[i]);
  }
  return out;
}

function cleanLine(l) {
  return stripInline(
    l.replace(/^\s*([-*+]|\d+[.)])\s+/, '')     // puce
     .replace(/^\[[ xX]\]\s*/, '')              // case à cocher
     // Marqueurs d'état en tête : l'interface les dessine elle-même (case à
     // cocher, pastille). Les laisser dans le texte les affichait en double.
     .replace(/^\s*(?:✅|✔️|☑️|⬜|🔲|☐|❌|🚧)\s*/, '')
     .replace(/^\s*\|/, '').replace(/\|\s*$/, '').replace(/\s*\|\s*/g, ' — ') // ligne de tableau
  ).trim();
}

function extractMarketingSummary(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');

  // Canaux : ✅ / ⬜ dans les tableaux de la section "canaux" si elle existe,
  // sinon dans tous les tableaux du document.
  const canauxLines = sectionLines(lines, /canaux|diffusion|acquisition/) || lines;
  let done = 0, todo = 0;
  for (const l of canauxLines) {
    if (/^\s*\|?\s*:?-{2,}/.test(l)) continue;    // ligne séparatrice de tableau
    // Tableaux ET listes à puces : trois fiches sur dix listent leurs canaux
    // en puces et affichaient « 0 fait, 0 à faire ».
    if (!l.includes('|') && !/^\s*[-*+]\s/.test(l)) continue;
    done += (l.match(/✅/g) || []).length;
    todo += (l.match(/⬜|🔲|☐/g) || []).length;
  }

  // Modèle de rémunération actuel : dans la section revenus/rémunération,
  // la première ligne contenant "actuel" ; sinon la première ligne pleine.
  let model = null;
  const revLines = sectionLines(lines, /remuneration|revenus|monetisation|business/);
  if (revLines) {
    const isSep = (l) => /^\s*\|?\s*:?-{2,}/.test(l);
    const sepIdx = revLines.findIndex(isSep);
    const headerIdx = sepIdx > 0 ? sepIdx - 1 : -1; // en-tête du tableau
    // 1. \b : « actuel(le) » en mot entier — sans quoi « contractuelle » matche.
    const hit = revLines.find((l) => /\bactuel(?:les?)?\b/i.test(l) && cleanLine(l));
    // 2. Première ligne de tableau cochée ✅ (ex. « ✅ câblé (en cours) »).
    const checked = revLines.find((l) => l.includes('|') && l.includes('✅'));
    // 3. Première ligne pleine — jamais l'en-tête ni le séparateur du tableau.
    const first = revLines.find((l, i) => i !== headerIdx && !isSep(l) && cleanLine(l));
    const src = hit || first || checked;
    if (src) {
      model = cleanLine(src).replace(/^.*?actuel(?:le)?\s*[:—-]?\s*/i, (m0) =>
        /[:—-]\s*$/.test(m0) ? '' : m0
      ).trim() || cleanLine(src);
      // enlève un éventuel marqueur « — ✅ actuelle » en fin de ligne
      model = model.replace(/\s*[—–-]?\s*✅?\s*actuel(?:le)?\s*$/i, '').trim() || model;
      if (model.length > 120) model = model.slice(0, 117) + '…';
    }
  }
  if (!model) {
    const any = lines.find((l) => /mod[eè]le\s+actuel/i.test(l));
    if (any) model = cleanLine(any);
  }

  // Les 3 priorités : section « Les 3 priorités » (ou, à défaut, l'ancienne
  // « Prochaines actions »). Le Studio n'affiche que ces trois-là.
  let nextActions = [];
  const naLines = sectionLines(lines, /priorites/) || sectionLines(lines, /prochaines actions|prochaines etapes|a faire ensuite|next/);
  if (naLines) {
    // Une puce peut courir sur plusieurs lignes : les lignes indentées qui
    // suivent sont recollées, sinon la priorité s'arrêtait en pleine phrase.
    const puces = [];
    for (const l of naLines) {
      if (/^\s*([-*+]|\d+[.)])\s+/.test(l)) puces.push(l);
      else if (puces.length && /^\s+\S/.test(l)) puces[puces.length - 1] += ` ${l.trim()}`;
    }
    nextActions = puces
      // Une ligne déjà cochée n'est plus une action à venir : la garder
      // remplissait la liste de travail terminé, avec une case vide par-dessus.
      .filter((l) => !/^\s*(?:[-*+]|\d+[.)])\s*(?:✅|✔️|☑️|\[[xX]\])/.test(l))
      .map(cleanLine)
      .filter(Boolean)
      .slice(0, 3);
  }

  return {
    model,
    done,
    todo,
    nextActions,
    // Infos importantes remontées automatiquement dans l'interface :
    kpis: extractTable(lines, /kpis|indicateurs/, 5),
    jalons: extractTable(lines, /calendrier/, 3) || extractListe(lines, /calendrier/, 3),
  };
}

// Extrait un tableau Markdown d'une section : { header, rows } (texte brut).
function extractTable(lines, re, maxRows) {
  const sec = sectionLines(lines, re);
  if (!sec) return null;
  let header = null;
  let inTable = false;
  const rows = [];
  for (const l of sec) {
    if (!l.includes('|')) { if (inTable) break; continue; }
    if (/^\s*\|?\s*:?-{2,}/.test(l)) { inTable = true; continue; }
    const cells = l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|')
      .map((c) => stripInline(c.trim()));
    if (!inTable && !header) { header = cells; continue; }
    if (inTable) {
      rows.push(cells);
      if (rows.length >= maxRows) break;
    }
  }
  return header && rows.length ? { header, rows } : null;
}

// L'essentiel technique : les puces « **Label** : valeur » de la section
// « Vue d'ensemble » ; à défaut, le premier paragraphe du document.
// Découpe une fiche de publication par plateforme : chaque « ### N. Titre »
// devient une colonne, avec son tableau clé/valeur et ses paragraphes.
// Ne retient que les sections qui portent un tableau — « Ce qui reste, dans
// l'ordre » et les autres listes de fin restent dans la fiche dépliable.
function extractPublicationPlateformes(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^###\s+(.+?)\s*$/);
    if (!m) continue;
    const titre = stripInline(m[1].replace(/^\d+\.\s*/, ''));

    const corps = [];
    for (let j = i + 1; j < lines.length; j++) {
      if (/^#{1,3}\s/.test(lines[j])) break;
      corps.push(lines[j]);
    }

    const faits = [];
    for (const l of corps) {
      if (!l.includes('|')) continue;
      if (/^\s*\|?\s*:?-{2,}/.test(l)) continue;
      const cells = l.replace(/^\s*\|/, '').replace(/\|\s*$/, '')
        .split('|').map((c) => stripInline(c.trim()));
      // Markdown écrit les URL nues « <https://…> » : les chevrons ne
      // regardent pas le lecteur.
      if (cells.length === 2 && cells[0] && cells[1]) {
        faits.push({ label: cells[0], value: cells[1].replace(/^<(.+)>$/, '$1') });
      }
    }
    if (!faits.length) continue;

    // Paragraphes : « **Ce qui bloque.** … » devient un intertitre + son texte.
    const notes = [];
    let para = [];
    const flush = () => {
      const texte = para.join(' ').trim();
      para = [];
      if (!texte) return;
      const t = texte.match(/^\*\*(.+?)\*\*\s*(.*)$/);
      if (t) notes.push({ titre: stripInline(t[1]).replace(/\.$/, ''), texte: stripInline(t[2]) });
      else notes.push({ titre: null, texte: stripInline(texte) });
    };
    for (const l of corps) {
      if (!l.trim()) { flush(); continue; }
      if (l.includes('|') || /^\s*-{3,}\s*$/.test(l)) { para = []; continue; }
      para.push(l.trim());
    }
    flush();

    out.push({ titre, faits, notes });
  }
  return out;
}

function extractInfraEssentiel(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const sec = sectionLines(lines, /vue d.ensemble|overview|resume|l.application\b/);
  const facts = [];
  if (sec) {
    for (let i = 0; i < sec.length && facts.length < 6; i++) {
      const m = sec[i].match(/^\s*[-*+]\s+\*\*(.+?)\*\*\s*:\s*(.+)$/);
      if (!m) continue;
      // joint les lignes de continuation (puce écrite sur plusieurs lignes)
      let value = m[2];
      while (i + 1 < sec.length && sec[i + 1].trim() &&
             !/^\s*(?:[-*+]\s|#|>|\|)/.test(sec[i + 1])) {
        value += ' ' + sec[i + 1].trim();
        i++;
      }
      facts.push({ label: stripInline(m[1]), value: stripInline(value).replace(/\.\s*$/, '') });
    }
  }
  // Repli : la section est parfois un tableau « Info | Valeur »
  if (!facts.length) {
    const table = extractTable(lines, /vue d.ensemble|overview|l.application\b/, 7);
    if (table) {
      for (const r of table.rows) {
        if (r[0] && r[1]) facts.push({ label: r[0], value: r[1] });
      }
    }
  }
  let resume = null;
  if (!facts.length) {
    let apresTitre = false;
    for (const l of lines) {
      if (/^#\s/.test(l)) { apresTitre = true; continue; }
      // ignore : lignes vides, citations, titres, puces (« - x »), tableaux —
      // mais pas les paragraphes commençant par du gras (« **x** »)
      if (!apresTitre || !l.trim() || /^\s*>/.test(l) || /^#/.test(l) ||
          /^\s*(?:[-*+]\s|\|)/.test(l)) continue;
      resume = stripInline(l).slice(0, 300);
      break;
    }
  }
  return { facts, resume };
}

// Repli quand une section attendue en tableau est une liste à puces :
// « **Quand** : quoi » → [quand, quoi], sinon ['', texte].
function extractListe(lines, re, maxItems) {
  const sec = sectionLines(lines, re);
  if (!sec) return null;
  const rows = [];
  for (let i = 0; i < sec.length && rows.length < maxItems; i++) {
    const m = sec[i].match(/^\s*[-*+]\s+(.*)$/);
    if (!m) continue;
    let texte = m[1];
    // joint les lignes de continuation d'une puce multi-lignes
    while (i + 1 < sec.length && sec[i + 1].trim() &&
           !/^\s*(?:[-*+]\s|#|>|\|)/.test(sec[i + 1])) {
      texte += ' ' + sec[i + 1].trim();
      i++;
    }
    const bold = texte.match(/^\*\*(.+?)\*\*\s*:\s*(.+)$/);
    rows.push(bold ? [stripInline(bold[1]), stripInline(bold[2])] : ['', stripInline(texte)]);
  }
  return rows.length ? { header: null, rows } : null;
}

// ── Parties « Parcours » (maquette F2, 13/10) ───────────────────────────────
// Sections courtes et normées que la routine des fiches écrit dans chaque
// fiche, pour que le Studio les dessine : trajets techniques, phases de
// rémunération, points forts, mesures, boutiques, poids, ce qui reste.
// Un état s'écrit entre crochets : [ok] [à faire] [bloquant] [pas encore].
function etatDe(tag) {
  const t = normalize(String(tag || '')).trim();
  if (/^(ok|fait|en place|en ligne)$/.test(t)) return 'ok';
  if (/^(a faire|en cours|a verifier)$/.test(t)) return 'run';
  if (/^(bloquant|bloque)$/.test(t)) return 'ko';
  if (/^(pas encore|plus tard)$/.test(t)) return 'none';
  return null;
}
// Sépare « [état] » (au début ou à la fin) du reste du texte.
function avecEtat(texte) {
  let etat = null;
  const t = String(texte).replace(/\s*\[([^\]]+)\]\s*/g, (m, tag) => {
    const k = etatDe(tag);
    if (k && !etat) { etat = k; return ' '; }
    return m;
  }).trim();
  return { etat, texte: t };
}
// Les puces (« - » ou « 1. ») d'une section, lignes de continuation jointes.
function pucesDe(lines, re) {
  const sec = sectionLines(lines, re);
  if (!sec) return null;
  const out = [];
  for (const l of sec) {
    const m = l.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (m) out.push(m[1].trim());
    else if (out.length && /^\s+\S/.test(l)) out[out.length - 1] += ' ' + l.trim();
  }
  return out.length ? out : null;
}
// « 🐙 **Titre** : texte » → { emoji, titre, texte }.
function titreTexte(p) {
  const m = p.match(/^(\p{Extended_Pictographic}[️‍\p{Extended_Pictographic}]*)?\s*\*\*(.+?)\*\*\s*:?\s*(.*)$/u);
  if (!m) return { emoji: null, titre: null, texte: stripInline(p) };
  return { emoji: m[1] || null, titre: stripInline(m[2]), texte: stripInline(m[3]) };
}
function extractParcours(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const enBref = (pucesDe(lines, /^en bref/) || []).map(titreTexte).filter((x) => x.titre)
    .map((x) => ({ label: x.titre, value: x.texte.replace(/\.\s*$/, '') }));
  const trajets = (pucesDe(lines, /^parcours/) || []).map((p) => {
    const tete = titreTexte(p.split('→')[0]);
    const reste = p.replace(/^[^:]*?\*\*.+?\*\*\s*:\s*/u, '');
    const etapes = reste.split('→').map((e) => {
      const { etat, texte } = avecEtat(e);
      const em = texte.match(/^(\p{Extended_Pictographic}[️‍\p{Extended_Pictographic}]*)\s*(.*)$/u);
      const corps = em ? em[2] : texte;
      const [nom, ...note] = corps.split(/\s+—\s+/);
      return { emoji: em ? em[1] : null, nom: stripInline(nom), note: stripInline(note.join(' — ')), etat: etat || 'none' };
    }).filter((e) => e.nom);
    return { emoji: tete.emoji, nom: tete.titre, etapes };
  }).filter((t) => t.nom && t.etapes.length);
  return { enBref, trajets };
}
function extractPhases(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const phases = (pucesDe(lines, /remuneration par phases|phases de remuneration/) || []).map((p) => {
    const { etat, texte } = avecEtat(p);
    const x = titreTexte(texte);
    return { etat: etat || 'none', titre: x.titre || '', texte: x.texte };
  });
  const forces = (pucesDe(lines, /^points forts/) || []).map(titreTexte).filter((x) => x.titre).slice(0, 3);
  const mesures = (pucesDe(lines, /^mesures/) || []).map(titreTexte).filter((x) => x.titre)
    .map((x) => ({ label: x.titre, value: x.texte }));
  return { phases, forces, mesures };
}
function extractBoutiques(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const enBref = (pucesDe(lines, /^en bref/) || []).map(titreTexte).filter((x) => x.titre)
    .map((x) => ({ label: x.titre, value: x.texte.replace(/\.\s*$/, '') }));
  let boutiques = null;
  const sec = sectionLines(lines, /^boutiques|^en ligne$/);
  if (sec) {
    const rangs = sec.filter((l) => l.includes('|') && !/^\s*\|?\s*:?-{2,}/.test(l))
      .map((l) => l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim()));
    if (rangs.length > 1) {
      boutiques = {
        colonnes: rangs[0].slice(1).map(stripInline),
        lignes: rangs.slice(1).map((r) => ({ label: stripInline(r[0]), cellules: r.slice(1).map((c) => {
          const { etat, texte } = avecEtat(c);
          return { etat, texte: stripInline(texte).replace(/^<(.+)>$/, '$1') };
        }) })),
      };
    }
  }
  const poids = (pucesDe(lines, /^poids/) || []).map((p) => {
    const x = titreTexte(p);
    const m = x.texte.match(/([\d.,]+)\s*\/\s*([\d.,]+)\s*([A-Za-zo]+)\s*(?:[—-]\s*(.*))?$/);
    if (!m) return null;
    const n = (v) => Number(v.replace(',', '.'));
    return { emoji: x.emoji, titre: x.titre, valeur: n(m[1]), max: n(m[2]), unite: m[3], note: m[4] ? stripInline(m[4]) : '' };
  }).filter(Boolean);
  const reste = (pucesDe(lines, /ce qui reste/) || []).map((p) => {
    const fait = /^\s*(?:✅|✔️|\[[xX]\])/.test(p);
    const x = titreTexte(p.replace(/^\s*(?:✅|✔️|⬜|\[[ xX]\])\s*/, ''));
    return { fait, titre: x.titre || x.texte, texte: x.titre ? x.texte : '' };
  });
  return { enBref, boutiques, poids, reste };
}

// Relie chaque service de l'app à la section d'infra.md dont le titre
// contient son nom (ou son id).
function findServiceAnchors(serviceIds, toc) {
  // Chaque section ne peut servir qu'un seul service, et on attribue d'abord
  // les correspondances les plus franches : sans ça, « Hébergement web »
  // s'accrochait à la section « GitHub » d'une app hébergée chez Cloudflare.
  const candidats = [];
  for (const id of serviceIds) {
    const svc = SERVICES.find((s) => s.id === id);
    if (!svc) continue;
    const base = svc.nom.replace(/\s*\(.*\)$/, '');
    const needles = [normalize(id)];
    for (const part of base.split('/')) needles.push(normalize(part.trim()));
    const paren = svc.nom.match(/\(([^)]+)\)/);
    if (paren) for (const alt of paren[1].split(/[/,]/)) needles.push(normalize(alt.trim()));
    for (const alt of svc.alias || []) needles.push(normalize(alt));
    for (const t of toc) {
      const title = normalize(t.text).replace(/^\s*\d+[.)]\s*/, '').replace(/[^a-z0-9]+/g, ' ').trim();
      if (!title) continue;
      for (const n of needles) {
        const needle = n.replace(/[^a-z0-9]+/g, ' ').trim();
        if (!needle || needle.length < 3) continue;
        let score = 0;
        if (title === needle) score = 100 + needle.length;          // « GitHub » = GitHub
        else if (title.includes(needle)) score = 50 + needle.length; // « Cloudflare Pages » contient « cloudflare »
        else if (title.length > 3 && needle.includes(title)) score = 20 + title.length;
        if (score) candidats.push({ id, ancre: t.id, score });
      }
    }
  }
  candidats.sort((a, b) => b.score - a.score);
  const anchors = {};
  const prises = new Set();
  for (const c of candidats) {
    if (anchors[c.id] || prises.has(c.ancre)) continue;
    anchors[c.id] = c.ancre;
    prises.add(c.ancre);
  }
  return anchors;
}

// Le nom réel du fournisseur, lu dans le titre de la section de la fiche :
// « ### 2. Cloudflare » → « Cloudflare ». Sans ça, la pastille n'affiche que
// l'étiquette générique du catalogue et l'app semble ne rien utiliser de précis.
function findServiceProviders(serviceIds, toc, anchors) {
  const fournisseurs = {};
  for (const id of serviceIds) {
    const ancre = anchors[id];
    if (!ancre) continue;
    const entry = toc.find((t) => t.id === ancre);
    if (!entry) continue;
    const nom = String(entry.text)
      .replace(/^\s*\d+[.)]\s*/, '')        // « 2. Cloudflare » → « Cloudflare »
      .replace(/\s*\(.*?\)\s*$/, '')        // parenthèses de fin
      .trim();
    const svc = SERVICES.find((x) => x.id === id);
    const generique = svc ? normalize(svc.nom.replace(/\s*\(.*\)$/, '')) : '';
    // On n'affiche le nom que s'il apporte quelque chose : « Hébergement web »
    // répété sous la pastille « Hébergement web » n'apprend rien.
    if (nom && nom.length <= 32 && normalize(nom) !== generique) fournisseurs[id] = nom;
  }
  return fournisseurs;
}

// ── 2-4. Lecture des apps ────────────────────────────────────────────────────
function loadApps() {
  if (!fs.existsSync(APPS_DIR)) return [];
  const apps = [];
  for (const entry of fs.readdirSync(APPS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const id = entry.name;
    const dir = path.join(APPS_DIR, id);
    const manifestPath = path.join(dir, 'app.json');
    if (!fs.existsSync(manifestPath)) {
      console.warn(`⚠️  apps/${id}/ ignoré : pas de app.json`);
      continue;
    }
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      console.error(`🛑 apps/${id}/app.json invalide : ${e.message}`);
      process.exit(1);
    }
    if (!manifest.name) {
      console.error(`🛑 apps/${id}/app.json : champ "name" manquant`);
      process.exit(1);
    }
    if (manifest.visible === false) {
      console.log(`👻 ${manifest.name} (apps/${id}) : visible=false → absent du site`);
      continue;
    }
    const services = Array.isArray(manifest.services) ? manifest.services : [];
    for (const sid of services) {
      if (!SERVICES.some((s) => s.id === sid)) {
        console.warn(`⚠️  apps/${id} : service inconnu "${sid}" (absent du catalogue) — ignoré dans le schéma`);
      }
    }

    // Extrait la date la plus récente de l'en-tête d'une fiche : formats
    // français (« 21 août 2026 »), ISO (2026-08-21, y compris avec des tirets
    // typographiques U+2010/U+2011), première douzaine de lignes seulement.
    function ficheDate(md) {
      if (!md) return null;
      const tete = md.split('\n').slice(0, 12).join('\n');
      const MOIS = { janvier: 0, fevrier: 1, 'février': 1, mars: 2, avril: 3, mai: 4, juin: 5,
        juillet: 6, aout: 7, 'août': 7, septembre: 8, octobre: 9, novembre: 10, 'décembre': 11, decembre: 11 };
      const dates = [];
      const iso = /(\d{4})[-‐‑](\d{2})[-‐‑](\d{2})/g;
      let m;
      while ((m = iso.exec(tete))) dates.push(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])));
      const fr = /(\d{1,2})(?:er)?\s+(janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[ûu]t|septembre|octobre|novembre|d[ée]cembre)\s+(\d{4})/gi;
      while ((m = fr.exec(tete))) dates.push(new Date(Date.UTC(+m[3], MOIS[m[2].toLowerCase()], +m[1])));
      const jma = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g; // « 20/07/2026 »
      while ((m = jma.exec(tete))) dates.push(new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])));
      const valides = dates.filter((d) => !isNaN(d.getTime()));
      if (!valides.length) return null;
      // Une ligne « Mis à jour le … » / « Généré le … » fait foi : sinon, un
      // calendrier de publication cité en tête donnait une date à venir.
      // La ligne peut être coupée en deux (« …mis à jour le » / « > 13 octobre 2026 ») :
      // on la lit avec la suivante.
      const lignesTete = tete.split('\n');
      const iMaj = lignesTete.findIndex((l) => /\b(mis\s*[àa]\s*jour|g[ée]n[ée]r[ée]|v[ée]rifi[ée])\b/i.test(l));
      const ligneMaj = iMaj > -1 ? `${lignesTete[iMaj]} ${(lignesTete[iMaj + 1] || '').replace(/^>\s*/, '')}` : null;
      if (ligneMaj) {
        const sousDates = [];
        let mm;
        const isoL = /(\d{4})[-‐‑](\d{2})[-‐‑](\d{2})/g;
        while ((mm = isoL.exec(ligneMaj))) sousDates.push(new Date(Date.UTC(+mm[1], +mm[2] - 1, +mm[3])));
        const frL = /(\d{1,2})(?:er)?\s+(janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[ûu]t|septembre|octobre|novembre|d[ée]cembre)\s+(\d{4})/gi;
        while ((mm = frL.exec(ligneMaj))) sousDates.push(new Date(Date.UTC(+mm[3], MOIS[mm[2].toLowerCase()], +mm[1])));
        const bonnes = sousDates.filter((d) => !isNaN(d.getTime()));
        if (bonnes.length) return new Date(Math.max(...bonnes.map((d) => d.getTime()))).toISOString().slice(0, 10);
      }
      const max = new Date(Math.max(...valides.map((d) => d.getTime())));
      return max.toISOString().slice(0, 10);
    }

    const readMd = (file, label) => {
      const p = path.join(dir, file);
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
      console.warn(`⚠️  apps/${id}/${file} manquant`);
      return `> ⚠️ *Fichier \`${file}\` manquant — ${label} à fournir.*`;
    };
    const infraMd = readMd('infra.md', 'la fiche technique');
    const marketingMd = readMd('marketing.md', 'le plan marketing');

    const infra = mdToHtml(infraMd, { anchorPrefix: 'i-' + slugify(id) });
    const marketing = mdToHtml(marketingMd, { anchorPrefix: 'm-' + slugify(id) });

    // Fiche de publication : facultative, et sans avertissement quand elle
    // manque — une app non distribuée en boutique n'a rien à y écrire.
    const publicationPath = path.join(dir, 'publication.md');
    const publicationMd = fs.existsSync(publicationPath)
      ? fs.readFileSync(publicationPath, 'utf8')
      : null;
    const publication = publicationMd
      ? mdToHtml(publicationMd, { anchorPrefix: 'p-' + slugify(id) })
      : null;

    // Date de fraîcheur de chaque fiche, lue dans son en-tête (« Généré le… »,
    // « mis à jour le… », dates ISO — on garde la PLUS RÉCENTE trouvée dans
    // les 12 premières lignes). Sert à signaler les fiches à rafraîchir.
    const fiches = {
      infra: ficheDate(infraMd),
      marketing: ficheDate(marketingMd),
      publication: publicationMd ? ficheDate(publicationMd) : null,
    };

    // Indicateurs vivants (release + statut CI) : optionnels, produits par
    // tool/sync.js à partir de l'API GitHub de app.repo. Absent tant que la
    // synchro n'a pas encore tourné, ou si l'app n'a pas de repo déclaré.
    let status = null;
    const statusPath = path.join(dir, 'status.json');
    if (fs.existsSync(statusPath)) {
      try { status = JSON.parse(fs.readFileSync(statusPath, 'utf8')); }
      catch (e) { console.warn(`⚠️  apps/${id}/status.json invalide (${e.message}) — ignoré`); }
    }

    const ancresServices = findServiceAnchors(services, infra.toc);
    apps.push({
      id,
      order: typeof manifest.order === 'number' ? manifest.order : 999,
      name: manifest.name,
      emoji: manifest.emoji || '📱',
      // Le vrai logo de l'app, quand il a été déposé dans assets/logos/ (une
      // image de 160 px tirée du dépôt de l'app). Sinon l'emoji fait l'affaire.
      // ?v= : quand un logo change (OptiLED → Kultiled), le navigateur le recharge.
      logo: fs.existsSync(path.join(LOGOS_DIR, id + '.webp')) ? 'logos/' + id + '.webp?v=' + Math.round(fs.statSync(path.join(LOGOS_DIR, id + '.webp')).mtimeMs) : null,
      tagline: manifest.tagline || '',
      // L'état du projet, décidé par Jean dans Mes applis (jamais déduit d'une phrase).
      etat: ['actif', 'pause', 'archive'].includes(manifest.etat) ? manifest.etat : 'actif',
      repo: manifest.repo || '',
      platforms: manifest.platforms || [],
      services: services.filter((sid) => SERVICES.some((s) => s.id === sid)),
      infraHtml: infra.html,
      infraToc: infra.toc,
      infraEssentiel: extractInfraEssentiel(infraMd),
      parcours: extractParcours(infraMd),
      marketingHtml: marketing.html,
      marketingToc: marketing.toc,
      marketingSummary: extractMarketingSummary(marketingMd),
      remuneration: extractPhases(marketingMd),
      publicationHtml: publication ? publication.html : null,
      publicationToc: publication ? publication.toc : null,
      // Même forme que « Vue d'ensemble » de l'infra : mêmes puces, même extracteur.
      publicationEssentiel: publicationMd ? extractInfraEssentiel(publicationMd) : null,
      publicationPlateformes: publicationMd ? extractPublicationPlateformes(publicationMd) : null,
      boutiques: publicationMd ? extractBoutiques(publicationMd) : null,
      serviceAnchors: ancresServices,
      serviceFournisseurs: findServiceProviders(services, infra.toc, ancresServices),
      fiches,
      status,
    });
  }
  // Tri : champ "order" du manifeste (plus petit = premier), puis alphabétique.
  apps.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fr'));
  return apps;
}

// ── 5. Génération de docs/index.html ─────────────────────────────────────────
function build() {
  console.log('🔒 Rappel : AUCUN secret dans ce dépôt — uniquement des références.');
  scanSecrets();

  const apps = loadApps();
  const data = {
    generatedAt: new Date().toISOString(),
    categories: CATEGORIES,
    services: SERVICES,
    apps,
  };

  // Données lues par le Studio (server/applis.js) : fichier généré, hors dépôt.
  const out = path.join(ROOT, 'data', 'applis.json');
  fs.writeFileSync(out, JSON.stringify(data));
  const size = (fs.statSync(out).size / 1024).toFixed(0);
  console.log(`\n\u2705 data/applis.json g\u00e9n\u00e9r\u00e9 (${size} Ko)`);
  console.log(`   ${apps.length} app(s) visible(s) : ${apps.map((a) => a.name).join(', ') || '\u2014'}`);
  console.log(`   ${SERVICES.length} services au catalogue (${CATEGORIES.length} familles)`);
}

// Lancé en commande : on construit. Requis par les tests : on prête les lecteurs.
if (require.main === module) build();
module.exports = { extractParcours, extractPhases, extractBoutiques };

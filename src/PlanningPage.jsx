// Planning des réseaux sociaux : une ligne par compte (TikTok, YouTube,
// Pinterest…), une colonne par jour. Une publication = une vidéo sur un
// compte, un jour. On glisse une vidéo « à placer » sur une case (ou on la
// touche, puis ＋) ; une vignette se glisse vers une autre case. La fiche à
// droite garde la légende, la vidéo et les actions ; une diode dit si
// chaque publication est faite (verte) ou à faire (orange).
import React, { useEffect, useRef, useState } from 'react';
import { LogoReseau } from './LogoReseau.jsx';
import { LogoAppli } from './LogoAppli.jsx';
import { api, copyText, followJob } from './api.js';
import { surLeMac } from './VideoSave.jsx';

const RESEAUX = [
  ['tiktok', 'TikTok', 'TT'],
  ['youtube', 'YouTube', 'YT'],
  ['instagram', 'Instagram', 'IG'],
  ['pinterest', 'Pinterest', 'Pin'],
];
const NOM_RESEAU = Object.fromEntries(RESEAUX.map(([k, n]) => [k, n]));

// Une couleur par appli (fond, encre).
const COULEURS = {
  erea: ['#FAEEDA', '#633806'],
  palabre: ['#EEEDFE', '#3C3489'],
  kultiva: ['#E1F5EE', '#085041'],
  kultivaprix: ['#EAF3DE', '#27500A'],
  keurcook: ['#FAECE7', '#712B13'],
  recettes: ['#FBEAF0', '#72243E'],
  keurdeco: ['#F1EFE8', '#444441'],
  keurbook: ['#E6F1FB', '#0C447C'],
  optiled: ['#FAEEDA', '#412402'],
  keurfoot: ['#E3F1E6', '#1B4D2B'],
  keurkado: ['#FBE9E7', '#7A1F12'],
};
const teinte = (v) => COULEURS[v?.depot] || ['#F1EFE8', '#2C2C2A'];

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const depuisIso = (s) => new Date(`${s}T12:00:00`);
const decaler = (s, n) => {
  const d = depuisIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
function lundi(d) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const jourCourt = (d) => `${JOURS[(d.getDay() + 6) % 7]} ${d.getDate()}`;
const cle = (x) => `${x.projectId}:${x.number}`;
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

// Réseaux repliés et comptes masqués : retenus sur l'appareil.
const RANGEMENT = 'drama-studio.planning';
function lireRangement() {
  try {
    return JSON.parse(localStorage.getItem(RANGEMENT)) || {};
  } catch {
    return {};
  }
}

const COLS = '140px repeat(7, minmax(0, 1fr))';
const pastille = (bg, color) => ({ fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: bg, color, whiteSpace: 'nowrap' });
const petitBouton = { border: 'none', borderRadius: 10, padding: '6px 10px', background: 'var(--carte-2)', color: 'var(--texte)', fontWeight: 800, fontSize: 12, cursor: 'pointer' };

function Apercu({ v, w, h }) {
  const [fond, encre] = teinte(v);
  return v?.vignette ? (
    <img src={v.vignette} style={{ width: w, height: h, objectFit: 'cover', borderRadius: 14, flex: 'none', display: 'block' }} />
  ) : (
    <div style={{ width: w, height: h, borderRadius: 14, flex: 'none', background: `repeating-linear-gradient(135deg, rgba(0,0,0,0.06) 0 7px, rgba(0,0,0,0) 7px 14px) ${fond}`, color: encre }} />
  );
}

// Les dépôts d'une appli dans le planning (les recettes vont avec Keur Cook).
const depotsDe = (cle) => (cle === 'keurcook' ? ['keurcook', 'recettes'] : [cle]);
// Garde seulement ce qui concerne une appli : ses comptes et ses vidéos.
function filtrer(d, cle) {
  if (!cle) {
    return d;
  }
  const deps = depotsDe(cle);
  const aElle = (v) => deps.includes(v?.depot);
  return {
    ...d,
    comptes: d.comptes.filter((c) => (c.applis || []).some((a) => deps.includes(a))),
    aPlacer: d.aPlacer.filter(aElle),
    publications: d.publications.filter((p) => aElle(p.video)),
  };
}

// `appli` (clé du dépôt) : planning réduit à cette appli (écran Publicité).
// Les sites : une ligne par site, ce qui sort chaque jour (articles datés,
// épingles Pinterest prévues). Lu dans les dépôts, rien ne se déplace ici.
function LignesSites({ sites, appli, jours, aujourdhui, caseSite, setCaseSite }) {
  const liste = (sites?.sites || []).filter((s) => !appli || s.cle === appli);
  if (!liste.length) return null;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 2px 2px', color: 'var(--c-muted)', fontSize: 12 }}>
        <span style={{ width: 12 }}>▾</span>
        <span style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--texte)' }}>Sites</span>
        <span>articles programmés et épingles Pinterest prévues</span>
      </div>
      {liste.map((s) => (
        <div key={s.cle} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px 10px', background: 'var(--side)', borderRadius: 12, minHeight: 52, boxSizing: 'border-box' }}>
            <b style={{ fontSize: 13, display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              <LogoAppli de={s.domaine} taille={18} />
              {s.nom}
            </b>
            <span className="clay-muted" style={{ fontSize: 11 }}>{s.domaine}</span>
          </div>
          {jours.map((d) => {
            const j = iso(d);
            const ici = s.jours[j] || [];
            const a = ici.filter((e) => e.type === 'article').length;
            const p = ici.filter((e) => e.type === 'epingle').length;
            const k = `${s.cle}|${j}`;
            return (
              <button
                key={j}
                type="button"
                disabled={!ici.length}
                onClick={() => setCaseSite(caseSite === k ? null : k)}
                style={{ background: j === aujourdhui ? 'var(--carte-2)' : 'var(--carte)', border: 'none', borderRadius: 12, minHeight: 52, padding: 5, display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start', justifyContent: 'center', cursor: ici.length ? 'pointer' : 'default', color: 'var(--texte)', outline: caseSite === k ? '2px solid var(--accent)' : 'none', fontSize: 12, fontWeight: 800 }}
              >
                {a ? <span>📝 {pluriel(a, 'article')}</span> : null}
                {p ? <span>📌 {pluriel(p, 'épingle')}</span> : null}
              </button>
            );
          })}
        </div>
      ))}
    </>
  );
}

function DetailSite({ sites, caseSite, fermer }) {
  if (!caseSite || !sites) return null;
  const [cle, j] = caseSite.split('|');
  const s = sites.sites.find((x) => x.cle === cle);
  const ici = s?.jours[j] || [];
  if (!ici.length) return null;
  const jour = depuisIso(j).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="clay-block" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <LogoAppli de={s.domaine} taille={22} />
        <b style={{ flex: 1 }}>
          {s.nom} · {jour}
        </b>
        <button className="clay-btn ghost small" onClick={fermer}>
          Fermer
        </button>
      </div>
      {ici.map((e, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 13 }}>
          <span>{e.type === 'article' ? '📝' : '📌'}</span>
          <span style={{ flex: 1 }}>
            {e.lien ? (
              <a href={e.lien} target="_blank" rel="noreferrer">
                {e.titre}
              </a>
            ) : (
              e.titre
            )}
            {e.type === 'epingle' ? <span className="clay-muted small"> · Pinterest{e.prevision ? ' (prévision)' : ' (déjà programmée)'}</span> : <span className="clay-muted small"> · article, en ligne ce jour-là</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PlanningPage({ appli } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [debut, setDebut] = useState(() => lundi(new Date()));
  const [sel, setSel] = useState(null); // vidéo à placer (clé), en attente d'une case
  const [fiche, setFiche] = useState(null); // vidéo ouverte dans la fiche (clé)
  const [over, setOver] = useState(null); // case survolée pendant un glisser
  const [rangement, setRangement] = useState(lireRangement);
  const [envoi, setEnvoi] = useState(null);
  const [sites, setSites] = useState(null); // ce qui sort sur chaque site (lecture seule)
  const [caseSite, setCaseSite] = useState(null); // « cle|jour » ouverte dans le détail
  const drag = useRef(null);
  const glisse = useRef(false); // vrai juste après un glisser (le clic qui suit est ignoré)

  const load = () =>
    api
      .planning()
      .then((d) => {
        setData(filtrer(d, appli));
        setError('');
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [appli]);
  useEffect(() => {
    api
      .planningSites()
      .then(setSites)
      .catch(() => setSites({ sites: [] }));
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(RANGEMENT, JSON.stringify(rangement));
    } catch {
      // préférence non retenue : sans gravité
    }
  }, [rangement]);

  if (!data) {
    return <div className="clay-content clay-muted">{error || 'Chargement…'}</div>;
  }

  const act = (p) => p.then(load).catch((e) => setError(e.message));
  const aujourdhui = iso(new Date());
  const { comptes, aPlacer, publications } = data;
  const compteDe = Object.fromEntries(comptes.map((c) => [c.id, c]));
  const ordre = Object.fromEntries(comptes.map((c, i) => [c.id, i]));
  const videos = new Map();
  aPlacer.forEach((v) => videos.set(cle(v), v));
  publications.forEach((p) => videos.set(cle(p), p.video));
  const pubsDe = (k) => publications.filter((p) => cle(p) === k).sort((a, b) => ordre[a.compte] - ordre[b.compte]);
  const dejaSur = (k, compte) => publications.some((p) => cle(p) === k && p.compte === compte);
  const enRetard = (p) => p.date < aujourdhui && !p.publie;
  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(debut);
    d.setDate(d.getDate() + i);
    return d;
  });
  const [premier, dernier] = [iso(jours[0]), iso(jours[6])];
  const dansSemaine = (p) => p.date >= premier && p.date <= dernier;
  const semaine = (n) => {
    const d = new Date(debut);
    d.setDate(d.getDate() + 7 * n);
    setDebut(d);
  };
  // Publication directe : seulement le compte YouTube qui porte le nom de la
  // chaîne connectée dans les Réglages.
  const direct = (p) => {
    const c = compteDe[p.compte];
    return c?.reseau === 'youtube' && data.youtube && c.nom.toLowerCase() === String(data.youtube).toLowerCase();
  };

  const placer = (k, compte, date) => {
    const v = videos.get(k);
    if (!v || dejaSur(k, compte)) {
      return;
    }
    setFiche(k);
    setSel(k);
    act(api.placerPlanning({ projectId: v.projectId, number: v.number, comptes: [compte], date }));
  };
  const deplacer = (id, compte, date) => {
    const p = publications.find((x) => x.id === id);
    if (!p || (p.compte === compte && p.date === date) || (p.compte !== compte && dejaSur(cle(p), compte))) {
      return;
    }
    setFiche(cle(p));
    act(api.modifierPlanning(id, { compte, date }));
  };
  const deposer = (compte, date) => {
    const d = drag.current;
    drag.current = null;
    setOver(null);
    if (d?.type === 'video') {
      placer(d.cle, compte, date);
    } else if (d?.type === 'pub') {
      deplacer(d.id, compte, date);
    }
  };
  const finGlisser = () => {
    drag.current = null;
    setOver(null);
  };
  // Glisser au doigt comme à la souris (iPad compris) : la vignette suit le
  // doigt, la case survolée s'allume, on lâche pour poser. Un simple toucher
  // (sans bouger) reste un toucher : il ouvre la fiche.
  const glisser = (e, quoi) => {
    if (e.button > 0) {
      return;
    }
    const source = e.currentTarget;
    const [x0, y0] = [e.clientX, e.clientY];
    let fantome = null;
    const caseSous = (ev) => document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-case]');
    const bouge = (ev) => {
      if (!fantome) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 8) {
          return;
        }
        drag.current = quoi;
        const r = source.getBoundingClientRect();
        fantome = source.cloneNode(true);
        Object.assign(fantome.style, { position: 'fixed', zIndex: 50, pointerEvents: 'none', width: `${r.width}px`, opacity: 0.85, transform: 'rotate(-3deg) scale(1.05)', boxShadow: 'var(--clay)', margin: 0 });
        document.body.appendChild(fantome);
      }
      ev.preventDefault();
      fantome.style.left = `${ev.clientX - 30}px`;
      fantome.style.top = `${ev.clientY - 20}px`;
      setOver(caseSous(ev)?.dataset.case || null);
    };
    const fin = (ev) => {
      window.removeEventListener('pointermove', bouge);
      window.removeEventListener('pointerup', fin);
      window.removeEventListener('pointercancel', fin);
      if (!fantome) {
        return;
      }
      fantome.remove();
      glisse.current = true;
      setTimeout(() => (glisse.current = false), 50);
      const c = ev.type === 'pointerup' ? caseSous(ev) : null;
      if (c) {
        deposer(c.dataset.compte, c.dataset.jour);
      } else {
        finGlisser();
      }
    };
    window.addEventListener('pointermove', bouge, { passive: false });
    window.addEventListener('pointerup', fin);
    window.addEventListener('pointercancel', fin);
  };
  const basculer = (p) => act(api.modifierPlanning(p.id, { publie: !p.publie }));
  const publierYoutube = (p) => {
    setEnvoi(p.id);
    api
      .publierYoutube(p.id)
      .then(({ jobId }) => followJob(jobId))
      .then(load)
      .catch((e) => setError(e.message))
      .finally(() => setEnvoi(null));
  };
  const lienTelechargement = (v) =>
    surLeMac() ? v.video : `${v.video}?dl=1&name=${encodeURIComponent(v.legende.slice(0, 120) + '.mp4')}`;

  // ---------- Vignette d'une publication dans la grille ----------
  const vignette = (p) => {
    const v = p.video;
    const [fond, encre] = teinte(v);
    return (
      <div
        key={p.id}
        onPointerDown={(e) => glisser(e, { type: 'pub', id: p.id })}
        onClick={() => !glisse.current && setFiche(cle(p))}
        title={v.titre}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          borderRadius: 8,
          padding: '5px 5px 5px 7px',
          cursor: 'grab',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          background: fond,
          color: encre,
          outline: fiche === cle(p) ? '2px solid var(--accent)' : 'none',
          outlineOffset: 1,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{v.titre}</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            title="Enlever du planning"
            onClick={(e) => {
              e.stopPropagation();
              act(api.retirerPlanning(p.id));
            }}
            style={{ width: 24, height: 24, borderRadius: 7, border: 'none', background: 'transparent', color: encre, fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: 0, lineHeight: 1, opacity: 0.7 }}
          >
            ✕
          </button>
          {/* Diode : verte = publiée, orange = à publier (toucher pour changer) */}
          <button
            title={p.publie ? 'Publiée — toucher pour annuler' : 'À publier — toucher une fois publiée'}
            onClick={(e) => {
              e.stopPropagation();
              basculer(p);
            }}
            style={{ width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: p.publie ? '#3fbf6a' : '#f0962e', boxShadow: `0 0 0 2px ${fond}, 0 0 8px ${p.publie ? '#3fbf6a' : '#f0962e'}` }} />
          </button>
        </div>
      </div>
    );
  };

  // ---------- Fiche de la vidéo ouverte ----------
  const fv = fiche && videos.get(fiche);
  const fps = fv ? pubsDe(fiche) : [];
  const ficheJsx = fv && (
    <aside
      style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 10, width: 360, maxWidth: '92%', boxSizing: 'border-box', background: 'var(--side)', borderRadius: '28px 0 0 28px', boxShadow: 'var(--clay)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={pastille(teinte(fv)[0], teinte(fv)[1])}>
          <LogoAppli de={fv.depot === 'recettes' ? 'keurcook' : fv.depot} taille={16} />
          {fv.appli}
        </span>
        <div style={{ flex: 1 }} />
        <button className="clay-pill" style={{ width: 34, height: 34, fontSize: 14 }} title="Fermer" onClick={() => (setFiche(null), setSel(null))}>
          ✕
        </button>
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Apercu v={fv} w={90} h={160} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <b style={{ fontSize: 18, lineHeight: 1.25 }}>{fv.titre}</b>
          <span className="clay-muted small">
            {!fps.length
              ? 'Pas encore placée'
              : `${pluriel(fps.length, 'compte')} · ${fps.some((p) => !p.publie) ? `${fps.filter((p) => !p.publie).length} à publier` : 'tout est publié'}`}
          </span>
          <a className="clay-btn ghost small" style={{ alignSelf: 'flex-start' }} href={lienTelechargement(fv)} target={surLeMac() ? '_blank' : undefined} rel="noreferrer">
            {surLeMac() ? '▶︎ Voir' : '⬇️ Vidéo'}
          </a>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <b style={{ flex: 1, fontSize: 14 }}>Légende</b>
          <button className="clay-btn small" onClick={() => copyText(fv.legende)}>
            📋 Copier
          </button>
        </div>
        <div style={{ background: 'var(--carte)', borderRadius: 14, padding: '10px 12px', fontSize: 13, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{fv.legende}</div>
      </div>
      {fps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <b style={{ fontSize: 14 }}>Publications</b>
          {fps.map((p) => {
            const c = compteDe[p.compte];
            const retard = enRetard(p);
            return (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--carte)', borderRadius: 14, padding: '8px 8px 8px 12px', boxShadow: 'var(--clay-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                    <span className="clay-muted" style={{ fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center' }}>
                      <LogoReseau id={c.reseau} taille={14} />
                      {NOM_RESEAU[c.reseau]}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.nom}>{c.nom}</span>
                  </div>
                  <span className={`clay-state ${p.publie ? 'ok' : retard ? 'ko' : 'run'}`}>{p.publie ? '✓ Publiée' : retard ? 'En retard' : 'À publier'}</span>
                  <button title="Retirer ce compte" onClick={() => act(api.retirerPlanning(p.id))} style={{ ...petitBouton, background: 'transparent', color: 'var(--c-muted)' }}>
                    ✕
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--carte-2)', borderRadius: 10 }}>
                    <button style={{ ...petitBouton, background: 'transparent' }} onClick={() => deplacer(p.id, p.compte, decaler(p.date, -1))}>
                      ‹
                    </button>
                    <span style={{ fontSize: 12, fontWeight: 800, minWidth: 48, textAlign: 'center' }}>{jourCourt(depuisIso(p.date))}</span>
                    <button style={{ ...petitBouton, background: 'transparent' }} onClick={() => deplacer(p.id, p.compte, decaler(p.date, 1))}>
                      ›
                    </button>
                  </div>
                  <div style={{ flex: 1 }} />
                  {p.url && (
                    <a className="clay-btn ghost small" href={p.url} target="_blank" rel="noreferrer">
                      Voir{p.prive ? ' (privée)' : ''}
                    </a>
                  )}
                  {!p.publie && direct(p) ? (
                    <button className="clay-btn small" disabled={envoi === p.id} onClick={() => publierYoutube(p)}>
                      {envoi === p.id ? '⏳ Envoi…' : '▶️ Publier'}
                    </button>
                  ) : (
                    <button className={`clay-btn small${p.publie ? ' ghost' : ''}`} onClick={() => basculer(p)}>
                      {p.publie ? 'Annuler' : '✓ Fait'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {comptes.some((c) => !dejaSur(fiche, c.id)) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="clay-muted small" style={{ fontWeight: 800 }}>
            {fps.length ? `Ajouter un compte (${jourCourt(depuisIso(fps[0].date)).toLowerCase()})` : 'Placer aujourd’hui sur…'}
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {comptes
              .filter((c) => !dejaSur(fiche, c.id))
              .sort((a, b) => Number(fv.proposes?.includes(b.id)) - Number(fv.proposes?.includes(a.id)))
              .map((c) => (
                <button key={c.id} style={petitBouton} onClick={() => placer(fiche, c.id, fps[0]?.date || aujourdhui)}>
                  ＋ <LogoReseau id={c.reseau} taille={14} />
                  {c.nom}
                  {fv.proposes?.includes(c.id) ? ' ★' : ''}
                </button>
              ))}
          </div>
        </div>
      )}
      {fps.length > 0 && (
        <button className="clay-btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => act(api.retirerVideoPlanning(fv.projectId, fv.number))}>
          ✕ Retirer du planning
        </button>
      )}
    </aside>
  );

  return (
    <div className="clay-content" style={{ maxWidth: 'none', padding: 0, position: 'relative' }}>
      {error && <p className="error small" style={{ padding: '16px 28px 0', margin: 0 }}>{error}</p>}
      <div style={{ padding: '14px 28px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* À placer : dans le planning d'une appli seulement (le général ne fait que montrer) */}
          {appli && aPlacer.length > 0 && (
            <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <b>À placer</b>
            <span className="clay-state run">{aPlacer.length}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 2px 6px', minHeight: 58 }}>
            {aPlacer.map((v) => {
              const k = cle(v);
              const [fond, encre] = teinte(v);
              return (
                <div
                  key={k}
                  onPointerDown={(e) => glisser(e, { type: 'video', cle: k })}
                  onClick={() => !glisse.current && (setSel(sel === k ? null : k), setFiche(k))}
                  style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', flex: '0 0 180px', display: 'flex', gap: 8, alignItems: 'center', padding: 7, borderRadius: 12, background: fond, color: encre, cursor: 'grab', outline: sel === k ? '3px solid var(--accent)' : 'none', outlineOffset: 2 }}
                >
                  <Apercu v={v} w={24} h={42} />
                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 11, fontWeight: 800 }}>{v.appli}</span>
                    <span style={{ fontSize: 12, lineHeight: 1.25, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{v.titre}</span>
                  </div>
                </div>
              );
            })}
          </div>
            </>
          )}

          {/* Semaine */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {sel && (
              <button className="clay-btn small" onClick={() => setSel(null)}>
                Terminé
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button style={petitBouton} onClick={() => semaine(-1)}>
                ‹
              </button>
              <b style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                {jours[0].getDate()} – {jours[6].getDate()} {MOIS[jours[6].getMonth()]}
              </b>
              <button style={petitBouton} onClick={() => semaine(1)}>
                ›
              </button>
              <button style={petitBouton} onClick={() => setDebut(lundi(new Date()))}>
                Aujourd'hui
              </button>
            </div>
          </div>

          {comptes.some((c) => rangement.masques?.[c.id]) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span className="clay-muted small" style={{ fontWeight: 800 }}>Comptes masqués :</span>
              {comptes
                .filter((c) => rangement.masques?.[c.id])
                .map((c) => (
                  <button key={c.id} style={{ ...petitBouton, borderRadius: 999 }} onClick={() => setRangement((x) => ({ ...x, masques: { ...x.masques, [c.id]: false } }))}>
                    <LogoReseau id={c.reseau} taille={14} />
                    {c.nom} · afficher
                  </button>
                ))}
            </div>
          )}

          {(
            <div style={{ overflowX: 'auto', scrollbarColor: 'var(--carte-2) transparent' }}>
              <div style={{ minWidth: appli ? 700 : 880, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 4, position: 'sticky', top: 0, background: 'var(--fond)', zIndex: 2, padding: '4px 0' }}>
                  <span />
                  {jours.map((d) => {
                    const j = iso(d);
                    return (
                      <span key={j} style={{ fontSize: 12, fontWeight: 800, padding: '4px 6px', color: j === aujourdhui ? 'var(--accent)' : j < aujourdhui ? 'var(--c-muted)' : 'var(--texte)' }}>
                        {jourCourt(d)}
                        {j === aujourdhui ? ' · auj.' : ''}
                      </span>
                    );
                  })}
                </div>
                {comptes.length === 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 4, marginTop: 8 }}>
                    <div className="clay-muted" style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', background: 'var(--side)', borderRadius: 12, minHeight: 60, fontSize: 13, fontWeight: 700 }}>
                      Aucune chaîne
                    </div>
                    {jours.map((d) => (
                      <div key={iso(d)} style={{ background: iso(d) === aujourdhui ? 'var(--carte-2)' : 'var(--carte)', borderRadius: 12, minHeight: 60 }} />
                    ))}
                  </div>
                )}
                {RESEAUX.map(([r, nom]) => {
                  const tous = comptes.filter((c) => c.reseau === r);
                  if (!tous.length) {
                    return null;
                  }
                  const replie = Boolean(rangement.replies?.[r]);
                  const n = publications.filter((p) => compteDe[p.compte]?.reseau === r && dansSemaine(p)).length;
                  return (
                    <React.Fragment key={r}>
                      <button
                        onClick={() => setRangement((x) => ({ ...x, replies: { ...x.replies, [r]: !replie } }))}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: '10px 2px 2px', textAlign: 'left', color: 'var(--c-muted)', fontSize: 12 }}
                      >
                        <span style={{ width: 12 }}>{replie ? '▸' : '▾'}</span>
                        <LogoReseau id={r} taille={20} seul />
                        <span style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--texte)' }}>{nom}</span>
                        <span>
                          {pluriel(tous.length, 'compte')} · {pluriel(n, 'publication')}
                        </span>
                      </button>
                      {replie ? (
                        <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 4 }}>
                          <div className="clay-muted" style={{ display: 'flex', alignItems: 'center', padding: '0 10px', background: 'var(--side)', borderRadius: 10, height: 30, fontSize: 12, fontWeight: 700 }}>
                            Replié
                          </div>
                          {jours.map((d) => {
                            const j = iso(d);
                            const c = publications.filter((p) => p.date === j && compteDe[p.compte]?.reseau === r).length;
                            return (
                              <div key={j} className="clay-muted" style={{ height: 30, borderRadius: 10, background: 'var(--carte)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
                                {c || ''}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        tous
                          .filter((c) => !rangement.masques?.[c.id])
                          .map((c) => (
                            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 6px 6px 10px', background: 'var(--side)', borderRadius: 12, minHeight: 60, boxSizing: 'border-box' }}>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                  <b style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }} title={c.nom}>
                                    {(c.applis || []).slice(0, 3).map((a) => (
                                      <LogoAppli key={a} de={a} taille={18} />
                                    ))}
                                    {c.nom}
                                  </b>
                                  <span className="clay-muted" style={{ fontSize: 11 }}>
                                    {publications.filter((p) => p.compte === c.id && dansSemaine(p)).length} cette semaine
                                  </span>
                                </div>
                                <button title="Masquer ce compte" onClick={() => setRangement((x) => ({ ...x, masques: { ...x.masques, [c.id]: true } }))} style={{ ...petitBouton, background: 'transparent', color: 'var(--c-muted)', padding: '4px 6px' }}>
                                  ✕
                                </button>
                              </div>
                              {jours.map((d) => {
                                const j = iso(d);
                                const k = `${c.id}|${j}`;
                                const ici = publications.filter((p) => p.compte === c.id && p.date === j);
                                return (
                                  <div
                                    key={j}
                                    data-case={k}
                                    data-compte={c.id}
                                    data-jour={j}
                                    style={{ background: j === aujourdhui ? 'var(--carte-2)' : 'var(--carte)', borderRadius: 12, padding: 5, display: 'flex', flexDirection: 'column', gap: 4, minHeight: 60, boxSizing: 'border-box', outline: over === k ? '2px solid var(--accent)' : ici.length > 1 ? '2px solid var(--ko)' : 'none' }}
                                  >
                                    {ici.map(vignette)}
                                    {sel && !dejaSur(sel, c.id) && (
                                      <button onClick={() => placer(sel, c.id, j)} style={{ flex: 1, minHeight: 28, border: '2px dashed var(--accent)', borderRadius: 8, background: 'transparent', color: 'var(--accent)', fontWeight: 800, cursor: 'pointer' }}>
                                        ＋
                                      </button>
                                    )}
                                    {ici.length > 1 && <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--ko)' }}>{ici.length} le même jour</span>}
                                  </div>
                                );
                              })}
                            </div>
                          ))
                      )}
                    </React.Fragment>
                  );
                })}
                <LignesSites sites={sites} appli={appli} jours={jours} aujourdhui={aujourdhui} caseSite={caseSite} setCaseSite={setCaseSite} />
              </div>
            </div>
          )}
          <DetailSite sites={sites} caseSite={caseSite} fermer={() => setCaseSite(null)} />
          {ficheJsx}
        </div>

    </div>
  );
}

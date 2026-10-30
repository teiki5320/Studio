// Planning des réseaux sociaux : une ligne par compte (TikTok, YouTube,
// Pinterest…), une colonne par jour. Une publication = une vidéo sur un
// compte, un jour. On glisse une vidéo « à placer » sur une case (ou on la
// touche, puis ＋) ; une vignette se glisse vers une autre case. La fiche à
// droite garde la légende, la vidéo et les actions ; une diode dit si
// chaque publication est faite (verte) ou à faire (orange).
import React, { useEffect, useRef, useState } from 'react';
import { LogoReseau } from './LogoReseau.jsx';
import { LogoAppli } from './LogoAppli.jsx';
import { api, copyText } from './api.js';
import { surLeMac } from './VideoSave.jsx';
import './planning-jour.css';

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
  keurdesir: ['#F7E6EE', '#6B1E45'],
  keurbible: ['#EEF0F7', '#26315C'],
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
const MAX_CASE = 4; // au-delà, la case affiche « + N autres »
const JOURS_LONGS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// Réseaux repliés et comptes masqués : retenus sur l'appareil.
const RANGEMENT = 'drama-studio.planning';
function lireRangement() {
  try {
    return JSON.parse(localStorage.getItem(RANGEMENT)) || {};
  } catch {
    return {};
  }
}

// Petites icônes au trait (pas d'émoji dans la grille).
const DESSINS = {
  chev: 'M6 9l6 6 6-6',
  gauche: 'M15 18l-6-6 6-6',
  droite: 'M9 6l6 6-6 6',
  croix: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  article: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z',
};
const Ic = ({ n, taille }) => (
  <svg className="pl-ic" viewBox="0 0 24 24" aria-hidden="true" style={taille ? { width: taille, height: taille } : undefined}>
    <path d={DESSINS[n]} />
  </svg>
);
// Étiquette réseau colorée (TikTok, YouTube…).
const Net = ({ r }) => (
  <span className={`pl-net ${r}`}>
    <LogoReseau id={r} taille={14} seul />
    <span className="t">{NOM_RESEAU[r] || r}</span>
  </span>
);
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
function LignesSites({ sites, appli, jours, aujourdhui, caseSite, setCaseSite, rang0 = 0 }) {
  const liste = (sites?.sites || []).filter((s) => !appli || s.cle === appli);
  if (!liste.length) return null;
  return (
    <>
      <div className="pl-section statique">
        <Ic n="globe" />
        <span className="nom">Sites</span>
        <span>articles programmés et épingles Pinterest prévues</span>
      </div>
      {liste.map((s, n) => (
        <div key={s.cle} className="pl-rang pl-monte" style={{ '--i': rang0 + n }}>
          <div className="pl-compte">
            <div className="t">
              <b>
                <LogoAppli de={s.domaine} taille={20} />
                <span className="nom">{s.nom}</span>
              </b>
              <small>{s.domaine}</small>
            </div>
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
                aria-pressed={caseSite === k}
                onClick={() => setCaseSite(caseSite === k ? null : k)}
                className={`pl-case pl-site-case${j === aujourdhui ? ' auj' : j < aujourdhui ? ' passe' : ''}${caseSite === k ? ' on' : ''}`}
              >
                {a ? (
                  <span className="pl-net article">
                    <Ic n="article" />
                    {pluriel(a, 'article')}
                  </span>
                ) : null}
                {p ? (
                  <span className="pl-net pinterest">
                    <LogoReseau id="pinterest" taille={14} seul />
                    {pluriel(p, 'épingle')}
                  </span>
                ) : null}
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
  const a = ici.filter((e) => e.type === 'article').length;
  const p = ici.length - a;
  return (
    <div key={caseSite} className="pl-panneau">
      <div className="pl-panneau-t">
        <LogoAppli de={s.domaine} taille={44} seul />
        <div className="t">
          <b>{s.nom}</b>
          <span>
            {jour}
            {a ? ` · ${pluriel(a, 'article')}` : ''}
            {p ? ` · ${pluriel(p, 'épingle')}` : ''}
          </span>
        </div>
        <button className="clay-btn ghost small" onClick={fermer}>
          Fermer
        </button>
      </div>
      {ici.map((e, i) => (
        <div key={i} className="pl-entree">
          {e.type === 'article' ? (
            <span className="pl-net article">
              <Ic n="article" />
              Article
            </span>
          ) : (
            <Net r="pinterest" />
          )}
          <span className="t">
            {e.lien ? (
              <a href={e.lien} target="_blank" rel="noreferrer">
                {e.titre}
              </a>
            ) : (
              e.titre
            )}
          </span>
          <span className="clay-muted small">{e.type === 'epingle' ? (e.prevision ? 'prévision' : 'déjà programmée') : 'en ligne ce jour-là'}</span>
        </div>
      ))}
    </div>
  );
}

// Vue Jour (maquette D, Jean, 30/10) : sept boutons pour la semaine, puis les
// vidéos du jour choisi, une carte par vidéo avec une ligne par compte et une
// seule action. En bas, les vidéos validées à placer sur ce jour.
function VueJour({ jours, jourChoisi, setJourSel, aujourdhui, publications, compteDe, ordre, etat, direct, envoi, publierMaintenant, basculer, fiche, setFiche, aPlacer, placerJour, listeSites, setCaseSite, appliActive }) {
  const ici = publications.filter((p) => p.date === jourChoisi).sort((a, b) => ordre[a.compte] - ordre[b.compte]);
  const groupes = new Map();
  ici.forEach((p) => groupes.set(cle(p), [...(groupes.get(cle(p)) || []), p]));
  const d0 = depuisIso(jourChoisi);
  const titre = `${jourChoisi === aujourdhui ? 'Aujourd’hui · ' : ''}${JOURS_LONGS[(d0.getDay() + 6) % 7]} ${d0.getDate()} ${MOIS[d0.getMonth()]}`;
  const faites = ici.filter((p) => p.publie).length;
  const sorties = listeSites
    .map((s) => ({ s, l: s.jours[jourChoisi] || [] }))
    .filter((x) => x.l.length);
  return (
    <div className="pl-vj">
      <div className="pl-vj-jours" role="tablist" aria-label="Jours de la semaine">
        {jours.map((d) => {
          const j = iso(d);
          const n = publications.filter((p) => p.date === j).length;
          const aFaire = j <= aujourdhui && publications.some((p) => p.date === j && !p.publie);
          return (
            <button
              key={j}
              type="button"
              role="tab"
              aria-selected={j === jourChoisi}
              className={`pl-vj-jour${j === jourChoisi ? ' on' : ''}${j < aujourdhui ? ' passe' : ''}`}
              onClick={() => setJourSel(j)}
            >
              {aFaire ? <i className="pt" aria-label="à publier" /> : null}
              <span className="aj">{j === aujourdhui ? 'Auj.' : JOURS[(d.getDay() + 6) % 7]}</span>
              <b>{d.getDate()}</b>
              <small>{n ? pluriel(n, 'pub') : '—'}</small>
            </button>
          );
        })}
      </div>

      <div className="pl-vj-tete">
        <h3>{titre}</h3>
        <span className="clay-muted">
          {ici.length ? `${pluriel(ici.length, 'publication')} · ${faites === ici.length ? 'tout est publié' : `${ici.length - faites} à faire`}` : 'Rien de prévu sur les réseaux'}
        </span>
      </div>

      {sorties.length > 0 && (
        <div className="pl-vj-sites">
          {sorties.map(({ s, l }) => {
            const a = l.filter((e) => e.type === 'article').length;
            const e = l.length - a;
            return (
              <button key={s.cle} type="button" className="pl-fpuce" onClick={() => setCaseSite(`${s.cle}|${jourChoisi}`)}>
                <LogoAppli de={s.domaine} taille={20} seul />
                {s.nom} · {[a ? pluriel(a, 'article') : '', e ? pluriel(e, 'épingle') : ''].filter(Boolean).join(', ')}
              </button>
            );
          })}
        </div>
      )}

      <div className="pl-vj-cartes">
        {[...groupes].map(([k, ps]) => {
          const v = ps[0].video;
          return (
            <article key={k} className={`pl-vj-carte${fiche === k ? ' on' : ''}`}>
              <button type="button" className="pl-vj-apercu" onClick={() => setFiche(k)} aria-label={`Ouvrir la fiche : ${v.titre}`}>
                <Apercu v={v} w={54} h={96} />
              </button>
              <div className="pl-vj-corps">
                <button type="button" className="pl-vj-titre" onClick={() => setFiche(k)}>
                  {!appliActive && <LogoAppli de={v.depot === 'recettes' ? 'keurcook' : v.depot} taille={18} seul />}
                  <b>{v.titre}</b>
                </button>
                {ps.map((p) => {
                  const c = compteDe[p.compte] || { nom: p.compte, reseau: '' };
                  const [texte, classe] = etat(p);
                  const libre = !p.publie && !p.envoi && !p.enFile;
                  return (
                    <div key={p.id} className="pl-vj-ligne">
                      <LogoReseau id={c.reseau} taille={16} seul />
                      <span className="nom" title={c.nom}>
                        {c.nom}
                      </span>
                      <span className={`pl-etat ${classe}`}>{texte}</span>
                      {libre && direct(p) ? (
                        <button className="clay-btn small" disabled={envoi === `${k}|${c.id}`} onClick={() => publierMaintenant(k, c)}>
                          {p.erreur ? 'Relancer' : 'Publier'}
                        </button>
                      ) : libre ? (
                        <button className="clay-btn ghost small" onClick={() => basculer(p)}>
                          ✓ Fait
                        </button>
                      ) : p.url ? (
                        <a className="clay-btn ghost small" href={p.url} target="_blank" rel="noreferrer">
                          Voir
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      {aPlacer.length > 0 && (
        <section className="pl-vj-placer">
          <span className="lab">À placer sur ce jour · {aPlacer.length}</span>
          <div className="pl-vj-puces">
            {aPlacer.map((v) => (
              <button key={cle(v)} type="button" className="pl-fpuce" onClick={() => placerJour(v, jourChoisi)} title="Placer ce jour-là sur ses comptes proposés">
                <Apercu v={v} w={18} h={32} />
                {!appliActive && <LogoAppli de={v.depot === 'recettes' ? 'keurcook' : v.depot} taille={18} seul />}
                <span className="t">{v.titre}</span>
                <span className="plus" aria-hidden="true">
                  +
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
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
  const [ouvertes, setOuvertes] = useState({}); // cases dépliées (« + N autres »)
  const [jourSel, setJourSel] = useState(null); // jour ouvert dans la vue Jour (iso)
  const [copie, setCopie] = useState(null); // légende copiée (clé de la vidéo)
  const drag = useRef(null);
  const glisse = useRef(false); // vrai juste après un glisser (le clic qui suit est ignoré)

  const load = () =>
    api
      .planning()
      .then((d) => {
        setData(d);
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

  // Filtre par appli (Jean, 30/10) : le planning général remplace la page de
  // chaque appli. Le choix est retenu sur l'appareil.
  const appliActive = appli || rangement.appli || null;
  const applisListe = [];
  [...data.aPlacer, ...data.publications.map((p) => p.video)].forEach((v) => {
    const d = v?.depot === 'recettes' ? 'keurcook' : v?.depot;
    if (d && !applisListe.some((a) => a.cle === d)) {
      applisListe.push({ cle: d, nom: v.depot === 'recettes' ? 'Keur Cook' : v.appli || d });
    }
  });
  const vu = filtrer(data, appliActive);
  const act = (p) => p.then(load).catch((e) => setError(e.message));
  const aujourdhui = iso(new Date());
  const { comptes, aPlacer, publications } = vu;
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
  // Planning général sans aucune vidéo programmée : on ne montre que ce qui
  // sort vraiment sur les sites (les lignes TikTok, YouTube… seraient vides).
  const sansVideos = !appliActive && !publications.length;
  const vue = rangement.vue || 'jour';
  const liste = vue === 'liste';
  const jourChoisi =
    jourSel && jourSel >= premier && jourSel <= dernier ? jourSel : aujourdhui >= premier && aujourdhui <= dernier ? aujourdhui : premier;
  const semaine = (n) => {
    const d = new Date(debut);
    d.setDate(d.getDate() + 7 * n);
    setDebut(d);
  };
  // Publication directe : seulement le compte YouTube qui porte le nom de la
  // chaîne connectée dans les Réglages.
  const directCompte = (c) =>
    (c?.reseau === 'youtube' && data.youtube && c.nom.toLowerCase() === String(data.youtube).toLowerCase()) || (c?.reseau === 'tiktok' && (data.tiktok || []).includes(c.id));
  const direct = (p) => {
    const c = compteDe[p.compte];
    return (c?.reseau === 'youtube' && data.youtube && c.nom.toLowerCase() === String(data.youtube).toLowerCase()) || (c?.reseau === 'tiktok' && (data.tiktok || []).includes(c.id));
  };
  // File d'envoi (Jean, 30/10) : le Studio envoie une publication à la fois.
  const enAttente = publications.filter((p) => p.enFile && !p.envoi && !p.publie).sort((a, b) => a.enFile.localeCompare(b.enFile));
  const enCours = publications.find((p) => p.envoi && !p.publie);
  // L'état d'une publication, en mots : [texte, classe].
  const etat = (p) => {
    if (p.publie) {
      return ['✓ Publiée', 'ok'];
    }
    if (p.envoi) {
      return ['⏳ Envoi en cours', 'file'];
    }
    if (p.enFile) {
      return [`⏳ En file · n° ${enAttente.findIndex((x) => x.id === p.id) + 1}`, 'file'];
    }
    if (p.erreur) {
      return ['Échec', 'ko'];
    }
    if (enRetard(p)) {
      return ['En retard', 'ko'];
    }
    return direct(p) ? ['Auto 18 h', 'auto'] : ['À publier', ''];
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
  const placerJour = (v, date) => {
    const deps = depotsDe(v.depot === 'recettes' ? 'keurcook' : v.depot);
    const ids = comptes.map((c) => c.id);
    const proposes = (v.proposes || []).filter((id) => ids.includes(id));
    const cs = proposes.length ? proposes : comptes.filter((c) => (c.applis || []).some((a) => deps.includes(a))).map((c) => c.id);
    if (!cs.length) {
      setError(`Aucune chaîne n’est reliée à ${v.appli || 'cette appli'} : relie-en une dans Mes applis.`);
      return;
    }
    setFiche(cle(v));
    act(api.placerPlanning({ projectId: v.projectId, number: v.number, comptes: cs, date }));
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
  // Publier tout de suite sur un compte branché (Jean, 30/10) : la vidéo est
  // placée aujourd'hui si elle n'y est pas encore, puis envoyée.
  const publierMaintenant = async (k, compte) => {
    const v = videos.get(k);
    const deja = pubsDe(k).find((p) => p.compte === compte.id && !p.publie);
    setEnvoi(`${k}|${compte.id}`);
    try {
      const id = deja ? deja.id : (await api.placerPlanning({ projectId: v.projectId, number: v.number, comptes: [compte.id], date: aujourdhui }))[0]?.id;
      if (!deja) {
        await load();
      }
      if (deja && deja.date !== aujourdhui) {
        await api.modifierPlanning(id, { date: aujourdhui });
      }
      await api.publierPlanning(id);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnvoi(null);
      load();
    }
  };
  const lienTelechargement = (v) =>
    surLeMac() ? v.video : `${v.video}?dl=1&name=${encodeURIComponent(v.legende.slice(0, 120) + '.mp4')}`;

  // ---------- Vignette d'une publication dans la grille ----------
  // Puce : logo et nom de l'appli, diode, titre, étiquette du réseau.
  // Une ligne par vidéo (Jean, 30/10 : beaucoup de vidéos par jour) : la
  // pastille de couleur dit l'état, le titre complet est dans la fiche.
  const vignette = (p) => {
    const v = p.video;
    const [texte, classe] = etat(p);
    return (
      <div
        key={p.id}
        className={`pl-puce compacte${fiche === cle(p) ? ' on' : ''}`}
        onPointerDown={(e) => glisser(e, { type: 'pub', id: p.id })}
        onClick={() => !glisse.current && setFiche(cle(p))}
        title={`${v.titre} — ${texte}`}
      >
        <span className={`pl-point ${classe}`} />
        {!appliActive && <LogoAppli de={v.depot === 'recettes' ? 'keurcook' : v.depot} taille={16} seul />}
        <span className="titre">{v.titre}</span>
      </div>
    );
  };

  // ---------- Fiche de la vidéo ouverte ----------
  const fv = fiche && videos.get(fiche);
  const fps = fv ? pubsDe(fiche) : [];
  // Fiche épurée (Jean, 30/10) : la vidéo, deux boutons (vidéo, légende),
  // le jour de programmation une seule fois, une ligne par compte avec une
  // seule action, puis les comptes à ajouter. La légende complète se déplie.
  const ficheJsx =
    fv &&
    (() => {
      const jourFiche = fps[0]?.date || jourChoisi;
      const aFaire = fps.filter((p) => !p.publie).length;
      const libres = comptes
        .filter((c) => !dejaSur(fiche, c.id))
        .sort((a, b) => Number(fv.proposes?.includes(b.id)) - Number(fv.proposes?.includes(a.id)));
      const decalerTout = (n) => fps.forEach((p) => deplacer(p.id, p.compte, decaler(p.date, n)));
      return (
        <aside className="pl-fiche pf" key={fiche} aria-label="Fiche de la vidéo">
          <div className="pf-tete">
            <Apercu v={fv} w={64} h={114} />
            <div className="pf-t">
              <span className="pf-appli">
                <LogoAppli de={fv.depot === 'recettes' ? 'keurcook' : fv.depot} taille={16} seul />
                {fv.appli}
              </span>
              <b>{fv.titre}</b>
              <span className={`pf-resume${aFaire ? ' afaire' : fps.length ? ' ok' : ''}`}>
                {!fps.length ? 'Pas encore programmée' : aFaire ? `${aFaire} à publier` : 'Tout est publié'}
              </span>
            </div>
            <button className="pf-fermer" title="Fermer" aria-label="Fermer la fiche" onClick={() => (setFiche(null), setSel(null))}>
              <Ic n="croix" taille={16} />
            </button>
          </div>

          <div className="pf-boutons">
            <a className="clay-btn ghost small" href={lienTelechargement(fv)} target={surLeMac() ? '_blank' : undefined} rel="noreferrer">
              {surLeMac() ? 'Voir la vidéo' : 'Enregistrer la vidéo'}
            </a>
            <button className="clay-btn ghost small" onClick={() => (copyText(fv.legende), setCopie(fiche))}>
              {copie === fiche ? 'Légende copiée ✓' : 'Copier la légende'}
            </button>
          </div>
          <details className="pf-legende">
            <summary>Voir la légende</summary>
            <p>{fv.legende}</p>
          </details>

          {fps.length > 0 && (
            <section className="pf-bloc">
              <div className="pf-bloc-t">
                <b>Programmée</b>
                <div className="pf-jour" role="group" aria-label="Changer de jour">
                  <button title="Jour d’avant" aria-label="Jour d’avant" onClick={() => decalerTout(-1)}>
                    <Ic n="gauche" taille={16} />
                  </button>
                  <span>{jourCourt(depuisIso(jourFiche))}</span>
                  <button title="Jour d’après" aria-label="Jour d’après" onClick={() => decalerTout(1)}>
                    <Ic n="droite" taille={16} />
                  </button>
                </div>
              </div>
              {fps.map((p) => {
                const c = compteDe[p.compte] || { id: p.compte, nom: p.compte, reseau: '' };
                const [texte, classe] = etat(p);
                const libre = !p.publie && !p.envoi && !p.enFile;
                return (
                  <div key={p.id} className="pf-ligne">
                    <div className="pf-l1">
                      <LogoReseau id={c.reseau} taille={18} seul />
                      <span className="nom" title={c.nom}>
                        {c.nom}
                        {p.date !== jourFiche ? <small> · {jourCourt(depuisIso(p.date))}</small> : null}
                      </span>
                      {p.publie ? (
                        <>
                          {p.url ? (
                            <a className="clay-btn ghost small" href={p.url} target="_blank" rel="noreferrer">
                              Voir
                            </a>
                          ) : null}
                          <button className="pl-etat ok" title="Remettre à publier" onClick={() => basculer(p)}>
                            {p.prive ? 'Publiée (privée)' : 'Publiée'}
                          </button>
                        </>
                      ) : p.envoi ? (
                        <span className="pl-etat file">Envoi…</span>
                      ) : p.enFile ? (
                        <button className="clay-btn ghost small" onClick={() => act(api.retirerFilePlanning(p.id))}>
                          {texte} · retirer
                        </button>
                      ) : direct(p) ? (
                        <button className="clay-btn small" disabled={envoi === `${fiche}|${c.id}`} onClick={() => publierMaintenant(fiche, c)}>
                          {p.erreur ? 'Relancer' : 'Publier'}
                        </button>
                      ) : (
                        <button className="clay-btn small" onClick={() => basculer(p)}>
                          ✓ Fait
                        </button>
                      )}
                      {libre && (
                        <button className="pf-x" title="Retirer ce compte" aria-label={`Retirer ${c.nom}`} onClick={() => act(api.retirerPlanning(p.id))}>
                          <Ic n="croix" taille={14} />
                        </button>
                      )}
                    </div>
                    {libre && classe === 'ko' ? <span className="pf-erreur">{p.erreur ? `L’envoi a échoué : ${p.erreur}` : 'En retard'}</span> : null}
                  </div>
                );
              })}
            </section>
          )}

          {libres.length > 0 && (
            <section className="pf-bloc">
              <b className="pf-bloc-t">{fps.length ? 'Ajouter un compte' : `Programmer ${jourChoisi === aujourdhui ? 'aujourd’hui' : jourCourt(depuisIso(jourChoisi)).toLowerCase()} sur`}</b>
              <div className="pf-puces">
                {libres.map((c) => (
                  <button key={c.id} className="pl-fpuce" onClick={() => placer(fiche, c.id, jourFiche)}>
                    <LogoReseau id={c.reseau} taille={16} seul />
                    {c.nom}
                    <span className="plus" aria-hidden="true">
                      +
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {fps.length > 0 && (
            <button className="pf-retirer" onClick={() => act(api.retirerVideoPlanning(fv.projectId, fv.number))}>
              Retirer du planning
            </button>
          )}
        </aside>
      );
    })();


  // Ce qui sort sur les sites cette semaine (pour le sous-titre).
  const listeSites = (sites?.sites || []).filter((s) => !appliActive || s.cle === appliActive);
  const sortiesSites = listeSites.reduce((t, s) => t + Object.entries(s.jours).filter(([j]) => j >= premier && j <= dernier).reduce((u, [, l]) => u + l.length, 0), 0);
  const nSemaine = publications.filter(dansSemaine).length;
  let rang = 0; // ordre d'arrivée des lignes (entrée en cascade)

  return (
    <div className="clay-content pl-page" data-sans-ressort="">
      {error && <p className="error small" style={{ padding: '16px clamp(16px, 3vw, 40px) 0', margin: 0 }}>{error}</p>}
      <div className="pl-corps">
          {/* À placer : dans le planning d'une appli seulement (le général ne fait que montrer) */}
          {vue !== 'jour' && appliActive && aPlacer.length > 0 && (
            <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <b>À placer</b>
            <span className="clay-state run">{aPlacer.length}</span>
            <small className="clay-muted">{sel ? 'touche maintenant le ＋ du jour voulu, dans le calendrier' : 'touche une vidéo, puis le ＋ du jour voulu (ou fais-la glisser)'}</small>
          </div>
          <div className="pl-aplacer tout">
            {aPlacer.map((v) => {
              const k = cle(v);
              return (
                <div
                  key={k}
                  className={`pl-puce${sel === k ? ' on' : ''}`}
                  onPointerDown={(e) => glisser(e, { type: 'video', cle: k })}
                  onClick={() => !glisse.current && (setSel(sel === k ? null : k), setFiche(k))}
                >
                  <Apercu v={v} w={24} h={42} />
                  <span className="titre">{v.titre}</span>
                </div>
              );
            })}
          </div>
            </>
          )}
          {/* Planning général : les vidéos validées se placent dans le planning de leur appli
              (page de l’appli → Son planning) ; ici, un rappel qui y mène (Jean, 29/10). */}
          {vue !== 'jour' && !appliActive && aPlacer.length > 0 && (
            <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <b>À placer</b>
            <span className="clay-state run">{aPlacer.length}</span>
            <small className="clay-muted">touche une appli pour placer ses vidéos</small>
          </div>
          <div className="pl-aplacer">
            {[...aPlacer.reduce((m, v) => {
              const depot = v.depot === 'recettes' ? 'keurcook' : v.depot;
              const g = m.get(depot) || { v, n: 0 };
              g.n += 1;
              return m.set(depot, g);
            }, new Map())].map(([depot, g]) => (
              <button key={depot} type="button" className="pl-puce" onClick={() => setRangement((x) => ({ ...x, appli: depot }))} style={{ font: 'inherit', color: 'inherit', textAlign: 'left' }}>
                <Apercu v={g.v} w={24} h={42} />
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="appli">{g.v.appli}</span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.25 }}>{g.n} vidéo{g.n > 1 ? 's' : ''} à placer →</span>
                </div>
              </button>
            ))}
          </div>
            </>
          )}

          {/* Semaine */}
          <div className="pl-tete pl-monte">
            <div className="pl-sous">
              Semaine du {jours[0].getDate()} {MOIS[jours[0].getMonth()]} · <b>{pluriel(nSemaine, 'vidéo')}</b> programmée{nSemaine > 1 ? 's' : ''}
              {listeSites.length ? (
                <>
                  {' '}· <b>{pluriel(sortiesSites, 'sortie')}</b> sur les sites
                </>
              ) : null}
            </div>
            <div className="pl-nav">
              {sel && (
                <button className="clay-btn small" onClick={() => setSel(null)}>
                  Terminé
                </button>
              )}
              <div className="pl-semaine">
                <button className="pl-rond" title="Semaine précédente" onClick={() => semaine(-1)}>
                  <Ic n="gauche" />
                </button>
                <b>
                  {jours[0].getDate()} – {jours[6].getDate()} {MOIS[jours[6].getMonth()]}
                </b>
                <button className="pl-rond" title="Semaine suivante" onClick={() => semaine(1)}>
                  <Ic n="droite" />
                </button>
              </div>
              <button className={`pl-pill${aujourdhui >= premier && aujourdhui <= dernier ? ' on' : ''}`} onClick={() => setDebut(lundi(new Date()))}>
                Aujourd'hui
              </button>
              <div className="pl-vues">
                {[
                  ['jour', 'Jour'],
                  ['semaine', 'Semaine'],
                  ['liste', 'Liste'],
                ].map(([id, nom]) => (
                  <button key={id} className={`pl-pill petite${vue === id ? ' on' : ''}`} onClick={() => setRangement((x) => ({ ...x, vue: id }))}>
                    {nom}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!appli && applisListe.length > 1 && (
            <div className="pl-filtre" role="group" aria-label="Filtrer par appli">
              <button className={`pl-fpuce${appliActive ? '' : ' on'}`} onClick={() => setRangement((x) => ({ ...x, appli: null }))}>
                Toutes
              </button>
              {applisListe.map((a) => (
                <button
                  key={a.cle}
                  className={`pl-fpuce${appliActive === a.cle ? ' on' : ''}`}
                  onClick={() => setRangement((x) => ({ ...x, appli: x.appli === a.cle ? null : a.cle }))}
                >
                  <LogoAppli de={a.cle} taille={22} seul />
                  {a.nom}
                </button>
              ))}
            </div>
          )}

          {(enCours || enAttente.length > 0) && (
            <div className="pl-file">
              <b>📤 File d’envoi</b>
              <span>
                {enCours ? <>en cours : <b>{enCours.video.titre}</b></> : 'démarrage…'}
                {enAttente.length ? ` · ${pluriel(enAttente.length, 'vidéo')} en attente` : ''}
              </span>
            </div>
          )}

          {comptes.some((c) => rangement.masques?.[c.id]) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span className="clay-muted small" style={{ fontWeight: 600 }}>Comptes masqués :</span>
              {comptes
                .filter((c) => rangement.masques?.[c.id])
                .map((c) => (
                  <button key={c.id} className="pl-pill petite" onClick={() => setRangement((x) => ({ ...x, masques: { ...x.masques, [c.id]: false } }))}>
                    <LogoReseau id={c.reseau} taille={14} seul />
                    {c.nom} · afficher
                  </button>
                ))}
            </div>
          )}

          {vue === 'jour' ? (
            <VueJour
              {...{ jours, jourChoisi, setJourSel, aujourdhui, publications, compteDe, ordre, etat, direct, envoi, publierMaintenant, basculer, fiche, setFiche, aPlacer, placerJour, listeSites, setCaseSite, appliActive }}
            />
          ) : liste && !sansVideos ? (
            <div className="pl-liste">
              {jours.map((d) => {
                const j = iso(d);
                const ici = publications
                  .filter((p) => p.date === j && !rangement.masques?.[p.compte])
                  .sort((a, b) => ordre[a.compte] - ordre[b.compte]);
                if (!ici.length && j !== aujourdhui) {
                  return null;
                }
                return (
                  <section key={j} className={`pl-liste-jour${j === aujourdhui ? ' auj' : ''}`}>
                    <h3>
                      {j === aujourdhui ? 'Aujourd’hui' : JOURS_LONGS[(d.getDay() + 6) % 7]} {d.getDate()} {MOIS[d.getMonth()]}
                      <span className="clay-muted"> · {pluriel(ici.length, 'vidéo')}</span>
                    </h3>
                    {!ici.length && <p className="clay-muted small" style={{ margin: 0 }}>Rien de prévu.</p>}
                    {ici.map((p) => {
                      const c = compteDe[p.compte];
                      const [texte, classe] = etat(p);
                      const peutEnvoyer = !p.publie && !p.envoi && !p.enFile && direct(p);
                      return (
                        <div key={p.id} className={`pl-ligne${fiche === cle(p) ? ' on' : ''}`} onClick={() => setFiche(cle(p))}>
                          <Apercu v={p.video} w={27} h={48} />
                          <div className="texte">
                            <b>{p.video.titre}</b>
                            <span className="clay-muted small">
                              <LogoReseau id={c.reseau} taille={13} seul /> {c.nom}
                              {!appliActive ? ` · ${p.video.appli}` : ''}
                            </span>
                          </div>
                          <span className={`pl-etat ${classe}`}>{texte}</span>
                          <div className="actions" onClick={(e) => e.stopPropagation()}>
                            <button style={petitBouton} title="Jour d’avant" onClick={() => deplacer(p.id, p.compte, decaler(p.date, -1))}>
                              ‹
                            </button>
                            <button style={petitBouton} title="Jour d’après" onClick={() => deplacer(p.id, p.compte, decaler(p.date, 1))}>
                              ›
                            </button>
                            {peutEnvoyer && (
                              <button className="clay-btn small" disabled={envoi === `${cle(p)}|${c.id}`} onClick={() => publierMaintenant(cle(p), c)}>
                                🚀
                              </button>
                            )}
                            <button style={{ ...petitBouton, background: 'transparent', color: 'var(--c-muted)' }} title="Enlever du planning" onClick={() => act(api.retirerPlanning(p.id))}>
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="pl-defile">
              <div className={`pl-grille${appliActive ? ' appli' : ''}`}>
                <div className="pl-rang pl-jours">
                  <span />
                  {jours.map((d) => {
                    const j = iso(d);
                    return (
                      <span key={j} className={`pl-jour${j === aujourdhui ? ' auj' : j < aujourdhui ? ' passe' : ''}`}>
                        <span>
                          {JOURS[(d.getDay() + 6) % 7]}
                          {j === aujourdhui ? <span className="auj-t"> · auj.</span> : null}
                        </span>
                        <span className="num">{d.getDate()}</span>
                      </span>
                    );
                  })}
                </div>
                {sansVideos ? (
                  <p className="clay-muted small" style={{ margin: '6px 2px' }}>
                    Aucune vidéo programmée sur les réseaux : seules les sorties des sites sont affichées.
                  </p>
                ) : null}
                {comptes.length === 0 && !sansVideos && (
                  <div className="pl-rang pl-monte" style={{ marginTop: 8 }}>
                    <div className="pl-compte">
                      <span className="clay-muted" style={{ fontSize: 13, fontWeight: 600 }}>Aucune chaîne</span>
                    </div>
                    {jours.map((d) => (
                      <div key={iso(d)} className={`pl-case${iso(d) === aujourdhui ? ' auj' : ''}`} />
                    ))}
                  </div>
                )}
                {RESEAUX.map(([r, nom]) => {
                  const tous = comptes.filter((c) => c.reseau === r);
                  if (!tous.length || sansVideos) {
                    return null;
                  }
                  const replie = Boolean(rangement.replies?.[r]);
                  const n = publications.filter((p) => compteDe[p.compte]?.reseau === r && dansSemaine(p)).length;
                  return (
                    <React.Fragment key={r}>
                      <button
                        className={`pl-section${replie ? ' replie' : ''}`}
                        aria-expanded={!replie}
                        onClick={() => setRangement((x) => ({ ...x, replies: { ...x.replies, [r]: !replie } }))}
                      >
                        <span className="pl-chev">
                          <Ic n="chev" />
                        </span>
                        <LogoReseau id={r} taille={20} seul />
                        <span className="nom">{nom}</span>
                        <span>
                          {pluriel(tous.length, 'compte')} · {pluriel(n, 'publication')}
                        </span>
                      </button>
                      {replie ? (
                        <div className="pl-rang pl-monte" style={{ '--i': rang++ }}>
                          <div className="pl-compte replie">Replié</div>
                          {jours.map((d) => {
                            const j = iso(d);
                            const c = publications.filter((p) => p.date === j && compteDe[p.compte]?.reseau === r).length;
                            return (
                              <div key={j} className={`pl-case replie${j === aujourdhui ? ' auj' : ''}`}>
                                {c || ''}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        tous
                          .filter((c) => !rangement.masques?.[c.id])
                          .map((c) => (
                            <div key={c.id} className="pl-rang pl-monte" style={{ '--i': rang++ }}>
                              <div className="pl-compte">
                                <div className="t">
                                  <b title={c.nom}>
                                    {!appliActive &&
                                      (c.applis || []).slice(0, 3).map((a) => (
                                        <LogoAppli key={a} de={a} taille={20} />
                                      ))}
                                    <span className="nom">{c.nom}</span>
                                  </b>
                                  <small>{publications.filter((p) => p.compte === c.id && dansSemaine(p)).length} cette semaine</small>
                                </div>
                                {!appli && (
                                  <button className="pl-masquer" title="Masquer ce compte" onClick={() => setRangement((x) => ({ ...x, masques: { ...x.masques, [c.id]: true } }))}>
                                    <Ic n="croix" taille={14} />
                                  </button>
                                )}
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
                                    className={`pl-case${j === aujourdhui ? ' auj' : j < aujourdhui ? ' passe' : ''}${over === k ? ' survol' : ''}`}
                                  >
                                    {(ouvertes[k] || ici.length <= MAX_CASE ? ici : ici.slice(0, MAX_CASE - 1)).map(vignette)}
                                    {ici.length > MAX_CASE && (
                                      <button className="pl-autres" onClick={() => setOuvertes((o) => ({ ...o, [k]: !o[k] }))}>
                                        {ouvertes[k] ? 'Replier' : `+ ${ici.length - MAX_CASE + 1} autres`}
                                      </button>
                                    )}
                                    {sel && !dejaSur(sel, c.id) && (
                                      <button className="pl-poser" title="Placer ici" onClick={() => placer(sel, c.id, j)}>
                                        <Ic n="plus" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))
                      )}
                    </React.Fragment>
                  );
                })}
                <LignesSites sites={sites} appli={appliActive} jours={jours} aujourdhui={aujourdhui} caseSite={caseSite} setCaseSite={setCaseSite} rang0={rang} />
              </div>
            </div>
          )}
          <DetailSite sites={sites} caseSite={caseSite} fermer={() => setCaseSite(null)} />
          {ficheJsx}
        </div>

    </div>
  );
}

// Mes applis et Lexique — repris du module « Mes apps » du Dashboard
// (dash-module.js). Les données viennent de /api/applis (data/applis.json,
// généré par tool/apps-build.cjs à partir de data/apps/<id>/).
//   #/applis               → la grille, Applis puis Sites
//   #/applis/<id>[/volet]  → la fiche d'une app : Technique / Marketing / Publication
//   #/lexique[/<service>]  → les services rangés par famille
// Le HTML des fiches vient des Markdown des dépôts de Jean (tool/markdown.cjs
// échappe le texte) : on l'insère tel quel.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, followJob } from './api.js';
import './applis.css';

const TINTS = ['mint', 'peach', 'sun', 'sky', 'lilac'];
const BADGES = { requis: 'Requis', optionnel: 'Optionnel', gratuit: 'Gratuit' };
export const FICHE_PERIMEE_JOURS = 45;

const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const nomCourt = (svc) => svc.nom.replace(/\s*\(.*\)$/, '');

export function fmtDate(iso, avecHeure) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  let s = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  if (avecHeure) s += ` · ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  return s;
}

// Un « site » n'a que le Web pour plateforme ; tout le reste est une appli.
export const estSite = (a) => (a.platforms || []).length > 0 && a.platforms.every((p) => p === 'Web');

// Âge d'une fiche en jours (null si inconnu).
export function ficheAge(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : Math.floor((Date.now() - d.getTime()) / 86400000);
}
export function ageFiches(a) {
  const ages = [ficheAge(a.fiches?.infra), ficheAge(a.fiches?.marketing)].filter((x) => x !== null);
  return ages.length ? Math.min(...ages) : null;
}

// État du code d'après le dernier passage de la CI GitHub.
export function ciInfo(app) {
  const ci = app.status?.ci;
  if (!app.repo) return { k: 'none', label: 'Sans dépôt' };
  if (!ci) return { k: 'none', label: 'Jamais vérifiée' };
  const base = { url: ci.url || `https://github.com/${app.repo}/actions`, date: fmtDate(ci.updatedAt), dateLong: fmtDate(ci.updatedAt, true), enCours: Boolean(ci.enCours) };
  if (ci.status !== 'completed') return { ...base, k: 'run', label: 'Vérification en cours' };
  if (ci.conclusion === 'success') return { ...base, k: 'ok', label: 'Code OK' };
  if (ci.conclusion === 'failure') return { ...base, k: 'ko', label: 'Erreur de code' };
  return { ...base, k: 'none', label: `Vérif. ${ci.conclusion || ci.status}` };
}

export function Logo({ app, cls }) {
  const [rate, setRate] = useState(false);
  if (!app.logo || rate) return <span className={`${cls} logo-emoji`}>{app.emoji}</span>;
  return (
    <span className={`${cls} logo-vrai`}>
      <img src={`/${app.logo}`} alt="" loading="lazy" onError={() => setRate(true)} />
    </span>
  );
}

function CiPill({ app, big }) {
  const c = ciInfo(app);
  const inner = (
    <>
      <i className="dot" />
      <span className="ci-lbl">
        {c.label}
        {big ? <small>{c.dateLong || (app.repo ? 'aucune vérification' : 'à créer')}{c.enCours ? ' · revérification en cours' : ''}</small> : null}
      </span>
    </>
  );
  const cls = `ci ci-${c.k}${big ? ' ci-big' : ''}`;
  return big && c.url ? (
    <a className={cls} href={c.url} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    <span className={cls}>{inner}</span>
  );
}

// Les données, chargées une fois et partagées (Accueil, Mes applis, Lexique).
let cache = null;
export function useApplis() {
  const [data, setData] = useState(cache);
  const [error, setError] = useState('');
  useEffect(() => {
    let vivant = true;
    api
      .applis()
      .then((d) => {
        cache = d;
        if (vivant) setData(d);
      })
      .catch((e) => vivant && setError(e.message));
    return () => {
      vivant = false;
    };
  }, []);
  const recharger = () =>
    api.applis().then((d) => {
      cache = d;
      setData(d);
    });
  return { data, error, recharger };
}

// ---------- La grille ----------
function Grille({ data, onSynchro, synchro }) {
  const groupes = [
    ['Applis', data.apps.filter((a) => !estSite(a))],
    ['Sites', data.apps.filter(estSite)],
  ];
  const s = data.synchro || {};
  return (
    <div className="clay-content">
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="clay-muted small">
          Fiches à jour du {fmtDate(s.le || data.generatedAt, true) || '—'}
          {s.ok === false ? ' · ⚠️ dernière synchro en échec' : ''}
        </span>
        <button className="clay-btn small ghost" disabled={synchro} onClick={onSynchro}>
          {synchro ? '⏳ Synchro…' : '🔄 Synchroniser'}
        </button>
      </div>
      {groupes.map(([titre, liste]) =>
        liste.length ? (
          <div key={titre}>
            <p className="clay-sub">{titre}</p>
            <div className="clay-grid">
              {liste.map((a) => {
                const c = ciInfo(a);
                const age = ageFiches(a);
                const perimee = age !== null && age > FICHE_PERIMEE_JOURS;
                return (
                  <a key={a.id} className="clay-tile applis-tuile" href={`#/applis/${a.id}`}>
                    {perimee ? <span className="applis-coin" title={`Fiches vieilles de ${age} jours`} /> : null}
                    <span className="clay-tile-ic applis-logo">
                      <Logo app={a} cls="applis-logo-in" />
                    </span>
                    <b>{a.name}</b>
                    <span className="clay-muted small">{(a.platforms || []).join(' · ') || 'Aucune plateforme'}</span>
                    <span className={`clay-state ${c.k === 'ok' ? 'ok' : c.k === 'ko' ? 'ko' : c.k === 'run' ? 'att' : ''}`}>{c.label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}

// ---------- La fiche d'une app ----------
function Toc({ toc }) {
  const items = (toc || []).filter((t) => t.level >= 2 && t.level <= 3);
  if (items.length < 3) return null;
  return (
    <div className="toc">
      {items.map((t) => (
        <a key={t.id} className={`lvl-${t.level}`} href={`#${t.id}`} onClick={(e) => revelerAncre(t.id, e)}>
          {t.text}
        </a>
      ))}
    </div>
  );
}

function revelerAncre(id, e) {
  const cible = document.getElementById(id);
  if (!cible) return;
  e?.preventDefault();
  cible.closest('.fiche')?.classList.add('open');
  window.scrollTo({ top: cible.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth' });
}

function Fiche({ titre, sous, toc, html, onClickMd }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className={`tile fiche tint-sun rise${ouvert ? ' open' : ''}`}>
      <button className="fiche-toggle" type="button" onClick={() => setOuvert(!ouvert)}>
        <span className="fiche-t">
          <b>{titre}</b>
          <small>{sous}</small>
        </span>
        <span className="chev">Déplier</span>
      </button>
      <Toc toc={toc} />
      <div className="md" onClick={onClickMd} dangerouslySetInnerHTML={{ __html: html || '' }} />
    </div>
  );
}

const lienSiUrl = (v) =>
  /^https?:\/\/\S+$/.test(v) ? (
    <a href={v} target="_blank" rel="noopener noreferrer">
      {v.replace(/^https?:\/\//, '')}
    </a>
  ) : (
    v
  );

function Faits({ faits }) {
  return (
    <div className="facts">
      {faits.map((f, i) => (
        <div key={i} className="fact">
          <span>{f.label}</span>
          <span>{lienSiUrl(f.value)}</span>
        </div>
      ))}
    </div>
  );
}

function Services({ app, data, famTint, ouvrir }) {
  const services = app.services.map((id) => data.services.find((s) => s.id === id)).filter(Boolean);
  return (
    <div className="tile rise">
      <div className="tile-h">
        <b>Services</b>
        <span>{services.length} rattachés · touche pour la fiche</span>
      </div>
      {!services.length ? <span className="empty-note">Aucun service déclaré dans app.json.</span> : null}
      {data.categories.map((cat) => {
        const liste = services.filter((s) => s.categorie === cat);
        if (!liste.length) return null;
        return (
          <div key={cat} className="fam">
            <div className="fam-h">
              <i className={`sw sw-${famTint(cat)}`} />
              {cat}
            </div>
            <div className="chips">
              {liste.map((s) => {
                const fournisseur = (app.serviceFournisseurs || {})[s.id];
                const generique = nomCourt(s);
                const a = norm(fournisseur || '');
                const b = norm(generique);
                const redondant = Boolean(fournisseur) && (a.includes(b) || b.includes(a));
                return (
                  <button key={s.id} type="button" className={`chip tint-${famTint(cat)}`} onClick={() => ouvrir(s)}>
                    {s.emoji} {fournisseur || generique}
                    {fournisseur && !redondant ? <span className="chip-f">{generique}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Fiche d'une app — maquette « F2 Parcours » (13/10) ----------
// Chaque volet raconte un trajet : la chaîne jusqu'aux boutiques (Technique),
// les phases de rémunération (Marketing), les étapes qui restent
// (Publication). Les parties viennent des sections normées des fiches
// (« Parcours », « Rémunération par phases »…) ; tant qu'une fiche ne les a
// pas, le volet montre ce qu'elle contient déjà.
const ETAT_LIB = { ok: 'en place', run: 'à faire', ko: 'bloquant', none: 'pas encore' };
const COULEUR_TRAJET = ['bleu', 'ok', 'lilas', 'peche', 'run'];
const publicDe = (app) => (estSite(app) ? 'les visiteurs' : /jeu|game|cartes/i.test(app.tagline || '') ? 'les joueurs' : 'les utilisateurs');

function Legende() {
  return (
    <div className="fa-legende">
      {Object.entries(ETAT_LIB).map(([k, l]) => (
        <span key={k}>
          <i className={`fa-pt ${k}`} />
          {l}
        </span>
      ))}
    </div>
  );
}

function Trajets({ app, data, ouvrir }) {
  const trajets = app.parcours?.trajets || [];
  if (!trajets.length) return null;
  const service = (nom) => {
    const n = norm(nom);
    return data.services.find((s) => app.services.includes(s.id) && (norm(nomCourt(s)).includes(n) || n.includes(norm(nomCourt(s)))));
  };
  return (
    <div className="fa-carte">
      <div className="fa-carte-h">
        <h3>
          Comment {app.name} arrive chez {publicDe(app)}
        </h3>
        <small>d’après infra.md · touche une étape pour la fiche du service</small>
      </div>
      <div className="fa-trajets">
        {trajets.map((t, i) => (
          <div key={i} className={`fa-trajet c-${COULEUR_TRAJET[i % COULEUR_TRAJET.length]}`}>
            <span className="fa-trajet-nom">
              <span className="em">{t.emoji}</span>
              {t.nom}
            </span>
            <div className="fa-etapes">
              {t.etapes.map((e, j) => {
                const svc = service(e.nom);
                return (
                  <React.Fragment key={j}>
                    {j ? <span className={`fa-lien${t.etapes[j - 1].etat === 'ok' ? ' actif' : ''}`} style={{ '--d': `${j * 0.4}s` }} /> : null}
                    <button type="button" className={`fa-etape${svc ? ' cliquable' : ''}`} onClick={() => svc && ouvrir(svc)} title={ETAT_LIB[e.etat]}>
                      <span className="fa-etape-h">
                        {e.emoji ? <span className="em">{e.emoji}</span> : null}
                        <b>{e.nom}</b>
                        <i className={`fa-pt ${e.etat}`} />
                      </span>
                      {e.note ? <small>{e.note}</small> : null}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <Legende />
    </div>
  );
}

function Bref({ faits }) {
  if (!faits?.length) return null;
  return (
    <div className="fa-bref">
      {faits.map((f, i) => (
        <div key={i} className="fa-bref-c">
          <span className="lab">{f.label}</span>
          <span className="val">{lienSiUrl(f.value)}</span>
        </div>
      ))}
    </div>
  );
}

function Phases({ m, r }) {
  const phases = r?.phases || [];
  const actuelle = [...phases].reverse().find((p) => p.etat === 'ok');
  return (
    <div className="fa-carte fa-phases">
      <div className="fa-carte-h">
        <span className="fa-sur">Rémunération · aujourd’hui</span>
        <h3>{actuelle?.texte || m.model || 'Non renseigné'}</h3>
      </div>
      {phases.length > 1 ? (
        <div className="fa-etapier" style={{ '--n': phases.length }}>
          {phases.map((p, i) => (
            <div key={i} className={`fa-phase ${p.etat}`}>
              <span className="rond">{p.etat === 'ok' ? '✓' : i}</span>
              <b>
                {i} — {p.titre}
              </b>
              <small>{p.texte}</small>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Forces({ liste }) {
  if (!liste?.length) return null;
  return (
    <div className="fa-forces">
      {liste.map((f, i) => (
        <div key={i} className="fa-carte fa-force">
          <span className="em">{f.emoji || '✨'}</span>
          <b>{f.titre}</b>
          <p>{f.texte}</p>
        </div>
      ))}
    </div>
  );
}

function Mesures({ liste, kpis }) {
  const lignes = liste?.length ? liste : (kpis?.rows || []).map((r) => ({ label: r[0], value: r[1] }));
  if (!lignes.length) return null;
  return (
    <div className="fa-carte">
      <div className="fa-carte-h">
        <h3>Mesures</h3>
      </div>
      <div className="fa-lignes">
        {lignes.map((l, i) => (
          <div key={i} className="fa-ligne">
            <span>{l.label}</span>
            <b className={/v[ée]rifier|instrumenter|sans objet|aucun/i.test(l.value || '') ? 'gris' : ''}>{l.value || '—'}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function Reste({ liste }) {
  if (!liste?.length) return null;
  const faits = liste.filter((x) => x.fait).length;
  return (
    <div className="fa-carte fa-reste">
      <div className="fa-carte-h fa-reste-h">
        <h3>Ce qui reste, dans l’ordre</h3>
        <b>
          {faits} / {liste.length}
        </b>
      </div>
      <span className="fa-barre">
        <span style={{ width: `${(100 * faits) / liste.length}%` }} />
      </span>
      <ol>
        {liste.map((x, i) => (
          <li key={i} className={x.fait ? 'fait' : ''}>
            <span className="num">{x.fait ? '✓' : i + 1}</span>
            <span className="t">
              <b>{x.titre}</b>
              {x.texte ? <small>{x.texte}</small> : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Boutiques({ b }) {
  if (!b) return null;
  return (
    <div className="fa-carte fa-boutiques">
      <table>
        <thead>
          <tr>
            <th />
            {b.colonnes.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {b.lignes.map((l) => (
            <tr key={l.label}>
              <th>{l.label}</th>
              {l.cellules.map((c, i) => (
                <td key={i}>
                  {c.etat ? <i className={`fa-pt ${c.etat}`} /> : null}
                  {lienSiUrl(c.texte || '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Poids({ liste }) {
  return (liste || []).map((p, i) => {
    const r = p.max ? p.valeur / p.max : 0;
    return (
      <div key={i} className="fa-carte fa-poids">
        <div className="fa-carte-h">
          <h3>
            {p.emoji} {p.titre}
          </h3>
          <b className={r > 0.9 ? 'ko' : r > 0.75 ? 'run' : 'ok'}>
            {String(p.valeur).replace('.', ',')} / {p.max} {p.unite}
          </b>
        </div>
        <span className={`fa-barre ${r > 0.9 ? 'ko' : r > 0.75 ? 'run' : 'ok'}`}>
          <span style={{ width: `${Math.min(100, 100 * r)}%` }} />
        </span>
        {p.note ? <p className="fa-note">{p.note}</p> : null}
      </div>
    );
  });
}

function AnciennesBoutiques({ app }) {
  const plats = app.publicationPlateformes || [];
  if (!plats.length) return null;
  return plats.map((p, i) => (
    <div key={i} className="fa-carte">
      <div className="fa-carte-h">
        <h3>{p.titre}</h3>
      </div>
      <Faits faits={p.faits} />
    </div>
  ));
}

function FicheApp({ app, data, volet, famTint, ouvrir }) {
  const volets = [
    ['technique', '🛠️', 'Technique'],
    ['marketing', '📣', 'Marketing'],
  ];
  if (app.publicationHtml) volets.push(['publication', '🚀', 'Publication']);
  const v = volets.find((x) => x[0] === volet) || volets[0];
  // Un titre de la fiche technique rattaché à un service ouvre sa fiche.
  const clicMd = (e) => {
    const h = e.target.closest?.('[id]');
    const id = h && Object.entries(app.serviceAnchors || {}).find(([, ancre]) => ancre === h.id)?.[0];
    const svc = id && data.services.find((s) => s.id === id);
    if (svc && /^H[1-6]$/.test(h.tagName)) ouvrir(svc);
    const lien = e.target.closest?.('a[href^="#"]');
    if (lien) revelerAncre(lien.getAttribute('href').slice(1), e);
  };
  const barre = useRef(null);
  const [curseur, setCurseur] = useState(null);
  React.useLayoutEffect(() => {
    const b = barre.current?.querySelector('.on');
    if (b) setCurseur({ left: b.offsetLeft, top: b.offsetTop, width: b.offsetWidth, height: b.offsetHeight });
  }, [v[0], app.id]);
  const age = ageFiches(app);
  const plusRecente = Object.values(app.fiches || {}).filter(Boolean).sort().pop();
  const version = (app.boutiques?.enBref || []).find((f) => /version/i.test(f.label))?.value?.split(/[ (]/)[0];

  let corps;
  if (v[0] === 'publication') {
    const b = app.boutiques || {};
    const ess = app.publicationEssentiel || { facts: [] };
    corps = (
      <>
        <div className="fa-deux">
          <Reste liste={b.reste} />
          <div className="fa-pile">
            {b.boutiques ? <Boutiques b={b.boutiques} /> : <AnciennesBoutiques app={app} />}
            <Poids liste={b.poids} />
            {b.enBref?.length ? (
              <div className="fa-carte">
                <div className="fa-lignes">
                  {b.enBref.map((f, i) => (
                    <div key={i} className="fa-ligne">
                      <span>{f.label}</span>
                      <b>{lienSiUrl(f.value)}</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : !b.boutiques && ess.facts?.length ? (
              <div className="fa-carte">
                <Faits faits={ess.facts} />
              </div>
            ) : null}
          </div>
        </div>
        <Fiche titre="Fiche de publication complète" sous={`publication.md · mise à jour le ${fmtDate(app.fiches?.publication)}`} toc={app.publicationToc} html={app.publicationHtml} onClickMd={clicMd} />
      </>
    );
  } else if (v[0] === 'marketing') {
    const m = app.marketingSummary || {};
    const r = app.remuneration || {};
    corps = (
      <>
        <Phases m={m} r={r} />
        <Forces liste={r.forces} />
        <div className="fa-deux">
          <div className="fa-carte">
            <div className="fa-carte-h">
              <h3>Les 3 priorités</h3>
            </div>
            {(m.nextActions || []).length ? (
              <ol className="fa-priorites">
                {m.nextActions.map((a, i) => (
                  <li key={i}>
                    <span className="num">{i + 1}</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <span className="empty-note">Pas de section « Les 3 priorités » dans la fiche.</span>
            )}
          </div>
          <Mesures liste={r.mesures} kpis={m.kpis} />
        </div>
        <Fiche titre="Plan marketing complet" sous={`marketing.md · mis à jour le ${fmtDate(app.fiches?.marketing)}`} toc={app.marketingToc} html={app.marketingHtml} onClickMd={clicMd} />
      </>
    );
  } else {
    const ess = app.infraEssentiel || { facts: [] };
    const bref = app.parcours?.enBref?.length ? app.parcours.enBref : ess.facts;
    corps = (
      <>
        <Trajets app={app} data={data} ouvrir={ouvrir} />
        {bref?.length ? <Bref faits={bref} /> : ess.resume ? <p className="resume">{ess.resume}</p> : null}
        <Services app={app} data={data} famTint={famTint} ouvrir={ouvrir} />
        <Fiche titre="Fiche technique complète" sous={`infra.md · ${app.services.length} services · mise à jour le ${fmtDate(app.fiches?.infra)}`} toc={app.infraToc} html={app.infraHtml} onClickMd={clicMd} />
      </>
    );
  }

  return (
    <div className="clay-content dash-body fa">
      <div className="fa-fil">
        <a href="#/applis">Mes applis</a> › <a href={`#/applis/${app.id}`}>{app.name}</a> › <b>{v[2]}</b>
      </div>
      <div className="fa-hero">
        <Logo app={app} cls="app-big" />
        <div className="fa-hero-t">
          <h2>{app.name}</h2>
          {app.tagline ? <p>{app.tagline}</p> : null}
          <div className="chips">
            {(app.platforms || []).map((p) => (
              <span key={p} className="chip">
                {p}
              </span>
            ))}
            {app.repo ? (
              <a className="chip" href={`https://github.com/${app.repo}`} target="_blank" rel="noopener noreferrer">
                📦 {app.repo}
              </a>
            ) : (
              <span className="chip">Pas de dépôt</span>
            )}
            <span className="chip">{app.services.length} services</span>
            {version ? <span className="chip">v{version}</span> : null}
          </div>
        </div>
        <CiPill app={app} big />
      </div>
      <div className="fa-onglets-l">
        <div className="fa-onglets" ref={barre}>
          {curseur ? <span className="fa-curseur" style={curseur} /> : null}
          {volets.map(([id, ic, nom]) => (
            <a key={id} className={id === v[0] ? 'on' : ''} href={`#/applis/${app.id}/${id}`}>
              <span className="ic">{ic}</span>
              {nom}
            </a>
          ))}
        </div>
        {plusRecente ? (
          <span className="fa-age">
            Fiches à jour du {fmtDate(plusRecente)}
            {age !== null ? ` · ${age === 0 ? "aujourd'hui" : age === 1 ? 'il y a 1 jour' : `il y a ${age} jours`}` : ''}
          </span>
        ) : null}
      </div>
      <div key={v[0]} className="fa-corps" data-sans-ressort>
        {corps}
      </div>
    </div>
  );
}

// ---------- La fiche d'un service (panneau latéral) ----------
function sectionDeService(app, svcId) {
  const ancre = (app.serviceAnchors || {})[svcId];
  if (!ancre) return null;
  const hote = document.createElement('div');
  hote.innerHTML = app.infraHtml || '';
  const h = hote.querySelector(`[id="${ancre}"]`);
  if (!h || !/^H[1-6]$/.test(h.tagName)) return null;
  const niveau = Number(h.tagName.slice(1));
  let corps = '';
  for (let n = h.nextElementSibling; n; n = n.nextElementSibling) {
    if (/^H[1-6]$/.test(n.tagName) && Number(n.tagName.slice(1)) <= niveau) break;
    corps += n.outerHTML;
  }
  const tmp = document.createElement('div');
  tmp.innerHTML = corps;
  const liens = [...new Set([...tmp.querySelectorAll('a[href^="http"]')].map((a) => a.getAttribute('href')))]
    .slice(0, 4)
    .map((u) => ({ url: u, label: u.replace(/^https?:\/\//, '').replace(/\/+$/, '') }));
  return {
    ancre,
    titre: String(h.textContent || '')
      .replace(/#\s*$/, '')
      .replace(/^\s*\d+[.)]\s*/, '')
      .trim(),
    html: corps,
    liens,
  };
}

function Lexique1({ svc }) {
  return (
    <>
      <h3>Rôle</h3>
      <p>{svc.role}</p>
      {svc.concepts?.length ? (
        <>
          <h3>Concepts clés</h3>
          <dl>
            {svc.concepts.map((c) => (
              <React.Fragment key={c.terme}>
                <dt>{c.terme}</dt>
                <dd>{c.def}</dd>
              </React.Fragment>
            ))}
          </dl>
        </>
      ) : null}
      <h3>Coût</h3>
      <p>{svc.cout}</p>
      <h3>Quand l’utiliser</h3>
      <p>{svc.quand}</p>
      <h3>Alternatives</h3>
      <p>{svc.alternatives}</p>
      {svc.consigner?.length ? (
        <>
          <h3>À consigner dans la fiche de l’app</h3>
          <ul>
            {svc.consigner.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

function FicheService({ svc, app, data, famTint, onFermer, onAller }) {
  const voisins = useMemo(() => {
    if (app) {
      const siens = app.services.map((id) => data.services.find((s) => s.id === id)).filter(Boolean);
      if (siens.length > 1 && siens.includes(svc)) return siens;
    }
    return data.services.filter((s) => s.categorie === svc.categorie);
  }, [svc, app, data]);
  const pos = voisins.indexOf(svc);
  const pas = (d) => onAller(voisins[(pos + d + voisins.length) % voisins.length]);
  useEffect(() => {
    const touche = (e) => {
      if (e.key === 'Escape') onFermer();
      else if (e.key === 'ArrowLeft') pas(-1);
      else if (e.key === 'ArrowRight') pas(1);
    };
    document.addEventListener('keydown', touche);
    return () => document.removeEventListener('keydown', touche);
  });
  const sec = app ? sectionDeService(app, svc.id) : null;
  const [genOuvert, setGenOuvert] = useState(!sec);
  const utilisateurs = data.apps.filter((a) => a.services.includes(svc.id) && (!app || a.id !== app.id));
  return (
    <div className="dash-overlay" onClick={(e) => e.target === e.currentTarget && onFermer()}>
      <div className="dash-sheet" role="dialog" aria-modal="true">
        <div className="close-row">
          {voisins.length > 1 ? (
            <div className="sheet-nav">
              <button type="button" className="d-btn sm" onClick={() => pas(-1)} aria-label="Fiche précédente">
                ‹
              </button>
              <span className="pos">
                {pos + 1} / {voisins.length}
              </span>
              <button type="button" className="d-btn sm" onClick={() => pas(1)} aria-label="Fiche suivante">
                ›
              </button>
            </div>
          ) : null}
          <span className="grow" />
          <button type="button" className="d-btn sm" onClick={onFermer} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="sheet-head">
          <span className={`row-ico big tint-${famTint(svc.categorie)}`}>{svc.emoji}</span>
          <div>
            <h2>{svc.nom}</h2>
            <div className="svc-cat">
              {svc.categorie} · <span className={`badge badge-${svc.badge}`}>{BADGES[svc.badge] || svc.badge}</span>
              {app ? ` · chez ${app.name}` : ''}
            </div>
          </div>
        </div>
        {app && sec ? (
          <div className="sheet-app">
            <div className="sheet-app-h">
              <b>{sec.titre}</b>
              <small>Chez {app.name} · infra.md</small>
            </div>
            <div className="md" dangerouslySetInnerHTML={{ __html: sec.html }} />
            {sec.liens.length ? (
              <div className="sheet-liens">
                {sec.liens.map((l) => (
                  <a key={l.url} className="chip" href={l.url} target="_blank" rel="noopener noreferrer">
                    ↗ {l.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ) : app ? (
          <div className="sheet-app manque">
            <b>{app.name} déclare ce service mais ne le documente pas.</b>
            <p>
              Aucune section ne parle de {nomCourt(svc)} dans sa fiche technique
              {app.repo ? ` — à ajouter dans l’infra.md de ${app.repo}` : ''}.
            </p>
          </div>
        ) : null}
        {app ? (
          <div className={`sheet-gen${genOuvert ? ' open' : ''}`}>
            <button type="button" className="sheet-gen-t" onClick={() => setGenOuvert(!genOuvert)}>
              <span className="fiche-t">
                <b>{nomCourt(svc)} en général</b>
                <small>Lexique · rôle, coût, alternatives</small>
              </span>
              <span className="chev">Déplier</span>
            </button>
            <div className="gen-body">
              <Lexique1 svc={svc} />
            </div>
          </div>
        ) : (
          <Lexique1 svc={svc} />
        )}
        {utilisateurs.length ? (
          <>
            <h3>{app ? 'Aussi utilisé par' : 'Utilisé par'}</h3>
            <div className="chips">
              {utilisateurs.map((a) => (
                <a key={a.id} className={`chip tint-${TINTS[data.apps.indexOf(a) % TINTS.length]}`} href={`#/applis/${a.id}`} onClick={onFermer}>
                  <Logo app={a} cls="ch-logo" /> {a.name}
                </a>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ---------- Pages ----------
function famTintDe(data) {
  return (cat) => TINTS[Math.max(0, data.categories.indexOf(cat)) % TINTS.length];
}

export function MesApplisPage({ arg }) {
  const { data, error, recharger } = useApplis();
  const [svc, setSvc] = useState(null);
  const [synchro, setSynchro] = useState(false);
  const [errSynchro, setErrSynchro] = useState('');
  useEffect(() => setSvc(null), [arg]);
  if (!data) return <div className="clay-content clay-muted">{error || 'Chargement de tes applis…'}</div>;
  const famTint = famTintDe(data);
  const [id, volet] = String(arg || '').split('/');
  const app = id ? data.apps.find((a) => a.id === id) : null;
  const lancerSynchro = () => {
    setSynchro(true);
    setErrSynchro('');
    api
      .synchroApplis()
      .then(({ jobId }) => followJob(jobId))
      .then(recharger)
      .catch((e) => setErrSynchro(e.message))
      .finally(() => setSynchro(false));
  };
  return (
    <div className="applis">
      {app ? <FicheApp app={app} data={data} volet={volet || 'technique'} famTint={famTint} ouvrir={setSvc} /> : <Grille data={data} onSynchro={lancerSynchro} synchro={synchro} />}
      {errSynchro && <p className="error small clay-content">{errSynchro}</p>}
      {svc ? <FicheService svc={svc} app={app} data={data} famTint={famTint} onFermer={() => setSvc(null)} onAller={setSvc} /> : null}
    </div>
  );
}

// Lexique — maquette « L2 Colonnes » (12/10) : les familles à gauche, les
// services au milieu, la fiche du service choisi toujours ouverte à droite.
// Sur téléphone, les colonnes s'empilent et la fiche s'ouvre par-dessus.
const POINT = { requis: 'var(--ko)', gratuit: 'var(--ok)', optionnel: 'var(--c-muted)' };

function FicheLexique({ svc, data, famTint }) {
  const users = data.apps.filter((a) => a.services.includes(svc.id));
  return (
    <div className="lx-fiche" key={svc.id}>
      <div className="lx-fiche-h">
        <span className={`row-ico big tint-${famTint(svc.categorie)}`}>{svc.emoji}</span>
        <span className="lx-fiche-t">
          <b>{svc.nom}</b>
          <span>
            {svc.categorie} <span className={`badge badge-${svc.badge}`}>{BADGES[svc.badge] || svc.badge}</span>
          </span>
        </span>
      </div>
      {[
        ['Rôle', svc.role],
        ['Quand l’utiliser', svc.quand],
        ['Coût', svc.cout],
        ['Alternatives', svc.alternatives],
      ].map(([t, v]) =>
        v ? (
          <section key={t}>
            <h4>{t}</h4>
            <p>{v}</p>
          </section>
        ) : null,
      )}
      {svc.concepts?.length ? (
        <section>
          <h4>Concepts clés</h4>
          {svc.concepts.map((c) => (
            <div key={c.terme} className="lx-concept">
              <b>{c.terme}</b>
              <span>{c.def}</span>
            </div>
          ))}
        </section>
      ) : null}
      {users.length ? (
        <section>
          <h4>Utilisé par</h4>
          <div className="chips">
            {users.map((a) => (
              <a key={a.id} className={`chip tint-${TINTS[data.apps.indexOf(a) % TINTS.length]}`} href={`#/applis/${a.id}`}>
                <Logo app={a} cls="ch-logo" /> {a.name}
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function LexiquePage({ arg }) {
  const { data, error } = useApplis();
  const [q, setQ] = useState('');
  const [fam, setFam] = useState('');
  const [choix, setChoix] = useState(arg || '');
  const [mobile, setMobile] = useState(() => window.matchMedia?.('(max-width: 900px)').matches);
  const [ouvert, setOuvert] = useState(Boolean(arg));
  useEffect(() => {
    const m = window.matchMedia?.('(max-width: 900px)');
    if (!m) return undefined;
    const on = () => setMobile(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  if (!data) return <div className="clay-content clay-muted">{error || 'Chargement du lexique…'}</div>;
  const famTint = famTintDe(data);
  const n = norm(q).trim();
  const trouve = (s) => !n || norm(`${s.nom} ${s.resume} ${s.categorie} ${s.role}`).includes(n);
  const familles = data.categories.filter((c) => data.services.some((s) => s.categorie === c));
  const liste = data.services.filter((s) => trouve(s) && (!fam || s.categorie === fam));
  const svc = data.services.find((s) => s.id === choix) || liste[0] || null;
  const choisir = (s) => {
    setChoix(s.id);
    setOuvert(true);
  };
  return (
    <div className="applis">
      <div className="clay-content lx">
        <div className="lx-haut">
          <label className="tb-search lx-recherche">
            <span>⌕</span>
            <input type="search" autoComplete="off" placeholder="Rechercher un service…" value={q} onChange={(e) => setQ(e.target.value)} />
            <em>
              {liste.length} / {data.services.length}
            </em>
          </label>
          <div className="lx-legende">
            <span className="badge badge-requis">Requis</span> indispensable dans sa famille
            <span className="badge badge-optionnel">Optionnel</span> selon les besoins
            <span className="badge badge-gratuit">Gratuit</span> offre gratuite suffisante
          </div>
        </div>
        <div className="lx-cols">
          <nav className="lx-familles">
            {[['', 'Toutes', data.services.filter(trouve).length], ...familles.map((c) => [c, c, data.services.filter((s) => s.categorie === c && trouve(s)).length])].map(([id, nom, nb]) => (
              <button key={nom} type="button" className={`lx-fam${fam === id ? ' on' : ''}`} onClick={() => setFam(id)}>
                <i className={id ? `sw sw-${famTint(id)}` : 'sw sw-tout'} />
                <span>{nom}</span>
                <em>{nb}</em>
              </button>
            ))}
          </nav>
          <div className="lx-services">
            {liste.length ? null : <p className="clay-muted">Aucun service ne correspond.</p>}
            {liste.map((s) => (
              <button key={s.id} type="button" className={`lx-svc${svc && s.id === svc.id ? ' on' : ''}`} onClick={() => choisir(s)}>
                <span className={`row-ico tint-${famTint(s.categorie)}`}>{s.emoji}</span>
                <span className="lx-svc-t">
                  <b>{s.nom}</b>
                  <small>{s.categorie}</small>
                </span>
                <i className="lx-point" style={{ background: POINT[s.badge] || 'var(--c-muted)' }} title={BADGES[s.badge] || ''} />
              </button>
            ))}
          </div>
          {!mobile && svc ? (
            <div className="lx-droite">
              <FicheLexique svc={svc} data={data} famTint={famTint} />
            </div>
          ) : null}
        </div>
      </div>
      {mobile && ouvert && svc ? (
        <FicheService svc={svc} app={null} data={data} famTint={famTint} onFermer={() => setOuvert(false)} onAller={(x) => setChoix(x.id)} />
      ) : null}
    </div>
  );
}

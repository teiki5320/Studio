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
const pct = (done, todo) => (done + todo ? Math.round((done / (done + todo)) * 100) : 0);
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

function Donut({ done, todo }) {
  const p = pct(done, todo);
  return (
    <div className="donut-row">
      <div className="donut" style={{ '--p': p }}>
        <div>
          <b>{p} %</b>
        </div>
      </div>
      <div className="donut-legend">
        <span>
          <i className="sw sw-accent" />
          {done} ouverts
        </span>
        <span>
          <i className="sw sw-sun" />
          {todo} à ouvrir
        </span>
      </div>
    </div>
  );
}

// Les 3 priorités de l'app, tirées de sa fiche marketing : de l'information,
// pas une liste à cocher (ce qui est fait disparaît de la fiche elle-même).
function Priorites({ liste }) {
  if (!liste.length) return <span className="empty-note">Pas de section « Les 3 priorités » dans la fiche.</span>;
  return (
    <ol className="priorites">
      {liste.map((a, i) => (
        <li key={i}>{a}</li>
      ))}
    </ol>
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

function FicheApp({ app, data, volet, famTint, ouvrir }) {
  const appTint = TINTS[data.apps.indexOf(app) % TINTS.length];
  const volets = [
    ['technique', 'Technique'],
    ['marketing', 'Marketing'],
  ];
  if (app.publicationHtml) volets.push(['publication', 'Publication']);
  const idx = Math.max(
    0,
    volets.findIndex((v) => v[0] === volet),
  );
  // Un titre de la fiche technique rattaché à un service ouvre sa fiche.
  const clicMd = (e) => {
    const h = e.target.closest?.('[id]');
    const id = h && Object.entries(app.serviceAnchors || {}).find(([, ancre]) => ancre === h.id)?.[0];
    const svc = id && data.services.find((s) => s.id === id);
    if (svc && /^H[1-6]$/.test(h.tagName)) ouvrir(svc);
    const lien = e.target.closest?.('a[href^="#"]');
    if (lien) revelerAncre(lien.getAttribute('href').slice(1), e);
  };

  let corps;
  if (volet === 'publication' && app.publicationHtml) {
    const ess = app.publicationEssentiel || { facts: [] };
    const plats = app.publicationPlateformes || [];
    const communs = (ess.facts || []).filter((f) => !plats.some((p) => norm(p.titre).startsWith(norm(f.label))));
    corps = (
      <>
        {communs.length ? (
          <div className="tile rise">
            <div className="tile-h">
              <b>Commun aux boutiques</b>
              <span>publication.md</span>
            </div>
            <Faits faits={communs} />
          </div>
        ) : null}
        {plats.length ? (
          <div className="pub-grid">
            {plats.map((p, i) => {
              const etat = p.faits.find((f) => norm(f.label) === 'etat')?.value;
              const autres = p.faits.filter((f) => norm(f.label) !== 'etat');
              const ios = /ios|apple|app store/i.test(p.titre);
              const and = /android|play/i.test(p.titre);
              return (
                <div key={i} className="tile rise">
                  <div className="store-h">
                    <span className={`row-ico tint-${ios ? 'sky' : and ? 'mint' : 'lilac'}`}>{ios ? '🍎' : and ? '🤖' : '🌐'}</span>
                    <div>
                      <b>{p.titre}</b>
                      {etat ? <small>{etat}</small> : null}
                    </div>
                  </div>
                  {autres.length ? <Faits faits={autres} /> : null}
                  {p.notes.map((n, j) => (
                    <div key={j} className="note">
                      {n.titre ? <b>{n.titre}</b> : null}
                      <p>{n.texte}</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ) : null}
        <Fiche titre="Fiche de publication complète" sous="publication.md" toc={app.publicationToc} html={app.publicationHtml} onClickMd={clicMd} />
      </>
    );
  } else if (volet === 'marketing') {
    const m = app.marketingSummary || {};
    corps = (
      <>
        <div className="three-col">
          <div className="tile rise">
            <div className="tile-h">
              <b>Canaux</b>
              <span>marketing.md</span>
            </div>
            <Donut done={m.done || 0} todo={m.todo || 0} />
          </div>
          <div className="tile tint-lilac rise">
            <div className="cap-label">Modèle de rémunération actuel</div>
            <div className="cap-model">{m.model || <span className="empty-note">Non renseigné</span>}</div>
            {m.jalons?.rows?.length ? (
              <>
                <div className="cap-label" style={{ marginTop: 14 }}>
                  Calendrier
                </div>
                <div className="jalons">
                  {m.jalons.rows.map((r, i) => (
                    <div key={i} className="jalon">
                      {r[0] ? <b>{r[0]}</b> : null}
                      <span>{r[1] || ''}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
          <div className="tile rise">
            <div className="tile-h">
              <b>Les 3 priorités</b>
              <span>marketing.md</span>
            </div>
            <Priorites liste={m.nextActions || []} />
          </div>
        </div>
        {m.kpis?.rows?.length ? (
          <div className="kpi-row">
            {m.kpis.rows.map((r, i) => (
              <div key={i} className={`tile kpi tint-${TINTS[i % TINTS.length]} rise`}>
                <span className="kpi-lab">{r[0] || ''}</span>
                <b className="kpi-txt">{r[1] || '—'}</b>
                {r[2] ? <small>objectif : {r[2]}</small> : null}
              </div>
            ))}
          </div>
        ) : null}
        <Fiche titre="Plan marketing complet" sous="marketing.md" toc={app.marketingToc} html={app.marketingHtml} onClickMd={clicMd} />
      </>
    );
  } else {
    const ess = app.infraEssentiel || { facts: [] };
    corps = (
      <>
        <div className="two-col">
          <div className="tile rise">
            <div className="tile-h">
              <b>L’essentiel</b>
              <span>infra.md · vue d’ensemble</span>
            </div>
            {ess.facts?.length ? (
              <Faits faits={ess.facts} />
            ) : ess.resume ? (
              <p className="resume">{ess.resume}</p>
            ) : (
              <span className="empty-note">Pas de section « Vue d’ensemble » dans l’infra.md.</span>
            )}
          </div>
          <Services app={app} data={data} famTint={famTint} ouvrir={ouvrir} />
        </div>
        <Fiche titre="Fiche technique complète" sous={`infra.md · ${app.services.length} services`} toc={app.infraToc} html={app.infraHtml} onClickMd={clicMd} />
      </>
    );
  }

  return (
    <div className="clay-content dash-body">
      <div className={`tile app-head tint-${appTint} rise`}>
        <Logo app={app} cls="app-big" />
        <div className="app-txt">
          <h3>{app.name}</h3>
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
          </div>
        </div>
        <div className="app-side">
          <CiPill app={app} big />
        </div>
      </div>
      <div className="seg rise" style={{ '--n': volets.length }}>
        <span className="seg-thumb" style={{ '--i': idx }} />
        {volets.map(([id, nom]) => (
          <a key={id} className={id === volets[idx][0] ? 'active' : ''} href={`#/applis/${app.id}/${id}`}>
            {nom}
          </a>
        ))}
      </div>
      {corps}
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
                  {a.emoji} {a.name}
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
                {a.emoji} {a.name}
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

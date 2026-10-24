// Indexation des sites sur Google : chaque site, combien de pages Google a
// gardées, et la liste des problèmes en français avec leur solution. Le
// Studio vérifie tout seul chaque matin (dès 4 h 30) ; on peut aussi relancer
// à la main. C'est une page d'information : ce qui reste à régler est sur
// l'Accueil (colonne À faire), d'où on l'envoie à Claude (« Sites du jour »,
// chaque matin à 5 h 05). Une page déjà corrigée est « en attente de Google ».
import React, { useEffect, useState } from 'react';
import { LogoAppli } from './LogoAppli.jsx';
import { api, followJob } from './api.js';
import './indexation.css';

// Couleur d'un problème selon sa gravité : rouge cassé, jaune refusé, bleu en attente de Google.
const TEINTE = { 3: 'ko', 2: 'run', 1: 'bleu' };
const date = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '');
const nb = (n) => Number(n || 0).toLocaleString('fr-FR');
const heure = (iso) => (iso ? new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'jamais');

// Où en est un problème marqué corrigé, d'après la revérification.
function Suivi({ c }) {
  if (!c) return null;
  const pages = c.pages ? ` (${c.pages} page${c.pages > 1 ? 's' : ''})` : '';
  if (c.statut === 'echec') {
    return <span className="ix-etat ko">⚠️ Toujours pas réglé après revérification{pages}</span>;
  }
  if (c.statut === 'pasRepasse') {
    return <span className="ix-etat ok">✓ Corrigé — en attente de Google, pas encore repassé sur ces pages{pages}</span>;
  }
  return <span className="ix-etat ok">✓ Corrigé le {date(c.le)} — revérification vers le {date(new Date(new Date(c.le).getTime() + 3 * 86400000))}</span>;
}

// Un problème, en lecture seule : Indexation est une page d'information.
// Ce qui reste à régler se règle depuis l'Accueil (colonne À faire) ; ce qui
// est corrigé attend simplement que Google repasse.
function Probleme({ p }) {
  const [ouvert, setOuvert] = useState(false);
  const corrige = Boolean(p.corrige) && p.corrige.statut !== 'echec';
  const envoye = p.envoi?.statut === 'envoye';
  return (
    <div className={`ix-probleme${corrige ? ' corrige' : ''}`}>
      <div className="ix-probleme-h">
        <i className={`ix-point ${corrige ? 'bleu' : TEINTE[p.gravite] || 'run'}`} />
        <b>{p.titre}</b>
        {p.urls.length ? <span className="ix-nb">· {p.urls.length} page{p.urls.length > 1 ? 's' : ''}</span> : null}
        <Suivi c={p.corrige} />
      </div>
      {corrige && p.corrige.compteRendu ? (
        <div className="small" style={{ marginTop: 4, whiteSpace: 'pre-line' }}>
          {p.corrige.compteRendu}
        </div>
      ) : null}
      {corrige ? null : (
        <>
          <p className="ix-explication">{p.explication}</p>
          <p className="ix-solution">
            <b>Solution :</b> {p.solution}
          </p>
        </>
      )}
      <div className="ix-actions">
        {!corrige ? (
          <a className="clay-btn small" href="#/accueil">
            {envoye ? `⏳ Chez Claude depuis le ${date(p.envoi.le)}` : '→ À régler depuis l’Accueil'}
          </a>
        ) : null}
        {p.urls.length ? (
          <button className="clay-btn ghost small" onClick={() => setOuvert(!ouvert)}>
            {ouvert ? 'Masquer les pages' : 'Voir les pages'}
          </button>
        ) : null}
      </div>
      {p.envoi?.statut === 'bloque' ? (
        <p className="error small" style={{ whiteSpace: 'pre-line' }}>
          ⚠️ Claude n’a pas pu corriger : {p.envoi.message}
        </p>
      ) : null}
      {ouvert && (
        <div style={{ marginTop: 8 }}>
          {p.urls.slice(0, 50).map((u) => (
            <div key={u.url} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, padding: '3px 0' }}>
              <span style={{ flex: 1, overflowWrap: 'anywhere' }}>{u.url.replace(/^https?:\/\/(www\.)?/, '')}</span>
              <a className="clay-btn ghost small" href={u.google} target="_blank" rel="noreferrer">
                Demander l’indexation ↗
              </a>
            </div>
          ))}
          {p.urls.length > 50 ? <p className="clay-muted small">… et {p.urls.length - 50} autres.</p> : null}
        </div>
      )}
    </div>
  );
}

// Clics Google semaine par semaine, un site par ligne : des barres qui
// montent si le référencement progresse. La dernière semaine est en cours.
function Courbe() {
  const [h, setH] = useState(null);
  useEffect(() => {
    api.historiqueGoogle().then(setH).catch(() => setH({ sites: {} }));
  }, []);
  if (!h) return null;
  const lignes = Object.entries(h.sites)
    .filter(([, v]) => Array.isArray(v) && v.length)
    .map(([prop, v]) => ({ domaine: prop.replace(/^sc-domain:|^https?:\/\/|\/$/g, ''), semaines: v.slice(-8) }))
    .sort((a, b) => b.semaines.reduce((t, x) => t + x.clics, 0) - a.semaines.reduce((t, x) => t + x.clics, 0));
  if (!lignes.length) return null;
  const max = Math.max(1, ...lignes.flatMap((l) => l.semaines.map((x) => x.clics)));
  return (
    <div className="ix-carte ix-courbe">
      <b className="ix-courbe-t">Clics depuis Google, semaine par semaine</b>
      {lignes.map((l) => {
        const [avant, derniere] = l.semaines.slice(-3, -1).map((x) => x.clics);
        return (
          <div key={l.domaine} className="ix-courbe-l">
            <span className="d">
              <LogoAppli de={l.domaine} taille={18} />
              {l.domaine}
            </span>
            <span className="barres">
              {l.semaines.map((x) => (
                <i key={x.semaine} title={`semaine du ${x.semaine.slice(8)}/${x.semaine.slice(5, 7)} : ${x.clics} clics`} style={{ height: `${Math.max(3, (x.clics / max) * 100)}%` }} />
              ))}
            </span>
            <span className="n">
              {derniere ?? 0} <small>{derniere > avant ? '↑' : derniere < avant ? '↓' : '='}</small>
            </span>
          </div>
        );
      })}
      <small className="ix-perf">Le chiffre = la dernière semaine complète (↑ ↓ par rapport à la précédente) ; la barre pâle = semaine en cours. Google a 2 à 3 jours de retard.</small>
    </div>
  );
}

// Place moyenne de tous les sites, pondérée par les apparitions.
const placeMoyenne = (perf) => {
  const s = Object.values(perf.sites).filter((x) => x.position && x.vues);
  const vues = s.reduce((t, x) => t + x.vues, 0);
  return vues ? place(s.reduce((t, x) => t + x.position * x.vues, 0) / vues) : '';
};

// Place moyenne dans Google (1 à 10 = première page), arrondie : « 14e place ».
const place = (pos) => (pos ? `${Math.max(1, Math.round(pos))}${Math.round(pos) <= 1 ? 're' : 'e'} place` : '');

// Les pages que Google montre déjà, mais pas encore en haut (place 4 à 20) : les plus faciles à faire monter.
function PresquePremierePage({ domaine }) {
  const [occ, setOcc] = useState(null);
  useEffect(() => {
    setOcc(null);
    api
      .occasionsGoogle(domaine)
      .then(setOcc)
      .catch(() => setOcc({ pages: [] }));
  }, [domaine]);
  if (!occ?.pages?.length) return null;
  return (
    <div className="ix-probleme ix-requetes">
      <div className="ix-probleme-h">
        <b>🎯 Pages presque en première page</b>
        <span className="ix-nb">
          · {occ.pages.length} page{occ.pages.length > 1 ? 's' : ''} entre la 4e et la 20e place · du {date(occ.debut)} au {date(occ.fin)}
        </span>
      </div>
      {occ.pages.map((p) => (
        <div key={p.page} className="ix-requete">
          <span>
            <a href={p.page} target="_blank" rel="noreferrer">
              {p.page.replace(/^https?:\/\/[^/]+/, '') || '/'}
            </a>
            {p.requetes[0] ? <small> · « {p.requetes[0].texte} »</small> : null}
          </span>
          <b>{place(p.position)}</b>
          <small>{nb(p.vues)} apparitions</small>
        </div>
      ))}
    </div>
  );
}

export function IndexationPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [suivi, setSuivi] = useState(false);
  // '' = tous les sites : en arrivant, on voit tout ce qu'il reste à corriger.
  const [site, setSite] = useState('');
  const [perf, setPerf] = useState(null);
  useEffect(() => {
    api
      .performancesGoogle()
      .then(setPerf)
      .catch(() => setPerf({ sites: {} }));
  }, []);
  const load = () =>
    api
      .indexation()
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  // Un passage en cours (lancé ici ou le matin) : on le suit jusqu'au bout.
  useEffect(() => {
    if (data?.passageId && !suivi) {
      setSuivi(true);
      followJob(data.passageId)
        .catch((e) => setError(e.message))
        .finally(() => {
          setSuivi(false);
          load();
        });
    }
  }, [data?.passageId]);

  if (!data) {
    return <div className="clay-content clay-muted">{error || 'Chargement…'}</div>;
  }
  if (!data.connecte) {
    return (
      <div className="clay-content">
        <div className="clay-block" style={{ maxWidth: 640 }}>
          <h3 style={{ marginTop: 0 }}>🔎 Brancher Google Search Console</h3>
          <p className="small">Le Studio lira l’état de chaque page de tes sites chez Google, chaque matin.</p>
          {data.configure ? (
            <a className="clay-btn" href="/api/indexation/connecter">
              Connecter Search Console
            </a>
          ) : (
            <p className="clay-muted small">Il faut d’abord les clés Google (Réglages → YouTube).</p>
          )}
          <p className="clay-muted small">Choisis le compte Google qui gère Search Console (teiki5320@gmail.com).</p>
        </div>
        {error && <p className="error small">{error}</p>}
      </div>
    );
  }
  const verifier = () =>
    api
      .verifierIndexation()
      .then(load)
      .catch((e) => setError(e.message));

  const ouverts = (site) => site.problemes.filter((p) => !p.corrige || p.corrige.statut === 'echec');
  const tous = data.sites.flatMap(ouverts);
  const chezClaude = data.sites.flatMap((x) => x.problemes).filter((p) => p.envoi?.statut === 'envoye').length;
  const choisi = data.sites.find((x) => x.propriete === site) || null;
  // Un clic sur un site le filtre ; un second clic revient à tous les sites.
  const choisir = (x) => setSite(x.propriete === site ? '' : x.propriete);
  const aCorriger = data.sites.filter((x) => ouverts(x).length);
  const pct = (n, t) => (t ? Math.round((100 * n) / t) : 0);

  return (
    <div className="clay-content ix">
      <p className="pb-sous">Google Search Console · pages connues de Google</p>
      <div className="ix-haut">
        <span className="ix-date">Dernière vérification : {heure(data.dernierPassage)} · tous les matins à partir de 4 h 30</span>
        <button className="clay-btn" disabled={Boolean(data.passageId)} onClick={verifier}>
          <svg className="rf-ic petite" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12a8 8 0 1 1-2.3-5.7" />
            <path d="M20 4v5h-5" />
          </svg>
          {data.passageId ? 'Vérification en cours…' : 'Vérifier maintenant'}
        </button>
      </div>
      <div className="ix-kpis">
        <div className="ix-kpi">
          <span className="lab">Pages sur Google</span>
          <b className="ok">{nb(data.sites.reduce((t, x) => t + (x.indexees || 0), 0))}</b>
          <span className="sub">sur {nb(data.sites.reduce((t, x) => t + (x.total || 0), 0))} dans les plans des sites</span>
        </div>
        <div className="ix-kpi">
          <span className="lab">Problèmes ouverts</span>
          <b className={tous.length ? 'run' : 'ok'}>{tous.length}</b>
          <span className="sub">sur {data.sites.length} sites</span>
        </div>
        <div className="ix-kpi">
          <span className="lab">Clics depuis Google · 7 j</span>
          <b>{perf ? nb(Object.values(perf.sites).reduce((t, x) => t + (x.clics || 0), 0)) : '…'}</b>
          <span className="sub">{perf ? `${nb(Object.values(perf.sites).reduce((t, x) => t + (x.vues || 0), 0))} apparitions dans les résultats` : 'chiffres de Google'}</span>
        </div>
        <div className="ix-kpi">
          <span className="lab">Place moyenne dans Google · 7 j</span>
          <b>{perf ? placeMoyenne(perf) || '—' : '…'}</b>
          <span className="sub">1 à 10 = première page</span>
        </div>
        <div className="ix-kpi">
          <span className="lab">Chez Claude</span>
          <b>{chezClaude}</b>
          <span className="sub">routine chaque matin à 5 h 05</span>
        </div>
      </div>
      {data.sites.length === 0 && (
        <div className="ix-carte">
          <p className="ix-explication">Aucune vérification encore. Touche « Vérifier maintenant » : la première peut prendre une vingtaine de minutes.</p>
        </div>
      )}
      {data.sites.length ? (
        <div className="ix-liste">
          {data.sites.map((x) => {
            const n = ouverts(x).length;
            // Une page corrigée n'est plus « cassée » ni « refusée » : elle attend Google (bleu).
            const ouvertsIci = ouverts(x);
            const urls = (g) => ouvertsIci.filter((p) => p.gravite === g).reduce((t, p) => t + p.urls.length, 0);
            const enAttente = x.problemes.filter((p) => !ouvertsIci.includes(p) || p.gravite === 1).reduce((t, p) => t + p.urls.length, 0);
            const p100 = pct(x.indexees, x.total);
            const parts = [
              ['ok', x.indexees, 'sur Google'],
              ['bleu', enAttente, 'en attente de Google'],
              ['run', urls(2), 'refusées par Google'],
              ['ko', urls(3), 'cassées'],
            ];
            const ps = perf?.sites[x.propriete];
            return (
              <button
                key={x.propriete}
                type="button"
                className={`ix-ligne${choisi && x.propriete === choisi.propriete ? ' on' : ''}`}
                aria-pressed={Boolean(choisi && x.propriete === choisi.propriete)}
                onClick={() => choisir(x)}
              >
                <span className="ix-site">
                  <span className="ix-logo">
                    <LogoAppli de={x.domaine} taille={32} seul />
                  </span>
                  <span className="t">
                    <b title={x.domaine}>{x.domaine.replace(/\.(com|fr)$/, '')}</b>
                    <small>
                      {ps && !ps.erreur ? (
                        <>
                          {nb(ps.clics)} clics · {nb(ps.vues)} apparitions{ps.position ? ` · ${place(ps.position)}` : ''} · 7 j
                        </>
                      ) : (
                        `${p100} % sur Google`
                      )}
                      {x.verifiees < x.total ? ` · ${x.total - x.verifiees} pas encore vérifiées` : ''}
                    </small>
                  </span>
                </span>
                <span className="ix-barre" title={parts.filter(([, v]) => v).map(([, v, l]) => `${v} ${l}`).join(' · ')}>
                  <span className="ix-barre-in">
                    {parts.map(([c, v]) => (v ? <span key={c} className={c} style={{ width: `${(100 * v) / Math.max(1, x.total)}%` }} /> : null))}
                  </span>
                </span>
                <span className="ix-compte">
                  <span className="ix-nbs">
                    {nb(x.indexees)} <i>/ {nb(x.total)}</i>
                  </span>
                  <span className={`ix-etat ${x.erreur ? 'ko' : n ? 'run' : 'ok'}`}>
                    {x.erreur ? 'vérification ratée' : n ? `${n} à régler` : x.problemes.length ? 'corrigé, Google repassera' : 'rien à régler'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
      {!choisi ? (
        <div className="ix-detail" key="tous" data-sans-ressort>
          <h3>
            Tous les sites
            <small>{tous.length ? `${tous.length} chose${tous.length > 1 ? 's' : ''} à régler` : 'rien à régler'}</small>
          </h3>
          {tous.length ? (
            <p className="ix-explication">
              {aCorriger.map((x) => `${x.domaine} (${ouverts(x).length})`).join(' · ')} : à régler depuis l’Accueil, colonne À faire.{' '}
              <a href="#/accueil">Ouvrir l’Accueil →</a>
            </p>
          ) : (
            <p className="ix-explication">✓ Rien à régler sur tes sites : les pages corrigées attendent que Google repasse. Touche un site pour voir son détail.</p>
          )}
        </div>
      ) : (
        <div className="ix-detail" key={choisi.propriete} data-sans-ressort>
          <button type="button" className="clay-btn ghost small ix-tous" onClick={() => setSite('')}>
            ← Tous les sites
          </button>
          <h3>
            <LogoAppli de={choisi.domaine} taille={26} />
            {choisi.domaine}
            <small>
              {ouverts(choisi).length
                ? `${ouverts(choisi).length} problème${ouverts(choisi).length > 1 ? 's' : ''}`
                : choisi.problemes.length
                  ? 'tout est fait de ton côté, on attend Google'
                  : 'aucun problème'}
            </small>
          </h3>
          {choisi.erreur ? <p className="error small">⚠️ {choisi.erreur}</p> : null}
          {perf?.sites[choisi.propriete]?.requetes?.length ? (
            <div className="ix-probleme ix-requetes">
              <div className="ix-probleme-h">
                <b>🔍 Ce que les gens cherchent pour arriver ici</b>
                <span className="ix-nb">
                  · du {date(perf.debut)} au {date(perf.fin)}
                  {perf.sites[choisi.propriete].position ? ` · position moyenne ${String(perf.sites[choisi.propriete].position).replace('.', ',')}` : ''}
                </span>
              </div>
              {perf.sites[choisi.propriete].requetes.map((r) => (
                <div key={r.texte} className="ix-requete">
                  <span>{r.texte}</span>
                  <b>{nb(r.clics)} clic{r.clics > 1 ? 's' : ''}</b>
                  <small>{nb(r.vues)} apparitions</small>
                </div>
              ))}
            </div>
          ) : null}
          <PresquePremierePage domaine={choisi.domaine} />
          {choisi.problemes.map((p) => (
            <Probleme key={p.id} p={p} />
          ))}
        </div>
      )}
      <Courbe />
      {error && <p className="error small">{error}</p>}
    </div>
  );
}

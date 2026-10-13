// Indexation des sites sur Google : chaque site, combien de pages Google a
// gardées, et la liste des problèmes en français avec leur solution. Le
// Studio vérifie tout seul chaque matin ; on peut aussi relancer à la main.
// « Envoyer à Claude » met un problème dans la file de la routine Claude
// « Indexation : corrections » (6 h, 9 h, 12 h, 19 h).
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
    return <span className="ix-etat run">⏳ Revérifié : Google n’est pas encore repassé sur ces pages{pages}</span>;
  }
  return <span className="ix-etat ok">✓ Corrigé le {date(c.le)} — revérification vers le {date(new Date(new Date(c.le).getTime() + 3 * 86400000))}</span>;
}

function Probleme({ p, onFait, setError }) {
  const [ouvert, setOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const plan = () => {
    setEnvoi(true);
    api
      .renvoyerPlan(p.id)
      .then(({ jobId }) => followJob(jobId))
      .then(onFait)
      .catch((e) => setError(e.message))
      .finally(() => setEnvoi(false));
  };
  const envoyer = () => {
    setEnvoiEnCours(true);
    api
      .envoyerAClaude(p.id)
      .then(onFait)
      .catch((e) => setError(e.message))
      .finally(() => setEnvoiEnCours(false));
  };
  const envoye = p.envoi?.statut === 'envoye';
  return (
    <div className="ix-probleme">
      <div className="ix-probleme-h">
        <i className={`ix-point ${TEINTE[p.gravite] || 'run'}`} />
        <b>{p.titre}</b>
        {p.urls.length ? <span className="ix-nb">· {p.urls.length} page{p.urls.length > 1 ? 's' : ''}</span> : null}
        <Suivi c={p.corrige} />
      </div>
      {p.corrige?.compteRendu && p.action === 'plan' ? (
        <div className="small" style={{ marginTop: 4, whiteSpace: 'pre-line' }}>{p.corrige.compteRendu}</div>
      ) : null}
      <p className="ix-explication">{p.explication}</p>
      <p className="ix-solution">
        <b>Solution :</b> {p.solution}
      </p>
      <div className="ix-actions">
        {p.action === 'plan' ? (
          <button className="clay-btn small" disabled={envoi} onClick={plan}>
            {envoi ? '⏳ Envoi…' : '✓ Renvoyer le plan à Google'}
          </button>
        ) : (
          <>
            <button className="clay-btn small" disabled={envoye || envoiEnCours} onClick={envoyer}>
              {envoye ? `📤 Envoyé le ${date(p.envoi.le)}` : '📤 Envoyer à Claude'}
            </button>
            <button className="clay-btn ghost small" onClick={() => api.noterCorrige(p.id).then(onFait).catch((e) => setError(e.message))}>
              ✓ C’est corrigé
            </button>
          </>
        )}
        {p.urls.length ? (
          <button className="clay-btn ghost small" onClick={() => setOuvert(!ouvert)}>
            {ouvert ? 'Masquer les pages' : 'Voir les pages'}
          </button>
        ) : null}
      </div>
      {envoye ? <p className="clay-muted small">Claude s’en occupe au prochain passage : 6 h, 9 h, 12 h ou 19 h.</p> : null}
      {p.envoi?.statut === 'bloque' ? (
        <p className="error small" style={{ whiteSpace: 'pre-line' }}>
          ⚠️ Claude n’a pas pu corriger : {p.envoi.message}
        </p>
      ) : null}
      {p.corrige?.compteRendu && p.action !== 'plan' && /^Corrigé par Claude/.test(p.corrige.compteRendu) ? (
        <div className="small" style={{ marginTop: 4, whiteSpace: 'pre-line' }}>{p.corrige.compteRendu}</div>
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

export function IndexationPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [suivi, setSuivi] = useState(false);
  const [site, setSite] = useState(() => {
    try {
      return localStorage.getItem('indexation-site') || '';
    } catch {
      return '';
    }
  });
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
  const choisi = data.sites.find((x) => x.propriete === site) || data.sites.find((x) => ouverts(x).length) || data.sites[0];
  const choisir = (x) => {
    setSite(x.propriete);
    try {
      localStorage.setItem('indexation-site', x.propriete);
    } catch {}
  };
  const pct = (n, t) => (t ? Math.round((100 * n) / t) : 0);

  return (
    <div className="clay-content ix">
      <div className="ix-haut">
        <span className="ix-date">Dernière vérification : {heure(data.dernierPassage)} · tous les matins à partir de 7 h</span>
        <button className="clay-btn" disabled={Boolean(data.passageId)} onClick={verifier}>
          {data.passageId ? '⏳ Vérification en cours…' : '🔄 Vérifier maintenant'}
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
          <span className="lab">Chez Claude</span>
          <b>{chezClaude}</b>
          <span className="sub">routine 6 h · 9 h · 12 h · 19 h</span>
        </div>
      </div>
      {data.sites.length === 0 && (
        <div className="ix-carte">
          <p className="ix-explication">Aucune vérification encore. Touche « Vérifier maintenant » : la première peut prendre une vingtaine de minutes.</p>
        </div>
      )}
      <div className="ix-jauges">
        {data.sites.map((x) => {
          const n = ouverts(x).length;
          const urls = (g) => x.problemes.filter((p) => p.gravite === g).reduce((t, p) => t + p.urls.length, 0);
          const p100 = pct(x.indexees, x.total);
          const parts = [
            ['ok', x.indexees, 'sur Google'],
            ['bleu', urls(1), 'en attente de Google'],
            ['run', urls(2), 'refusées par Google'],
            ['ko', urls(3), 'cassées'],
          ];
          return (
            <button key={x.propriete} type="button" className={`ix-jauge${choisi && x.propriete === choisi.propriete ? ' on' : ''}`} onClick={() => choisir(x)}>
              <span className="ix-jauge-h">
                <span className="ix-anneau">
                  <svg viewBox="0 0 80 80" aria-hidden="true">
                    <circle className="piste" cx="40" cy="40" r="34" />
                    <circle className="part" cx="40" cy="40" r="34" style={{ strokeDasharray: `${((214 * p100) / 100).toFixed(1)} 214` }} />
                  </svg>
                  <b>{p100}%</b>
                </span>
                <span className="t">
                  <b>
                    <LogoAppli de={x.domaine} taille={22} />
                    {x.domaine}
                  </b>
                  <small>
                    <strong>{nb(x.indexees)}</strong> sur Google, sur {nb(x.total)}
                    {x.verifiees < x.total ? ` · ${x.total - x.verifiees} pas encore vérifiées` : ''}
                  </small>
                </span>
              </span>
              {perf?.sites[x.propriete] && !perf.sites[x.propriete].erreur ? (
                <span className="ix-perf">
                  <b>{nb(perf.sites[x.propriete].clics)}</b> clics · {nb(perf.sites[x.propriete].vues)} apparitions · 7 j
                </span>
              ) : null}
              <span className="ix-barre" title={parts.filter(([, v]) => v).map(([, v, l]) => `${v} ${l}`).join(' · ')}>
                {parts.map(([c, v]) => (v ? <span key={c} className={c} style={{ width: `${(100 * v) / Math.max(1, x.total)}%` }} /> : null))}
              </span>
              <span className={`ix-etat ${x.erreur ? 'ko' : n ? 'run' : 'ok'}`}>
                {x.erreur ? '⚠️ vérification ratée' : n ? `${n} problème${n > 1 ? 's' : ''}` : '✓ Rien à corriger'}
              </span>
            </button>
          );
        })}
      </div>
      {choisi ? (
        <div className="ix-detail" key={choisi.propriete} data-sans-ressort>
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
          {choisi.problemes.map((p) => (
            <Probleme key={p.id} p={p} onFait={load} setError={setError} />
          ))}
        </div>
      ) : null}
      {error && <p className="error small">{error}</p>}
    </div>
  );
}

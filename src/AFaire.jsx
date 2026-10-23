// « À faire » (Accueil) : tout ce qu'il reste à faire, pour tous les sites et
// applis, en une liste (à décider, puis problèmes graves, puis le reste),
// regroupée par site. Chaque ligne se règle d'ici : « Envoyer à Claude » (ou
// « Oui » / « Non » pour une décision) la met dans la file commune, que la
// routine du matin (6 h) applique ; elle rend compte et la ligne passe à
// ✅ fait ou ❌ bloqué (avec ce que Jean doit faire).
// Comme dans Indexation : tout par défaut, un clic sur un site le filtre,
// « Tous » pour revenir.
import React, { useEffect, useState } from 'react';
import { api, followJob } from './api.js';
import { LogoAppli } from './LogoAppli.jsx';
import './afaire.css';

const SOURCES = {
  indexation: 'Google',
  routine: 'Tâche du matin',
  tests: 'Tests GitHub',
  fiches: 'Fiche',
  point: 'Point du matin',
};
const GENERAL = 'Général';
export const ouvert = (e) => e.etat === 'a-faire' || e.etat === 'bloque';
export const rang = (e) => (e.etat === 'fait' ? 9 : e.type === 'decision' ? 0 : e.grave ? 1 : 2);

function Etat({ e }) {
  if (e.etat === 'envoye') return <span className="af-etat run">⏳ Chez Claude · réglé demain matin</span>;
  if (e.etat === 'fait') return <span className="af-etat ok">✅ {e.compteRendu || 'Fait'}</span>;
  if (e.etat === 'bloque')
    return (
      <span className="af-etat ko">
        ❌ Bloqué{e.compteRendu ? ' — ' : ''}
        {e.compteRendu}
      </span>
    );
  return null;
}

export function Ligne({ e, onAgir, avecSite = false }) {
  const [plus, setPlus] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const agir = (f) => {
    setOccupe(true);
    onAgir(f).finally(() => setOccupe(false));
  };
  const icone = e.etat === 'fait' ? '✅' : e.type === 'decision' ? '❓' : e.grave ? '❗' : '•';
  return (
    <div className={`af-ligne ${e.etat}${e.grave && ouvert(e) ? ' grave' : ''}`}>
      <span className="af-ic" aria-hidden="true">
        {icone}
      </span>
      <div className="af-texte">
        <span className="af-t">{e.texte}</span>
        <span className="af-src">
          {avecSite && e.site ? <b className="af-site">{e.site}</b> : null}
          {SOURCES[e.source] || e.source}
          {e.detail ? (
            <button type="button" className="af-plus" onClick={() => setPlus(!plus)}>
              {plus ? 'moins' : 'détails'}
            </button>
          ) : null}
          {e.lien ? (
            <a href={e.lien} target="_blank" rel="noreferrer">
              voir ↗
            </a>
          ) : null}
        </span>
        {plus && e.detail ? <small className="af-detail">{e.detail}</small> : null}
        <Etat e={e} />
      </div>
      {ouvert(e) ? (
        <div className="af-boutons">
          {e.type === 'decision' && e.etat === 'a-faire' ? (
            <>
              <button className="clay-btn small" disabled={occupe} onClick={() => agir(() => api.envoyerAfaire(e.id, 'oui'))}>
                Oui
              </button>
              <button className="clay-btn ghost small" disabled={occupe} onClick={() => agir(() => api.envoyerAfaire(e.id, 'non'))}>
                Non
              </button>
            </>
          ) : e.action === 'plan' ? (
            <button className="clay-btn small" disabled={occupe} onClick={() => agir(() => api.renvoyerPlan(e.id).then(({ jobId }) => followJob(jobId)))}>
              {occupe ? '⏳ Envoi…' : '✓ Renvoyer le plan à Google'}
            </button>
          ) : (
            <button className="clay-btn small" disabled={occupe} onClick={() => agir(() => api.envoyerAfaire(e.id, 'oui'))}>
              {e.etat === 'bloque' ? '📤 Renvoyer à Claude' : '📤 Envoyer à Claude'}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function AFaire() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  // '' = tous les sites.
  const [site, setSite] = useState('');
  const charger = () =>
    api
      .afaire()
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    charger();
  }, []);
  const onAgir = (f) =>
    f()
      .catch((e) => setError(e.message))
      .then(charger);

  if (!data) return error ? <p className="error small">{error}</p> : null;
  const tous = data.elements;
  const groupes = new Map();
  for (const e of tous) groupes.set(e.site, [...(groupes.get(e.site) || []), e]);
  const ordre = [...groupes.entries()].sort(
    ([a, la], [b, lb]) =>
      (a === GENERAL) - (b === GENERAL) ||
      Math.min(...la.map(rang)) - Math.min(...lb.map(rang)) ||
      lb.filter(ouvert).length - la.filter(ouvert).length ||
      a.localeCompare(b, 'fr'),
  );
  const choisi = site && groupes.has(site) ? site : '';
  const visibles = choisi ? ordre.filter(([s]) => s === choisi) : ordre;
  const c = data.compteurs;

  return (
    <div className="af anim">
      <div className="af-tete">
        <h3>📋 À faire</h3>
        <span>tous les sites et applis · Claude s’en occupe chaque matin à 6 h</span>
      </div>
      <div className="af-compteurs">
        <span className="run">
          <b>{c.aDecider}</b> à décider
        </span>
        <span className={c.graves ? 'ko' : 'ok'}>
          <b>{c.graves}</b> grave{c.graves > 1 ? 's' : ''}
        </span>
        <span className="neutre">
          <b>{c.aFaire}</b> à faire en tout
        </span>
        <span className="neutre">
          <b>{c.envoyes}</b> chez Claude
        </span>
        <span className="ok">
          <b>{c.faits}</b> fait{c.faits > 1 ? 's' : ''} récemment
        </span>
      </div>
      {ordre.length > 1 ? (
        <div className="af-filtres" role="group" aria-label="Filtrer par site">
          <button type="button" className={`af-filtre${choisi ? '' : ' on'}`} onClick={() => setSite('')}>
            Tous <small>{tous.filter(ouvert).length}</small>
          </button>
          {ordre.map(([s, liste]) => (
            <button key={s} type="button" className={`af-filtre${choisi === s ? ' on' : ''}`} onClick={() => setSite(choisi === s ? '' : s)}>
              <LogoAppli de={s} taille={18} />
              {s} <small>{liste.filter(ouvert).length}</small>
            </button>
          ))}
        </div>
      ) : null}
      {error ? <p className="error small">{error}</p> : null}
      {!tous.length ? <p className="af-vide">✓ Rien à faire pour l’instant : tout roule.</p> : null}
      {visibles.map(([s, liste]) => (
        <div key={s} className="af-groupe">
          <button type="button" className="af-groupe-t" onClick={() => setSite(choisi === s ? '' : s)}>
            <LogoAppli de={s} taille={20} />
            {s}
            <small>
              {liste.filter(ouvert).length ? `${liste.filter(ouvert).length} à faire` : 'rien à faire'}
              {choisi ? ' · ← tous les sites' : ' · voir ce site seul →'}
            </small>
          </button>
          {liste.map((e) => (
            <Ligne key={e.id} e={e} onAgir={onAgir} />
          ))}
        </div>
      ))}
    </div>
  );
}

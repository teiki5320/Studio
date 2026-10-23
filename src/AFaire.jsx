// « À faire » (Accueil) : une ligne de la liste de ce qu'il reste à faire.
// Chaque ligne se règle d'ici : « Envoyer à Claude » (ou « Oui » / « Non »
// pour une décision) la met dans la file commune, que la routine « Sites du
// jour » (5 h 05) applique ; elle rend compte et la ligne passe à ✅ fait ou
// ❌ bloqué (avec ce que Jean doit faire). Les deux colonnes de l'Accueil
// (AccueilPage.jsx) utilisent cette ligne.
import React, { useState } from 'react';
import { api, followJob } from './api.js';
import './afaire.css';

const SOURCES = {
  indexation: 'Google',
  routine: 'Tâche du matin',
  tests: 'Tests GitHub',
  fiches: 'Fiche',
  point: 'Point du matin',
};
export const ouvert = (e) => e.etat === 'a-faire' || e.etat === 'bloque';

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

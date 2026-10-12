// Réglages → Comptes & adresses / Reste à faire : le récapitulatif de
// l'harmonisation sous toakeur.com. « Comptes & adresses » montre ce qui est
// réglé, en tableau simple sans commentaires ; « Reste à faire » montre ce qui reste, avec
// quand le faire, et la barre de progression. On touche « À faire » une fois
// la chose faite : la ligne part dans l'autre onglet.
import React, { useEffect, useState } from 'react';
import { api } from './api.js';

export function ComptesTab({ resteSeulement = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api
      .comptes()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  if (!data) {
    return <p className="clay-muted">{error || 'Chargement…'}</p>;
  }
  const toutes = data.sections.flatMap((s) => s.lignes);
  const reglees = toutes.filter((l) => l.etat !== 'a_faire').length;
  const sections = data.sections
    .map((s) => ({ ...s, lignes: s.lignes.filter((l) => (l.etat === 'a_faire') === resteSeulement) }))
    .filter((s) => s.lignes.length);
  const cocher = (l) =>
    api
      .etatCompte(l.id, 'fait')
      .then(setData)
      .catch((e) => setError(e.message));

  const pct = toutes.length ? reglees / toutes.length : 0;
  return (
    <>
      {resteSeulement ? (
        <div className="rg-carte rg-reste-h">
          <div className="rg-anneau">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className="piste" cx="60" cy="60" r="50" />
              <circle className="part" cx="60" cy="60" r="50" style={{ strokeDasharray: `${(314 * pct).toFixed(1)} 314` }} />
            </svg>
            <span className="mid">
              <b>{reglees}</b>
              <small>sur {toutes.length}</small>
            </span>
          </div>
          <div className="t">
            <h3>
              {reglees} / {toutes.length} réglés · reste {toutes.length - reglees}
            </h3>
            <p className="rg-aide">Touche « À faire » une fois la chose faite : la ligne part dans Comptes &amp; adresses.</p>
          </div>
        </div>
      ) : null}
      {resteSeulement && !sections.length ? <p className="rg-aide">Tout est réglé 🎉</p> : null}
      {sections.map((s) => (
        <div key={s.titre} className="rg-carte">
          {resteSeulement ? null : (
            <div className="rg-carte-h rg-carte-h2">
              <h3>{s.titre}</h3>
              {s.sousTitre ? <small>{s.sousTitre}</small> : null}
            </div>
          )}
          <div className="rg-lignes">
            {s.lignes.map((l) =>
              resteSeulement ? (
                <div key={l.id} className="rg-ligne rg-ligne-reste">
                  <span className="t">
                    <b>{l.quoi}</b>
                    {l.note ? <small>{l.note}</small> : null}
                  </span>
                  <span className="quand">{l.quand}</span>
                  <button className="rg-etat run rg-cocher" title="Toucher une fois fait" onClick={() => cocher(l)}>
                    À faire
                  </button>
                </div>
              ) : (
                <div key={l.id} className="rg-ligne rg-ligne-2">
                  <b>{l.quoi}</b>
                  <span>{l.resultat}</span>
                </div>
              ),
            )}
          </div>
        </div>
      ))}
      {error && <p className="error small">{error}</p>}
    </>
  );
}

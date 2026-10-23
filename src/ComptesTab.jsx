// Réglages → Comptes & adresses : le récapitulatif de l'harmonisation sous
// toakeur.com, en tableau simple sans commentaires (ce qui est réglé).
// Ce qui reste à faire n'est plus ici : chaque ligne « à faire » est sur
// l'Accueil (colonne À faire), où l'on touche « C'est fait » ; elle rejoint
// alors sa section dans ce tableau.
import React, { useEffect, useState } from 'react';
import { LogoAppli } from './LogoAppli.jsx';
import { api } from './api.js';

export function ComptesTab() {
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
  const sections = data.sections
    .map((s) => ({ ...s, lignes: s.lignes.filter((l) => l.etat !== 'a_faire') }))
    .filter((s) => s.lignes.length);

  return (
    <>
      {sections.map((s) => (
        <div key={s.titre} className="rg-carte">
          <div className="rg-carte-h rg-carte-h2">
            <h3>{s.titre}</h3>
            {s.sousTitre ? <small>{s.sousTitre}</small> : null}
          </div>
          <div className="rg-lignes">
            {s.lignes.map((l) => (
              <div key={l.id} className="rg-ligne rg-ligne-2">
                <b>
                  <LogoAppli de={l.quoi} taille={18} />
                  {l.quoi}
                </b>
                <span>{l.resultat}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {error && <p className="error small">{error}</p>}
    </>
  );
}

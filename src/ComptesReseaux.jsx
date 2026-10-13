// Réglages → Comptes des réseaux : les comptes TikTok, YouTube, Pinterest
// du Planning (une ligne chacun), et les applis pour lesquelles chaque
// compte est proposé d'office.
import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { APP_LOOKS } from './apps.js';

const RESEAUX = [
  ['tiktok', 'TikTok'],
  ['youtube', 'YouTube'],
  ['instagram', 'Instagram'],
  ['pinterest', 'Pinterest'],
];
const APPLIS = [...Object.entries(APP_LOOKS).map(([k, v]) => [k, `${v.icon} ${v.name}`]), ['recettes', '🍲 Recettes Keur Cook']];
const libelleAppli = (k) => (APPLIS.find((a) => a[0] === k) || [k, k])[1];

export function ComptesReseauxCard() {
  const [comptes, setComptes] = useState(null);
  const [reseau, setReseau] = useState('tiktok');
  const [nom, setNom] = useState('');
  const [ouvert, setOuvert] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.comptesReseaux().then(setComptes).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  if (!comptes) {
    return error ? <p className="error small">{error}</p> : null;
  }
  const act = (p) =>
    p
      .then(() => {
        setError('');
        return load();
      })
      .catch((e) => setError(e.message));
  const ajouter = () => nom.trim() && act(api.ajouterCompteReseau({ reseau, nom: nom.trim() }).then(() => setNom('')));

  return (
    <div className="rg-carte">
      <div className="rg-carte-h">
        <h3>📱 Comptes des réseaux</h3>
        <small title="« Applis » : les applis pour lesquelles ce compte est coché d'office dans le Planning ; un compte sans appli sert quand aucune règle ne s'applique.">
          chaque compte a sa ligne dans le Planning
        </small>
      </div>
      <div className="rg-lignes">
        {RESEAUX.flatMap(([r, libelle]) =>
          comptes
            .filter((c) => c.reseau === r)
            .map((c) => (
              <div key={c.id} className="rg-ligne rg-ligne-compte">
                <span className={`rg-reseau ${r}`}>{libelle}</span>
                <span className="t">
                  <b>{c.nom}</b>
                  <small>{c.applis.length ? c.applis.map(libelleAppli).join(', ') : 'proposé par défaut'}</small>
                </span>
                <span className="rg-actions">
                  <button className="clay-btn ghost small" onClick={() => setOuvert(ouvert === c.id ? null : c.id)}>
                    {ouvert === c.id ? 'Fermer' : 'Applis'}
                  </button>
                  <button
                    className="clay-btn ghost small"
                    title="Supprimer ce compte"
                    onClick={() => window.confirm(`Supprimer le compte ${c.nom} ?`) && act(api.retirerCompteReseau(c.id))}
                  >
                    ✕
                  </button>
                </span>
                {ouvert === c.id && (
                  <div className="rg-choix-applis">
                    {APPLIS.map(([k, lib]) => {
                      const on = c.applis.includes(k);
                      return (
                        <button
                          key={k}
                          className={`clay-btn small${on ? '' : ' ghost'}`}
                          onClick={() => act(api.modifierCompteReseau(c.id, { applis: on ? c.applis.filter((x) => x !== k) : [...c.applis, k] }))}
                        >
                          {on ? '✓ ' : ''}
                          {lib}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )),
        )}
      </div>
      <div className="rg-ajout">
        <select className="rp-input" style={{ width: 'auto', margin: 0 }} value={reseau} onChange={(e) => setReseau(e.target.value)}>
          {RESEAUX.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <input
          className="rp-input"
          style={{ flex: 1, minWidth: 180, margin: 0 }}
          placeholder="@nom du compte, ou nom de la chaîne"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ajouter()}
        />
        <button className="clay-btn" onClick={ajouter}>
          Ajouter
        </button>
      </div>
      {error && <p className="error small">{error}</p>}
    </div>
  );
}

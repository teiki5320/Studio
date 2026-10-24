// Réglages → Routines : ce que Claude fait tout seul, et où il en est.
// Les routines tournent dans l'appli Claude (le Studio ne fait que les
// montrer) : on les lance ou les modifie depuis la colonne « Routines » de
// l'appli Claude. (Les dépôts et leur synchro sont dans Mes applis.)
import React, { useEffect, useState } from 'react';
import { LogoAppli } from './LogoAppli.jsx';
import { api } from './api.js';
import { fmtDate } from './MesApplisPage.jsx';

const STATUT = {
  ok: ['ok', '✓ Terminée'],
  bloquee: ['ko', 'Bloquée'],
  encours: ['run', 'En cours'],
  inconnu: ['none', 'Sans compte rendu'],
  jamais: ['none', 'Pas encore passée'],
};

function Ligne({ r }) {
  const [classe, texte] = STATUT[r.statut] || STATUT.inconnu;
  return (
    <div className={`rg-ligne rg-ligne-routine${r.active ? '' : ' eteinte'}`}>
      <span className="t">
        <b>
          <LogoAppli de={r.nom} taille={18} />
          {r.nom}
        </b>
        {r.description ? <small>{r.description}</small> : null}
        {r.statut === 'bloquee' && r.aFaire ? <small className="chaud">À décider : {r.aFaire}</small> : null}
      </span>
      <span className="quand">{r.active ? r.horaire : 'éteinte'}</span>
      <span className="date">{r.dernierPassage ? fmtDate(r.dernierPassage, true) : '—'}</span>
      <span className={`rg-etat ${classe}`} title={r.detail || ''}>
        <i />
        {texte}
      </span>
    </div>
  );
}

function Tableau({ titre, liste }) {
  if (!liste.length) return null;
  return (
    <div className="rg-carte">
      <div className="rg-carte-h">
        <h3>{titre}</h3>
      </div>
      <div className="rg-lignes">
        {liste.map((r) => (
          <Ligne key={r.id} r={r} />
        ))}
      </div>
    </div>
  );
}

export function RoutinesTab() {
  const [liste, setListe] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api
      .routines()
      .then(setListe)
      .catch((e) => setError(e.message));
  }, []);
  if (!liste) return <p className="clay-muted">{error || 'Chargement…'}</p>;
  const actives = liste.filter((r) => r.active);
  return (
    <>
      <p className="rg-aide">Elles tournent dans l’appli Claude, Mac allumé. Pour en lancer une tout de suite : appli Claude → Routines → la routine → « Exécuter maintenant ».</p>
      <Tableau titre="Tous les jours, chaque mois" liste={actives.filter((r) => r.recurrente)} />
      <Tableau titre="Rappels à venir" liste={actives.filter((r) => !r.recurrente)} />
      <Tableau titre="Éteintes ou passées" liste={liste.filter((r) => !r.active)} />
    </>
  );
}

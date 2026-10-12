// Réglages → Routines : ce que Claude fait tout seul, et où il en est.
// Les routines tournent dans l'appli Claude (le Studio ne fait que les
// montrer) : on les lance ou les modifie depuis la colonne « Routines » de
// l'appli Claude. Réglages → Dépôts : les apps suivies et leur synchro.
import React, { useEffect, useState } from 'react';
import { api, followJob } from './api.js';
import { useApplis, ciInfo, fmtDate } from './MesApplisPage.jsx';

const STATUT = {
  ok: ['ok', '✓ Terminée'],
  bloquee: ['ko', '⚠️ Bloquée'],
  encours: ['att', '⏳ En cours'],
  inconnu: ['', 'Sans compte rendu'],
  jamais: ['', 'Pas encore passée'],
};

function Ligne({ r }) {
  const [classe, texte] = STATUT[r.statut] || STATUT.inconnu;
  return (
    <tr style={{ borderTop: '1px solid var(--ligne)', verticalAlign: 'top', opacity: r.active ? 1 : 0.55 }}>
      <td style={{ padding: 8 }}>
        <b>{r.nom}</b>
        {r.description ? <div className="clay-muted small">{r.description}</div> : null}
        {r.statut === 'bloquee' && r.aFaire ? <div className="error small">À décider : {r.aFaire}</div> : null}
      </td>
      <td style={{ padding: 8 }} className="small">
        {r.active ? r.horaire : 'éteinte'}
      </td>
      <td style={{ padding: 8 }} className="small">
        {r.dernierPassage ? fmtDate(r.dernierPassage, true) : '—'}
      </td>
      <td style={{ padding: 8 }}>
        <span className={`clay-state ${classe}`} title={r.detail || ''}>
          {texte}
        </span>
      </td>
    </tr>
  );
}

function Tableau({ titre, liste }) {
  if (!liste.length) return null;
  return (
    <div className="clay-block" style={{ overflowX: 'auto' }}>
      <h3 style={{ marginTop: 0 }}>{titre}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr className="clay-muted small" style={{ textAlign: 'left' }}>
            <th style={{ padding: '6px 8px' }}>Routine</th>
            <th style={{ padding: '6px 8px' }}>Quand</th>
            <th style={{ padding: '6px 8px' }}>Dernier passage</th>
            <th style={{ padding: '6px 8px' }}>État</th>
          </tr>
        </thead>
        <tbody>
          {liste.map((r) => (
            <Ligne key={r.id} r={r} />
          ))}
        </tbody>
      </table>
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
      <p className="clay-muted small">Elles tournent dans l’appli Claude, Mac allumé. Pour en lancer une tout de suite : appli Claude → Routines → la routine → « Exécuter maintenant ».</p>
      <Tableau titre="⏰ Tous les jours, chaque mois" liste={actives.filter((r) => r.recurrente)} />
      <Tableau titre="📅 Rappels à venir" liste={actives.filter((r) => !r.recurrente)} />
      <Tableau titre="💤 Éteintes ou passées" liste={liste.filter((r) => !r.active)} />
    </>
  );
}

// Les dépôts suivis par Mes applis : huit apps, la liste est décidée dans le
// code (data/apps/<id>/app.json), pas ici.
export function DepotsTab() {
  const { data, error, recharger } = useApplis();
  const [synchro, setSynchro] = useState(false);
  const [err, setErr] = useState('');
  if (!data) return <p className="clay-muted">{error || 'Chargement…'}</p>;
  const lancer = () => {
    setSynchro(true);
    setErr('');
    api
      .synchroApplis()
      .then(({ jobId }) => followJob(jobId))
      .then(recharger)
      .catch((e) => setErr(e.message))
      .finally(() => setSynchro(false));
  };
  const s = data.synchro || {};
  return (
    <div className="clay-block" style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>📦 {data.apps.length} dépôts suivis</h3>
        <span className="clay-muted small">
          dernière synchro : {fmtDate(s.le, true) || '—'}
          {s.ok === false ? ' · ⚠️ en échec' : ''} · toutes les 6 h
        </span>
        <button className="clay-btn small ghost" disabled={synchro} onClick={lancer}>
          {synchro ? '⏳ Synchro…' : '🔄 Synchroniser'}
        </button>
      </div>
      {s.ok === false && s.erreur ? <p className="error small">{s.erreur}</p> : null}
      {err ? <p className="error small">{err}</p> : null}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginTop: 10 }}>
        <thead>
          <tr className="clay-muted small" style={{ textAlign: 'left' }}>
            <th style={{ padding: '6px 8px' }}>App</th>
            <th style={{ padding: '6px 8px' }}>Dépôt</th>
            <th style={{ padding: '6px 8px' }}>Code</th>
          </tr>
        </thead>
        <tbody>
          {data.apps.map((a) => {
            const c = ciInfo(a);
            return (
              <tr key={a.id} style={{ borderTop: '1px solid var(--ligne)' }}>
                <td style={{ padding: 8, fontWeight: 700 }}>
                  {a.emoji} {a.name}
                </td>
                <td style={{ padding: 8 }}>
                  <a href={`https://github.com/${a.repo}`} target="_blank" rel="noopener noreferrer">
                    {a.repo}
                  </a>
                </td>
                <td style={{ padding: 8 }}>
                  <span className={`clay-state ${c.k === 'ok' ? 'ok' : c.k === 'ko' ? 'ko' : c.k === 'run' ? 'att' : ''}`}>{c.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

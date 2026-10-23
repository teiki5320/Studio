// Point du matin (Accueil) : ce que la routine de 7 h a préparé — agenda et
// mails, puis une ligne par site et appli. Ses décisions et problèmes
// s'affichent juste en dessous, dans le bloc « À faire » (AFaire.jsx), avec
// tout le reste. Les mails cochés partent dans la file commune, que la routine
// du matin (6 h) applique.
import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import './point.css';

const heure = (iso) => (iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '');
const jourLong = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const aujourdhui = () => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date());

function Mails({ mails, onCorbeille }) {
  const [coches, setCoches] = useState([]);
  const groupes = (mails?.groupes || []).filter((g) => !g.protege);
  const proteges = (mails?.groupes || []).filter((g) => g.protege);
  if (!mails) return null;
  const basculer = (id) => setCoches((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  return (
    <div className="pm-carte">
      <h4>✉️ Mails · {mails.total ?? '…'} en boîte</h4>
      {mails.erreur ? <p className="pm-vide">{mails.erreur}</p> : null}
      {groupes.map((g) => (
        <label key={g.id} className={`pm-mail${g.etat ? ` ${g.etat}` : ''}`}>
          <input type="checkbox" disabled={Boolean(g.etat)} checked={coches.includes(g.id) || Boolean(g.etat)} onChange={() => basculer(g.id)} />
          <span>
            {g.nom} — {g.nombre}
            {g.objet ? <small> · {g.objet}</small> : null}
            {g.etat === 'demande' ? <small> · ⏳ à la corbeille demain matin</small> : g.etat === 'fait' ? <small> · ✅ à la corbeille</small> : g.etat === 'bloque' ? <small> · ❌ échec</small> : null}
          </span>
        </label>
      ))}
      {proteges.length ? <p className="pm-vide">À garder : {proteges.map((g) => `${g.nom} ${g.nombre}`).join(' · ')}</p> : null}
      {groupes.length ? (
        <button
          className="clay-btn small"
          disabled={!coches.length}
          onClick={() => {
            onCorbeille(coches);
            setCoches([]);
          }}
        >
          🗑️ Mettre à la corbeille ({coches.length})
        </button>
      ) : null}
      {mails.groupes?.length ? <p className="pm-vide">Corbeille : récupérable 30 jours, rien n'est supprimé pour de bon.</p> : null}
    </div>
  );
}

export function PointDuMatin() {
  const [p, setP] = useState(undefined);
  const [error, setError] = useState('');
  const [ouvert, setOuvert] = useState(null);
  const charger = () =>
    api
      .point()
      .then(setP)
      .catch((e) => setError(e.message));
  useEffect(() => {
    charger();
  }, []);
  const agir = (promesse) => promesse.then(setP).catch((e) => setError(e.message));
  if (p === undefined) return null;
  if (!p) return <div className="pm anim"><h3>☀️ Point du matin</h3><p className="pm-vide">Le premier point arrivera demain à 7 h.</p></div>;

  const ancien = p.date !== aujourdhui();
  const nbOk = p.sites.filter((s) => s.etat === 'ok').length;
  return (
    <div className="pm anim">
      <div className="pm-tete">
        <h3>☀️ Point du matin · {jourLong(p.date)}</h3>
        <span>{ancien ? '⚠️ point d’un jour précédent' : `prêt à ${heure(p.pretLe)}`}</span>
      </div>
      {error ? <p className="error small">{error}</p> : null}

      <div className="pm-deux">
        <div className="pm-carte">
          <h4>📅 Agenda</h4>
          {p.agenda?.erreur ? <p className="pm-vide">{p.agenda.erreur}</p> : null}
          {(p.agenda?.lignes || []).length ? (
            p.agenda.lignes.map((l, i) => (
              <div key={i} className="pm-rdv">
                <b>{l.heure}</b> {l.titre}
                {l.lieu ? <small> · {l.lieu}</small> : null}
              </div>
            ))
          ) : (
            <p className="pm-vide">Aucun rendez-vous aujourd’hui.</p>
          )}
          {p.agenda?.demain ? <p className="pm-vide">Demain matin : {p.agenda.demain}</p> : null}
        </div>
        <Mails mails={p.mails} onCorbeille={(g) => agir(api.corbeillePoint(g))} />
      </div>

      <div className="pm-carte">
        <h4>🌐 Sites et applis{p.sites.length ? ` · ${nbOk} sans souci` : ''}</h4>
        <div className="pm-sites">
          {p.sites.map((s) => (
            <div key={s.cle || s.nom} className={`pm-site ${s.etat || ''}`}>
              <button className="pm-site-l" onClick={() => setOuvert(ouvert === s.nom ? null : s.nom)}>
                <span>{s.etat === 'ok' ? '✅' : s.etat === 'ko' ? '❌' : s.etat === 'encours' ? '⏳' : '•'}</span>
                <b>{s.nom}</b>
                <small>{s.resume}</small>
              </button>
              {ouvert === s.nom && s.detail?.length ? (
                <ul>
                  {s.detail.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

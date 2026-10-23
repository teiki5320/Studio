// Point du matin (Accueil) : ce que la routine de 7 h a préparé. Dans l'ordre :
// à décider, problèmes, agenda et mails, puis une ligne par site et appli.
// Les réponses partent dans une file que la routine « actions » applique
// (toutes les 15 minutes) ; on relit le point tant qu'une réponse attend.
import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import './point.css';

const heure = (iso) => (iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '');
const jourLong = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const aujourdhui = () => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date());

function Etat({ x }) {
  if (x.etat === 'demande') return <span className="pm-etat run">⏳ envoyé à Claude · traité dans les 15 min</span>;
  if (x.etat === 'fait') return <span className="pm-etat ok">✅ {x.compteRendu || 'fait'}</span>;
  if (x.etat === 'bloque') return <span className="pm-etat ko">❌ {x.compteRendu || 'bloqué'}</span>;
  return null;
}

function Ligne({ x, onRepondre, ouiSeul }) {
  return (
    <div className="pm-ligne">
      <div className="pm-texte">
        {x.site ? <b>{x.site} · </b> : null}
        {x.texte}
        {x.detail ? <small>{x.detail}</small> : null}
        <Etat x={x} />
      </div>
      {!x.etat ? (
        <div className="pm-boutons">
          <button className="clay-btn small" onClick={() => onRepondre(x.id, 'oui')}>
            {ouiSeul ? 'Régler' : 'Oui'}
          </button>
          {ouiSeul ? null : (
            <button className="clay-btn ghost small" onClick={() => onRepondre(x.id, 'non')}>
              Non
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

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
            {g.etat === 'demande' ? <small> · ⏳ corbeille demandée</small> : g.etat === 'fait' ? <small> · ✅ à la corbeille</small> : g.etat === 'bloque' ? <small> · ❌ échec</small> : null}
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
  // Tant qu'une réponse attend la routine, on relit toutes les 30 s.
  const attente = p && [...(p.decisions || []), ...(p.problemes || []), ...(p.corbeille || [])].some((x) => x.etat === 'demande');
  useEffect(() => {
    if (!attente) return undefined;
    const t = setInterval(charger, 30000);
    return () => clearInterval(t);
  }, [attente]);

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
      <div className="pm-compteurs">
        <span className="run"><b>{p.decisions.filter((x) => !x.etat).length}</b> à décider</span>
        <span className="ko"><b>{p.problemes.filter((x) => x.etat !== 'fait').length}</b> problème{p.problemes.length > 1 ? 's' : ''}</span>
        <span className="ok"><b>{nbOk}</b> sans souci</span>
      </div>
      {error ? <p className="error small">{error}</p> : null}

      {p.decisions.length ? (
        <div className="pm-carte">
          <h4>❓ À décider</h4>
          {p.decisions.map((x) => (
            <Ligne key={x.id} x={x} onRepondre={(id, c) => agir(api.repondrePoint(id, c))} />
          ))}
        </div>
      ) : null}

      {p.problemes.length ? (
        <div className="pm-carte">
          <h4 className="ko">❌ Problèmes</h4>
          {p.problemes.map((x) => (
            <Ligne key={x.id} x={x} ouiSeul onRepondre={(id, c) => agir(api.repondrePoint(id, c))} />
          ))}
        </div>
      ) : null}

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
        <h4>🌐 Sites et applis</h4>
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

// File d'attente de production : ce qui est en cours, en attente ou prêt.
// projectId : n'afficher que les vidéos d'un projet (page d'une appli).
// Sans projectId (page En cours) : seulement ce qui tourne, attend ou a
// échoué ; les vidéos prêtes sont dans Publicité (page de leur appli) et se
// déplient ici d'un clic.
import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { lienVideo, surLeMac } from './VideoSave.jsx';
import { logoAppli } from './apps.js';
import { LogoAppli } from './LogoAppli.jsx';

const STATES = {
  running: { cls: 'run', text: 'en cours' },
  waiting: { cls: 'att', text: 'en attente' },
  done: { cls: 'ok', text: 'prête ✓ iCloud' },
  error: { cls: 'ko', text: 'échec' },
};

export function QueuePanel({ projectId = null, refreshKey = 0, onDone = null }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [voirFinies, setVoirFinies] = useState(false);

  // Travaux lancés hors de la file (Retoucher : montage, image, clip, voix).
  const [travaux, setTravaux] = useState([]);
  const load = () =>
    api
      .activeJobs()
      .then(setTravaux)
      .catch(() => {})
      .then(() => api.queue())
      .then((list) => {
        setItems((prev) => {
          // Une vidéo vient de se terminer : la page du projet se met à jour.
          if (onDone && prev) {
            const finished = list.some(
              (it) => it.status === 'done' && prev.some((p) => p.id === it.id && p.status !== 'done'),
            );
            if (finished) {
              onDone();
            }
          }
          return list;
        });
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [refreshKey]);

  const duProjet = (items || []).filter((it) => !projectId || it.projectId === projectId);
  const finies = projectId ? [] : duProjet.filter((it) => it.status === 'done');
  const shown = projectId || voirFinies ? duProjet : duProjet.filter((it) => it.status !== 'done');
  const liesALaFile = new Set((items || []).map((it) => it.jobId).filter(Boolean));
  const horsFile = travaux.filter((j) => !liesALaFile.has(j.id) && (!projectId || j.projectId === projectId));

  // Une carte par vidéo : logo, nom, étape, % et barre (rayée tant que ça tourne).
  const carte = ({ key, de, label, sous, erreur, etat, progress, actions }) => {
    const st = STATES[etat] || STATES.waiting;
    const pc = progress != null ? Math.round(progress * 100) : null;
    const largeur = etat === 'done' ? 100 : etat === 'waiting' ? 0 : pc ?? 6;
    return (
      <div key={key} className={`qp-job ${st.cls}`}>
        <span className="qp-logo">{logoAppli(de) ? <LogoAppli de={de} taille={44} seul /> : <Picto id="film" />}</span>
        <div className="qp-corps">
          <div className="qp-h">
            <b>{label}</b>
            <span className="qp-pc">{etat === 'running' && pc != null ? `${pc} %` : etat === 'done' ? 'Terminé' : ''}</span>
          </div>
          <div className="qp-sous">
            <span className={`qp-tag ${st.cls}`}>{st.text}</span>
            {sous ? <span className="qp-etape">{sous}</span> : null}
          </div>
          {erreur ? <small className="error qp-err">{erreur}</small> : null}
          <div className="qp-barre" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={largeur}>
            <div className={`qp-fill${etat === 'running' ? ' rayures' : ''}`} style={{ width: `${largeur}%` }} />
          </div>
        </div>
        {actions ? <div className="qp-actions">{actions}</div> : null}
      </div>
    );
  };

  const rien = items && shown.length === 0 && horsFile.length === 0;
  const liste = (
    <>
      {error && <p className="error small">{error}</p>}
      {horsFile.map((j) =>
        carte({ key: j.id, de: j.projectTitle || j.label, label: j.label, sous: j.step, etat: 'running', progress: j.progress }),
      )}
      {rien && (projectId ? <p className="clay-muted small">Rien en attente.</p> : <div className="qp-vide">Rien en cours.</div>)}
      {finies.length ? (
        <button type="button" className="clay-btn ghost small qp-voir" onClick={() => setVoirFinies(!voirFinies)}>
          {voirFinies ? 'Cacher les vidéos prêtes' : `${finies.length} vidéo${finies.length > 1 ? 's' : ''} prête${finies.length > 1 ? 's' : ''} (dans Publicité) · voir`}
        </button>
      ) : null}
      {[...shown].reverse().map((it) =>
        carte({
          key: it.id,
          de: it.projectTitle || it.label,
          label: it.label,
          sous: it.status === 'running' ? it.step : '',
          erreur: it.status === 'error' ? it.error : '',
          etat: it.status,
          progress: it.progress,
          actions: (
            <>
              {it.status === 'done' && it.number != null && !surLeMac() && (
                <a
                  className="clay-btn ghost small qp-ic"
                  href={lienVideo(it.projectId, `renders/episode-${it.number}.mp4`, it.label)}
                  title="Enregistrer la vidéo"
                  aria-label="Enregistrer la vidéo"
                >
                  <Picto id="bas" />
                </a>
              )}
              {!projectId && (
                <a className="clay-btn ghost small qp-ic" href={`#/projet/${it.projectId}`} title="Ouvrir le projet" aria-label="Ouvrir le projet">
                  <Picto id="ouvrir" />
                </a>
              )}
              {it.status !== 'running' && (
                <button
                  className="clay-btn ghost small qp-ic"
                  title={it.status === 'waiting' ? 'Retirer de la file' : 'Effacer la ligne'}
                  aria-label={it.status === 'waiting' ? 'Retirer de la file' : 'Effacer la ligne'}
                  onClick={() => api.removeFromQueue(it.id).then(load).catch((e) => setError(e.message))}
                >
                  <Picto id="croix" />
                </button>
              )}
            </>
          ),
        }),
      )}
    </>
  );

  // Page En cours : les cartes directement ; page d'un projet : dans un bloc.
  if (!projectId) return <div className="qp qp-page">{liste}</div>;
  return (
    <div className="clay-block qp">
      <h3>File d'attente</h3>
      {liste}
    </div>
  );
}

const PICTOS = {
  film: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="3" />
      <path d="M16 10l5-3v10l-5-3" />
    </>
  ),
  bas: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  ouvrir: <path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" />,
  croix: <path d="M6 6l12 12M18 6L6 18" />,
};

function Picto({ id }) {
  return (
    <svg className="rf-ic petite" viewBox="0 0 24 24" aria-hidden="true">
      {PICTOS[id]}
    </svg>
  );
}

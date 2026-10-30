// Page d'une campagne de pub (une appli) ou d'une chaîne, sur le modèle de la
// page Recettes : la vidéo à gauche, les commandes à droite. On choisit une
// idée (ou on écrit la sienne), « Générer », et la vidéo se fabrique toute
// seule jusqu'au MP4 (file d'attente). Les réglages fins restent accessibles
// par « Réglages avancés » (l'ancienne page de production).
//
// La façon d'écrire chaque pub est encore la même pour toutes les applis :
// elle sera personnalisée appli par appli, avec Jean.
import React, { useEffect, useState } from 'react';
import { Player } from '@remotion/player';
import { api, followJob } from './api.js';
import { Episode } from './remotion/Episode.jsx';
import { FPS, WIDTH, HEIGHT, episodeDurationInFrames } from './remotion/timing.js';
import { Credits } from './RecipesPage.jsx';
import { EtatValidation, lienVideo, surLeMac, CasesBoutiques } from './VideoSave.jsx';
import { badgesBoutiques, marqueProjet } from './apps.js';
import { ScreenshotsPanel } from './ProjectView.jsx';
import './prep.css';

// Choix en tuiles (formats, régions) : tout se voit d'un coup d'œil, avec
// le coût sous chaque format (refonte P1, Jean, 30/10).
const sansEmoji = (s) => String(s || '').replace(/^[^\p{L}\p{N}«"'(]+/u, '').trim();
const cout250 = (id) => (id === 'ambiance' || id === 'timelapse' ? '≈ 250 crédits' : '');
function Tuiles({ options, value, onChange, cout, label = 'Format' }) {
  return (
    <div className="pp-tuiles" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          className={`pp-tuile${o.id === value ? ' on' : ''}`}
          onClick={() => onChange(o.id)}
        >
          <b>{sansEmoji(o.label)}</b>
          {cout && cout(o.id) ? <span>{cout(o.id)}</span> : null}
        </button>
      ))}
    </div>
  );
}

const Ic = ({ d }) => (
  <svg className="rf-ic petite" viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} />
  </svg>
);

function Apercu({ project, episode, studio }) {
  const isPub = project.kind === 'pub';
  if (!episode) {
    return (
      <div className="rp-video rp-video-vide">
        <span>{isPub ? '📣' : '🎥'}</span>
        <p>{isPub ? 'Choisis une idée à droite, puis « Générer la pub ».' : 'Choisis un sujet à droite, puis « Générer la vidéo ».'}</p>
      </div>
    );
  }
  if (episode.renderedFile) {
    return (
      <video
        key={episode.renderedFile}
        className="rp-video"
        src={`/files/${project.id}/${episode.renderedFile}?apercu=1&v=${encodeURIComponent(project.updatedAt || '')}#t=0.5`}
        preload="metadata"
        controls
        playsInline
      />
    );
  }
  const cta = isPub ? episode.cta || project.cta || '' : '';
  const ctaLogo = isPub && project.ctaLogo ? `/files/${project.id}/${project.ctaLogo}` : '';
  return (
    <div className="rp-video">
      <Player
        component={Episode}
        inputProps={{
          episode,
          characters: project.characters,
          assetBase: `/files/${project.id}`,
          musicFile: project.musicFile,
          seriesTitle: project.title,
          studio,
          studioBase: '/studio',
          noOutroCard: true,
          cta,
          ctaLogo,
          ctaBadges: badgesBoutiques(project, '/studio'),
          ctaTheme: project.ctaTheme,
        }}
        durationInFrames={Math.max(1, episodeDurationInFrames(episode, studio, true, cta))}
        fps={FPS}
        compositionWidth={WIDTH}
        compositionHeight={HEIGHT}
        controls
        acknowledgeRemotionLicense
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

// Keur Cook : pas d'idées à choisir — la pub suit la tournée des pays
// (plat emblématique + ingrédient rare), la fin alterne recette / ingrédient.
function KeurCookAdControls({ projectId, onQueued }) {
  const [plan, setPlan] = useState(null);
  const [pays, setPays] = useState('');
  const seconds = 45;
  const [error, setError] = useState('');
  const load = () =>
    api
      .keurcookPlan(projectId)
      .then((p) => {
        setPlan(p);
        setPays((cur) => cur || (p.next && p.next.pays) || '');
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [projectId]);
  const choisi = plan?.pays.find((e) => e.pays === pays);
  return (
    <div className="clay-block">
      <h3>Nouvelle pub · Tour d'Afrique</h3>
      {!plan && !error && <p className="clay-muted small">Chargement de la tournée…</p>}
      {plan && (
        <>
          <select className="rp-input" value={pays} onChange={(e) => setPays(e.target.value)}>
            {plan.pays.map((e) => (
              <option key={e.pays} value={e.pays}>
                {e.fait ? '✓ ' : ''}
                {e.pays} — {e.recette} + {e.produit}
                {plan.next && e.pays === plan.next.pays ? ' (prochain)' : ''}
              </option>
            ))}
          </select>
          <button
            className="clay-btn rp-generate"
            disabled={!pays}
            onClick={() =>
              api
                .addToQueue({ kind: 'keurcook', projectId, pays, seconds })
                .then(() => {
                  setPays('');
                  onQueued();
                  return load();
                })
                .catch((e) => setError(e.message))
            }
          >
            Générer la pub
          </button>
        </>
      )}
      {error && <p className="error small">{error}</p>}
    </div>
  );
}

// Keur Déco : trois formats au choix (ambiance, visite, avant / après),
// l'article du site (le prochain est proposé), la vue pour l'ambiance.
function KeurDecoAdControls({ projectId, onQueued }) {
  const [plan, setPlan] = useState(null);
  const [format, setFormat] = useState('ambiance');
  const [article, setArticle] = useState('');
  const [vue, setVue] = useState('');
  const seconds = 30;
  const [error, setError] = useState('');
  const load = () =>
    api
      .keurdecoPlan(projectId)
      .then((p) => {
        setPlan(p);
        setArticle((cur) => cur || p.next || '');
        setVue((cur) => cur || p.nextVue || '');
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [projectId]);
  const choix = (plan?.articles || []).filter((a) => format === 'ambiance' || a.objets >= 2);
  return (
    <div className="clay-block">
      <h3>Nouvelle pub</h3>
      {!plan && !error && <p className="clay-muted small">Chargement des articles…</p>}
      {plan && (
        <>
          <Tuiles options={plan.formats} value={format} onChange={setFormat} cout={cout250} />
          <select className="rp-input" value={article} onChange={(e) => setArticle(e.target.value)}>
            {choix.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.fait ? '✓ ' : ''}
                {a.titre}
                {a.slug === plan.next ? ' (prochain)' : ''}
              </option>
            ))}
          </select>
          {format === 'ambiance' && (
            <select className="rp-input" value={vue} onChange={(e) => setVue(e.target.value)}>
              {plan.vues.map((v) => (
                <option key={v} value={v}>
                  Vue : {v}
                </option>
              ))}
            </select>
          )}
          <button
            className="clay-btn rp-generate"
            disabled={!article}
            onClick={() =>
              api
                .addToQueue({ kind: 'keurdeco', projectId, format, article, vue, seconds })
                .then(() => {
                  setArticle('');
                  setVue('');
                  onQueued();
                  return load();
                })
                .catch((e) => setError(e.message))
            }
          >
            Générer la pub
          </button>
        </>
      )}
      {error && <p className="error small">{error}</p>}
    </div>
  );
}

// Keurbook : « Le livre en 30 s » — le prochain livre est proposé ; on peut
// en chercher un autre parmi tous ceux du site.
function KeurbookAdControls({ projectId, onQueued }) {
  const [plan, setPlan] = useState(null);
  const [search, setSearch] = useState('');
  const [livre, setLivre] = useState('');
  const [error, setError] = useState('');
  const load = () =>
    api
      .keurbookPlan(projectId)
      .then((p) => {
        setPlan(p);
        setLivre((cur) => cur || p.next || '');
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [projectId]);
  const q = search.trim().toLowerCase();
  const liste = (plan?.livres || []).filter(
    (l) => !q || `${l.titre} ${l.auteur} ${l.pays}`.toLowerCase().includes(q) || l.slug === livre,
  );
  const choisi = (plan?.livres || []).find((l) => l.slug === livre);
  return (
    <div className="clay-block">
      <h3>Nouvelle pub · Le livre en 30 s</h3>
      {!plan && !error && <p className="clay-muted small">Chargement des livres…</p>}
      {plan && (
        <>
          <input
            className="rp-input"
            value={search}
            placeholder={`Chercher parmi ${plan.livres.length} livres : titre, auteur, pays…`}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="rp-input" value={livre} onChange={(e) => setLivre(e.target.value)}>
            {liste.slice(0, 300).map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.fait ? '✓ ' : ''}
                {l.titre} — {l.auteur}
                {l.pays ? ` (${l.pays})` : ''}
                {l.slug === plan.next ? ' · prochain' : ''}
              </option>
            ))}
          </select>
          <button
            className="clay-btn rp-generate"
            disabled={!livre}
            onClick={() =>
              api
                .addToQueue({ kind: 'keurbook', projectId, livre, label: choisi ? choisi.titre : livre })
                .then(() => {
                  setLivre('');
                  setSearch('');
                  onQueued();
                  return load();
                })
                .catch((e) => setError(e.message))
            }
          >
            Générer la pub
          </button>
        </>
      )}
      {error && <p className="error small">{error}</p>}
    </div>
  );
}

// Kultiled : le calcul en 30 s (vrais chiffres du site) ou le time-lapse.
function OptiledAdControls({ projectId, onQueued }) {
  const [plan, setPlan] = useState(null);
  const [format, setFormat] = useState('calcul');
  const [culture, setCulture] = useState('');
  const [error, setError] = useState('');
  const load = () =>
    api
      .optiledPlan(projectId)
      .then((p) => {
        setPlan(p);
        setCulture((cur) => cur || p.next || '');
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [projectId]);
  const choisie = (plan?.cultures || []).find((c) => c.id === culture);
  return (
    <div className="clay-block">
      <h3>Nouvelle pub</h3>
      {!plan && !error && <p className="clay-muted small">Chargement des cultures…</p>}
      {plan && (
        <>
          <Tuiles options={plan.formats} value={format} onChange={setFormat} cout={cout250} />
          <select className="rp-input" value={culture} onChange={(e) => setCulture(e.target.value)}>
            {plan.cultures.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fait ? '✓ ' : ''}
                {c.nom} — {c.resume}
                {c.id === plan.next ? ' · prochain' : ''}
              </option>
            ))}
          </select>
          <button
            className="clay-btn rp-generate"
            disabled={!culture}
            onClick={() =>
              api
                .addToQueue({ kind: 'optiled', projectId, format, culture, label: choisie ? choisie.nom : culture })
                .then(() => {
                  setCulture('');
                  onQueued();
                  return load();
                })
                .catch((e) => setError(e.message))
            }
          >
            Générer la pub
          </button>
        </>
      )}
      {error && <p className="error small">{error}</p>}
    </div>
  );
}

// Kultiva : semis du mois (illustrations de l'appli), graine → assiette,
// famille avec le Tamassi, ou time-lapse. Région choisie à chaque pub.
function KultivaAdControls({ projectId, onQueued }) {
  const [plan, setPlan] = useState(null);
  const [format, setFormat] = useState('mois');
  const [region, setRegion] = useState('france');
  const [espece, setEspece] = useState('');
  const [error, setError] = useState('');
  const load = () =>
    api
      .kultivaPlan(projectId)
      .then(setPlan)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [projectId]);
  const especes = (plan?.especes || [])
    .slice()
    .sort((a, b) => Number(b[region]) - Number(a[region]) || a.nom.localeCompare(b.nom, 'fr'));
  const aSemer = especes.filter((e) => e[region]);
  const choisie = especes.find((e) => e.id === espece);
  return (
    <div className="clay-block">
      <h3>Nouvelle pub</h3>
      {!plan && !error && <p className="clay-muted small">Chargement du calendrier…</p>}
      {plan && (
        <>
          <Tuiles options={plan.formats} value={format} onChange={setFormat} cout={cout250} />
          <Tuiles options={plan.regions} value={region} onChange={setRegion} label="Région" />
          {format !== 'mois' && (
            <select className="rp-input" value={espece} onChange={(e) => setEspece(e.target.value)}>
              <option value="">Au hasard (de saison)</option>
              {especes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fait ? '✓ ' : ''}
                  {e.emoji} {e.nom}
                  {e[region] ? ` · à semer en ${plan.mois}` : ''}
                </option>
              ))}
            </select>
          )}
          <button
            className="clay-btn rp-generate"
            disabled={format === 'mois' && !aSemer.length}
            onClick={() =>
              api
                .addToQueue({
                  kind: 'kultiva',
                  projectId,
                  format,
                  region,
                  espece: format === 'mois' ? '' : espece,
                  label: format === 'mois' ? plan.mois : choisie ? choisie.nom : '',
                })
                .then(() => {
                  setEspece('');
                  onQueued();
                  return load();
                })
                .catch((e) => setError(e.message))
            }
          >
            Générer la pub
          </button>
        </>
      )}
      {error && <p className="error small">{error}</p>}
    </div>
  );
}

// Palabre : les vrais écrans du jeu — une carte posée au spectateur, un
// mandat en accéléré, ou le palais qui s'achète pièce par pièce.
function PalabreAdControls({ projectId, onQueued }) {
  const [plan, setPlan] = useState(null);
  const [format, setFormat] = useState('question');
  const [carte, setCarte] = useState('');
  const [error, setError] = useState('');
  const load = () =>
    api
      .palabrePlan(projectId)
      .then(setPlan)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [projectId]);
  const choisie = (plan?.cartes || []).find((c) => c.id === carte);
  return (
    <div className="clay-block">
      <h3>Nouvelle pub</h3>
      {!plan && !error && <p className="clay-muted small">Chargement des cartes…</p>}
      {plan && (
        <>
          <Tuiles options={plan.formats} value={format} onChange={setFormat} cout={cout250} />
          {format === 'question' && (
            <select className="rp-input" value={carte} onChange={(e) => setCarte(e.target.value)}>
              <option value="">Une carte au hasard</option>
              {plan.cartes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fait ? '✓ ' : ''}
                  {c.titre} — {c.gauche} / {c.droite}
                </option>
              ))}
            </select>
          )}
          <button
            className="clay-btn rp-generate"
            onClick={() =>
              api
                .addToQueue({ kind: 'palabre', projectId, format, carte: format === 'question' ? carte : '', label: choisie ? choisie.titre : '' })
                .then(() => {
                  setCarte('');
                  onQueued();
                  return load();
                })
                .catch((e) => setError(e.message))
            }
          >
            Générer la pub
          </button>
        </>
      )}
      {error && <p className="error small">{error}</p>}
    </div>
  );
}

// Erea : l'anachronisme (un personnage projeté dans une mauvaise époque),
// avant ou après ?, l'interro surprise, la petite histoire, et trois formats
// à 0 crédit : remets-les dans l'ordre, ce jour-là, le savais-tu ?
function EreaAdControls({ projectId, project, onQueued }) {
  const [plan, setPlan] = useState(null);
  const [format, setFormat] = useState('anachronisme');
  const [personnage, setPersonnage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    api
      .ereaPlan(projectId)
      .then(setPlan)
      .catch((e) => setError(e.message));
  }, [projectId]);
  // Crédits OpenArt par vidéo (images + clips économiques), à titre indicatif.
  // Coûts réels relevés le 26/10 : une image ≈ 40 crédits, un clip ≈ 60.
  const credits = { anachronisme: ' · ≈ 200 crédits', avantapres: ' · ≈ 100 crédits', interro: ' · 0 crédit', petitehistoire: ' · ≈ 200 crédits', ordre: ' · 0 crédit', cejour: ' · 0 crédit', savais: ' · 0 crédit' };
  return (
    <div className="clay-block">
      <h3>Nouvelle pub</h3>
      {!plan && !error && <p className="clay-muted small">Chargement des formats…</p>}
      {plan && (
        <>
          <Tuiles options={plan.formats} value={format} onChange={setFormat} cout={(id) => (credits[id] || '').replace(' · ', '')} />
          {format === 'anachronisme' && (
            <input
              className="rp-input"
              value={personnage}
              placeholder="Personnage (facultatif) — sinon Claude en choisit un nouveau"
              onChange={(e) => setPersonnage(e.target.value)}
            />
          )}
          <button
            className="clay-btn rp-generate"
            onClick={() =>
              api
                .addToQueue({ kind: 'erea', projectId, format, personnage: format === 'anachronisme' ? personnage : '' })
                .then(() => {
                  setPersonnage('');
                  onQueued();
                })
                .catch((e) => setError(e.message))
            }
          >
            Générer la pub
          </button>
        </>
      )}
      {error && <p className="error small">{error}</p>}
    </div>
  );
}

// Pubs des sites : le format validé par Jean pour ce site (30/10), en un clic.
function SitePubControls({ projectId, onQueued }) {
  const [formats, setFormats] = useState([]);
  const [format, setFormat] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  useEffect(() => {
    api
      .sitePubPlan(projectId)
      .then((r) => {
        setFormats(r.formats || []);
        setFormat((r.formats || [])[0]?.id || '');
      })
      .catch((e) => setError(e.message));
  }, [projectId]);
  if (!formats.length) {
    return null;
  }
  return (
    <div className="clay-block">
      <h3>Pub au format validé</h3>
      {formats.length > 1 ? (
        <select className="rp-input" value={format} onChange={(e) => setFormat(e.target.value)}>
          {formats.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      ) : (
        <p style={{ margin: 0, fontWeight: 700 }}>{formats[0].label}</p>
      )}
      <p className="clay-muted small" style={{ margin: 0 }}>Le Studio choisit le contenu sur le site, puis écrit et fabrique la pub.</p>
      <button
        className="clay-btn rp-generate"
        onClick={() => {
          setError('');
          setOk('');
          api
            .addToQueue({ kind: 'sitepub', projectId, format })
            .then(() => {
              setOk('Ajoutée à la fabrication.');
              onQueued();
            })
            .catch((e) => setError(e.message));
        }}
      >
        Générer la pub
      </button>
      {ok && <p className="clay-muted small">{ok}</p>}
      {error && <p className="error small">{error}</p>}
    </div>
  );
}

export function AdPage({ projectId, onAdvanced }) {
  const [project, setProject] = useState(null);
  const [studio, setStudio] = useState(null);
  const [queue, setQueue] = useState([]);
  const [selected, setSelected] = useState(null);
  // Dossier des validées (Jean, 29/10) : une vidéo validée part au planning et se range ici.
  const [dossier, setDossier] = useState(false);
  // Captures d'écran et badges des boutiques : rangés derrière « Plus » (refonte P1).
  const [plus, setPlus] = useState(false);
  const [idea, setIdea] = useState('');
  const [custom, setCustom] = useState('');
  const [ideasBusy, setIdeasBusy] = useState(false);
  const [error, setError] = useState('');

  const loadProject = () =>
    api
      .getProject(projectId)
      .then((p) => {
        setProject(p);
        return p;
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    loadProject();
    api.getStudio().then(setStudio).catch(() => setStudio({}));
  }, [projectId]);

  useEffect(() => {
    let prevRunning = null;
    const tick = () =>
      api
        .queue()
        .then((list) => {
          const mine = list.filter((it) => it.projectId === projectId);
          setQueue(mine);
          const running = mine.filter((it) => it.status === 'running').map((it) => it.id).join(',');
          if (prevRunning !== null && running !== prevRunning) {
            loadProject();
          }
          prevRunning = running;
        })
        .catch(() => {});
    tick();
    const t = setInterval(tick, 3000);
    return () => clearInterval(t);
  }, [projectId]);

  const ideas = project?.topicIdeas || [];
  useEffect(() => {
    if (!idea && ideas.length) {
      setIdea(ideas[0]);
    }
  }, [ideas.length]);

  // Une appli sans pub ni idée reçoit tout de suite ses idées (Claude seul).
  const moreIdeas = () => {
    setIdeasBusy(true);
    setError('');
    api
      .suggestTopics(projectId)
      .then(({ jobId }) => followJob(jobId, () => {}))
      .then(() => loadProject())
      .then((p) => p && p.topicIdeas && p.topicIdeas[0] && setIdea(p.topicIdeas[0]))
      .catch((e) => setError(e.message))
      .finally(() => setIdeasBusy(false));
  };
  useEffect(() => {
    if (
      project &&
      project.kind === 'pub' &&
      !['teiki5320/keurcook', 'teiki5320/keurdeco', 'teiki5320/keurbook', 'teiki5320/optiled', 'teiki5320/erea', 'teiki5320/kultiva', 'teiki5320/palabre'].includes(
        String(project.repo || '').toLowerCase(),
      ) &&
      !(project.episodes || []).length &&
      !ideas.length &&
      !ideasBusy
    ) {
      moreIdeas();
    }
  }, [project?.id]);

  if (!project) {
    return <div className="clay-content clay-muted">{error || 'Chargement…'}</div>;
  }

  const isPub = project.kind === 'pub';
  const repoKey = String(project.repo || '').toLowerCase();
  const isKeurCook = repoKey === 'teiki5320/keurcook';
  const isKeurDeco = repoKey === 'teiki5320/keurdeco';
  const isKeurbook = repoKey === 'teiki5320/keurbook';
  const isOptiled = repoKey === 'teiki5320/optiled';
  const isErea = repoKey === 'teiki5320/erea';
  const isKultiva = repoKey === 'teiki5320/kultiva';
  const isPalabre = repoKey === 'teiki5320/palabre';
  const episodes = [...(project.episodes || [])].sort((a, b) => b.number - a.number);
  const shown =
    episodes.find((e) => e.number === selected) || episodes.find((e) => e.renderedFile) || episodes[0] || null;
  const liste = episodes.filter((e) => (e.validation === 'validee') === dossier);
  const active = queue.filter((it) => it.status === 'running' || it.status === 'waiting');
  const failed = queue.filter((it) => it.status === 'error').slice(-1)[0];
  const subject = custom.trim() || idea;

  const generate = () => {
    setError('');
    api
      .addToQueue({ kind: isPub ? 'pub' : 'chaine', projectId, angle: subject })
      .then(() => {
        setCustom('');
        return api.queue();
      })
      .then((list) => {
        setQueue(list.filter((it) => it.projectId === projectId));
        loadProject();
      })
      .catch((e) => setError(e.message));
  };

  const remove = (ep) => {
    if (!confirm(`Supprimer « ${ep.title} » (images, voix et MP4) ?`)) {
      return;
    }
    api
      .deleteEpisode(projectId, ep.number)
      .then(() => {
        setSelected(null);
        loadProject();
      })
      .catch((e) => alert(e.message));
  };

  const nValidees = episodes.filter((e) => e.validation === 'validee').length;
  const onQueued = () => api.queue().then((list) => setQueue(list.filter((it) => it.projectId === projectId)));
  const Controls = isErea
    ? null
    : isKeurCook
      ? KeurCookAdControls
      : isKeurDeco
        ? KeurDecoAdControls
        : isKeurbook
          ? KeurbookAdControls
          : isOptiled
            ? OptiledAdControls
            : isKultiva
              ? KultivaAdControls
              : isPalabre
                ? PalabreAdControls
                : null;

  return (
    <div className="rp prep">
      <div className="rp-left">
        <Apercu project={project} episode={shown} studio={marqueProjet(project, studio)} />
        {shown && (
          <div className="rp-video-title">
            <b>{shown.title}</b>
          </div>
        )}
        {shown && (
          <div className="pp-actions">
            <EtatValidation project={project} ep={shown} onChange={loadProject} />
            {shown.renderedFile &&
              (surLeMac() ? (
                <button
                  className="clay-btn ghost small pp-ic"
                  title="Ouvrir le dossier de la vidéo"
                  aria-label="Ouvrir le dossier de la vidéo"
                  onClick={() => api.openFolder(project.id, shown.number).catch((e) => alert(e.message))}
                >
                  <Ic d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </button>
              ) : (
                <a
                  className="clay-btn ghost small pp-ic"
                  href={lienVideo(project.id, shown.renderedFile, shown.title)}
                  title="Enregistrer la vidéo"
                  aria-label="Enregistrer la vidéo"
                >
                  <Ic d="M12 4v11M7 10l5 5 5-5M5 20h14" />
                </a>
              ))}
            <button className="clay-btn ghost small pp-ic" onClick={onAdvanced} title="Retoucher : refaire une image, un clip ou une voix" aria-label="Retoucher">
              <Ic d="M4 20l4-1 11-11-3-3L5 16z" />
            </button>
            <button className="clay-btn ghost small pp-ic" onClick={() => remove(shown)} title="Supprimer cette vidéo" aria-label="Supprimer cette vidéo">
              <Ic d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
            </button>
          </div>
        )}
      </div>

      <div className="rp-right">
        <div className="pp-tete">
          <Credits />
          {isPub && (
            <button className="clay-btn ghost small" onClick={() => setPlus((x) => !x)} aria-expanded={plus}>
              {plus ? 'Fermer' : '⋯ Plus'}
            </button>
          )}
        </div>

        {isPub && plus && (
          <div className="pp-plus">
            <ScreenshotsPanel project={project} projectId={projectId} busy={false} onRefresh={loadProject} />
            <div className="clay-block pp-boutiques">
              <h3>Badges en fin de pub</h3>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <CasesBoutiques project={project} onChange={loadProject} />
              </div>
            </div>
          </div>
        )}

        <SitePubControls projectId={projectId} onQueued={onQueued} />
        {isErea ? (
          <EreaAdControls projectId={projectId} project={project} onQueued={onQueued} />
        ) : Controls ? (
          <Controls projectId={projectId} onQueued={onQueued} />
        ) : (
          <div className="clay-block">
            <h3>{isPub ? 'Nouvelle pub' : `Nouvelle vidéo — ${project.title}`}</h3>
            {ideas.length > 0 && (
              <select className="rp-input" value={idea} onChange={(e) => setIdea(e.target.value)}>
                {ideas.map((t, i) => (
                  <option key={i} value={t}>
                    {i + 1}. {t}
                  </option>
                ))}
              </select>
            )}
            {ideasBusy && <p className="clay-muted small">Claude prépare des idées…</p>}
            <input
              className="rp-input"
              value={custom}
              placeholder={isPub ? 'ou écris ton propre angle…' : 'ou écris ton propre sujet…'}
              onChange={(e) => setCustom(e.target.value)}
            />
            <button className="clay-btn rp-generate" disabled={subject.trim().length < 5} onClick={generate}>
              {isPub ? 'Générer la pub' : 'Générer la vidéo'}
            </button>
            <button className="clay-btn ghost small" disabled={ideasBusy} onClick={moreIdeas}>
              Autres idées
            </button>
            {error && <p className="error small">{error}</p>}
          </div>
        )}

        {(active.length > 0 || failed) && (
          <div className="pp-fab">
            {active.map((it) => (
              <div key={it.id} className="pp-fab-ligne">
                <div className="rp-job-head">
                  <span>
                    <b>{it.status === 'running' ? 'En fabrication' : 'En attente'}</b> · {it.label}
                  </span>
                  <small className="clay-muted">{it.status === 'running' ? it.step || 'Démarrage…' : ''}</small>
                </div>
                {it.status === 'running' && (
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.round((it.progress || 0) * 100)}%` }} />
                  </div>
                )}
              </div>
            ))}
            {failed && active.length === 0 && (
              <p className="error small" style={{ margin: 0 }}>
                La dernière vidéo ({failed.label}) a échoué : {failed.error}{' '}
                <button
                  className="clay-btn ghost small"
                  title="Effacer ce message (la vidéo n'est pas refaite)"
                  onClick={() =>
                    api
                      .removeFromQueue(failed.id)
                      .then(() => setQueue((q) => q.filter((it) => it.id !== failed.id)))
                      .catch((err) => alert(err.message))
                  }
                >
                  Effacer
                </button>
              </p>
            )}
          </div>
        )}

        <div className="pp-pubs">
          <div className="pp-pubs-tete">
            <h3>{isPub ? 'Mes pubs' : 'Mes vidéos'}</h3>
            <div className="pp-seg" role="tablist">
              <button role="tab" aria-selected={!dossier} className={dossier ? '' : 'on'} onClick={() => setDossier(false)}>
                À valider · {episodes.length - nValidees}
              </button>
              <button role="tab" aria-selected={dossier} className={dossier ? 'on' : ''} onClick={() => setDossier(true)}>
                Validées · {nValidees}
              </button>
            </div>
          </div>
          {liste.length === 0 && (
            <p className="clay-muted small" style={{ margin: '6px 12px' }}>
              {dossier ? 'Aucune vidéo validée pour l’instant.' : 'Rien à valider. Génère une pub au-dessus.'}
            </p>
          )}
          {liste.map((ep) => (
            <button key={ep.number} type="button" className={`rp-ep${shown && shown.number === ep.number ? ' on' : ''}`} onClick={() => setSelected(ep.number)}>
              <span className="rp-ep-title">{ep.topic || ep.title}</span>
              <span className={`clay-state ${ep.validation === 'validee' ? 'ok' : ep.renderedFile ? 'run' : 'att'}`}>
                {ep.validation === 'validee' ? 'validée' : ep.renderedFile ? 'à valider' : 'à monter'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

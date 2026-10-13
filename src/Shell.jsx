// Ossature du studio, aux couleurs du Dashboard : une barre latérale
// (Publicité, Chaîne, En cours, Réglages) et une page par adresse (#/…).
// Les adresses servent aussi de liens depuis le Dashboard :
//   #/pub            → les boutons des applis
//   #/pub/erea       → la campagne d'Erea (préparée au premier clic)
//   #/keurcook       → Keur Cook : Recettes ou Publicité
//   #/recettes, #/chaine, #/encours, #/reglages, #/projet/<id>
// (#/autre, l'ancienne entrée, renvoie vers #/chaine.)
import React, { useEffect, useRef, useState } from 'react';
import { VOICES } from '../shared/catalog.js';
import { api, followJob } from './api.js';
import { ProjectView } from './ProjectView.jsx';
import { FrenchVoicesCard, AppCreate, ChannelCreate } from './App.jsx';
import { appLook, NOT_ADVERTISED } from './apps.js';
import { ComptesReseauxCard } from './ComptesReseaux.jsx';
import { ComptesTab } from './ComptesTab.jsx';
import { QueuePanel } from './QueuePanel.jsx';
import { RecipesPage } from './RecipesPage.jsx';
import { IndexationPage } from './IndexationPage.jsx';
import { AudiencePage } from './AudiencePage.jsx';
import { PlanningPage } from './PlanningPage.jsx';
import { PlansPage } from './PlansPage.jsx';
import { AdPage } from './AdPage.jsx';
import { AccueilPage } from './AccueilPage.jsx';
import { MesApplisPage, LexiquePage, useApplis } from './MesApplisPage.jsx';
import { RoutinesTab, DepotsTab } from './RoutinesTab.jsx';
import { ChainesPage, ChaineDetail, NouvelleChaine, AppliPubPage } from './ChainesPage.jsx';
import './clay.css';
import './ressort.css';
import './reglages.css';
import { useRessort, BULLES } from './ressort.js';

// ---------- Adresse (#/…) ----------
function readRoute() {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { page: parts[0] || 'accueil', arg: parts.slice(1).join('/') };
}

export function go(path) {
  window.location.hash = `#/${path}`;
}

function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const on = () => setRoute(readRoute());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

// ---------- Thème clair / sombre (comme le Dashboard) ----------
const THEME_KEY = 'drama-studio.theme';

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || 'sombre';
    } catch {
      return 'sombre';
    }
  });
  useEffect(() => {
    if (theme === 'clair') {
      document.documentElement.setAttribute('data-theme', 'clair');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // préférence non retenue : sans gravité
    }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'clair' ? 'sombre' : 'clair'))];
}

// Entrée de la barre latérale à allumer quand un projet est ouvert : les
// campagnes et les recettes (Keur Cook) relèvent de Publicité.
const sectionOfProject = (p) => (p && p.mode === 'chaine' && p.kind !== 'pub' ? 'chaine' : 'pub');

// Keur Cook a deux usages : ses recettes en vidéo, et sa pub.
const KEURCOOK_REPO = 'teiki5320/keurcook';

const NAV = [
  { id: 'accueil', icon: '⌂', label: 'Accueil', path: 'accueil' },
  { id: 'applis', icon: '📱', label: 'Mes applis', path: 'applis' },
  { id: 'pub', icon: '📣', label: 'Publicité', path: 'pub' },
  { id: 'chaine', icon: '🎥', label: 'Chaîne', path: 'chaine' },
  { id: 'indexation', icon: '🔎', label: 'Indexation', path: 'indexation' },
  { id: 'audience', icon: '📈', label: 'Audience', path: 'audience' },
  { id: 'planning', icon: '🗓️', label: 'Planning', path: 'planning' },
  { id: 'sep' },
  { id: 'encours', icon: '🏭', label: 'En cours', path: 'encours' },
  { id: 'lexique', icon: '▤', label: 'Lexique', path: 'lexique' },
  { id: 'reglages', icon: '⚙️', label: 'Réglages', path: 'reglages' },
];

function Sidebar({ active, running }) {
  return (
    <aside className="clay-side">
      <div className="clay-logo" title="Studio">🎬</div>
      {NAV.map((n) =>
        n.id === 'sep' ? (
          <div key="sep" className="clay-sep" />
        ) : (
          <a key={n.id} href={`#/${n.path}`} className={`clay-nav${active === n.id ? ' on' : ''}`}>
            <span className="clay-nav-ic">
              {n.icon}
              {n.id === 'encours' && running > 0 && <span className="clay-dot">{running}</span>}
            </span>
            {n.label}
          </a>
        ),
      )}
    </aside>
  );
}

function TopBar({ title, onBack, theme, onTheme }) {
  return (
    <header className="clay-top">
      {onBack && (
        <button className="clay-pill" onClick={onBack} title="Retour">
          ←
        </button>
      )}
      <h1>{title}</h1>
      <button className="clay-pill" onClick={onTheme} title="Thème clair / sombre">
        {theme === 'clair' ? '🌙' : '☀️'}
      </button>
    </header>
  );
}

// Suivi d'un job de création (campagne, atelier…) en plein écran.
function Waiting({ job, error, onBack }) {
  return (
    <div className="clay-wait">
      {!error && <div className="spinner" />}
      <h2>{error ? 'Ça n’a pas marché' : 'Préparation…'}</h2>
      <p className="clay-muted">{error || job?.step || 'Démarrage…'}</p>
      {!error && job?.progress != null && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${Math.round(job.progress * 100)}%` }} />
        </div>
      )}
      <button className="clay-btn ghost" onClick={onBack}>
        ← Retour
      </button>
    </div>
  );
}

// ---------- Publicité : un bouton par dépôt ----------
function PubPage({ projects, onOpenRepo }) {
  const [repos, setRepos] = useState(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  // Les mêmes applis que « Mes applis », dans le même ordre.
  const { data: applis } = useApplis();

  useEffect(() => {
    if (!applis) return;
    const ordre = applis.apps.map((a) => String(a.repo || '').toLowerCase());
    api
      .githubRepos()
      .then((d) =>
        setRepos(
          (d.repos || [])
            .filter((r) => !NOT_ADVERTISED.has(r.name.toLowerCase()) && ordre.includes(r.fullName.toLowerCase()))
            .sort((a, b) => ordre.indexOf(a.fullName.toLowerCase()) - ordre.indexOf(b.fullName.toLowerCase())),
        ),
      )
      .catch((e) => setError(e.message));
  }, [applis]);

  const campaigns = projects.filter((p) => p.kind === 'pub');
  const byRepo = (fullName) =>
    campaigns.find((p) => String(p.repo || '').toLowerCase() === fullName.toLowerCase());
  // Campagnes créées sans dépôt (un site, une fiche tapée à la main).
  const others = campaigns.filter(
    (p) => !p.repo || !(repos || []).some((r) => r.fullName.toLowerCase() === p.repo.toLowerCase()),
  );
  const count = (p) => (p ? (p.episodes || []).length : 0);
  const badge = (n) => (
    <span className={`clay-badge${n ? ' ok' : ''}`}>{n ? `${n} pub${n > 1 ? 's' : ''}` : 'aucune pub'}</span>
  );

  if (showForm) {
    return (
      <div className="clay-content">
        <button className="clay-btn ghost" onClick={() => setShowForm(false)}>
          ← Retour aux applis
        </button>
        <AppCreate
          error={formError}
          voices={VOICES}
          onSubmit={(info) =>
            onOpenRepo(null, () => api.createAdProject(info)).catch((e) => setFormError(e.message))
          }
        />
      </div>
    );
  }

  return (
    <div className="clay-content">
      {error && <p className="error">Liste GitHub illisible : {error}</p>}
      {!repos && !error && <p className="clay-muted">Chargement de tes dépôts…</p>}
      <div className="clay-grid">
        {(repos || []).map((r) => {
          const look = appLook(r.name, r.label);
          const p = byRepo(r.fullName);
          return (
            <button
              key={r.fullName}
              className="clay-tile"
              onClick={() => go(`appli/${r.name}`)}
            >
              <span className="clay-tile-ic">{look.icon}</span>
              <b>{look.name}</b>
              {badge(count(p))}
            </button>
          );
        })}
        {others.map((p) => (
          <button key={p.id} className="clay-tile" onClick={() => go(`projet/${p.id}`)}>
            <span className="clay-tile-ic">🌐</span>
            <b>{p.title}</b>
            {badge(count(p))}
          </button>
        ))}
        {repos && (
          <button className="clay-tile add" onClick={() => setShowForm(true)}>
            <span className="clay-tile-ic">➕</span>
            <b>Autre appli ou site</b>
            <span className="clay-muted small">depuis une adresse de site</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Keur Cook : ses recettes en vidéo, ou sa pub ----------
function KeurCookPage({ projects, onOpenRepo }) {
  const recettes = projects.find((p) => p.mode === 'recette');
  const pub = projects.find((p) => p.kind === 'pub' && String(p.repo || '').toLowerCase() === KEURCOOK_REPO);
  const n = (p) => (p ? (p.episodes || []).length : 0);
  return (
    <div className="clay-content">
      <div className="clay-two">
        <a className="clay-big" href="#/recettes">
          <span className="clay-big-ic">🍲</span>
          <b>Recettes</b>
          {n(recettes) ? <span>{`${n(recettes)} vidéo${n(recettes) > 1 ? 's' : ''}`}</span> : null}
        </a>
        <button className="clay-big" onClick={() => onOpenRepo(KEURCOOK_REPO)}>
          <span className="clay-big-ic">📣</span>
          <b>Publicité</b>
          {n(pub) ? <span>{`${n(pub)} pub${n(pub) > 1 ? 's' : ''}`}</span> : null}
        </button>
      </div>
    </div>
  );
}

// ---------- Chaîne : les chaînes à thème (vidéos de contenu, dramas) ----------
// En bas de l'onglet Chaîne, repliées : l'onglet montre d'abord les comptes.
function ChainesAThemes({ projects, onCreate }) {
  const [error, setError] = useState('');
  const channels = projects.filter((p) => p.mode === 'chaine' && p.kind !== 'pub');
  return (
    <details className="ch-themes">
      <summary>
        🎥 Chaînes à thème{channels.length ? ` · ${channels.length}` : ''} <small>vidéos de contenu, créées par le Studio</small>
      </summary>
      {channels.length > 0 && (
        <div className="clay-grid">
          {channels.map((p) => (
            <a key={p.id} className="clay-tile" href={`#/projet/${p.id}`}>
              <span className="clay-tile-ic">🎥</span>
              <b>{p.title}</b>
              <span className="clay-badge ok">
                {(p.episodes || []).length} vidéo{(p.episodes || []).length > 1 ? 's' : ''}
              </span>
            </a>
          ))}
        </div>
      )}
      <ChannelCreate
        error={error}
        voices={VOICES}
        onSubmit={(info) => onCreate(() => api.createChannel(info)).catch((e) => setError(e.message))}
      />
    </details>
  );
}

// ---------- Recettes : l'atelier unique, créé au premier passage ----------
function RecettesEntry({ projects, loaded, onCreate }) {
  const started = useRef(false);
  const atelier = projects.find((p) => p.mode === 'recette');
  useEffect(() => {
    if (!loaded || atelier || started.current) {
      return;
    }
    started.current = true;
    onCreate(
      () =>
        api.createRecipeStudio({
          name: 'Recettes Keur Cook',
          tone: 'chaleureux',
          targetSeconds: 60,
          narratorVoice: 'tMyQcCxfGDdIt7wJ2RQw', // Marie Alice (voix française)
        }),
      'recettes',
    );
  }, [loaded, atelier]);
  if (atelier) {
    return <RecipesPage projectId={atelier.id} />;
  }
  return <p className="clay-content clay-muted">⏳ Ouverture de l'atelier de recettes…</p>;
}

// ---------- Réglages : ma marque, voix françaises ----------
// YouTube : coller les clés du projet Google « Studio », puis se connecter.
function YoutubeCard() {
  const [etat, setEtat] = useState(null);
  const [id, setId] = useState('');
  const [secret, setSecret] = useState('');
  const [changer, setChanger] = useState(false);
  const [error, setError] = useState('');
  const load = () => api.youtube().then(setEtat).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  if (!etat) {
    return null;
  }
  return (
    <div className="rg-carte">
      <div className="rg-yt">
        <span className="rg-yt-ic">▶️</span>
        <span className="t">
          <b>YouTube</b>
          <span className={`rg-etat-txt ${etat.connecte ? 'ok' : 'none'}`}>
            <i />
            {etat.connecte ? `Connecté${etat.chaine ? ` — ${etat.chaine}` : ''}` : 'Pas connecté'}
          </span>
        </span>
      {etat.connecte ? (
        <div className="rg-actions">
          <a className="clay-btn ghost small" href="/api/youtube/connecter">
            Reconnecter
          </a>
          <button className="clay-btn ghost small" onClick={() => api.youtubeDeconnecter().then(setEtat)}>
            Déconnecter
          </button>
          <button className="clay-btn ghost small" onClick={() => setChanger(!changer)}>
            Changer les clés
          </button>
        </div>
      ) : null}
      </div>
      {etat.connecte && !changer ? null : etat.configure && !changer ? (
        <a className="clay-btn" href="/api/youtube/connecter">
          Connecter YouTube
        </a>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 560 }}>
          <input className="rp-input" placeholder="ID client (…apps.googleusercontent.com)" value={id} onChange={(e) => setId(e.target.value)} />
          <input className="rp-input" type="password" placeholder="Code secret du client" value={secret} onChange={(e) => setSecret(e.target.value)} />
          <button
            className="clay-btn"
            onClick={() =>
              api
                .youtubeCles(id, secret)
                .then((e) => {
                  setEtat(e);
                  setId('');
                  setSecret('');
                  setChanger(false);
                  setError('');
                })
                .catch((e) => setError(e.message))
            }
          >
            Enregistrer les clés
          </button>
        </div>
      )}
      {error && <p className="error small">{error}</p>}
    </div>
  );
}

const ONGLETS_REGLAGES = [
  ['marque', '🔌 Réseaux'],
  ['voix', '🎙️ Voix'],
  ['depots', '📦 Dépôts'],
  ['routines', '⏰ Routines'],
  ['comptes', '🗂️ Comptes & adresses'],
  ['reste', '📌 Reste à faire'],
];

function ReglagesPage({ arg }) {
  const [studio, setStudio] = useState(null);
  const [voices, setVoices] = useState(VOICES);
  const [onglet, setOnglet] = useState(() => {
    try {
      const o = arg || localStorage.getItem('reglages-onglet');
      return ONGLETS_REGLAGES.some(([id]) => id === o) ? o : 'marque';
    } catch {
      return 'marque';
    }
  });
  const choisirOnglet = (id) => {
    setOnglet(id);
    try {
      localStorage.setItem('reglages-onglet', id);
    } catch {}
  };
  const refreshStudio = () => api.getStudio().then(setStudio).catch(() => {});
  const refreshVoices = () => api.voices().then(setVoices).catch(() => {});
  useEffect(() => {
    refreshStudio();
    refreshVoices();
  }, []);
  // Les pastilles des onglets : routines bloquées, choses qui restent à faire.
  const [pastilles, setPastilles] = useState({});
  useEffect(() => {
    api
      .routines()
      .then((l) => setPastilles((p) => ({ ...p, routines: l.filter((r) => r.active && r.statut === 'bloquee').length })))
      .catch(() => {});
    api
      .comptes()
      .then((d) => setPastilles((p) => ({ ...p, reste: d.sections.flatMap((x) => x.lignes).filter((l) => l.etat === 'a_faire').length })))
      .catch(() => {});
  }, [onglet]);
  return (
    <div className="clay-content reglages">
      <OngletsReglages onglet={onglet} choisir={choisirOnglet} pastilles={pastilles} />
      <div key={onglet} className="rg-corps" data-sans-ressort>
        {onglet === 'comptes' || onglet === 'reste' ? (
          <ComptesTab resteSeulement={onglet === 'reste'} />
        ) : onglet === 'routines' ? (
          <RoutinesTab />
        ) : onglet === 'depots' ? (
          <DepotsTab />
        ) : onglet === 'voix' ? (
          <FrenchVoicesCard voices={voices} onChange={refreshVoices} />
        ) : (
          <>
            <YoutubeCard />
            <ComptesReseauxCard />
          </>
        )}
      </div>
    </div>
  );
}

// La barre d'onglets de Réglages : un curseur d'argile glisse en rebond
// sous l'onglet choisi (maquette « R1 Onglets »).
function OngletsReglages({ onglet, choisir, pastilles }) {
  const barre = useRef(null);
  const [curseur, setCurseur] = useState(null);
  React.useLayoutEffect(() => {
    const mesurer = () => {
      const b = barre.current?.querySelector(`[data-onglet="${onglet}"]`);
      if (b) setCurseur({ left: b.offsetLeft, top: b.offsetTop, width: b.offsetWidth, height: b.offsetHeight });
    };
    mesurer();
    window.addEventListener('resize', mesurer);
    return () => window.removeEventListener('resize', mesurer);
  }, [onglet, pastilles]);
  return (
    <div className="rg-onglets" ref={barre} role="tablist">
      {curseur ? <span className="rg-curseur" style={curseur} /> : null}
      {ONGLETS_REGLAGES.map(([id, nom]) => {
        const [ic, ...mots] = nom.split(' ');
        const n = pastilles[id];
        return (
          <button key={id} type="button" role="tab" aria-selected={onglet === id} data-onglet={id} className={`rg-onglet${onglet === id ? ' on' : ''}`} onClick={() => choisir(id)}>
            <span className="ic">{ic}</span>
            <span className="nom">{mots.join(' ')}</span>
            {n ? <span className={`rg-pastille ${id === 'routines' ? 'ko' : 'run'}`}>{n}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

// ---------- En cours : la file et les fabrications ----------
function EnCoursPage() {
  return (
    <div className="clay-content">
      <QueuePanel />
    </div>
  );
}

const TITLES = {
  accueil: 'Accueil',
  applis: 'Mes applis',
  lexique: 'Lexique',
  pub: 'Publicité',
  keurcook: '🍲 Keur Cook',
  recettes: '🍲 Recettes Keur Cook',
  chaine: 'Chaîne',
  appli: 'Publicité',
  encours: 'En cours',
  reglages: 'Réglages',
  planning: 'Planning',
  audience: 'Audience',
  indexation: 'Indexation',
};

export function Shell() {
  const route = useRoute();
  const mainRef = useRef(null);
  useRessort(mainRef, `${route.page}/${route.arg || ''}`);
  const [theme, toggleTheme] = useTheme();
  const [projects, setProjects] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [running, setRunning] = useState(0);
  const [waiting, setWaiting] = useState(null); // { job, error }

  const refresh = () =>
    api
      .listProjects()
      .then((list) => {
        setProjects(list);
        setLoaded(true);
        return list;
      })
      .catch(() => {});

  useEffect(() => {
    refresh();
  }, [route.page]);

  const project =
    route.page === 'projet' || route.page === 'avance' ? projects.find((p) => p.id === route.arg) : null;

  // Pastille « En cours » : tout ce qui se fabrique ou attend — la file
  // (en cours + en attente) et les retouches lancées à part.
  useEffect(() => {
    const tick = () =>
      Promise.all([api.queue(), api.activeJobs()])
        .then(([file, jobs]) => {
          const enFile = file.filter((it) => it.status === 'running' || it.status === 'waiting');
          const lies = new Set(file.map((it) => it.jobId).filter(Boolean));
          setRunning(enFile.length + jobs.filter((j) => !lies.has(j.id)).length);
        })
        .catch(() => {});
    tick();
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, []);

  // Lance un job de création, le suit, puis ouvre le projet obtenu.
  const runCreation = async (kickoff, destination = null) => {
    setWaiting({ job: null, error: null });
    try {
      const r = await kickoff();
      const projectId = r.projectId || (await followJob(r.jobId, (job) => setWaiting({ job, error: null }))).result?.projectId;
      await refresh();
      setWaiting(null);
      go(destination || `projet/${projectId}`);
    } catch (e) {
      setWaiting({ job: null, error: e.message });
    }
  };

  // #/pub/<dépôt> : ouvre (ou prépare) la campagne de ce dépôt.
  const openRepo = (fullName, kickoff = null) =>
    runCreation(kickoff || (() => api.adFromRepo(fullName)));

  // Ancienne adresse « Autre » (liens déjà enregistrés) → Chaîne ; un
  // atelier de recettes s'ouvre toujours sur la page Recettes.
  useEffect(() => {
    if (route.page === 'autre') {
      window.location.replace('#/chaine');
    }
    if (route.page === 'projet' && project && project.mode === 'recette') {
      window.location.replace('#/recettes');
    }
  }, [route.page, project]);

  useEffect(() => {
    if (route.page === 'pub' && route.arg) {
      const full = route.arg.includes('/') ? route.arg : `teiki5320/${route.arg}`;
      openRepo(full);
    }
  }, [route.page, route.arg]);

  const active =
    route.page === 'projet' || route.page === 'avance'
      ? sectionOfProject(project)
      : ['recettes', 'keurcook', 'appli'].includes(route.page)
        ? 'pub'
        : route.page;

  let body;
  if (waiting) {
    body = (
      <>
        <TopBar title="Préparation" theme={theme} onTheme={toggleTheme} />
        <Waiting
          job={waiting.job}
          error={waiting.error}
          onBack={() => {
            setWaiting(null);
            go(active === 'chaine' ? 'chaine' : 'pub');
          }}
        />
      </>
    );
  } else if (route.page === 'avance' && project && (project.mode === 'chaine' || project.mode === 'recette')) {
    // Retoucher une pub, une vidéo de chaîne ou une recette, plan par plan.
    body = (
      <>
        <TopBar
          title={`🔧 ${project.title}`}
          onBack={() => go(project.mode === 'recette' ? 'recettes' : `projet/${route.arg}`)}
          theme={theme}
          onTheme={toggleTheme}
        />
        <PlansPage key={route.arg} projectId={route.arg} />
      </>
    );
  } else if ((route.page === 'projet' || route.page === 'avance') && project && project.mode !== 'chaine') {
    // Ancien drama (ou projet inconnu) : l'ancienne page de production.
    body = <ProjectView key={route.arg} projectId={route.arg} onBack={() => go('pub')} />;
  } else if (route.page === 'avance') {
    // Réglages avancés d'une pub ou d'une chaîne : scènes, voix, images une par une.
    body = <ProjectView key={route.arg} projectId={route.arg} onBack={() => go(`projet/${route.arg}`)} />;
  } else if (route.page === 'projet') {
    const backTo = !project
      ? 'pub'
      : String(project.repo || '').toLowerCase() === KEURCOOK_REPO
        ? 'keurcook'
        : sectionOfProject(project);
    const look = project && project.kind === 'pub' ? appLook(String(project.repo || '').split('/')[1] || '', project.title) : null;
    body = (
      <>
        <TopBar
          title={project ? (look ? `${look.icon} ${project.title}` : `🎥 ${project.title}`) : 'Chargement…'}
          onBack={() => go(backTo)}
          theme={theme}
          onTheme={toggleTheme}
        />
        <AdPage key={route.arg} projectId={route.arg} onAdvanced={() => go(`avance/${route.arg}`)} />
      </>
    );
  } else {
    const back =
      route.page === 'recettes' || route.page === 'keurcook'
        ? () => go(route.page === 'recettes' ? 'keurcook' : 'pub')
        : route.page === 'applis' && route.arg
          ? () => go('applis')
          : route.page === 'appli'
            ? () => go('pub')
            : route.page === 'chaine' && route.arg
              ? () => window.history.back()
              : null;
    body = (
      <>
        <TopBar title={TITLES[route.page] || 'Publicité'} onBack={back} theme={theme} onTheme={toggleTheme} />
        {route.page === 'accueil' ? (
          <AccueilPage />
        ) : route.page === 'applis' ? (
          <MesApplisPage arg={route.arg} />
        ) : route.page === 'lexique' ? (
          <LexiquePage arg={route.arg} />
        ) : route.page === 'keurcook' ? (
          <KeurCookPage projects={projects} onOpenRepo={openRepo} />
        ) : route.page === 'recettes' ? (
          <RecettesEntry projects={projects} loaded={loaded} onCreate={runCreation} />
        ) : route.page === 'chaine' ? (
          !route.arg ? (
            <ChainesPage themes={<ChainesAThemes projects={projects} onCreate={runCreation} />} />
          ) : route.arg.startsWith('nouvelle') ? (
            <NouvelleChaine key={route.arg} arg={route.arg} />
          ) : (
            <ChaineDetail key={route.arg} id={route.arg} />
          )
        ) : route.page === 'appli' ? (
          <AppliPubPage
            key={route.arg}
            repo={route.arg}
            projects={projects}
            onCreerPub={() => openRepo(`teiki5320/${route.arg}`)}
          />
        ) : route.page === 'indexation' ? (
          <IndexationPage />
        ) : route.page === 'audience' ? (
          <AudiencePage />
        ) : route.page === 'planning' ? (
          <PlanningPage />
        ) : route.page === 'encours' ? (
          <EnCoursPage />
        ) : route.page === 'reglages' ? (
          <ReglagesPage key={route.arg} arg={route.arg} />
        ) : (
          <PubPage projects={projects} onOpenRepo={openRepo} />
        )}
      </>
    );
  }

  return (
    <div className="clay-shell">
      <div className="res-bulles" aria-hidden="true">
        {BULLES.map(([x, y, t, d], i) => (
          <i key={i} style={{ left: `${x}%`, top: `${y}%`, width: t, height: t, animationDuration: `${d}s`, animationDelay: `${-i * 2}s` }} />
        ))}
      </div>
      <Sidebar active={active} running={running} />
      <main className="clay-main" ref={mainRef}>{body}</main>
    </div>
  );
}

// Ossature du studio, aux couleurs du Dashboard : une barre latérale
// (Accueil, Mes applis, Publicité, Indexation, Audience, Planning, En cours,
// Réglages) et une page par adresse (#/…).
// Les adresses servent aussi de liens depuis le Dashboard :
//   #/pub            → les boutons des applis
//   #/pub/erea       → la campagne d'Erea (préparée au premier clic)
//   #/keurcook       → Keur Cook : Recettes ou Publicité
//   #/recettes, #/chaine, #/encours, #/reglages, #/projet/<id>
// (#/autre, l'ancienne entrée, renvoie vers #/chaine.)
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LogoReseau } from './LogoReseau.jsx';
import { VOICES } from '../shared/catalog.js';
import { api, followJob } from './api.js';
import { ProjectView } from './ProjectView.jsx';
import { FrenchVoicesCard, AppCreate } from './App.jsx';
import { appLook, logoAppli, NOT_ADVERTISED } from './apps.js';
import { LogoAppli } from './LogoAppli.jsx';
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
import { RoutinesTab } from './RoutinesTab.jsx';
import { ChainesPage, ChaineDetail, NouvelleChaine, AppliPubPage } from './ChainesPage.jsx';
import './clay.css';
import './ressort.css';
import './reglages.css';
import './refonte.css';
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
// (Chaîne n'a plus d'entrée à elle : tout s'allume sous Publicité.)
const sectionOfProject = () => 'pub';

// Keur Cook a deux usages : ses recettes en vidéo, et sa pub.
const KEURCOOK_REPO = 'teiki5320/keurcook';

// Icônes du menu (trait, couleur du texte) — refonte « Studio animé » du 23/10.
const ICONES = {
  accueil: <path d="M3 11l9-7 9 7v8a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z" />,
  applis: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </>
  ),
  pub: (
    <>
      <path d="M4 10v4a1 1 0 0 0 1 1h2l6 4V5L7 9H5a1 1 0 0 0-1 1z" />
      <path d="M16.5 9a4 4 0 0 1 0 6" />
      <path d="M19 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  indexation: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  audience: (
    <>
      <path d="M3 17l5-5 4 3 8-8" />
      <path d="M15 7h5v5" />
    </>
  ),
  planning: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  encours: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v5h-5" />
    </>
  ),
  reglages: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  camera: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="3" />
      <path d="M16 10l5-3v10l-5-3" />
    </>
  ),
  retour: <path d="M15 6l-6 6 6 6" />,
  soleil: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  lune: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
};

export function Icone({ id, petite = false }) {
  return (
    <svg className={`rf-ic${petite ? ' petite' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
      {ICONES[id]}
    </svg>
  );
}

// Chaîne (dans Publicité, page de chaque appli) et Lexique (lien depuis Mes
// applis) ne sont plus dans le menu ; leurs adresses marchent toujours.
const NAV = [
  { id: 'accueil', label: 'Accueil', path: 'accueil' },
  { id: 'applis', label: 'Mes applis', path: 'applis' },
  { id: 'pub', label: 'Publicité', path: 'pub' },
  { id: 'indexation', label: 'Indexation', path: 'indexation' },
  { id: 'audience', label: 'Audience', path: 'audience' },
  { id: 'planning', label: 'Planning', path: 'planning' },
  { id: 'sep' },
  { id: 'encours', label: 'En cours', path: 'encours' },
  { id: 'reglages', label: 'Réglages', path: 'reglages' },
];

// Barre latérale : un repère glisse (en ressort) sous l'entrée choisie.
// Sur téléphone, elle devient la barre d'onglets du bas (refonte.css).
function Sidebar({ active, running }) {
  const navRef = useRef(null);
  const [repere, setRepere] = useState(null);
  // Pas de glissement au tout premier placement (sinon le repère part du haut à chaque chargement).
  const [pret, setPret] = useState(false);
  useEffect(() => {
    if (!repere || pret) return undefined;
    const raf = requestAnimationFrame(() => setPret(true));
    return () => cancelAnimationFrame(raf);
  }, [repere, pret]);
  useLayoutEffect(() => {
    const placer = () => {
      const el = navRef.current?.querySelector('.clay-nav.on');
      setRepere(el ? { top: el.offsetTop, height: el.offsetHeight } : null);
    };
    placer();
    window.addEventListener('resize', placer);
    return () => window.removeEventListener('resize', placer);
  }, [active]);
  return (
    <aside className="clay-side">
      <a href="#/accueil" className="clay-logo" title="Studio">
        <span className="rf-logo-ic">
          <Icone id="camera" />
        </span>
        <span className="rf-logo-t">
          <b>Studio</b>
          <small>Jean</small>
        </span>
      </a>
      <nav ref={navRef} className="rf-nav" aria-label="Sections">
        {repere ? <span className="rf-repere" aria-hidden="true" style={{ transform: `translateY(${repere.top}px)`, height: repere.height, transition: pret ? undefined : 'none' }} /> : null}
        {NAV.map((n) =>
          n.id === 'sep' ? (
            <div key="sep" className="clay-sep" />
          ) : (
            <a
              key={n.id}
              href={`#/${n.path}`}
              className={`clay-nav${active === n.id ? ' on' : ''}`}
              aria-current={active === n.id ? 'page' : undefined}
            >
              <span className="clay-nav-ic">
                <Icone id={n.id} />
                {n.id === 'encours' && running > 0 && <span className="clay-dot">{running}</span>}
              </span>
              <span className="clay-nav-t">{n.label}</span>
            </a>
          ),
        )}
      </nav>
    </aside>
  );
}

function TopBar({ title, onBack, theme, onTheme }) {
  return (
    <header className="clay-top">
      {onBack && (
        <button className="clay-pill" onClick={onBack} title="Retour" aria-label="Retour">
          <Icone id="retour" />
        </button>
      )}
      <h1>{title}</h1>
      <button className="clay-pill" onClick={onTheme} title="Thème clair / sombre" aria-label="Thème clair ou sombre">
        <Icone id={theme === 'clair' ? 'lune' : 'soleil'} />
      </button>
    </header>
  );
}

// Petits pictos trait (Publicité, En cours, Réglages) — mêmes règles que ICONES.
const PICTOS = {
  plus: <path d="M12 5v14M5 12h14" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  chaines: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="3" />
      <path d="M16 10l5-3v10l-5-3" />
    </>
  ),
  reseaux: (
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" />
    </>
  ),
  voix: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </>
  ),
  routines: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5M9 2.5h6" />
    </>
  ),
  comptes: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M3 8l9 6 9-6" />
    </>
  ),
  fleche: <path d="M5 12h14M13 6l6 6-6 6" />,
  retour: <path d="M19 12H5M11 6l-6 6 6 6" />,
};

function Picto({ id, petite = true }) {
  return (
    <svg className={`rf-ic${petite ? ' petite' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
      {PICTOS[id]}
    </svg>
  );
}

// Suivi d'un job de création (campagne, atelier…) en plein écran.
function Waiting({ job, error, onBack }) {
  const pc = job?.progress != null ? Math.round(job.progress * 100) : null;
  return (
    <div className="clay-wait pb-attente">
      {!error && <div className="spinner" />}
      <h2>{error ? 'Ça n’a pas marché' : 'Préparation…'}</h2>
      <p className="clay-muted">{error || job?.step || 'Démarrage…'}</p>
      {!error && pc != null && (
        <div className="pb-jauge-l">
          <div className="pb-jauge">
            <div className="pb-jauge-f rayures" style={{ width: `${pc}%` }} />
          </div>
          <span className="pb-pc">{pc} %</span>
        </div>
      )}
      <button className="clay-btn ghost" onClick={onBack}>
        <Picto id="retour" /> Retour
      </button>
    </div>
  );
}

// « aujourd'hui », « hier », « il y a 4 j », puis la date.
function ilYa(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const jours = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (jours <= 0) return 'aujourd’hui';
  if (jours === 1) return 'hier';
  if (jours < 30) return `il y a ${jours} j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// Une tuile d'appli : bandeau avec le logo flouté en fond et net au centre.
function TuilePub({ nom, logo, icone, n, derniere, href, onOuvrir, onCreer }) {
  const corps = (
    <>
      <span className="pb-bandeau">
        {logo ? <img className="pb-fond" src={`/${logo}`} alt="" aria-hidden="true" /> : null}
        <span className="pb-logo">{logo ? <img src={`/${logo}`} alt="" /> : icone}</span>
        <span className="pb-nb">{n ? `${n} pub${n > 1 ? 's' : ''}` : 'aucune pub'}</span>
      </span>
      <span className="pb-txt">
        <b>{nom}</b>
        <small>{n && derniere ? `Dernière : ${derniere}` : 'Aucune pub pour l’instant'}</small>
      </span>
    </>
  );
  return (
    <div className="pb-tuile">
      {href ? (
        <a className="pb-ouvrir" href={href}>
          {corps}
        </a>
      ) : (
        <button type="button" className="pb-ouvrir" onClick={onOuvrir}>
          {corps}
        </button>
      )}
      <button type="button" className="clay-btn small pb-creer" onClick={onCreer}>
        <Picto id="plus" /> Créer une pub
      </button>
    </div>
  );
}

// ---------- Publicité : une tuile par appli ----------
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
      .catch((e) => {
        // GitHub injoignable : les applis de « Mes applis » suffisent pour
        // ouvrir leur page (le dépôt est écrit dans chaque fiche).
        setError(e.message);
        setRepos(
          applis.apps
            .filter((a) => a.repo && !NOT_ADVERTISED.has(String(a.repo).split('/')[1].toLowerCase()))
            .map((a) => ({ name: String(a.repo).split('/')[1], fullName: a.repo, label: a.name })),
        );
      });
  }, [applis]);

  const campaigns = projects.filter((p) => p.kind === 'pub');
  const byRepo = (fullName) =>
    campaigns.find((p) => String(p.repo || '').toLowerCase() === fullName.toLowerCase());
  // Campagnes créées sans dépôt (un site, une fiche tapée à la main).
  const others = campaigns.filter(
    (p) => !p.repo || !(repos || []).some((r) => r.fullName.toLowerCase() === p.repo.toLowerCase()),
  );
  const count = (p) => (p ? (p.episodes || []).length : 0);
  // « Créer une pub » : comme sur la page de l'appli (Keur Cook ouvre le choix Recettes / Publicité).
  const creer = (r) => (r.fullName.toLowerCase() === KEURCOOK_REPO ? go('keurcook') : onOpenRepo(r.fullName));

  if (showForm) {
    return (
      <div className="clay-content">
        <button className="clay-btn ghost" onClick={() => setShowForm(false)}>
          <Picto id="retour" /> Retour aux applis
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
    <div className="clay-content pb">
      <p className="pb-sous">Vidéos verticales · TikTok, YouTube Shorts, Pinterest</p>
      {error && <p className="pb-alerte">GitHub injoignable ({error}) : la liste vient de Mes applis.</p>}
      {!repos && !error && <p className="clay-muted">Chargement de tes dépôts…</p>}
      <div className="pb-grille">
        {(repos || []).map((r) => {
          const look = appLook(r.name, r.label);
          const p = byRepo(r.fullName);
          return (
            <TuilePub
              key={r.fullName}
              nom={look.name}
              logo={logoAppli(r.name)}
              icone={look.icon}
              n={count(p)}
              derniere={p ? ilYa(p.updatedAt) : ''}
              href={`#/appli/${r.name}`}
              onCreer={() => creer(r)}
            />
          );
        })}
        {others.map((p) => (
          <TuilePub
            key={p.id}
            nom={p.title}
            logo={logoAppli(p.title)}
            icone={<Picto id="globe" petite={false} />}
            n={count(p)}
            derniere={ilYa(p.updatedAt)}
            href={`#/projet/${p.id}`}
            onCreer={() => go(`projet/${p.id}`)}
          />
        ))}
      </div>
      {repos && (
        <div className="pb-autres">
          <button type="button" className="pb-ajout" onClick={() => setShowForm(true)}>
            <span className="ic">
              <Picto id="plus" petite={false} />
            </span>
            <span className="t">
              <b>Autre appli ou site</b>
              <small>depuis une adresse de site</small>
            </span>
          </button>
          {/* Les chaînes vivent dans la page de chaque appli ; la vue d'ensemble reste ici. */}
          <button type="button" className="pb-ajout" onClick={() => go('chaine')}>
            <span className="ic">
              <Picto id="chaines" petite={false} />
            </span>
            <span className="t">
              <b>Toutes les chaînes</b>
              <small>les comptes réseaux, toutes applis confondues</small>
            </span>
          </button>
        </div>
      )}
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
        <LogoReseau id="youtube" taille={44} seul />
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
  ['marque', 'Réseaux', 'reseaux'],
  ['voix', 'Voix', 'voix'],
  ['routines', 'Routines', 'routines'],
  ['comptes', 'Comptes & adresses', 'comptes'],
];

function ReglagesPage({ arg }) {
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
  const refreshVoices = () => api.voices().then(setVoices).catch(() => {});
  useEffect(() => {
    refreshVoices();
  }, []);
  // La pastille de l'onglet Routines (routines bloquées), lue une fois à
  // l'ouverture de Réglages, pas à chaque changement d'onglet. Ce qui reste à
  // faire dans Comptes & adresses est sur l'Accueil (colonne À faire).
  const [pastilles, setPastilles] = useState({});
  useEffect(() => {
    api
      .routines()
      .then((l) => setPastilles({ routines: l.filter((r) => r.active && r.statut === 'bloquee').length }))
      .catch(() => {});
  }, []);
  return (
    <div className="clay-content reglages">
      <p className="pb-sous">Réseaux, voix, routines et comptes</p>
      <OngletsReglages onglet={onglet} choisir={choisirOnglet} pastilles={pastilles} />
      <div key={onglet} className="rg-corps" data-sans-ressort>
        {onglet === 'comptes' ? (
          <ComptesTab />
        ) : onglet === 'routines' ? (
          <RoutinesTab />
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
      // Téléphone : la barre défile, l'onglet choisi reste en vue.
      const c = barre.current;
      if (b && c && c.scrollWidth > c.clientWidth) {
        c.scrollTo({ left: Math.max(0, b.offsetLeft - (c.clientWidth - b.offsetWidth) / 2), behavior: 'smooth' });
      }
    };
    mesurer();
    window.addEventListener('resize', mesurer);
    return () => window.removeEventListener('resize', mesurer);
  }, [onglet, pastilles]);
  return (
    <div className="rg-onglets" ref={barre} role="tablist">
      {curseur ? <span className="rg-curseur" style={curseur} /> : null}
      {ONGLETS_REGLAGES.map(([id, nom, picto]) => {
        const n = pastilles[id];
        return (
          <button key={id} type="button" role="tab" aria-selected={onglet === id} data-onglet={id} className={`rg-onglet${onglet === id ? ' on' : ''}`} onClick={() => choisir(id)}>
            <span className="ic">
              <Picto id={picto} />
            </span>
            <span className="nom">{nom}</span>
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
    <div className="clay-content pb-encours">
      <p className="pb-sous">Rendus Remotion, voix ElevenLabs, images OpenArt</p>
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
      : ['recettes', 'keurcook', 'appli', 'chaine'].includes(route.page)
        ? 'pub'
        : route.page === 'lexique'
          ? 'applis'
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
            go('pub');
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
        ? () => go(route.page === 'recettes' ? 'keurcook' : 'appli/keurcook')
        : route.page === 'applis' && route.arg
          ? () => go('applis')
          : route.page === 'appli'
            ? () => go('pub')
            : route.page === 'chaine' && route.arg
              ? () => window.history.back()
              : route.page === 'chaine'
                ? () => go('pub')
                : route.page === 'lexique' && !route.arg
                  ? () => go('applis')
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
            <ChainesPage />
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
            // Keur Cook : « Créer une pub » ouvre le choix Recettes / Publicité.
            onCreerPub={() =>
              `teiki5320/${route.arg}`.toLowerCase() === KEURCOOK_REPO ? go('keurcook') : openRepo(`teiki5320/${route.arg}`)
            }
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

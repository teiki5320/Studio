// Chaînes — les comptes YouTube, TikTok, Instagram et Pinterest, vus sous
// deux angles (maquette validée le 13/10) :
//  - l'onglet Chaîne : tous les comptes, avec les applis qu'ils servent, leurs
//    vidéos publiées et programmées, et un guide pour en ouvrir un nouveau ;
//  - Publicité → une appli : seulement les comptes qui servent cette appli,
//    puis ses pubs. Un compte partagé (Afrotok…) n'existe qu'une fois.
// Le Studio ne crée pas le compte chez le réseau : Jean le crée sur leur site,
// guidé pas à pas, puis le Studio l'enregistre (studio/reseaux.json).
import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { useApplis, Logo } from './MesApplisPage.jsx';
import './chaines.css';

export const RESEAUX = [
  { id: 'youtube', nom: 'YouTube', ic: '▶️', creer: 'https://www.youtube.com/create_channel', auto: true },
  { id: 'tiktok', nom: 'TikTok', ic: '🎵', creer: 'https://www.tiktok.com/signup' },
  { id: 'instagram', nom: 'Instagram', ic: '📸', creer: 'https://www.instagram.com/accounts/emailsignup/' },
  { id: 'pinterest', nom: 'Pinterest', ic: '📌', creer: 'https://www.pinterest.fr/business/create/' },
];
const reseau = (id) => RESEAUX.find((r) => r.id === id) || { id, nom: id, ic: '🌐' };
const cleAppli = (a) => String(a?.repo || '').split('/')[1]?.toLowerCase() || a?.id;
const jour = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const auj = () => new Date().toISOString().slice(0, 10);

// Les comptes et le planning, chargés ensemble.
function useChaines() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const charger = () =>
    api
      .planning()
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    charger();
  }, []);
  return { data, error, charger };
}

function chiffres(data, compte) {
  const pubs = (data.publications || []).filter((p) => p.compte === compte.id);
  return {
    publiees: pubs.filter((p) => p.publie).length,
    programmees: pubs.filter((p) => !p.publie && p.date >= auj()).length,
    pubs,
  };
}

// YouTube branché = le compte qui porte le nom de la chaîne connectée.
const publieSeul = (data, c) => c.reseau === 'youtube' && data.youtube && c.nom.toLowerCase() === String(data.youtube).toLowerCase();

function CarteCompte({ c, data, applis, sous }) {
  const r = reseau(c.reseau);
  const n = chiffres(data, c);
  const servies = applis.filter((a) => c.applis.includes(cleAppli(a)));
  return (
    <a className="ch-carte" href={`#/chaine/${c.id}`}>
      <span className="ch-ic">{r.ic}</span>
      <b>{c.nom}</b>
      <small>
        {r.nom} · {sous || (servies.length ? `sert ${servies.length} appli${servies.length > 1 ? 's' : ''}` : 'proposé par défaut')}
      </small>
      <small>
        {n.publiees} publiée{n.publiees > 1 ? 's' : ''} · {n.programmees} programmée{n.programmees > 1 ? 's' : ''}
      </small>
      <span className={`ch-etat ${publieSeul(data, c) ? 'ok' : 'main'}`}>{publieSeul(data, c) ? 'branché · publie seul' : 'publication à la main'}</span>
    </a>
  );
}

// ---------- Onglet Chaîne ----------
export function ChainesPage({ themes }) {
  const { data, error } = useChaines();
  const { data: applis } = useApplis();
  if (!data || !applis) return <div className="clay-content clay-muted">{error || 'Chargement de tes chaînes…'}</div>;
  return (
    <div className="clay-content ch">
      <div className="ch-grille">
        {data.comptes.map((c) => (
          <CarteCompte key={c.id} c={c} data={data} applis={applis.apps} />
        ))}
        <a className="ch-carte ch-ajout" href="#/chaine/nouvelle">
          <span className="ch-ic">＋</span>
          <b>Ouvrir une nouvelle chaîne</b>
          <small>YouTube, TikTok, Instagram ou Pinterest, guidé pas à pas</small>
        </a>
      </div>
      {themes}
    </div>
  );
}

// ---------- Une chaîne ----------
export function ChaineDetail({ id }) {
  const { data, error, charger } = useChaines();
  const { data: applis } = useApplis();
  const [err, setErr] = useState('');
  if (!data || !applis) return <div className="clay-content clay-muted">{error || 'Chargement…'}</div>;
  const c = data.comptes.find((x) => x.id === id);
  if (!c) return <div className="clay-content clay-muted">Cette chaîne n’existe plus.</div>;
  const r = reseau(c.reseau);
  const n = chiffres(data, c);
  const basculer = (cle) =>
    api
      .modifierCompteReseau(c.id, { applis: c.applis.includes(cle) ? c.applis.filter((x) => x !== cle) : [...c.applis, cle] })
      .then(charger)
      .catch((e) => setErr(e.message));
  const tri = [...n.pubs].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="clay-content ch">
      <div className="ch-tete">
        <span className="ch-ic grand">{r.ic}</span>
        <div className="t">
          <h2>{c.nom}</h2>
          <span>
            {r.nom} · {publieSeul(data, c) ? 'branché, le Studio publie seul' : 'le Studio prépare, tu publies à la main'}
          </span>
        </div>
        <div className="ch-chiffres">
          <span>
            <b>{n.publiees}</b> publiée{n.publiees > 1 ? 's' : ''}
          </span>
          <span>
            <b>{n.programmees}</b> programmée{n.programmees > 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="ch-bloc">
        <h3>Les applis qu’elle sert</h3>
        <p className="ch-aide">Touche une appli pour l’ajouter ou la retirer : le Planning propose cette chaîne d’office pour ses vidéos.</p>
        <div className="ch-applis">
          {applis.apps.map((a) => {
            const on = c.applis.includes(cleAppli(a));
            return (
              <button key={a.id} type="button" className={`ch-appli${on ? ' on' : ''}`} onClick={() => basculer(cleAppli(a))}>
                <Logo app={a} cls="ch-logo" />
                {a.name}
                {on ? ' ✓' : ''}
              </button>
            );
          })}
        </div>
        {err ? <p className="error small">{err}</p> : null}
      </div>
      <div className="ch-bloc">
        <h3>Ses vidéos</h3>
        {tri.length ? (
          <div className="ch-lignes">
            {tri.map((p) => (
              <div key={p.id} className="ch-ligne">
                <span className="d">{jour(p.date)}</span>
                <span className="t">{p.video?.titre || p.video?.label || `Vidéo ${p.number}`}</span>
                <span className={`ch-etat ${p.publie ? 'ok' : p.date < auj() ? 'retard' : 'main'}`}>{p.publie ? 'publiée' : p.date < auj() ? 'en retard' : 'programmée'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="ch-aide">Aucune vidéo placée sur cette chaîne pour l’instant.</p>
        )}
        <a className="clay-btn small" href="#/planning">
          🗓️ Programmer dans le Planning
        </a>
      </div>
    </div>
  );
}

// ---------- Ouvrir une nouvelle chaîne (guide) ----------
export function NouvelleChaine({ arg }) {
  const [, rInit, aInit] = String(arg || '').split('/');
  const { data: applis } = useApplis();
  const [res, setRes] = useState(rInit || '');
  const [pour, setPour] = useState(aInit ? [aInit] : []);
  const [nom, setNom] = useState('');
  const [err, setErr] = useState('');
  if (!applis) return <div className="clay-content clay-muted">Chargement…</div>;
  const r = res ? reseau(res) : null;
  const choisies = applis.apps.filter((a) => pour.includes(cleAppli(a)));
  const une = choisies.length === 1 ? choisies[0] : null;
  const adresse = une ? `${cleAppli(une)}@toakeur.com` : 'afrotok@toakeur.com';
  const enregistrer = () => {
    if (!nom.trim()) {
      setErr('Écris le nom du compte que tu viens de créer.');
      return;
    }
    api
      .ajouterCompteReseau({ reseau: res, nom: nom.trim(), applis: pour })
      .then((c) => {
        window.location.hash = `#/chaine/${c.id || ''}`;
      })
      .catch((e) => setErr(e.message));
  };
  return (
    <div className="clay-content ch">
      <div className="ch-bloc">
        <h3>1 · Sur quel réseau ?</h3>
        <div className="ch-reseaux">
          {RESEAUX.map((x) => (
            <button key={x.id} type="button" className={`ch-reseau${res === x.id ? ' on' : ''}`} onClick={() => setRes(x.id)}>
              <span className="ch-ic">{x.ic}</span>
              {x.nom}
            </button>
          ))}
        </div>
      </div>
      {r ? (
        <div className="ch-bloc">
          <h3>2 · Pour quelles applis ?</h3>
          <p className="ch-aide">Une seule appli : une chaîne à son nom. Plusieurs : une chaîne commune, comme Afrotok.</p>
          <div className="ch-applis">
            {applis.apps.map((a) => {
              const on = pour.includes(cleAppli(a));
              return (
                <button
                  key={a.id}
                  type="button"
                  className={`ch-appli${on ? ' on' : ''}`}
                  onClick={() => setPour(on ? pour.filter((x) => x !== cleAppli(a)) : [...pour, cleAppli(a)])}
                >
                  <Logo app={a} cls="ch-logo" />
                  {a.name}
                  {on ? ' ✓' : ''}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {r && pour.length ? (
        <div className="ch-bloc">
          <h3>3 · Crée le compte sur {r.nom}</h3>
          <ol className="ch-etapes">
            <li>
              Ouvre{' '}
              <a href={r.creer} target="_blank" rel="noopener noreferrer">
                la page de création {r.nom} ↗
              </a>
              .
            </li>
            <li>
              Inscris-toi avec l’adresse <b>{adresse}</b> (elle arrive dans ton Gmail).
            </li>
            <li>
              Nom conseillé : <b>{une ? une.name : 'Afrotok'}</b>
              {une?.tagline ? ` — description : « ${une.tagline} »` : ''}.
            </li>
            {r.id === 'youtube' ? <li>Pour que le Studio publie tout seul, branche ensuite la chaîne dans Réglages → Ma marque → YouTube.</li> : null}
            {r.id === 'pinterest' || r.id === 'instagram' ? <li>Choisis un compte « professionnel » : c’est gratuit et ça donne les statistiques.</li> : null}
          </ol>
        </div>
      ) : null}
      {r && pour.length ? (
        <div className="ch-bloc">
          <h3>4 · C’est créé : enregistre-le ici</h3>
          <div className="ch-form">
            <input className="rp-input" placeholder={`Nom du compte ${r.nom}, par exemple @keurcook`} value={nom} onChange={(e) => (setNom(e.target.value), setErr(''))} />
            <button type="button" className="clay-btn" onClick={enregistrer}>
              Enregistrer la chaîne
            </button>
          </div>
          {err ? <p className="error small">{err}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

// ---------- Publicité → une appli (écran intermédiaire) ----------
export function AppliPubPage({ repo, projects, onCreerPub }) {
  const { data } = useChaines();
  const { data: applis } = useApplis();
  if (!data || !applis) return <div className="clay-content clay-muted">Chargement…</div>;
  const app = applis.apps.find((a) => String(a.repo || '').toLowerCase().endsWith(`/${repo.toLowerCase()}`));
  if (!app) return <div className="clay-content clay-muted">Appli inconnue.</div>;
  const cle = cleAppli(app);
  const siennes = data.comptes.filter((c) => c.applis.includes(cle));
  const manquants = RESEAUX.filter((r) => !siennes.some((c) => c.reseau === r.id));
  const pub = projects.find((p) => p.kind === 'pub' && String(p.repo || '').toLowerCase() === String(app.repo).toLowerCase());
  const nPubs = (pub?.episodes || []).length;
  const recettes = cle === 'keurcook' ? projects.find((p) => p.mode === 'recette') : null;
  return (
    <div className="clay-content ch">
      <div className="ch-tete">
        <Logo app={app} cls="ch-logo grand" />
        <div className="t">
          <h2>{app.name}</h2>
          {app.tagline ? <span>{app.tagline}</span> : null}
        </div>
      </div>
      <h3 className="ch-sous">Ses chaînes</h3>
      <div className="ch-grille">
        {siennes.map((c) => (
          <CarteCompte key={c.id} c={c} data={data} applis={applis.apps} sous={c.applis.length > 1 ? 'partagée' : 'à son nom'} />
        ))}
        {manquants.map((r) => (
          <a key={r.id} className="ch-carte ch-ajout" href={`#/chaine/nouvelle/${r.id}/${cle}`}>
            <span className="ch-ic">{r.ic}</span>
            <b>{r.nom}</b>
            <small>Ouvrir pour {app.name}</small>
          </a>
        ))}
      </div>
      <h3 className="ch-sous">Ses vidéos</h3>
      <div className="ch-grille">
        {pub ? (
          <a className="ch-carte" href={`#/projet/${pub.id}`}>
            <span className="ch-ic">📣</span>
            <b>
              {nPubs} pub{nPubs > 1 ? 's' : ''}
            </b>
            <small>ouvrir l’atelier de pub</small>
          </a>
        ) : null}
        {recettes ? (
          <a className="ch-carte" href="#/recettes">
            <span className="ch-ic">🍲</span>
            <b>
              {(recettes.episodes || []).length} recette{(recettes.episodes || []).length > 1 ? 's' : ''}
            </b>
            <small>vidéos de recettes</small>
          </a>
        ) : null}
        <button type="button" className="ch-carte ch-ajout" onClick={onCreerPub}>
          <span className="ch-ic">＋</span>
          <b>Créer une pub</b>
          <small>ouvre la création de vidéo</small>
        </button>
      </div>
    </div>
  );
}

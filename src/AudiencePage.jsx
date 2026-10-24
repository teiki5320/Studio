// Audience des sites, lue chez Cloudflare : une période, un site (ou tous),
// les chiffres clés, l'histogramme des visiteurs jour par jour, puis les
// sites, pages, pays et sources. La liste des sites se trie en touchant le
// titre d'une colonne ; toucher un site le choisit (re-toucher : tous).
import React, { useEffect, useRef, useState } from 'react';
import { LogoAppli } from './LogoAppli.jsx';
import { api } from './api.js';

const PERIODES = [
  [7, '7 jours'],
  [30, '30 jours'],
  [90, '3 mois'],
];
const nb = (n) => Number(n || 0).toLocaleString('fr-FR');
const somme = (l, k) => l.reduce((t, x) => t + (x[k] || 0), 0);
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const calme = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const leJour = (s) => new Date(`${s}T12:00:00`);
const jourLong = (s) => {
  const d = leJour(s);
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
};
const jourCourt = (s) => s.split('-').reverse().slice(0, 2).join('/');

// Les jours de deux sites ou plus, additionnés date par date.
function cumul(sites) {
  const m = new Map();
  for (const s of sites) {
    for (const j of s.jours) {
      const x = m.get(j.date) || { date: j.date, visiteurs: 0, vues: 0 };
      x.visiteurs += j.visiteurs || 0;
      x.vues += j.vues || 0;
      m.set(j.date, x);
    }
  }
  return [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// Additionne des listes { nom, vues } (pays, sources) de plusieurs sites.
function fusion(listes) {
  const m = new Map();
  for (const l of listes) {
    for (const x of l) {
      m.set(x.nom, (m.get(x.nom) || 0) + x.vues);
    }
  }
  return [...m.entries()]
    .map(([nom, vues]) => ({ nom, vues }))
    .sort((a, b) => b.vues - a.vues)
    .slice(0, 10);
}

// Un nombre qui monte depuis zéro à l'arrivée, puis glisse vers sa nouvelle
// valeur quand la période ou le site change.
function useMonte(cible, duree = 900) {
  const [v, setV] = useState(() => (calme() ? cible : 0));
  const depuis = useRef(calme() ? cible : 0);
  useEffect(() => {
    if (calme()) {
      depuis.current = cible;
      setV(cible);
      return undefined;
    }
    const a = depuis.current;
    const t0 = performance.now();
    let image;
    const pas = (t) => {
      const k = Math.min(1, (t - t0) / duree);
      const x = a + (cible - a) * (1 - Math.pow(1 - k, 3));
      depuis.current = x;
      setV(x);
      if (k < 1) image = requestAnimationFrame(pas);
    };
    image = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(image);
  }, [cible]);
  return v;
}

// Vrai une image après l'arrivée : les barres partent de zéro et s'allongent.
function useArrive() {
  const [la, setLa] = useState(false);
  useEffect(() => {
    const i = requestAnimationFrame(() => setLa(true));
    return () => cancelAnimationFrame(i);
  }, []);
  return la;
}

function Chiffre({ lab, valeur, decimales = 0, vide, etiquette, d }) {
  const v = useMonte(vide ? 0 : valeur);
  return (
    <div className="au-carte au-chiffre au-monte" style={{ '--d': d }}>
      <div className="au-lbl">{lab}</div>
      <b className="au-gros">{vide ? '—' : v.toLocaleString('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}</b>
      {etiquette ? <span className="au-tag">{etiquette}</span> : null}
    </div>
  );
}

// Histogramme des visiteurs : une barre par jour, la dernière en accent.
// Les barres sont repérées depuis la fin : en changeant de période, les
// jours communs changent de hauteur en douceur, les nouveaux poussent.
function Barres({ jours }) {
  const [survol, setSurvol] = useState(null);
  if (!jours.length) {
    return <p className="clay-muted small">Pas encore de données sur cette période.</p>;
  }
  const n = jours.length;
  const max = Math.max(1, ...jours.map((j) => j.visiteurs));
  // Un libellé tous les `pas` jours, calé sur le dernier.
  const pas = n <= 8 ? 1 : Math.ceil(n / 7);
  const libelle = (j, i) => {
    if ((n - 1 - i) % pas) return '';
    if (n <= 8) return `${JOURS[leJour(j.date).getDay()].replace('.', '')} ${leJour(j.date).getDate()}`;
    return jourCourt(j.date);
  };
  const s = survol === null || survol >= n ? null : jours[survol];
  const gauche = s ? ((survol + 0.5) * 100) / n : 0;
  return (
    <div className={`au-histo${n > 40 ? ' serre' : n > 14 ? ' moyen' : ''}`} onMouseLeave={() => setSurvol(null)}>
      {s ? (
        <div className="au-bulle" style={{ left: `${gauche}%`, '--decal': `-${gauche}%` }}>
          <b>{nb(s.visiteurs)} visiteurs</b>
          <span>
            {jourLong(s.date)} · {nb(s.vues)} pages vues
          </span>
        </div>
      ) : null}
      <div className="au-barres">
        {jours.map((j, i) => {
          const h = j.visiteurs ? Math.max(2, (100 * j.visiteurs) / max) : 0;
          return (
            <div
              key={n - 1 - i}
              className={`au-col${i === n - 1 ? ' dernier' : ''}${survol === i ? ' survol' : ''}`}
              onMouseEnter={() => setSurvol(i)}
              onClick={() => setSurvol(survol === i ? null : i)}
              title={`${jourCourt(j.date)} : ${nb(j.visiteurs)} visiteurs`}
            >
              <div className="au-piste">
                <div className="au-barre" style={{ height: `${h}%`, '--i': Math.min(i, 40) }} />
              </div>
              <span className="au-jour">{libelle(j, i)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Liste({ titre, lignes, vide, note, couleur, d }) {
  const la = useArrive();
  const max = Math.max(1, ...lignes.map((l) => l.vues));
  return (
    <div className="au-carte au-liste au-monte" style={{ '--d': d }}>
      <div className="au-lbl">{titre}</div>
      {note ? <p className="clay-muted small au-note">{note}</p> : null}
      {lignes.length === 0 ? <p className="clay-muted small au-note">{vide}</p> : null}
      {lignes.map((l) => (
        <div key={l.nom} className="au-ligne">
          <div className="au-ligne-t">
            <span title={l.nom}>{l.nom}</span>
            <b>{nb(l.vues)}</b>
          </div>
          <span className="au-piste-h">
            <span className={`au-remplit ${couleur}`} style={{ width: la ? `${(100 * l.vues) / max}%` : 0 }} />
          </span>
        </div>
      ))}
    </div>
  );
}

function Fleche({ sens }) {
  return (
    <svg className="au-fleche" viewBox="0 0 24 24" aria-hidden="true">
      <path d={sens < 0 ? 'M12 5v14M6 13l6 6 6-6' : 'M12 19V5M6 11l6-6 6 6'} />
    </svg>
  );
}

function CleCloudflare({ onOk }) {
  const [cle, setCle] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="clay-block" style={{ maxWidth: 640 }}>
      <h3 style={{ marginTop: 0 }}>📈 Brancher Cloudflare</h3>
      <ol className="small" style={{ lineHeight: 1.6, paddingLeft: 18 }}>
        <li>dash.cloudflare.com → icône 👤 en haut à droite → Profil → Jetons d'API → Créer un jeton.</li>
        <li>Modèle « Lire les rapports d'analyse et les journaux » (Read analytics and logs) → Utiliser le modèle.</li>
        <li>Ressources de zone : toutes les zones · Ressources du compte : ton compte → Continuer → Créer le jeton.</li>
        <li>Copie le jeton et colle-le ici.</li>
      </ol>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input className="rp-input" style={{ flex: 1, minWidth: 220 }} type="password" placeholder="Jeton Cloudflare (lecture seule)" value={cle} onChange={(e) => setCle(e.target.value)} />
        <button
          className="clay-btn"
          onClick={() =>
            api
              .cloudflareCle(cle)
              .then(onOk)
              .catch((e) => setError(e.message))
          }
        >
          Enregistrer
        </button>
      </div>
      {error && <p className="error small">{error}</p>}
    </div>
  );
}

function ListeSites({ lignes, tri, setTri, site, setSite }) {
  const la = useArrive();
  const [col, sens] = tri;
  const max = Math.max(1, ...lignes.map((l) => l.visiteurs));
  const entete = (k, nom, cls) => (
    <button type="button" className={`au-tri ${cls}${col === k ? ' on' : ''}`} onClick={() => setTri([k, col === k ? -sens : -1])}>
      {nom}
      {col === k ? <Fleche sens={sens} /> : null}
    </button>
  );
  return (
    <div className="au-carte au-sites au-monte" style={{ '--d': '.22s' }}>
      <div className="au-site au-site-tete">
        {entete('nom', 'Site', 'a-nom')}
        {entete('visiteurs', 'Visiteurs', 'a-vis')}
        {entete('vues', 'Pages vues', 'a-vues')}
        {entete('source', 'Mesure', 'a-mes')}
      </div>
      {lignes.map((l) => (
        <button type="button" key={l.nom} className={`au-site${site === l.nom ? ' on' : ''}`} onClick={() => setSite(site === l.nom ? 'tous' : l.nom)} aria-pressed={site === l.nom}>
          <span className="a-logo">
            <LogoAppli de={l.nom} taille={28} seul />
          </span>
          <span className="a-nom">{l.nom}</span>
          <span className="a-barre">
            <span className="au-piste-h">
              <span className="au-remplit accent" style={{ width: la ? `${(100 * l.visiteurs) / max}%` : 0 }} />
            </span>
          </span>
          <b className="a-vis">{nb(l.visiteurs)}</b>
          <span className="a-vues">
            {l.source === 'Domaine' && !l.vues ? '—' : nb(l.vues)}
            <small> pages vues</small>
          </span>
          <span className="a-mes">
            <span className={`au-tag${l.source === 'Domaine' ? '' : ' ok'}`}>{l.source}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function AudiencePage() {
  const [jours, setJours] = useState(30);
  const [data, setData] = useState(null);
  const [site, setSite] = useState('tous');
  const [tri, setTri] = useState(['visiteurs', -1]);
  const [error, setError] = useState('');
  const load = () => {
    setError('');
    return api
      .audience(jours)
      .then(setData)
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    load();
  }, [jours]);

  if (!data) {
    return <div className="clay-content clay-muted">{error || 'Chargement de l’audience…'}</div>;
  }
  if (!data.configure) {
    return (
      <div className="clay-content">
        <CleCloudflare onOk={load} />
      </div>
    );
  }

  const lignes = data.sites.map((s) => ({
    nom: s.nom,
    source: s.source,
    visiteurs: somme(s.jours, 'visiteurs'),
    vues: somme(s.jours, 'vues'),
  }));
  const [col, sens] = tri;
  lignes.sort((a, b) => (typeof a[col] === 'string' ? a[col].localeCompare(b[col]) : a[col] - b[col]) * sens);
  const choisis = site === 'tous' ? data.sites : data.sites.filter((s) => s.nom === site);
  const parJour = cumul(choisis);
  const visiteurs = somme(parJour, 'visiteurs');
  const vues = somme(parJour, 'vues');
  const meilleur = parJour.reduce((m, j) => (!m || j.visiteurs > m.visiteurs ? j : m), null);
  const nWa = data.sites.filter((s) => s.source !== 'Domaine').length;
  const nDom = data.sites.length - nWa;
  const sousTitre = nWa
    ? `Cloudflare Web Analytics · ${pluriel(nWa, 'site')}${nDom ? ` + ${pluriel(nDom, 'domaine')}` : ''}`
    : `Cloudflare · ${pluriel(nDom, 'domaine')}`;
  const periode = PERIODES.find(([n]) => n === jours)?.[1] || `${jours} jours`;

  return (
    <div className="clay-content au-page" data-sans-ressort="">
      <div className="au-tete au-monte">
        <div className="au-sous">
          {sousTitre}
          <span className="au-point" aria-hidden="true" />
          {periode}
        </div>
        <div className="au-reglages">
          <select className="au-select" value={site} onChange={(e) => setSite(e.target.value)} aria-label="Site">
            <option value="tous">Tous les sites</option>
            {data.sites.map((s) => (
              <option key={s.nom} value={s.nom}>
                {s.nom}
              </option>
            ))}
          </select>
          <div className="au-segments" role="group" aria-label="Période">
            {PERIODES.map(([n, nom]) => (
              <button key={n} type="button" className={jours === n ? 'on' : ''} aria-pressed={jours === n} onClick={() => setJours(n)}>
                {nom}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="au-chiffres">
        <Chiffre lab="Visiteurs" valeur={visiteurs} etiquette={parJour.length ? `≈ ${nb(Math.round(visiteurs / parJour.length))} / jour` : null} d=".04s" />
        <Chiffre lab="Pages vues" valeur={vues} vide={!vues} etiquette={vues ? null : 'Avec la mesure Web Analytics'} d=".08s" />
        <Chiffre lab="Pages par visite" valeur={visiteurs ? vues / visiteurs : 0} decimales={1} vide={!vues || !visiteurs} d=".12s" />
        <Chiffre lab="Meilleur jour" valeur={meilleur?.visiteurs || 0} vide={!meilleur} etiquette={meilleur ? jourLong(meilleur.date) : null} d=".16s" />
      </div>

      <div className="au-carte au-graphe au-monte" style={{ '--d': '.15s' }}>
        <div className="au-graphe-t">
          <h2>
            Visiteurs
            <span>{site === 'tous' ? 'Tous les sites' : site}</span>
          </h2>
          <small>{parJour.length ? `max ${nb(Math.max(...parJour.map((j) => j.visiteurs)))} / jour` : ''}</small>
        </div>
        <Barres jours={parJour} />
      </div>

      <ListeSites lignes={lignes} tri={tri} setTri={setTri} site={site} setSite={setSite} />

      <div className="au-trio">
        <Liste
          titre="Pages les plus vues"
          couleur="accent"
          d=".26s"
          vide="Visible avec la mesure Web Analytics."
          lignes={fusion(choisis.map((s) => (site === 'tous' ? s.pages.map((p) => ({ ...p, nom: `${s.nom}${p.nom}` })) : s.pages)))}
        />
        <Liste
          titre="Pays"
          couleur="ok"
          d=".3s"
          vide="Pas de données."
          note={choisis.some((s) => s.source === 'Domaine') ? 'Fichiers chargés depuis chaque pays (pages, images, robots compris) : pas des visiteurs.' : null}
          lignes={fusion(choisis.map((s) => s.pays))}
        />
        <Liste titre="D’où ils viennent" couleur="ok" d=".34s" vide="Visible avec la mesure Web Analytics." lignes={fusion(choisis.map((s) => s.sources))} />
      </div>
      {(data.erreurs || []).length > 0 && <p className="clay-muted small">⚠️ {data.erreurs.join(' · ')}</p>}
      {error && <p className="error small">{error}</p>}
    </div>
  );
}

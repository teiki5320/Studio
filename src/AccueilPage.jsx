// Accueil du Studio — maquette « Trois mini-cartes » (n° 11, validée le 23/10,
// artifact GhbQgaord7pgJWkq3Qb19x). En haut, discrets : trois mini-cartes
// Agenda, Mails et État ; un clic déplie le détail juste dessous (un seul à
// la fois). En dessous, deux colonnes : « À décider » (Oui / Non) et
// « À faire » (graves d'abord), réglables d'ici comme dans le bloc À faire.
// Agenda et mails viennent du Point du matin (7 h) ; l'état, des fiches des
// applis (trois témoins : Code, Fiche, En ligne / Store).
import React, { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { useApplis, estSite, ciInfo, ageFiches, FICHE_PERIMEE_JOURS, Logo } from './MesApplisPage.jsx';
import { LogoAppli } from './LogoAppli.jsx';
import { Ligne, ouvert as estOuvert } from './AFaire.jsx';
import './accueil.css';
import './afaire.css';
import './point.css';

const nb = (n) => Number(n || 0).toLocaleString('fr-FR');
const COULEUR = { ok: 'var(--ok)', run: 'var(--run)', ko: 'var(--ko)', none: 'var(--none)' };

// Un nombre qui monte depuis zéro.
function Compte({ n, delai = 0 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setV(n);
      return undefined;
    }
    let raf;
    const debut = performance.now() + 120 + delai;
    const pas = (t) => {
      const p = Math.max(0, Math.min(1, (t - debut) / 1400));
      setV(Math.round(n * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  return nb(v);
}

function Courbe({ jours }) {
  if (!jours?.length) return null;
  const max = Math.max(1, ...jours.map((j) => j.n));
  const pts = jours.map((j, i) => `${i ? 'L' : 'M'}${(2 + (96 * i) / Math.max(1, jours.length - 1)).toFixed(1)} ${(18 - (16 * j.n) / max).toFixed(1)}`);
  return (
    <svg className="ac-courbe" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
      <path className="trait" stroke="var(--peach-ink)" d={pts.join(' ')} />
    </svg>
  );
}

// « Fraîcheur des infos » : chaque source, sa dernière mise à jour, et en
// rouge si elle a cessé de se mettre à jour (ou signale une erreur).
const depuis = (iso) => {
  if (!iso) return 'jamais';
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 2) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 36) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
};
function Fraicheur({ liste }) {
  if (!liste?.length) return null;
  const etat = (f) => (f.erreur || !f.le ? 'ko' : (Date.now() - new Date(f.le).getTime()) / 3600000 > f.seuilH ? 'ko' : 'ok');
  const enRetard = liste.filter((f) => etat(f) === 'ko').length;
  return (
    <div className="ac-fraicheur">
      <span className="ac-sstitre">
        Fraîcheur des infos {enRetard ? <b className="chaud">· {enRetard} à regarder</b> : <b className="frais">· tout est à jour</b>}
      </span>
      <div className="ac-fr-liste">
        {liste.map((f) => (
          <a key={f.cle} className={`ac-fr ${etat(f)}`} href={f.lien} title={f.erreur || (f.le ? new Date(f.le).toLocaleString('fr-FR') : 'aucune mise à jour connue')}>
            <span className="ic">{f.ic}</span>
            <span className="t">
              <b>{f.nom}</b>
              <small>{f.erreur || depuis(f.le)}</small>
            </span>
            <i />
          </a>
        ))}
      </div>
    </div>
  );
}

const ilYa = (iso) => {
  if (!iso) return '';
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return j <= 0 ? "envoyé aujourd'hui" : j === 1 ? 'envoyé hier' : `envoyé il y a ${j} j`;
};

// Les trois témoins d'une app : [couleur, raison].
function temoins(app, site) {
  const c = ciInfo(app);
  const code = [c.k === 'run' ? 'run' : c.k, `Code : ${c.label.toLowerCase()}${c.dateLong ? ` (${c.dateLong})` : ''}${c.enCours ? ' · revérification en cours' : ''}`];
  const age = ageFiches(app);
  const fiche = age === null ? ['none', 'Fiche sans date'] : [age > FICHE_PERIMEE_JOURS ? 'run' : 'ok', age > FICHE_PERIMEE_JOURS ? `Fiche figée depuis ${age} jours` : `Fiche de ${age} jour${age > 1 ? 's' : ''}`];
  let enLigne;
  if (estSite(app)) {
    enLigne = !site
      ? ['none', 'Adresse du site inconnue']
      : site.etat === 'ok'
        ? ['ok', `${site.url.replace(/^https?:\/\/(www\.)?/, '')} répond`]
        : site.etat === 'ko'
          ? ['ko', `${site.url.replace(/^https?:\/\/(www\.)?/, '')} répond en erreur (${site.code})`]
          : ['none', `${site.url.replace(/^https?:\/\/(www\.)?/, '')} : non vérifiable pour l'instant`];
  } else {
    const etats = (app.publicationPlateformes || [])
      .filter((p) => !/^web/i.test(p.titre))
      .map((p) => [p.titre, p.faits.find((f) => /^[ée]tat$/i.test(f.label.trim()))?.value || '']);
    // « en pause » : une décision en suspens (sur l'Accueil, À décider), pas une panne → gris.
    const k = (v) => (/en pause/i.test(v) ? 'none' : /en ligne|publi[ée]e|disponible/i.test(v) ? 'ok' : /bloqu|rejet|refus/i.test(v) ? 'ko' : /test|en cours|revue|examen/i.test(v) ? 'run' : 'none');
    const ks = etats.map(([, v]) => k(v));
    const pire = ks.includes('ok') ? 'ok' : ks.includes('ko') ? 'ko' : ks.includes('run') ? 'run' : 'none';
    enLigne = [pire, etats.length ? etats.map(([t, v]) => `${t} : ${v || 'non renseigné'}`).join('\n') : 'Aucune boutique renseignée'];
  }
  return [
    ['Code', ...code],
    ['Fiche', ...fiche],
    [estSite(app) ? 'En ligne' : 'Store', ...enLigne],
  ];
}

function Encart({ app, site, envoi, delai }) {
  return (
    <a className="ac-e2 anim" style={{ animationDelay: `${delai}s` }} href={`#/applis/${app.id}`}>
      <span className="haut">
        <span className="ic">
          <Logo app={app} cls="ic-in" />
        </span>
        <span className="t">
          <b>{app.name}</b>
          <small>{ilYa(envoi)}</small>
        </span>
      </span>
      <span className="temoins">
        {temoins(app, site).map(([nom, k, raison]) => (
          <span key={nom} className="tm" title={raison}>
            <i className={k === 'ko' ? 'battant' : ''} style={{ background: COULEUR[k] }} />
            <span>{nom}</span>
          </span>
        ))}
      </span>
    </a>
  );
}

// Raccourcis vers les sites de travail, en trois menus déroulants (choix de
// Jean, 16/10) : code et Google, Apple, création et réseaux.
const LIENS = [
  [
    '🛠️ Code & Google',
    [
      ['GitHub', 'https://github.com/teiki5320'],
      ['Cloudflare', 'https://dash.cloudflare.com'],
      ['Google Search Console', 'https://search.google.com/search-console'],
      ['Google AdSense', 'https://adsense.google.com'],
      ['Google AdMob', 'https://admob.google.com'],
      ['Google Play Console', 'https://play.google.com/console'],
      ['Google Cloud Console', 'https://console.cloud.google.com'],
      ['Amazon Partenaires', 'https://partenaires.amazon.fr'],
    ],
  ],
  [
    '🍎 Apple',
    [
      ['App Store Connect', 'https://appstoreconnect.apple.com'],
      ['Apple Developer', 'https://developer.apple.com/account'],
    ],
  ],
  [
    '🎨 Création & réseaux',
    [
      ['OpenArt', 'https://openart.ai'],
      ['ElevenLabs', 'https://elevenlabs.io/app'],
      ['YouTube Studio', 'https://studio.youtube.com'],
      ['TikTok Studio', 'https://www.tiktok.com/tiktokstudio'],
      ['Pinterest', 'https://fr.pinterest.com'],
    ],
  ],
];
function LiensMenus() {
  const [ouvert, setOuvert] = useState(null);
  useEffect(() => {
    if (ouvert === null) return undefined;
    const fermer = (e) => !e.target.closest('.ac-liens') && setOuvert(null);
    document.addEventListener('pointerdown', fermer);
    return () => document.removeEventListener('pointerdown', fermer);
  }, [ouvert]);
  return (
    <div className="ac-liens">
      {LIENS.map(([titre, liens], i) => (
        <div key={titre} className={`ac-lien-menu${ouvert === i ? ' ouvert' : ''}`}>
          <button type="button" className="clay-btn ghost small" onClick={() => setOuvert(ouvert === i ? null : i)}>
            {titre} <span className="fl">▾</span>
          </button>
          {ouvert === i ? (
            <div className="ac-lien-liste">
              {liens.map(([nom, url]) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" onClick={() => setOuvert(null)}>
                  {nom} <span>↗</span>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ---------- Mini-cartes Agenda · Mails · État ----------

// « 14:00 », « 14h », « 9 h 30 » → minutes depuis minuit (null si illisible).
const minutes = (h) => {
  const m = String(h || '').match(/(\d{1,2})\s*[h:.]\s*(\d{2})?/i);
  return m ? Number(m[1]) * 60 + Number(m[2] || 0) : null;
};
const minutesMaintenant = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};
const dans = (min) => (min < 60 ? `dans ${min} min` : `dans ${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, '0')}` : ''}`);
const aujourdhui = () => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date());
const nombre = (g) => Number.parseInt(g.nombre, 10) || 0;

const ICONES = {
  agenda: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  mails: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  ),
  etat: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l4 4 10-10" />
    </svg>
  ),
};

function Mini({ id, ouvert, onBasculer, valeur, sous }) {
  const actif = ouvert === id;
  return (
    <button type="button" className={`ac-mini ${id}${actif ? ' on' : ''}`} aria-expanded={actif} onClick={() => onBasculer(actif ? null : id)}>
      <span className="ic">{ICONES[id]}</span>
      <span className="t">
        <b>{valeur}</b>
        <small>{sous}</small>
      </span>
      <span className="fl" aria-hidden="true">
        ▾
      </span>
    </button>
  );
}

function PanneauAgenda({ agenda, maintenant, ancien }) {
  if (!agenda) return <p className="pm-vide">Pas encore d’agenda : il arrive avec le Point du matin, à 7 h.</p>;
  const lignes = agenda.lignes || [];
  return (
    <div className="ac-pan-liste">
      {ancien ? <p className="pm-vide">⚠️ Agenda d’un jour précédent (le point du jour n’est pas encore arrivé).</p> : null}
      {agenda.erreur ? <p className="pm-vide">{agenda.erreur}</p> : null}
      {lignes.length ? (
        lignes.map((l, i) => {
          const m = minutes(l.heure);
          const passe = !ancien && m !== null && m < maintenant;
          return (
            <div key={i} className={`ac-rdv${passe ? ' passe' : ''}`}>
              <b>{l.heure}</b>
              <span>
                {l.titre}
                {l.lieu ? <small> · {l.lieu}</small> : null}
              </span>
            </div>
          );
        })
      ) : (
        <p className="pm-vide">Aucun rendez-vous aujourd’hui.</p>
      )}
      {agenda.demain ? (
        <div className="ac-rdv demain">
          <b>Demain</b>
          <span>{agenda.demain}</span>
        </div>
      ) : null}
    </div>
  );
}

// Les mails cochés partent dans la file commune ; la routine « Sites du jour »
// (5 h 05) les met à la corbeille (récupérables 30 jours).
function PanneauMails({ mails, onCorbeille }) {
  const [coches, setCoches] = useState([]);
  if (!mails) return <p className="pm-vide">Pas encore de tri des mails : il arrive avec le Point du matin, à 7 h.</p>;
  const groupes = (mails.groupes || []).filter((g) => !g.protege);
  const proteges = (mails.groupes || []).filter((g) => g.protege);
  const basculer = (id) => setCoches((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const total = groupes.filter((g) => coches.includes(g.id)).reduce((t, g) => t + nombre(g), 0);
  return (
    <div className="ac-pan-liste">
      {mails.erreur ? <p className="pm-vide">{mails.erreur}</p> : null}
      {!groupes.length ? <p className="pm-vide">Rien à trier : {mails.total ?? 0} mails en boîte.</p> : null}
      {groupes.map((g) => (
        <label key={g.id} className={`ac-mail${g.etat ? ` ${g.etat}` : ''}`}>
          <input type="checkbox" disabled={Boolean(g.etat)} checked={coches.includes(g.id) || Boolean(g.etat)} onChange={() => basculer(g.id)} />
          <span className="nom">
            {g.nom}
            {g.objet ? <small> · {g.objet}</small> : null}
            {g.etat === 'demande' ? <small> · ⏳ à la corbeille demain matin</small> : g.etat === 'fait' ? <small> · ✅ à la corbeille</small> : g.etat === 'bloque' ? <small> · ❌ échec</small> : null}
          </span>
          <b>{g.nombre}</b>
        </label>
      ))}
      <div className="ac-pan-pied">
        {groupes.some((g) => !g.etat) ? (
          <button
            type="button"
            className="clay-btn small"
            disabled={!coches.length}
            onClick={() => {
              onCorbeille(coches);
              setCoches([]);
            }}
          >
            🗑️ Corbeille{coches.length ? ` (${total || coches.length})` : ''}
          </button>
        ) : null}
        {proteges.length ? <small>À garder : {proteges.map((g) => `${g.nom} ${g.nombre}`).join(' · ')}</small> : null}
        <small>{mails.total ?? '…'} en boîte · rien n’est supprimé pour de bon.</small>
      </div>
    </div>
  );
}

// Le pire des trois témoins d'une app.
const pire = (app, site) => {
  const ks = temoins(app, site).map(([, k]) => k);
  return ks.includes('ko') ? 'ko' : ks.includes('run') ? 'run' : ks.includes('none') ? 'none' : 'ok';
};

function PanneauEtat({ apps, ext }) {
  const c = ext?.compteurs || {};
  const perimees = apps.filter((a) => (ageFiches(a) ?? 0) > FICHE_PERIMEE_JOURS).length;
  const ouverts = apps.reduce((t, a) => t + (a.marketingSummary?.done || 0), 0);
  const canaux = ouverts + apps.reduce((t, a) => t + (a.marketingSummary?.todo || 0), 0);
  const envoi = (a) => ext?.envois?.[String(a.repo || '').toLowerCase()];
  const groupes = [
    ['Applis', apps.filter((a) => !estSite(a))],
    ['Sites', apps.filter(estSite)],
  ];
  const raccourcis = [
    ['#/pub', '📣', c.videosHier, 'vidéos prêtes'],
    ['#/indexation', '🔎', c.indexation, 'à régler sur Google'],
    ['#/planning', '🗓️', c.programmees, 'programmées'],
    ['#/encours', '🏭', c.enCours, 'en cours'],
    ['#/reglages/routines', '⏰', c.routinesDuJour, c.routinesBloquees ? `tâches · ${c.routinesBloquees} bloquée${c.routinesBloquees > 1 ? 's' : ''}` : 'tâches aujourd’hui'],
  ];
  return (
    <div className="ac-etat">
      <div className="ac-chiffres">
        <a className="gc" href="#/applis">
          <span className="lab">Fiches</span>
          <b>{nb(perimees)}</b>
          <span className={`var${perimees ? ' chaud' : ''}`}>à rafraîchir</span>
        </a>
        <a className="gc" href="#/applis">
          <span className="lab">Canaux</span>
          <b>{nb(ouverts)}</b>
          <span className="var">ouverts sur {canaux}</span>
        </a>
        <a className="gc" href="#/indexation">
          <span className="lab">Google</span>
          <b>{ext?.compteurs ? nb(c.pagesGoogle) : '—'}</b>
          <span className="var">pages sur {nb(c.pagesTotal)}</span>
        </a>
        <a className="gc cb" href="#/audience">
          <span className="lab">Visiteurs 7 j</span>
          <b>{ext?.vues ? nb(ext.vues.total) : '—'}</b>
          <Courbe jours={ext?.vues?.jours} />
        </a>
      </div>
      <div className="ac-raccourcis">
        {raccourcis.map(([href, ic, n, lab]) => (
          <a key={href} className="rc" href={href}>
            <span className="ic">{ic}</span>
            <b className={href.includes('routines') && c.routinesBloquees ? 'chaud' : ''}>{ext ? nb(n) : '…'}</b>
            <span className="lab">{lab}</span>
          </a>
        ))}
      </div>
      {groupes.map(([titre, liste]) =>
        liste.length ? (
          <React.Fragment key={titre}>
            <span className="ac-sstitre">{titre}</span>
            <div className="ac-encarts">
              {liste.map((a) => (
                <Encart key={a.id} app={a} site={ext?.sites?.[a.id]} envoi={envoi(a)} delai={0} />
              ))}
            </div>
          </React.Fragment>
        ) : null,
      )}
      <Fraicheur liste={ext?.fraicheur} />
      <div className="ac-legende">
        <span>
          <i style={{ background: 'var(--ok)' }} />
          tout va
        </span>
        <span>
          <i style={{ background: 'var(--run)' }} />à surveiller
        </span>
        <span>
          <i style={{ background: 'var(--ko)' }} />
          bloqué
        </span>
        <span>
          <i style={{ background: 'var(--none)' }} />
          rien encore
        </span>
      </div>
    </div>
  );
}

// ---------- Deux colonnes : À décider · À faire ----------

const RANG_TACHE = (e) => (e.etat === 'bloque' ? 0 : e.grave ? 1 : e.etat === 'envoye' || e.etat === 'attente' ? 3 : 2);
const MAX_TACHES = 8;

function Tache({ e, onAgir }) {
  return (
    <div className="ac-tache">
      <span className="ac-logo">
        <LogoAppli de={e.site} taille={28} seul />
      </span>
      <Ligne e={e} onAgir={onAgir} avecSite />
    </div>
  );
}

export function AccueilPage() {
  const { data, error } = useApplis();
  const [ext, setExt] = useState(null);
  const [point, setPoint] = useState(undefined);
  const [af, setAf] = useState(null);
  const [erreur, setErreur] = useState('');
  const [ouvert, setOuvert] = useState(null);
  const [toutVoir, setToutVoir] = useState(false);
  const [voirFaits, setVoirFaits] = useState(false);
  const [maintenant, setMaintenant] = useState(minutesMaintenant);
  const deja = useRef(false);
  const chargerAf = () =>
    api
      .afaire()
      .then((d) => {
        setAf(d);
        setErreur('');
      })
      .catch((e) => setErreur(e.message));
  useEffect(() => {
    if (deja.current) return;
    deja.current = true;
    api
      .accueil()
      .then(setExt)
      .catch(() => setExt({}));
    api
      .point()
      .then(setPoint)
      .catch(() => setPoint(null));
    chargerAf();
  }, []);
  useEffect(() => {
    const t = setInterval(() => setMaintenant(minutesMaintenant()), 60000);
    return () => clearInterval(t);
  }, []);
  if (!data) return <div className="clay-content clay-muted">{error || 'Chargement…'}</div>;

  const apps = data.apps;
  const jour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const ancien = Boolean(point) && point.date !== aujourdhui();

  // Agenda
  const lignes = point?.agenda?.lignes || [];
  const aVenir = ancien ? [] : lignes.filter((l) => (minutes(l.heure) ?? -1) >= maintenant);
  const prochain = aVenir[0];
  const agendaV = point === undefined ? '…' : prochain ? prochain.heure : lignes.length && !ancien ? 'Journée finie' : 'Libre';
  const agendaS =
    point === undefined
      ? 'chargement'
      : !point?.agenda
        ? 'point du matin à 7 h'
        : ancien
          ? 'agenda d’un jour précédent'
          : prochain
            ? `${prochain.titre} · ${dans(minutes(prochain.heure) - maintenant)}${aVenir.length > 1 ? ` · +${aVenir.length - 1}` : ''}`
            : lignes.length
              ? `${lignes.length} rendez-vous passé${lignes.length > 1 ? 's' : ''}`
              : 'aucun rendez-vous aujourd’hui';

  // Mails
  const gm = point?.mails?.groupes || [];
  const aTrier = gm.filter((g) => !g.protege && !g.etat);
  const enFile = gm.filter((g) => g.etat === 'demande');
  const nMails = aTrier.reduce((t, g) => t + nombre(g), 0);
  const mailsV = point === undefined ? '…' : aTrier.length ? (nMails ? `${nb(nMails)} mails` : `${aTrier.length} groupes`) : 'Rien à trier';
  const mailsS = !point?.mails
    ? 'point du matin à 7 h'
    : aTrier.length
      ? `${aTrier.length} expéditeur${aTrier.length > 1 ? 's' : ''} à trier${enFile.length ? ` · ${enFile.length} en file` : ''}`
      : enFile.length
        ? `⏳ ${enFile.length} groupe${enFile.length > 1 ? 's' : ''} à la corbeille demain`
        : `${point.mails.total ?? '—'} en boîte`;

  // État
  const pires = apps.map((a) => [a, pire(a, ext?.sites?.[a.id])]);
  // « Au vert » : rien de rouge ni d'orange (un témoin gris = rien encore, pas un souci).
  const aVoir = pires.filter(([, k]) => k === 'ko' || k === 'run');
  const vert = apps.length - aVoir.length;
  const etatS = aVoir.length
    ? `${aVoir
        .slice(0, 3)
        .map(([a]) => a.name)
        .join(' · ')}${aVoir.length > 3 ? ` +${aVoir.length - 3}` : ''} à voir`
    : 'tout va';

  // À décider · À faire
  const elements = af?.elements || [];
  const decisions = elements.filter((e) => e.type === 'decision' && e.etat !== 'fait');
  const taches = elements.filter((e) => e.type !== 'decision' && e.etat !== 'fait').sort((a, b) => RANG_TACHE(a) - RANG_TACHE(b));
  const listeFaits = elements.filter((e) => e.etat === 'fait');
  const faits = listeFaits.length;
  const visibles = toutVoir ? taches : taches.slice(0, MAX_TACHES);
  const onAgir = (f) =>
    f()
      .catch((e) => setErreur(e.message))
      .then(chargerAf);

  return (
    <div className="clay-content accueil">
      <div className="ac-haut">
        <div className="ac-salut anim">
          <div className="jour">
            {jour}
            {point?.pretLe && !ancien ? ` · point prêt à ${new Date(point.pretLe).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}
          </div>
          <h3>Bonjour Jean</h3>
        </div>
        <LiensMenus />
      </div>

      {/* Sécurité : après 7 h 30 sans point du jour, on le dit (sinon tout paraîtrait à jour). */}
      {point !== undefined && (!point || ancien) && maintenant >= 7 * 60 + 30 ? (
        <div className="ac-alerte">⚠️ Pas de point ce matin : la tâche de 7 h n’est pas passée. Les infos ci-dessous peuvent être anciennes. Vérifie que le Mac et l’app Claude sont ouverts.</div>
      ) : null}

      <div className="ac-minis">
        <Mini id="agenda" ouvert={ouvert} onBasculer={setOuvert} valeur={agendaV} sous={agendaS} />
        <Mini id="mails" ouvert={ouvert} onBasculer={setOuvert} valeur={mailsV} sous={mailsS} />
        <Mini id="etat" ouvert={ouvert} onBasculer={setOuvert} valeur={`${vert}/${apps.length} au vert`} sous={etatS} />
      </div>

      {ouvert ? (
        <div className={`ac-panneau ${ouvert}`}>
          {ouvert === 'agenda' ? <PanneauAgenda agenda={point?.agenda} maintenant={maintenant} ancien={ancien} /> : null}
          {ouvert === 'mails' ? (
            <PanneauMails
              mails={point?.mails}
              onCorbeille={(g) =>
                api
                  .corbeillePoint(g)
                  .then(setPoint)
                  .catch((e) => setErreur(e.message))
              }
            />
          ) : null}
          {ouvert === 'etat' ? <PanneauEtat apps={apps} ext={ext} /> : null}
        </div>
      ) : null}

      {erreur ? <p className="error small">{erreur}</p> : null}

      <div className="ac-cols">
        <section className="ac-col decider">
          <div className="ac-col-t">
            <h3>
              À décider <span>· {decisions.filter(estOuvert).length}</span>
            </h3>
            <small>Oui / Non · Claude applique à 5 h 05</small>
          </div>
          {!af ? <p className="af-vide">Chargement…</p> : null}
          {af && !decisions.length ? <p className="af-vide">✓ Aucune décision en attente.</p> : null}
          {decisions.map((e) => (
            <Tache key={e.id} e={e} onAgir={onAgir} />
          ))}
        </section>

        <section className="ac-col faire">
          <div className="ac-col-t">
            <h3>
              À faire <span>· {taches.filter(estOuvert).length}</span>
            </h3>
            <small>
              grave d’abord{af?.compteurs?.envoyes ? ` · ${af.compteurs.envoyes} chez Claude` : ''}
              {faits ? (
                <>
                  {' · '}
                  <button type="button" className="ac-plus ac-faits" onClick={() => setVoirFaits(!voirFaits)}>
                    {voirFaits ? 'cacher les faits ▴' : `voir les ${faits} fait${faits > 1 ? 's' : ''} récemment ▾`}
                  </button>
                </>
              ) : null}
            </small>
          </div>
          {af && !taches.length ? <p className="af-vide">✓ Rien à faire pour l’instant : tout roule.</p> : null}
          {visibles.map((e) => (
            <Tache key={e.id} e={e} onAgir={onAgir} />
          ))}
          {voirFaits && faits ? (
            <div className="ac-faits-liste">
              {listeFaits.map((e) => (
                <Tache key={e.id} e={e} onAgir={onAgir} />
              ))}
            </div>
          ) : null}
          {taches.length > MAX_TACHES ? (
            <button type="button" className="ac-plus" onClick={() => setToutVoir(!toutVoir)}>
              {toutVoir ? 'Voir moins ▴' : `Voir les ${taches.length - MAX_TACHES} autres ▾`}
            </button>
          ) : null}
        </section>
      </div>
    </div>
  );
}

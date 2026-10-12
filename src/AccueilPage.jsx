// Accueil du Studio — maquette validée (artifact 8oFkNdUgqU7DzvfMQFjHfC) :
// sans prose. Un bandeau général animé (l'anneau du code, quatre chiffres
// qui montent : fiches, canaux, pages sur Google, vues), une rangée de raccourcis (un par entrée du rail), puis un
// encart par app avec trois témoins creusés : Code, Fiche, En ligne / Store.
import React, { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { useApplis, estSite, ciInfo, ageFiches, FICHE_PERIMEE_JOURS, Logo } from './MesApplisPage.jsx';
import './accueil.css';

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

function Anneau({ ok, ko, jamais }) {
  const total = ok + ko + jamais || 1;
  const parts = [
    [ok, 'var(--ok)'],
    [ko, 'var(--ko)'],
    [jamais, 'var(--none)'],
  ];
  const [pret, setPret] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setPret(true));
    return () => cancelAnimationFrame(r);
  }, []);
  let depart = 0;
  return (
    <div className="ac-anneau">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="piste" cx="60" cy="60" r="50" />
        {parts.map(([n, c], i) => {
          const pct = (100 * n) / total;
          const el = n ? (
            <circle
              key={i}
              className="part"
              cx="60"
              cy="60"
              r="50"
              stroke={c}
              transform={`rotate(${(depart * 360) / 100} 60 60)`}
              style={{ strokeDashoffset: pret ? 314 - (314 * pct) / 100 : 314, transitionDelay: `${0.3 + i * 0.3}s` }}
            />
          ) : null;
          depart += pct;
          return el;
        })}
      </svg>
      <div className="mid">
        <b>
          <Compte n={ok} />
        </b>
        <span>sur {ok + ko + jamais} au vert</span>
      </div>
    </div>
  );
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

const ilYa = (iso) => {
  if (!iso) return '';
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return j <= 0 ? "envoyé aujourd'hui" : j === 1 ? 'envoyé hier' : `envoyé il y a ${j} j`;
};

// Les trois témoins d'une app : [couleur, raison].
function temoins(app, site) {
  const c = ciInfo(app);
  const code = [c.k === 'run' ? 'run' : c.k, `Code : ${c.label.toLowerCase()}${c.dateLong ? ` (${c.dateLong})` : ''}`];
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
    const k = (v) => (/en ligne|publi[ée]e|disponible/i.test(v) ? 'ok' : /bloqu|rejet|refus/i.test(v) ? 'ko' : /test|en cours|revue|examen/i.test(v) ? 'run' : 'none');
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

export function AccueilPage() {
  const { data, error } = useApplis();
  const [ext, setExt] = useState(null);
  const deja = useRef(false);
  useEffect(() => {
    if (deja.current) return;
    deja.current = true;
    api
      .accueil()
      .then(setExt)
      .catch(() => setExt({}));
  }, []);
  if (!data) return <div className="clay-content clay-muted">{error || 'Chargement…'}</div>;

  const apps = data.apps;
  const ks = apps.map((a) => ciInfo(a).k);
  const ok = ks.filter((k) => k === 'ok').length;
  const ko = ks.filter((k) => k === 'ko').length;
  const perimees = apps.filter((a) => (ageFiches(a) ?? 0) > FICHE_PERIMEE_JOURS).length;
  const ouverts = apps.reduce((t, a) => t + (a.marketingSummary?.done || 0), 0);
  const canaux = ouverts + apps.reduce((t, a) => t + (a.marketingSummary?.todo || 0), 0);
  const c = ext?.compteurs || {};
  const envoi = (a) => ext?.envois?.[String(a.repo || '').toLowerCase()];
  const groupes = [
    ['Applis', apps.filter((a) => !estSite(a))],
    ['Sites', apps.filter(estSite)],
  ];
  const jour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const raccourcis = [
    ['#/pub', '📣', c.videosHier, 'prêtes'],
    ['#/indexation', '🔎', c.indexation, c.indexationEnvoyes ? `à régler · ${c.indexationEnvoyes} chez Claude` : 'à régler'],
    ['#/audience', '📈', ext?.vues?.total, 'visiteurs 7 j'],
    ['#/planning', '🗓️', c.programmees, 'programmées'],
    ['#/encours', '🏭', c.enCours, 'en cours'],
    ['#/reglages/routines', '⏰', c.routinesDuJour, c.routinesBloquees ? `aujourd'hui · ${c.routinesBloquees} bloquée${c.routinesBloquees > 1 ? 's' : ''}` : "aujourd'hui"],
  ];

  return (
    <div className="clay-content accueil">
      <div className="ac-salut anim">
        <div className="jour">{jour}</div>
        <h3>Bonjour Jean</h3>
      </div>

      <div className="ac-general anim" style={{ animationDelay: '.05s' }}>
        <Anneau ok={ok} ko={ko} jamais={apps.length - ok - ko} />
        <div className="ac-chiffres">
          <a className="gc" href="#/applis">
            <span className="lab">Fiches</span>
            <b>
              <Compte n={perimees} />
            </b>
            <span className={`var${perimees ? ' chaud' : ''}`}>à rafraîchir</span>
          </a>
          <a className="gc" href="#/applis">
            <span className="lab">Canaux</span>
            <b>
              <Compte n={ouverts} delai={50} />
            </b>
            <span className="var">ouverts sur {canaux}</span>
          </a>
          <a className="gc" href="#/indexation">
            <span className="lab">Google</span>
            <b>{ext?.compteurs ? <Compte n={c.pagesGoogle || 0} delai={100} /> : '—'}</b>
            <span className="var">pages sur {nb(c.pagesTotal)}</span>
          </a>
          <a className="gc cb" href="#/audience">
            <span className="lab">Visiteurs 7 j</span>
            <b>{ext?.vues ? <Compte n={ext.vues.total} delai={150} /> : '—'}</b>
            <Courbe jours={ext?.vues?.jours} />
          </a>
        </div>
      </div>

      <div className="ac-raccourcis anim" style={{ animationDelay: '.08s' }}>
        {raccourcis.map(([href, ic, n, lab]) => (
          <a key={href} className="rc" href={href}>
            <span className="ic">{ic}</span>
            <b className={href.includes('routines') && c.routinesBloquees ? 'chaud' : ''}>{ext ? nb(n) : '…'}</b>
            <span className="lab">{lab}</span>
          </a>
        ))}
      </div>

      {groupes.map(([titre, liste], g) =>
        liste.length ? (
          <React.Fragment key={titre}>
            <span className="ac-sstitre">{titre}</span>
            <div className="ac-encarts">
              {liste.map((a, i) => (
                <Encart key={a.id} app={a} site={ext?.sites?.[a.id]} envoi={envoi(a)} delai={0.1 + (g * 3 + i) * 0.03} />
              ))}
            </div>
          </React.Fragment>
        ) : null,
      )}

      <div className="ac-legende anim">
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

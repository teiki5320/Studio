// Les dix cartes « une par appli ou site » avec leurs trois témoins (Code,
// Fiche, En ligne / Store) et leur légende. Elles vivaient dans le panneau
// État de l'Accueil ; depuis le 23/10 (choix de Jean) elles sont la page
// d'entrée de Mes applis, et l'Accueil n'en garde que le compte « N/10 au vert ».
import React from 'react';
import { estSite, ciInfo, ageFiches, FICHE_PERIMEE_JOURS, Logo } from './MesApplisPage.jsx';
import './accueil.css';

const COULEUR = { ok: 'var(--ok)', run: 'var(--run)', ko: 'var(--ko)', none: 'var(--none)' };

const ilYa = (iso) => {
  if (!iso) return '';
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return j <= 0 ? "envoyé aujourd'hui" : j === 1 ? 'envoyé hier' : `envoyé il y a ${j} j`;
};

// Les trois témoins d'une app : [couleur, raison].
export function temoins(app, site) {
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

export function Encart({ app, site, envoi, delai }) {
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


// Le pire des trois témoins d'une app.
export const pire = (app, site) => {
  const ks = temoins(app, site).map(([, k]) => k);
  return ks.includes('ko') ? 'ko' : ks.includes('run') ? 'run' : ks.includes('none') ? 'none' : 'ok';
};

export function LegendeTemoins() {
  return (
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
  );
}

// Accueil — « À trier » en cartes (maquette Page H, choisie par Jean le 26/10,
// artifact BNE9kfta1Eoj8FgzpxGFMW) : une pile de cartes recto / verso.
//  - Recto : la question ou la tâche. Verso (toucher la carte ou « Retourner ») :
//    ce que Claude fera exactement selon la réponse.
//  - On glisse la carte : à droite = Oui / Claude demain 5 h 05, à gauche =
//    Non / C'est fait, en haut = Ticket GitHub, en bas = On y travaille ensemble.
//    Les gros boutons ronds font la même chose (pas obligé de glisser sur l'iPad).
//  - « Annuler » efface la dernière réponse (tant que Claude n'est pas passé).
// En dessous, « Décidé aujourd'hui » : chaque réponse du jour, où elle en est, et
// « Changer d'avis » jusqu'au passage de Claude.
import React, { useMemo, useRef, useState } from 'react';
import { api, followJob } from './api.js';
import { LogoAppli } from './LogoAppli.jsx';
import './tricartes.css';

const SOURCES = {
  indexation: 'Google',
  routine: 'Tâche du matin',
  tests: 'Tests GitHub',
  fiches: 'Fiche',
  point: 'Point du matin',
  comptes: 'Comptes & adresses',
  'produits-amazon': 'Amazon',
  pause: 'Appli en pause',
  planning: 'Planning',
};
const SEUIL = 110;
const court = (t, n) => (t && t.length > n ? `${t.slice(0, n - 1)}…` : t || '');
const jourParis = (d) => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(d);
const heure = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });

// Ce qui reste à trier : à faire ou bloqué, sauf un ticket où Claude a la main.
export const aTrier = (e) => (e.etat === 'a-faire' || e.etat === 'bloque') && !(e.ticket && e.ticket.etat !== 'a-toi' && e.ticket.etat !== 'regle');
const rangCarte = (e) => (e.type === 'decision' ? 0 : e.etat === 'bloque' ? 1 : e.grave ? 2 : 3);

// Les choix d'une carte, par sens de glissé, avec ce que chacun déclenche.
function choixDe(e) {
  const c = {};
  if (e.type === 'decision') {
    c.droite = { mot: 'Oui', court: 'OUI', fait: 'Claude l’applique demain à 5 h 05, sur le Mac, puis rend compte.', f: () => api.envoyerAfaire(e.id, 'oui') };
    c.gauche = { mot: 'Non', court: 'NON', fait: 'Rien n’est fait. La carte passe en « fait » avec « on ne fait rien ».', f: () => api.envoyerAfaire(e.id, 'non') };
    return c;
  }
  if (e.action === 'planning') {
    c.droite = { mot: 'Placer', court: 'PLACER', fait: 'Ouvre le planning pour choisir le jour de publication.', lien: e.lien };
    c.gauche = { mot: 'Retirer', court: 'RETIRER', fait: 'La vidéo n’est plus validée : elle sort de la liste.', f: () => api.validateEpisode(e.projectId, e.number, false) };
    return c;
  }
  if (e.action === 'plan') {
    c.droite = { mot: 'Renvoyer le plan', court: 'GOOGLE', fait: 'Le plan du site est renvoyé à Google tout de suite.', f: () => api.renvoyerPlan(e.id).then(({ jobId }) => followJob(jobId)) };
    return c;
  }
  c.droite = {
    mot: e.etat === 'bloque' ? 'Réessayer demain' : 'Claude demain',
    court: 'CLAUDE',
    fait: 'Claude s’en charge demain à 5 h 05, sur le Mac (avec le navigateur), puis rend compte ici.',
    f: () => api.envoyerAfaire(e.id, 'oui'),
  };
  if (e.source !== 'indexation') {
    c.gauche = {
      mot: 'C’est fait',
      court: 'FAIT',
      fait: 'Tu l’as réglé toi-même : la carte passe en « fait ». Si le problème revient, elle reviendra.',
      f: () => (e.action === 'comptes' ? api.etatCompte(e.compte, 'fait') : api.envoyerAfaire(e.id, 'fait')),
    };
  }
  if (!e.ticket && e.source !== 'produits-amazon') {
    c.haut = { mot: 'Ticket', court: 'TICKET', fait: 'Un ticket GitHub : un Claude en ligne répond tout de suite (code, explications, étapes pour toi).', f: () => api.envoyerGithub([e.id]) };
  }
  c.bas = { mot: 'Ensemble', court: 'ENSEMBLE', fait: 'On y travaille dans une conversation : la carte reste en bas, ne compte plus, la routine n’y touche pas.', f: () => api.envoyerAfaire(e.id, 'encours') };
  return c;
}

const ICONES = {
  croix: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l4 4 10-10',
  claude: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18',
  haut: 'M12 19V5M5 12l7-7 7 7',
  bas: 'M12 5v14M5 12l7 7 7-7',
  annuler: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
  tourner: 'M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5',
  passer: 'M5 12h14M13 6l6 6-6 6',
};
const Ic = ({ d, taille = 22, couleur = 'currentColor', epais = 2.6 }) => (
  <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={epais} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

function Puce({ e }) {
  if (e.type === 'decision') return <span className="tc-puce dec">À DÉCIDER</span>;
  if (e.etat === 'bloque') return <span className="tc-puce ko">BLOQUÉ</span>;
  if (e.grave) return <span className="tc-puce ko">URGENT</span>;
  return <span className="tc-puce">À FAIRE</span>;
}

function Recto({ e }) {
  return (
    <div className="tc-face recto">
      <div className="tc-tete">
        <span className="tc-logo">
          <LogoAppli de={e.site} taille={36} seul />
        </span>
        <span className="tc-qui">
          <b>{e.site || 'Général'}</b>
          <small>{SOURCES[e.source] || e.source}</small>
        </span>
        <Puce e={e} />
      </div>
      <h1 className="tc-titre">{e.texte}</h1>
      {e.etat === 'bloque' && e.compteRendu ? <p className="tc-bloque">Claude a bloqué : {court(e.compteRendu, 260)}</p> : null}
      {e.detail ? <p className="tc-texte">{court(e.detail, 260)}</p> : null}
      {e.ticket ? (
        <a className="tc-lien" href={e.ticket.url} target="_blank" rel="noreferrer" onPointerDown={(x) => x.stopPropagation()}>
          Ticket n° {e.ticket.numero} : Claude a répondu, à toi ↗
        </a>
      ) : null}
      <div className="tc-vide" />
      <span className="tc-retourner">
        <Ic d={ICONES.tourner} taille={16} epais={2.4} /> Touche la carte pour voir ce que fera chaque choix
      </span>
    </div>
  );
}

function Verso({ e, choix }) {
  const consigne = e.consigne && e.consigne !== e.texte ? court(e.consigne, 420) : '';
  const lignes = [
    ['droite', '→'],
    ['gauche', '←'],
    ['haut', '↑'],
    ['bas', '↓'],
  ].filter(([s]) => choix[s]);
  return (
    <div className="tc-face verso">
      <div className="tc-tete">
        <b style={{ fontSize: 15 }}>Ce qui se passera</b>
        <span className="tc-puce verso">VERSO</span>
      </div>
      {lignes.map(([s, fl]) => (
        <div key={s} className="tc-etape">
          <b>{fl}</b>
          <span>
            <strong>{choix[s].mot}</strong> — {choix[s].fait}
          </span>
        </div>
      ))}
      {consigne ? (
        <div className="tc-consigne">
          <small>CE QUE CLAUDE A POUR CONSIGNE</small>
          <span>{consigne}</span>
        </div>
      ) : null}
      {e.lien && !e.lien.startsWith('#') ? (
        <a className="tc-lien" href={e.lien} target="_blank" rel="noreferrer" onPointerDown={(x) => x.stopPropagation()}>
          Voir ↗
        </a>
      ) : e.lien ? (
        <a className="tc-lien" href={e.lien} onPointerDown={(x) => x.stopPropagation()}>
          Voir →
        </a>
      ) : null}
      <div className="tc-vide" />
      <span className="tc-retourner">Touche pour revenir au recto</span>
    </div>
  );
}

export function TriCartes({ elements, onAgir, chargement }) {
  const [ordre, setOrdre] = useState([]); // ids passés, renvoyés en fin de pile
  const [verso, setVerso] = useState(false);
  const [glisse, setGlisse] = useState({ dx: 0, dy: 0, actif: false });
  const [occupe, setOccupe] = useState(false);
  const [dernier, setDernier] = useState(null); // { id, texte } pour « Annuler »
  const depart = useRef(null);

  const pile = useMemo(() => {
    const l = elements.filter(aTrier).sort((a, b) => rangCarte(a) - rangCarte(b));
    const passes = ordre.filter((id) => l.some((e) => e.id === id));
    return [...l.filter((e) => !passes.includes(e.id)), ...passes.map((id) => l.find((e) => e.id === id))];
  }, [elements, ordre]);
  const e = pile[0];
  const choix = e ? choixDe(e) : {};

  const agir = (sens) => {
    const c = choix[sens];
    if (!c || occupe) return;
    setGlisse({ dx: 0, dy: 0, actif: false });
    if (c.lien) {
      window.location.hash = c.lien.replace(/^#/, '');
      return;
    }
    setOccupe(true);
    setVerso(false);
    const id = e.id;
    onAgir(c.f).finally(() => {
      setOccupe(false);
      setDernier(sens === 'haut' || e.action === 'planning' || e.action === 'plan' || e.action === 'comptes' ? null : { id, texte: e.texte });
    });
  };
  const passer = () => {
    if (!e) return;
    setVerso(false);
    setOrdre((o) => [...o.filter((x) => x !== e.id), e.id]);
  };
  const annuler = () => {
    if (!dernier || occupe) return;
    setOccupe(true);
    onAgir(() => api.envoyerAfaire(dernier.id, 'annuler')).finally(() => {
      setOccupe(false);
      setDernier(null);
    });
  };

  const down = (x) => {
    if (occupe) return;
    depart.current = { x: x.clientX, y: x.clientY, bouge: false };
    try {
      x.currentTarget.setPointerCapture(x.pointerId);
    } catch {
      /* rien */
    }
    setGlisse({ dx: 0, dy: 0, actif: true });
  };
  const move = (x) => {
    if (!depart.current) return;
    const dx = x.clientX - depart.current.x;
    const dy = x.clientY - depart.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 8) depart.current.bouge = true;
    setGlisse({ dx, dy, actif: true });
  };
  const up = () => {
    if (!depart.current) return;
    const { bouge } = depart.current;
    depart.current = null;
    const { dx, dy } = glisse;
    if (!bouge) {
      setGlisse({ dx: 0, dy: 0, actif: false });
      setVerso((v) => !v);
      return;
    }
    const sens = Math.abs(dx) >= Math.abs(dy) ? (dx > SEUIL ? 'droite' : dx < -SEUIL ? 'gauche' : null) : dy < -SEUIL ? 'haut' : dy > SEUIL ? 'bas' : null;
    if (sens && choix[sens]) agir(sens);
    else setGlisse({ dx: 0, dy: 0, actif: false });
  };
  const clavier = (x) => {
    const sens = { ArrowRight: 'droite', ArrowLeft: 'gauche', ArrowUp: 'haut', ArrowDown: 'bas' }[x.key];
    if (sens) {
      x.preventDefault();
      agir(sens);
    } else if (x.key === ' ' || x.key === 'Enter') {
      x.preventDefault();
      setVerso((v) => !v);
    }
  };

  // Quel tampon s'affiche pendant le glissé.
  const { dx, dy } = glisse;
  const sensVu = Math.abs(dx) >= Math.abs(dy) ? (dx > 30 ? 'droite' : dx < -30 ? 'gauche' : null) : dy < -30 ? 'haut' : dy > 30 ? 'bas' : null;
  const force = Math.min(1, Math.max(Math.abs(dx), Math.abs(dy)) / SEUIL);
  const nDec = pile.filter((x) => x.type === 'decision').length;

  return (
    <section className="tc-bloc">
      <div className="tc-entete">
        <h3>
          À trier <span>· {pile.length}</span>
          {pile.length ? <small>{nDec ? ` · ${nDec} décision${nDec > 1 ? 's' : ''}` : ''}</small> : null}
        </h3>
        <small>touche la carte pour la retourner · glisse-la, ou utilise les boutons</small>
      </div>

      {chargement ? <p className="af-vide">Chargement…</p> : null}
      {!chargement && !e ? (
        <div className="tc-fini">
          <Ic d={ICONES.check} taille={40} couleur="var(--ok)" />
          <b>Tout est trié</b>
          <span>Claude applique tes choix demain à 5 h 05.</span>
          {dernier ? (
            <button type="button" className="clay-btn ghost small" onClick={annuler} disabled={occupe}>
              ↺ Annuler la dernière
            </button>
          ) : null}
        </div>
      ) : null}

      {e ? (
        <>
          <div className="tc-scene">
            {pile[2] ? <div className="tc-derriere d2" /> : null}
            {pile[1] ? (
              <div className="tc-derriere d1">
                <span>Ensuite : {court(pile[1].texte, 70)}</span>
              </div>
            ) : null}
            <div
              key={e.id}
              className={`tc-carte${glisse.actif ? ' glisse' : ''}${occupe ? ' occupe' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={`${e.texte}. Flèches pour répondre, Espace pour retourner.`}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              onKeyDown={clavier}
              style={{ transform: `translate(${dx}px, ${dy}px) rotate(${dx / 22}deg)` }}
            >
              <div className={`tc-tourne${verso ? ' verso' : ''}`}>
                <Recto e={e} />
                <Verso e={e} choix={choix} />
              </div>
              {sensVu && choix[sensVu] ? (
                <span className={`tc-tampon ${sensVu}`} style={{ opacity: force }}>
                  {choix[sensVu].court}
                </span>
              ) : null}
            </div>
          </div>

          <div className="tc-boutons">
            <Rond lab="Annuler" taille={50} onClick={annuler} disabled={!dernier || occupe} d={ICONES.annuler} couleur="var(--run)" />
            {choix.gauche ? <Rond lab={choix.gauche.mot} taille={68} onClick={() => agir('gauche')} disabled={occupe} d={e.type === 'decision' ? ICONES.croix : ICONES.check} couleur={e.type === 'decision' ? undefined : 'var(--ok)'} /> : null}
            {choix.haut ? <Rond lab={choix.haut.mot} taille={52} onClick={() => agir('haut')} disabled={occupe} d={ICONES.haut} couleur="#9fc3f0" /> : null}
            <Rond lab="Retourner" taille={52} onClick={() => setVerso((v) => !v)} d={ICONES.tourner} />
            {choix.bas ? <Rond lab={choix.bas.mot} taille={52} onClick={() => agir('bas')} disabled={occupe} d={ICONES.bas} couleur="#c7a6ef" /> : null}
            <Rond lab="Passer" taille={50} onClick={passer} disabled={pile.length < 2} d={ICONES.passer} />
            {choix.droite ? <Rond lab={choix.droite.mot} taille={68} principal onClick={() => agir('droite')} disabled={occupe} d={e.type === 'decision' ? ICONES.check : e.action === 'planning' || e.action === 'plan' ? ICONES.passer : ICONES.claude} /> : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

function Rond({ lab, taille, d, couleur, principal, ...props }) {
  return (
    <span className="tc-lab">
      <button type="button" className={`tc-rond${principal ? ' principal' : ''}`} aria-label={lab} style={{ width: taille, height: taille, marginTop: (68 - taille) / 2 }} {...props}>
        <Ic d={d} taille={Math.round(taille * 0.38)} couleur={principal ? 'var(--accent-ink)' : couleur} epais={2.8} />
      </button>
      {lab}
    </span>
  );
}

// ---------- Décidé aujourd'hui ----------

function reponseDe(e) {
  if (e.ticket) return ['Ticket', 'ticket'];
  if (e.etat === 'encours') return ['Ensemble', 'ens'];
  if (e.source === 'point' && e.choix) return e.choix === 'oui' ? ['Oui', 'oui'] : ['Non', ''];
  if (e.compteRendu === 'Noté : on ne fait rien.') return ['Non', ''];
  if (e.compteRendu === 'Réglé par Jean.') return ['C’est fait', ''];
  if (e.type === 'decision') return ['Oui', 'oui'];
  return ['Claude', 'oui'];
}
function etatDe(e) {
  if (e.ticket) return [`Ticket n° ${e.ticket.numero}`, 'run'];
  if (e.etat === 'envoye') return ['Claude demain 5 h 05', 'run'];
  if (e.etat === 'encours') return ['En cours avec toi', 'ens'];
  if (e.etat === 'bloque') return ['Bloqué : revenu en carte', 'ko'];
  if (e.etat === 'fait' && e.compteRendu === 'Noté : on ne fait rien.') return ['Noté, rien à faire', ''];
  if (e.etat === 'fait') return [e.compteRendu && !['Réglé par Jean.', 'Noté : on ne fait rien.'].includes(e.compteRendu) ? `Fait · ${court(e.compteRendu, 70)}` : 'Fait', 'ok'];
  return ['', ''];
}
const modifiable = (e) =>
  !e.ticket &&
  (e.etat === 'envoye' || e.etat === 'encours' || (e.etat === 'fait' && ['Réglé par Jean.', 'Noté : on ne fait rien.'].includes(e.compteRendu) && e.source !== 'comptes'));

// Ce qui a été tranché aujourd'hui (par Jean ou appliqué par Claude), plus ce
// qui attend encore Claude ou une conversation, même décidé un autre jour.
export function DecidesDuJour({ elements, onAgir }) {
  const [occupe, setOccupe] = useState(null);
  const [tout, setTout] = useState(false);
  const auj = jourParis(new Date());
  const quand = (e) => e.retour || e.le || e.ticket?.le || null;
  const liste = elements
    .filter((e) => {
      const q = quand(e);
      const duJour = q && jourParis(new Date(q)) === auj;
      if (e.etat === 'envoye' || e.etat === 'encours') return true;
      if (e.ticket && e.ticket.le && jourParis(new Date(e.ticket.le)) === auj) return true;
      return duJour && (e.etat === 'fait' || e.etat === 'bloque');
    })
    .sort((a, b) => new Date(quand(b) || 0) - new Date(quand(a) || 0));
  const enAttente = liste.filter((e) => e.etat === 'envoye').length;
  const faits = liste.filter((e) => e.etat === 'fait').length;
  const visibles = tout ? liste : liste.slice(0, 8);
  const changer = (e) => {
    setOccupe(e.id);
    onAgir(() => api.envoyerAfaire(e.id, 'annuler')).finally(() => setOccupe(null));
  };
  return (
    <section className="tc-bloc tc-decides">
      <div className="tc-entete">
        <h3>
          Décidé aujourd’hui <span>· {liste.length}</span>
        </h3>
        <small>
          tu peux changer d’avis jusqu’à 5 h 05{enAttente ? <> · <b className="run">{enAttente}</b> part{enAttente > 1 ? 'ent' : ''} demain matin</> : null}
          {faits ? <> · <b className="ok">{faits}</b> fait{faits > 1 ? 's' : ''}</> : null}
        </small>
      </div>
      {!liste.length ? <p className="af-vide">Rien de décidé pour l’instant aujourd’hui.</p> : null}
      {visibles.map((e) => {
        const q = quand(e);
        const [rep, repCl] = reponseDe(e);
        const [st, stCl] = etatDe(e);
        return (
          <div key={e.id} className="tc-dj">
            <span className="hr">{q ? (jourParis(new Date(q)) === auj ? heure(q) : new Date(q).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Europe/Paris' })) : '—'}</span>
            <span className="tc-logo">
              <LogoAppli de={e.site} taille={28} seul />
            </span>
            <span className="tx">
              {e.texte}
              <small>{[e.site, SOURCES[e.source] || e.source].filter(Boolean).join(' · ')}</small>
            </span>
            <span className={`rep ${repCl}`}>{rep}</span>
            <span className={`st ${stCl}`}>
              {e.ticket ? (
                <a href={e.ticket.url} target="_blank" rel="noreferrer">
                  {st} ↗
                </a>
              ) : (
                st
              )}
            </span>
            {modifiable(e) ? (
              <button type="button" className="tc-chg" disabled={occupe === e.id} onClick={() => changer(e)}>
                {occupe === e.id ? '…' : e.etat === 'fait' ? 'Annuler' : 'Changer d’avis'}
              </button>
            ) : (
              <span className="tc-chg vide" />
            )}
          </div>
        );
      })}
      {liste.length > 8 ? (
        <button type="button" className="ac-plus" onClick={() => setTout(!tout)}>
          {tout ? 'Voir moins ▴' : `Voir les ${liste.length - 8} autres ▾`}
        </button>
      ) : null}
    </section>
  );
}

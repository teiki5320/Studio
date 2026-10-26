// Pub Erea, les trois formats courts (au narrateur Troy) :
// - « Avant ou après ? » : le compte à rebours (EreaCompteARebours) puis la
//   réponse, frise LINÉAIRE qui se remet dans l'ordre (EreaComparaison) — la
//   frise du jeu n'est pas linéaire, elle tromperait l'œil sur les écarts ;
// - « Le défi en famille » et « Interro surprise » : la frise du jeu qui saute
//   d'une date à l'autre, au rythme de la voix (EreaReperes) ;
// - le carton d'ouverture de l'interro (EreaCarton).
// Mêmes polices, couleurs et pièces que la frise du jeu (EreaFrise.jsx).
import React from 'react';
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  usePolicesErea,
  Ruban,
  MiniCarte,
  Bouton,
  THEMES,
  yearToFrac,
  fracToYear,
  eraIndexAt,
  formatYear,
  INK,
  INK_SOFT,
  CORAL,
  LOGICAL_W,
  TAPE_W,
  TAPE_H,
} from './EreaFrise.jsx';

const PARCHEMIN = 'radial-gradient(ellipse at 50% 42%, #fff8e8 0%, #f2e2bf 80%)';
const OCRE = '#a97b36';
const VERT = '#3C9A5F';
const ecart = (x, y) => `${Math.abs(x - y).toLocaleString('fr-FR')} ans`;

// Une pastille de choix (emoji + nom court), au style des cartes du jeu.
const Choix = ({ c, style }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      padding: '18px 34px',
      borderRadius: 999,
      background: '#fff',
      boxShadow: '0 14px 34px rgba(53,64,107,0.16)',
      fontFamily: 'Baloo2',
      fontWeight: 800,
      fontSize: 58,
      color: INK,
      ...style,
    }}
  >
    <span>{c.emoji}</span>
    <span>{c.court}</span>
  </div>
);

// ---- Avant ou après ? : 3 secondes pour réfléchir ----
export const EreaCompteARebours = ({ secondes = 3, titre, a, b, fonts }) => {
  usePolicesErea(fonts);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const reste = Math.max(1, secondes - Math.floor(t));
  const u = t - Math.floor(t); // avancée dans la seconde
  const pop = interpolate(u, [0, 0.18, 0.35], [0.4, 1.15, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const anneau = 1 - Math.min(1, t / secondes);
  const R = 230;
  const C = 2 * Math.PI * R;
  return (
    <AbsoluteFill style={{ background: PARCHEMIN, alignItems: 'center', justifyContent: 'center' }}>
      {titre ? (
        <div style={{ position: 'absolute', top: 230, left: 80, right: 80, textAlign: 'center', fontFamily: 'Baloo2', fontWeight: 800, fontSize: 72, lineHeight: 1.08, color: INK }}>
          {titre}
        </div>
      ) : null}
      <div style={{ position: 'relative', width: 2 * R + 60, height: 2 * R + 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={2 * R + 60} height={2 * R + 60} style={{ position: 'absolute', inset: 0 }}>
          <circle cx={R + 30} cy={R + 30} r={R} fill="#fff" stroke="rgba(53,64,107,0.12)" strokeWidth={22} />
          <circle
            cx={R + 30}
            cy={R + 30}
            r={R}
            fill="none"
            stroke={CORAL}
            strokeWidth={22}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - anneau)}
            transform={`rotate(-90 ${R + 30} ${R + 30})`}
          />
        </svg>
        <div style={{ fontFamily: 'Baloo2', fontWeight: 800, fontSize: 300, color: INK, transform: `scale(${pop})`, lineHeight: 1 }}>{reste}</div>
      </div>
      <div style={{ position: 'absolute', bottom: 360, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 30 }}>
        <Choix c={a} style={{ fontSize: 50 }} />
        <span style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: 44, color: INK_SOFT }}>ou</span>
        <Choix c={b} style={{ fontSize: 50 }} />
      </div>
    </AbsoluteFill>
  );
};

// ---- Avant ou après ? : la réponse ----
// Une frise verticale à l'échelle (la plus ancienne date en haut). Les trois
// repères arrivent dans le désordre, puis glissent à leur vraie place ; les
// deux écarts s'affichent, le plus court (la bonne réponse) en vert.
export const EreaComparaison = ({ sujet, a, b, bonne, fonts }) => {
  usePolicesErea(fonts);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const items = [
    { k: 'a', ...a },
    { k: 's', ...sujet, court: sujet.nom },
    { k: 'b', ...b },
  ];
  const min = Math.min(a.annee, b.annee, sujet.annee);
  const max = Math.max(a.annee, b.annee, sujet.annee);
  const HAUT = 330;
  const BAS = 1560;
  const yVrai = (an) => HAUT + ((an - min) / Math.max(1, max - min)) * (BAS - HAUT);
  // Le désordre de départ : l'ordre inverse.
  const yFaux = (i) => HAUT + ((2 - i) / 2) * (BAS - HAUT);
  const range = interpolate(t, [0.5, 1.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const ecarts = interpolate(t, [1.7, 2.2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const AXE = 250;
  // L'écart entre deux repères : une accolade le long de l'axe, et sa durée.
  const accolade = (an1, an2, ok, i) => {
    const y1 = Math.min(yVrai(an1), yVrai(an2));
    const y2 = Math.max(yVrai(an1), yVrai(an2));
    const couleur = ok ? VERT : '#C9645A';
    return (
      <React.Fragment key={`e${i}`}>
        <div style={{ position: 'absolute', left: AXE - 70, top: y1, height: y2 - y1, width: 40, opacity: ecarts, border: `8px solid ${couleur}`, borderRight: 'none', borderRadius: '24px 0 0 24px', boxSizing: 'border-box' }} />
        <div style={{ position: 'absolute', left: 0, width: AXE - 80, top: (y1 + y2) / 2, height: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: ecarts }}>
          <div
            style={{
              transform: `rotate(-90deg) scale(${ok ? 1 + 0.06 * Math.sin(t * 6) : 1})`,
              whiteSpace: 'nowrap',
              fontFamily: 'Baloo2',
              fontWeight: 800,
              fontSize: 60,
              color: couleur,
            }}
          >
            {ecart(an1, an2)}
            {ok ? ' ✓' : ''}
          </div>
        </div>
      </React.Fragment>
    );
  };
  return (
    <AbsoluteFill style={{ background: PARCHEMIN }}>
      {/* L'axe du temps */}
      <div style={{ position: 'absolute', left: AXE - 5, top: HAUT - 60, height: BAS - HAUT + 120, width: 10, borderRadius: 6, background: 'rgba(53,64,107,0.55)' }} />
      {items.map((it, i) => {
        const y = interpolate(range, [0, 1], [yFaux(i), yVrai(it.annee)]);
        const estSujet = it.k === 's';
        const juste = it.k === bonne;
        const surbrille = ecarts > 0 && (estSujet || juste);
        const theme = THEMES[eraIndexAt(it.annee)];
        return (
          <div key={it.k} style={{ position: 'absolute', left: AXE - 26, top: y, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: estSujet ? CORAL : theme.tint, border: `6px solid ${estSujet ? '#fff' : theme.ink}`, boxSizing: 'border-box' }} />
            <div
              style={{
                marginLeft: 34,
                padding: '14px 30px',
                borderRadius: 30,
                background: '#fff',
                boxShadow: surbrille ? `0 0 0 6px ${estSujet ? CORAL : VERT}, 0 14px 34px rgba(53,64,107,0.18)` : '0 14px 34px rgba(53,64,107,0.14)',
                maxWidth: 720,
              }}
            >
              <div style={{ fontFamily: 'Baloo2', fontWeight: 800, fontSize: 60, lineHeight: 1.05, color: INK }}>
                {it.emoji} {it.court}
              </div>
              <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: 38, color: theme.ink, marginTop: 4 }}>{formatYear(it.annee)}</div>
            </div>
          </div>
        );
      })}
      {accolade(a.annee, sujet.annee, bonne === 'a', 0)}
      {accolade(b.annee, sujet.annee, bonne === 'b', 1)}
    </AbsoluteFill>
  );
};

// ---- Interro surprise : le carton d'ouverture ----
export const EreaCarton = ({ etiquette, texte, fonts }) => {
  usePolicesErea(fonts);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const pop = interpolate(t, [0, 0.2, 0.35], [0.5, 1.12, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const pastille = interpolate(t, [0.15, 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const penche = Math.sin(t * 2.4) * 2;
  return (
    <AbsoluteFill style={{ background: PARCHEMIN, alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      {etiquette ? (
        <div
          style={{
            padding: '14px 36px',
            borderRadius: 999,
            background: CORAL,
            color: '#fff',
            fontFamily: 'Nunito',
            fontWeight: 900,
            fontSize: 46,
            letterSpacing: 3,
            opacity: pastille,
            transform: `translateY(${(1 - pastille) * -30}px) rotate(-3deg)`,
          }}
        >
          {etiquette}
        </div>
      ) : null}
      <div
        style={{
          marginTop: 50,
          fontFamily: 'Baloo2',
          fontWeight: 800,
          fontSize: 140,
          lineHeight: 1.02,
          color: INK,
          textAlign: 'center',
          whiteSpace: 'pre-line',
          transform: `scale(${pop}) rotate(${penche}deg)`,
        }}
      >
        {texte}
      </div>
      <div style={{ marginTop: 44, height: 10, width: interpolate(t, [0.3, 0.8], [0, 280], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), borderRadius: 5, background: OCRE }} />
    </AbsoluteFill>
  );
};

// ---- La frise du jeu, de date en date ----
// dates : [{ annee, affichage, legende }] ; debuts : l'image où la frise part
// vers chaque date (calée sur la voix) ; mouvement : durée d'un trajet (s).
export const EreaReperes = ({ depart, dates = [], debuts = [], mouvement = 0.7, compteur = false, assets = {} }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  usePolicesErea(assets.fonts);
  const md = Math.max(1, Math.round(mouvement * fps));
  const etapeA = (f) => {
    let i = -1;
    debuts.forEach((d, k) => {
      if (f >= d) {
        i = k;
      }
    });
    return i;
  };
  const pos = (f) => {
    const i = etapeA(f);
    if (i < 0) {
      return { frac: yearToFrac(depart), i, fini: false };
    }
    const de = i === 0 ? depart : dates[i - 1].annee;
    const t = Math.min(1, (f - debuts[i]) / md);
    const swing = interpolate(t, [0, 0.7, 1], [0, 1.06, 1], { easing: Easing.inOut(Easing.cubic) });
    const fA = yearToFrac(de);
    const fB = yearToFrac(dates[i].annee);
    return { frac: Math.max(0, Math.min(1, fA + (fB - fA) * swing)), i, fini: t >= 1 };
  };
  const p = pos(frame);
  const facingLeft = pos(frame + 1).frac > p.frac;
  // Le cliquetis du jeu : un cran tous les 24 pt de ruban parcourus.
  const crans = [];
  if (assets.sons && assets.sons.tic) {
    let parcouru = 0;
    let dernier = -1e9;
    for (let f = 1; f < durationInFrames; f++) {
      parcouru += Math.abs(pos(f).frac - pos(f - 1).frac) * TAPE_W;
      if (parcouru >= 24 && ((f - dernier) / fps) * 1000 >= 55) {
        parcouru = 0;
        dernier = f;
        crans.push(f);
      }
    }
  }
  const date = p.i >= 0 ? dates[p.i] : null;
  const annee = p.fini && date ? date.annee : fracToYear(p.frac);
  const affichage = p.fini && date ? date.affichage || formatYear(date.annee) : formatYear(annee);
  const theme = THEMES[eraIndexAt(annee)];
  const scale = width / LOGICAL_W;
  const logicalH = height / scale;
  // La légende arrive quand la frise se pose.
  const arrivee = p.i >= 0 ? debuts[p.i] + md : 0;
  const leg = date ? interpolate(frame, [arrivee - 4, arrivee + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const grand = p.fini ? interpolate(frame, [arrivee, arrivee + 5, arrivee + 10], [1, 1.12, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  return (
    <AbsoluteFill style={{ background: theme.tint }}>
      {crans.map((f, i) => (
        <Sequence key={`cran-${f}`} from={f} durationInFrames={Math.round(0.12 * fps)} layout="none">
          <Audio src={i % 2 === 0 ? assets.sons.tic : assets.sons.tac || assets.sons.tic} volume={0.35} />
        </Sequence>
      ))}
      {assets.bg && assets.bg[eraIndexAt(annee)] ? (
        <img
          src={assets.bg[eraIndexAt(annee)]}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 200 * scale, objectFit: 'cover', objectPosition: '50% 34%', opacity: 0.3, filter: 'blur(4px)', WebkitMaskImage: 'linear-gradient(#000 0%, #000 23%, transparent 75%)' }}
        />
      ) : null}
      <div style={{ position: 'absolute', left: 0, top: 0, width: LOGICAL_W, height: logicalH, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: logicalH * 0.1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {compteur && p.i >= 0 ? (
            <div style={{ marginBottom: 10, padding: '3px 12px', borderRadius: 999, background: CORAL, fontFamily: 'Nunito', fontWeight: 900, fontSize: 12, letterSpacing: 1.2, color: '#fff' }}>
              DATE {p.i + 1} / {dates.length}
            </div>
          ) : null}
          {/* Pastille d'époque */}
          <div style={{ height: 26, display: 'flex', alignItems: 'center' }}>
            <div style={{ padding: '2px 12px', background: '#fff', borderRadius: 999, boxShadow: '0 6px 16px rgba(53,64,107,0.12)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: theme.tint, border: `1.5px solid ${theme.ink}`, boxSizing: 'border-box' }} />
              <span style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: 11, letterSpacing: 1.3, color: theme.ink }}>{theme.name}</span>
            </div>
          </div>
          <div style={{ height: 2 }} />
          {/* La date, en grand */}
          <div style={{ height: 72, display: 'flex', alignItems: 'center', fontFamily: 'Baloo2', fontWeight: 800, fontSize: affichage.length > 9 ? 52 : 66, lineHeight: 1.05, color: INK, fontVariantNumeric: 'tabular-nums', transform: `scale(${grand})` }}>
            {affichage}
          </div>
          <div style={{ height: 8 }} />
          <div style={{ position: 'relative', width: LOGICAL_W, height: TAPE_H }}>
            <Ruban frac={p.frac} assets={assets} facingLeft={facingLeft} />
            <div style={{ position: 'absolute', top: 0, left: LOGICAL_W / 2 - 2, width: 4, height: TAPE_H, borderRadius: 4, background: CORAL, boxShadow: '0 0 0 2px rgba(255,255,255,0.7)' }} />
          </div>
          <div style={{ height: 12 }} />
          <div style={{ width: LOGICAL_W - 36, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Bouton glyph="−" />
            <MiniCarte frac={p.frac} />
            <Bouton glyph="+" />
          </div>
          {/* L'événement, en carte du jeu */}
          {date && date.legende ? (
            <div
              style={{
                marginTop: 18,
                width: LOGICAL_W - 36,
                padding: '14px 18px',
                borderRadius: 22,
                background: '#fff',
                boxShadow: '0 10px 26px rgba(53,64,107,0.12)',
                fontFamily: 'Baloo2',
                fontWeight: 800,
                fontSize: 25,
                lineHeight: 1.12,
                color: INK,
                textAlign: 'center',
                opacity: leg,
                transform: `translateY(${(1 - leg) * 14}px)`,
              }}
            >
              {date.legende}
            </div>
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};


// ---- Interro surprise : une question, la frise qui cherche, la réponse ----
// Avant `debut` (la question est posée) : la frise attend, l'année est un
// « ? ». De `debut` à `fin` (≈ 3 s, sans voix) : la frise glisse d'un côté,
// revient, hésite, au cliquetis du ruban. À `fin` : elle se pose sur la
// bonne année, qui s'affiche en grand, et Troy donne la réponse.
export const EreaRecherche = ({ depart, date, numero, total, debut, fin, assets = {} }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  usePolicesErea(assets.fonts);
  const fD = yearToFrac(depart);
  const fT = yearToFrac(date.annee);
  const borne = (x) => Math.max(0, Math.min(1, x));
  // L'hésitation : un grand passage au-delà, un retour trop loin, puis des
  // corrections de plus en plus fines autour de la bonne année.
  const sens = fT >= fD ? 1 : -1;
  const etapes = [fD, borne(fT + sens * 0.1), borne(fT - sens * 0.065), borne(fT + sens * 0.03), borne(fT - sens * 0.01), fT];
  const pos = (f) => {
    if (f <= debut) {
      return fD;
    }
    if (f >= fin) {
      return fT;
    }
    const u = (f - debut) / Math.max(1, fin - debut);
    return borne(interpolate(u, [0, 0.3, 0.55, 0.75, 0.9, 1], etapes, { easing: Easing.inOut(Easing.quad) }));
  };
  const frac = pos(frame);
  const facingLeft = pos(frame + 1) > frac;
  const crans = [];
  if (assets.sons && assets.sons.tic) {
    let parcouru = 0;
    let dernier = -1e9;
    for (let f = 1; f < durationInFrames; f++) {
      parcouru += Math.abs(pos(f) - pos(f - 1)) * TAPE_W;
      if (parcouru >= 24 && ((f - dernier) / fps) * 1000 >= 55) {
        parcouru = 0;
        dernier = f;
        crans.push(f);
      }
    }
  }
  const trouve = frame >= fin;
  const cherche = frame > debut && !trouve;
  const annee = trouve ? date.annee : fracToYear(frac);
  const theme = THEMES[eraIndexAt(annee)];
  const scale = width / LOGICAL_W;
  const logicalH = height / scale;
  const grand = trouve ? interpolate(frame, [fin, fin + 5, fin + 11], [1, 1.25, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  const entree = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  const clin = cherche ? 0.55 + 0.45 * Math.abs(Math.sin((frame / fps) * Math.PI * 2)) : 1;
  return (
    <AbsoluteFill style={{ background: theme.tint }}>
      {crans.map((f, i) => (
        <Sequence key={`cran-${f}`} from={f} durationInFrames={Math.round(0.12 * fps)} layout="none">
          <Audio src={i % 2 === 0 ? assets.sons.tic : assets.sons.tac || assets.sons.tic} volume={0.4} />
        </Sequence>
      ))}
      {assets.bg && assets.bg[eraIndexAt(annee)] ? (
        <img
          src={assets.bg[eraIndexAt(annee)]}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 200 * scale, objectFit: 'cover', objectPosition: '50% 34%', opacity: 0.3, filter: 'blur(4px)', WebkitMaskImage: 'linear-gradient(#000 0%, #000 23%, transparent 75%)' }}
        />
      ) : null}
      <div style={{ position: 'absolute', left: 0, top: 0, width: LOGICAL_W, height: logicalH, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: logicalH * 0.08, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* La question, en carte du jeu */}
          <div
            style={{
              width: LOGICAL_W - 36,
              padding: '20px 18px 16px',
              borderRadius: 22,
              background: '#fff',
              boxShadow: trouve ? `0 0 0 3px ${CORAL}, 0 10px 26px rgba(53,64,107,0.12)` : '0 10px 26px rgba(53,64,107,0.12)',
              position: 'relative',
              textAlign: 'center',
              opacity: entree,
              transform: `translateY(${(1 - entree) * 16}px)`,
            }}
          >
            <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', padding: '3px 12px', borderRadius: 999, background: CORAL, fontFamily: 'Nunito', fontWeight: 900, fontSize: 11, letterSpacing: 1.2, color: '#fff', whiteSpace: 'nowrap' }}>
              QUESTION {numero} / {total}
            </div>
            <div style={{ fontFamily: 'Baloo2', fontWeight: 800, fontSize: 25, lineHeight: 1.12, color: INK }}>{date.legende}</div>
            <div style={{ marginTop: 4, fontFamily: 'Nunito', fontWeight: 800, fontSize: 15, color: INK_SOFT }}>{trouve ? '✓ Bonne réponse !' : 'En quelle année ?'}</div>
          </div>
          <div style={{ height: 16 }} />
          {/* Pastille d'époque */}
          <div style={{ height: 26, display: 'flex', alignItems: 'center' }}>
            <div style={{ padding: '2px 12px', background: '#fff', borderRadius: 999, boxShadow: '0 6px 16px rgba(53,64,107,0.12)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: theme.tint, border: `1.5px solid ${theme.ink}`, boxSizing: 'border-box' }} />
              <span style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: 11, letterSpacing: 1.3, color: theme.ink }}>{theme.name}</span>
            </div>
          </div>
          <div style={{ height: 2 }} />
          {/* L'année : « ? », puis les années qui défilent, puis la réponse en grand */}
          <div
            style={{
              height: 80,
              display: 'flex',
              alignItems: 'center',
              fontFamily: 'Baloo2',
              fontWeight: 800,
              fontSize: trouve ? 72 : 56,
              lineHeight: 1.05,
              color: trouve ? INK : INK_SOFT,
              opacity: clin,
              fontVariantNumeric: 'tabular-nums',
              transform: `scale(${grand})`,
            }}
          >
            {frame <= debut ? '?' : trouve ? date.affichage || formatYear(date.annee) : formatYear(annee)}
          </div>
          <div style={{ height: 8 }} />
          <div style={{ position: 'relative', width: LOGICAL_W, height: TAPE_H }}>
            <Ruban frac={frac} assets={assets} facingLeft={facingLeft} />
            <div style={{ position: 'absolute', top: 0, left: LOGICAL_W / 2 - 2, width: 4, height: TAPE_H, borderRadius: 4, background: CORAL, boxShadow: '0 0 0 2px rgba(255,255,255,0.7)' }} />
          </div>
          <div style={{ height: 12 }} />
          <div style={{ width: LOGICAL_W - 36, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Bouton glyph="−" />
            <MiniCarte frac={frac} />
            <Bouton glyph="+" />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

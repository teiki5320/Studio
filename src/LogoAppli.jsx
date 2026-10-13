// Petit logo d'appli à côté de son nom, partout dans le Studio (listes,
// tableaux, planning). N'affiche rien si le texte ne nomme aucune appli.
import React from 'react';
import { logoAppli } from './apps.js';

// `seul` : sans marge à droite (logo affiché sans texte à côté).
export function LogoAppli({ de, taille = 20, seul = false }) {
  const src = logoAppli(de);
  if (!src) {
    return null;
  }
  return (
    <img
      src={`/${src}`}
      alt=""
      loading="lazy"
      width={taille}
      height={taille}
      style={{ width: taille, height: taille, borderRadius: Math.round(taille * 0.28), objectFit: 'cover', verticalAlign: 'middle', flex: 'none', display: 'inline-block', marginRight: seul ? 0 : 6 }}
    />
  );
}

// Animation « Ressort » : à chaque changement de page, la page glisse un peu
// et ses cartes arrivent une à une en rebond. Une « carte », c'est tout bloc
// arrondi avec une ombre (le style argile du Studio) : pas de liste à tenir
// page par page. Les cartes qui arrivent plus tard (données chargées après
// coup) rebondissent aussi, pendant les 3 secondes qui suivent.
import { useEffect } from 'react';

const ENTREE = [
  { opacity: 0, transform: 'translateY(28px) scale(.92)' },
  { opacity: 1, offset: 0.6 },
  { opacity: 1, transform: 'none' },
];
const PAGE = [
  { opacity: 0, transform: 'translateY(12px)' },
  { opacity: 1, transform: 'none' },
];
const RESSORT = 'cubic-bezier(.34, 1.56, .64, 1)';
const FENETRE_MS = 3000;
const MAX_CARTES = 40;

const calme = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function estCarte(el) {
  const s = getComputedStyle(el);
  if (s.display === 'none' || s.position === 'fixed') return false;
  return parseFloat(s.borderTopLeftRadius) >= 12 && s.boxShadow !== 'none' && el.offsetHeight > 24;
}

// Les cartes visibles, sans descendre dans une carte déjà trouvée.
function cartes(racine, deja) {
  const trouvees = [];
  const pile = [...racine.children].map((e) => [e, 0]);
  const bas = window.innerHeight + 200;
  while (pile.length && trouvees.length < MAX_CARTES) {
    const [el, prof] = pile.shift();
    if (deja.has(el) || el.closest('[data-sans-ressort]')) continue;
    if (el.getBoundingClientRect().top > bas) continue;
    if (estCarte(el)) trouvees.push(el);
    else if (prof < 8) pile.push(...[...el.children].map((e) => [e, prof + 1]));
  }
  return trouvees;
}

export function useRessort(ref, cle) {
  useEffect(() => {
    const racine = ref.current;
    if (!racine || calme() || !racine.animate) return undefined;
    racine.animate(PAGE, { duration: 400, easing: 'ease', fill: 'backwards' });
    const deja = new WeakSet();
    let image = 0;
    const jouer = () => {
      image = 0;
      cartes(racine, deja).forEach((el, i) => {
        deja.add(el);
        el.animate(ENTREE, { duration: 750, easing: RESSORT, delay: 20 + Math.min(i, 12) * 50, fill: 'backwards' });
      });
    };
    jouer();
    const obs = new MutationObserver(() => {
      if (!image) image = requestAnimationFrame(jouer);
    });
    obs.observe(racine, { childList: true, subtree: true });
    const fin = setTimeout(() => obs.disconnect(), FENETRE_MS);
    return () => {
      obs.disconnect();
      clearTimeout(fin);
      cancelAnimationFrame(image);
    };
  }, [cle]);
}

// Les bulles d'argile qui flottent en fond : [gauche %, haut %, taille px, durée s].
export const BULLES = [
  [6, 14, 140, 9],
  [78, 8, 90, 12],
  [88, 62, 180, 15],
  [30, 78, 110, 11],
  [55, 40, 60, 8],
];

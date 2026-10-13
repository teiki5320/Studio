// Mes applis et sites : nom et icône affichés sur les boutons de l'onglet
// Publicité — les mêmes que dans le Dashboard. La clé est le nom du dépôt
// GitHub en minuscules ; un dépôt absent de la liste garde son nom et 📦.
export const APP_LOOKS = {
  erea: { name: 'Erea', icon: '⏳' },
  kultiva: { name: 'Kultiva', icon: '🌱' },
  kultivaprix: { name: 'Kultiva Prix', icon: '🏷️' },
  keurcook: { name: 'Keur Cook', icon: '🍲' },
  tama: { name: 'Tama TV', icon: '📺' },
  palabre: { name: 'Palabre', icon: '🃏' },
  'd-sign': { name: 'D-Sign', icon: '🎮' },
  optiled: { name: 'OptiLED', icon: '💡' },
  keurdeco: { name: 'Keur Déco', icon: '🛋️' },
  keurbook: { name: 'Keurbook', icon: '📚' },
  solelis: { name: 'Solelis', icon: '🧭' },
  survival: { name: 'Survival', icon: '🏕️' },
};

// Applis mobiles (les autres sont des sites) : leurs pubs peuvent finir sur
// les badges officiels des boutiques où elles sont publiées.
export const APPLIS_MOBILES = new Set(['erea', 'palabre', 'kultiva', 'kultivaprix', 'tama', 'd-sign', 'survival']);

// Badges officiels (Apple, Google), rangés dans studio/.
export function badgesBoutiques(project, studioBase) {
  const depot = String(project?.repo || '').split('/').pop().toLowerCase();
  const b = project?.boutiques || {};
  if (project?.kind !== 'pub' || !APPLIS_MOBILES.has(depot)) {
    return [];
  }
  return [b.appStore ? `${studioBase}/badge-app-store.svg` : null, b.googlePlay ? `${studioBase}/badge-google-play.png` : null].filter(Boolean);
}

// Logo Afrotok dans le coin : plus nulle part (pubs, recettes, chaînes) ;
// seuls les anciens dramas le gardent.
export function logoAfrotokVisible(project) {
  return Boolean(project) && !['chaine', 'recette'].includes(project.mode) && project.kind !== 'pub';
}

// La vidéo de fin Afrotok (« Abonne-toi ») : seulement sur les anciens dramas.
export function outroAfrotok(project) {
  return logoAfrotokVisible(project);
}

// La marque d'une vidéo (logo + outro). Chaque appli a la sienne, choisie
// sur son écran dans Publicité (studio.marques[clé du dépôt]) ; les recettes
// prennent celle de Keur Cook mais ne finissent jamais sur une outro. Sans
// marque d'appli : l'ancienne règle Afrotok (anciens dramas seulement).
// L'outro propre à une chaîne passe toujours en premier.
export function marqueProjet(project, studio) {
  const s = { ...(studio || {}) };
  delete s.marques;
  const depot = project?.mode === 'recette' ? 'keurcook' : String(project?.repo || '').split('/').pop().toLowerCase();
  const m = depot ? studio?.marques?.[depot] : null;
  if (m) {
    s.sticker = m.sticker || null;
    s.outro = m.outro || null;
    s.outroIsVideo = Boolean(m.outroIsVideo);
    s.outroDurationSec = m.outroDurationSec || 0;
  } else if (!logoAfrotokVisible(project)) {
    s.sticker = null;
    s.outro = null;
  }
  if (project?.mode === 'recette') {
    s.outro = null;
  }
  if (project?.channelOutro) {
    s.outro = project.channelOutro;
    s.outroIsVideo = Boolean(project.channelOutroIsVideo);
    s.outroDurationSec = project.channelOutroDurationSec || 4;
  }
  return s;
}

// Dépôts qui ne sont pas des produits à promouvoir.
export const NOT_ADVERTISED = new Set(['dashboard', 'drama-studio', 'studio', 'bd']);

export function appLook(repoName, fallbackLabel = '') {
  const key = String(repoName || '').toLowerCase();
  return APP_LOOKS[key] || { name: fallbackLabel || repoName, icon: '📦' };
}

// Tests des parties « Parcours » des fiches (maquette F2) : ce que la routine
// écrit doit se relire tel quel — trajets, phases, boutiques, poids, reste.
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { extractParcours, extractPhases, extractBoutiques } = require('./apps-build.cjs');

test('un trajet se lit étape par étape, avec son état', () => {
  const md = [
    '# Infra',
    '## En bref',
    '- **Plateforme** : iOS et Android, un seul code Flutter.',
    '## Parcours',
    '- 🍎 **iOS** : 🐙 GitHub — main · CI au vert [ok] → ☁️ Xcode Cloud — build signée [ok] → 📱 App Store — pas publiée [pas encore]',
    '- 🌐 **Web** : 📁 docs/ [ok] → 🔗 palabre.toakeur.com — racine en 404 [bloquant]',
  ].join('\n');
  const p = extractParcours(md);
  assert.deepStrictEqual(p.enBref, [{ label: 'Plateforme', value: 'iOS et Android, un seul code Flutter' }]);
  assert.strictEqual(p.trajets.length, 2);
  assert.strictEqual(p.trajets[0].nom, 'iOS');
  assert.strictEqual(p.trajets[0].emoji, '🍎');
  assert.deepStrictEqual(p.trajets[0].etapes[1], { emoji: '☁️', nom: 'Xcode Cloud', note: 'build signée', etat: 'ok' });
  assert.strictEqual(p.trajets[0].etapes[2].etat, 'none');
  assert.deepStrictEqual(p.trajets[1].etapes[1], { emoji: '🔗', nom: 'palabre.toakeur.com', note: 'racine en 404', etat: 'ko' });
});

test('les phases, les points forts et les mesures', () => {
  const md = [
    '## Rémunération par phases',
    "- [fait] **Aujourd'hui** : aucune monétisation",
    '- [en cours] **Décision** : trancher le modèle',
    '- **Gratuit + pub** : interstitiel',
    '## Points forts',
    '- 🃏 **La densité narrative** : 687 cartes',
    '## Mesures',
    '- **Installations** : à vérifier dans la console',
  ].join('\n');
  const r = extractPhases(md);
  assert.deepStrictEqual(r.phases.map((x) => x.etat), ['ok', 'run', 'none']);
  assert.strictEqual(r.phases[1].titre, 'Décision');
  assert.deepStrictEqual(r.forces[0], { emoji: '🃏', titre: 'La densité narrative', texte: '687 cartes' });
  assert.deepStrictEqual(r.mesures, [{ label: 'Installations', value: 'à vérifier dans la console' }]);
});

test('boutiques en tableau, poids en jauge, ce qui reste numéroté', () => {
  const md = [
    '## Boutiques',
    '| | 🍎 App Store | 🤖 Google Play |',
    '|---|---|---|',
    '| État | [à faire] Chaîne prête | [à faire] Aucune soumission |',
    '| Construction | [ok] Xcode Cloud | [à faire] À la main |',
    '## Poids',
    '- 🤖 **Poids du bundle Android** : 143,3 / 150 Mo — recompresser les images',
    '## Ce qui reste, dans l’ordre',
    '1. ✅ **Trancher le modèle** : fait le 12/10',
    '2. **Page d’accueil** : la racine renvoie une 404',
  ].join('\n');
  const b = extractBoutiques(md);
  assert.deepStrictEqual(b.boutiques.colonnes, ['🍎 App Store', '🤖 Google Play']);
  assert.deepStrictEqual(b.boutiques.lignes[1], { label: 'Construction', cellules: [{ etat: 'ok', texte: 'Xcode Cloud' }, { etat: 'run', texte: 'À la main' }] });
  assert.deepStrictEqual(b.poids[0], { emoji: '🤖', titre: 'Poids du bundle Android', valeur: 143.3, max: 150, unite: 'Mo', note: 'recompresser les images' });
  assert.deepStrictEqual(b.reste.map((x) => x.fait), [true, false]);
  assert.strictEqual(b.reste[1].titre, 'Page d’accueil');
});

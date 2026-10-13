// Formulaires et cartes réutilisés par les pages du studio (Shell.jsx) :
// ma marque, voix françaises, fiche d'une appli, création d'une chaîne.
import React, { useEffect, useRef, useState } from 'react';
import { VOICES } from '../shared/catalog.js';
import { api, fileToDataUrl } from './api.js';

// « Ma marque » : sticker (logo) et outro perso, appliqués à tous les épisodes.
// `appli` : la marque de cette appli (écran Publicité) ; chaque appli a son
// logo et son outro, pour pouvoir changer de chaîne et de marque.
export function BrandCard({ studio, onChange, appli }) {
  const marque = appli ? studio?.marques?.[appli] || {} : studio;
  const [busy, setBusy] = useState(false);

  const upload = async (file, kind) => {
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      if (kind === 'sticker') {
        await api.uploadSticker(dataUrl, appli);
      } else {
        await api.uploadOutro(dataUrl, appli);
      }
      onChange();
    } catch (e) {
      alert(`Envoi impossible : ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (kind) => {
    setBusy(true);
    try {
      if (kind === 'sticker') {
        await api.deleteSticker(appli);
      } else {
        await api.deleteOutro(appli);
      }
      onChange();
    } finally {
      setBusy(false);
    }
  };

  // Une carte par élément (maquette Réglages « R1 ») : aperçu en grand,
  // puis Changer / Retirer.
  const carte = (kind, titre, aide, accept) => {
    const fichier = marque?.[kind];
    const video = kind === 'outro' && marque?.outroIsVideo;
    return (
      <div className="rg-carte rg-marque">
        <div className="rg-carte-h">
          <h3>{titre}</h3>
          {fichier ? <span className="rg-etat ok">✓ en place</span> : <span className="rg-etat none">aucun</span>}
        </div>
        {appli ? null : <p className="rg-aide">{aide}</p>}
        <div className="rg-apercu">
          {!fichier ? (
            <span>{kind === 'sticker' ? 'Aucun sticker' : 'Aucun outro'}</span>
          ) : video ? (
            <video src={`/studio/${fichier}`} muted loop autoPlay playsInline />
          ) : (
            <img src={`/studio/${fichier}`} alt={titre} />
          )}
        </div>
        <div className="rg-actions">
          <label className="clay-btn small">
            ⬆️ {fichier ? 'Changer' : 'Ajouter'}
            <input type="file" accept={accept} hidden disabled={busy} onChange={(e) => e.target.files[0] && upload(e.target.files[0], kind)} />
          </label>
          {fichier ? (
            <button className="clay-btn small ghost" disabled={busy} onClick={() => remove(kind)}>
              🗑️ Retirer
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className={`rg-duo${appli ? ' rg-duo-compact' : ''}`}>
      {carte('sticker', 'Sticker (logo)', 'Affiché en haut à droite de chaque vidéo de cette appli. PNG transparent recommandé.', 'image/png,image/jpeg,image/webp')}
      {carte('outro', 'Outro de fin', 'Ajoutée à la fin de chaque vidéo de cette appli (pas des recettes). MP4 court, 15 s max.', 'video/mp4,video/quicktime,image/png,image/jpeg,image/webp')}
    </div>
  );
}

// « Voix françaises » : découverte des meilleures voix NATIVEMENT françaises de
// la bibliothèque ElevenLabs — pré-écoute gratuite, adoption en un clic. Les
// voix adoptées rejoignent le catalogue (casting Claude + menus de voix).
export function FrenchVoicesCard({ voices, onChange }) {
  const [library, setLibrary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const adopted = voices.filter((v) => v.custom);

  const search = async () => {
    setBusy(true);
    setError(null);
    try {
      setLibrary(await api.libraryVoices());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const listen = (url) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    audioRef.current = new Audio(url);
    audioRef.current.play().catch(() => {});
  };

  const adopt = async (v) => {
    setBusy(true);
    setError(null);
    try {
      await api.adoptVoice({
        publicOwnerId: v.publicOwnerId,
        voiceId: v.voiceId,
        name: v.name,
        gender: v.gender,
        desc: v.desc,
      });
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setBusy(true);
    try {
      await api.removeCustomVoice(id);
      onChange();
    } finally {
      setBusy(false);
    }
  };

  // La bibliothèque se charge d'elle-même (pré-écoute gratuite).
  useEffect(() => {
    search();
  }, []);

  return (
    <>
      <div className="rg-carte">
        <div className="rg-carte-h">
          <h3>🇫🇷 Voix adoptées</h3>
          <small>dans les menus de voix et le casting automatique</small>
        </div>
        {adopted.length ? (
          <div className="rg-voix-adoptees">
            {adopted.map((v) => (
              <div key={v.id} className="rg-voix">
                <span className="av">{v.gender === 'femme' ? '👩' : '👨'}</span>
                <span className="t">
                  <b>{v.name}</b>
                  <small>{v.desc}</small>
                </span>
                <button className="rg-x" title="Retirer cette voix" disabled={busy} onClick={() => remove(v.id)}>
                  ✓
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rg-aide">Aucune voix adoptée pour l’instant.</p>
        )}
      </div>

      <div className="rg-carte">
        <div className="rg-carte-h">
          <h3>Bibliothèque ElevenLabs</h3>
          <small>voix nativement françaises · pré-écoute gratuite</small>
        </div>
        {error && <p className="error small">{error}</p>}
        {!library ? (
          <p className="rg-aide">{busy ? '⏳ Recherche des meilleures voix françaises…' : ''}</p>
        ) : (
          <div className="rg-lignes">
            {library.length === 0 && <p className="rg-aide">Aucune voix trouvée.</p>}
            {library.map((v) => {
              const already = voices.some((x) => x.id === v.voiceId);
              return (
                <div key={v.voiceId} className="rg-ligne rg-ligne-voix">
                  <span className="av">{v.gender === 'femme' ? '👩' : '👨'}</span>
                  <span className="t">
                    <b>
                      {v.name} <em>({v.gender})</em>
                    </b>
                    <small>{v.desc}</small>
                  </span>
                  <span className="rg-actions">
                    {v.previewUrl && (
                      <button className="clay-btn small ghost" onClick={() => listen(v.previewUrl)}>
                        ▶️ Écouter
                      </button>
                    )}
                    {already ? (
                      <span className="rg-etat ok">✓ Adoptée</span>
                    ) : (
                      <button className="clay-btn small" disabled={busy} onClick={() => adopt(v)}>
                        ＋ Adopter
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// Création d'une APPLI à promouvoir : son identité commerciale (ce qu'elle
// fait, pour qui, ce qu'elle propose, l'appel à l'action). Ensuite, dans
// l'appli, on enchaîne autant de pubs que d'angles à tester.
export function AppCreate({ onSubmit, error, voices = VOICES }) {
  const [name, setName] = useState('');
  const [pitch, setPitch] = useState('');
  const [platform, setPlatform] = useState('iOS');
  const [audience, setAudience] = useState('');
  const [features, setFeatures] = useState('');
  const [tone, setTone] = useState('probleme');
  const [cta, setCta] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [visualStyle, setVisualStyle] = useState('photorealiste');
  const [targetSeconds, setTargetSeconds] = useState(30);
  const [narratorVoice, setNarratorVoice] = useState('onwK4e9ZLuTAKqWW03F9');

  // Remplissage depuis un dépôt GitHub : on choisit, Claude lit le README.
  const [repos, setRepos] = useState([]);
  const [repo, setRepo] = useState('');
  const [reposError, setReposError] = useState('');
  const [reposLoading, setReposLoading] = useState(true);
  const [siteUrl, setSiteUrl] = useState('');
  const [briefBusy, setBriefBusy] = useState(false);
  const [briefInfo, setBriefInfo] = useState('');
  const [briefError, setBriefError] = useState('');

  // fresh = true : ignore le cache du serveur (bouton « Recharger »).
  const loadRepos = (fresh, isAlive = () => true) => {
    setReposLoading(true);
    setReposError('');
    api
      .githubRepos(fresh)
      .then((d) => isAlive() && setRepos(d.repos || []))
      .catch((e) => isAlive() && setReposError(e.message))
      .finally(() => isAlive() && setReposLoading(false));
  };

  useEffect(() => {
    let alive = true;
    loadRepos(false, () => alive);
    return () => {
      alive = false;
    };
  }, []);

  // fetchBrief : lecture d'un dépôt GitHub ou d'un site — même fiche en retour.
  const fillFrom = async (fetchBrief) => {
    setBriefBusy(true);
    setBriefError('');
    setBriefInfo('');
    try {
      const d = await fetchBrief();
      const f = d.fields || {};
      // On ne remplace que ce que Claude a su remplir : ce que tu as déjà tapé
      // reste — y compris ce que tu as tapé PENDANT la lecture du README.
      const fill = (value, set) => {
        if (value) {
          set((current) => (current.trim() ? current : value));
        }
      };
      fill(f.name, setName);
      fill(f.pitch, setPitch);
      fill(f.audience, setAudience);
      fill(f.features, setFeatures);
      fill(f.cta, setCta);
      fill(f.storeUrl, setStoreUrl);
      if (f.platform && /android/i.test(f.platform) && !/ios/i.test(f.platform)) {
        setPlatform('Android');
      } else if (f.platform && /ios|iphone/i.test(f.platform)) {
        setPlatform(/android/i.test(f.platform) ? 'iOS et Android' : 'iOS');
      }
      setBriefInfo(
        [
          `✅ Fiche remplie depuis ${d.repo}.`,
          d.hadReadme ? '' : ' (peu de texte à lire : la fiche risque d’être maigre)',
          d.notes ? ` À compléter : ${d.notes}` : '',
          ' Relis tout avant de valider.',
        ].join(''),
      );
    } catch (e) {
      setBriefError(e.message);
    } finally {
      setBriefBusy(false);
    }
  };

  return (
    <section className="create-card custom-form">
      <h2>➕ Nouvelle appli</h2>
      <p className="section-label">
        Décris ton appli une seule fois : Claude s'en sert ensuite pour écrire autant de pubs que
        tu veux, chacune sous un angle différent. Tu pourras ajouter tes captures d'écran juste
        après — elles sont insérées telles quelles dans les vidéos (aucun crédit).
      </p>
      <div className="form-field">
        <label>🐙 Partir d'un dépôt GitHub ou d'un site (raccourci)</label>
        <p className="field-hint">
          Choisis le dépôt de l'appli, ou colle l'adresse de son site : Claude le lit et
          remplit les questions ci-dessous. Il ne touche pas aux champs que tu as déjà remplis, et n'invente aucun
          chiffre — relis avant de valider.
        </p>
        {reposError ? (
          <p className="field-hint">
            ⚠️ Dépôts illisibles : {reposError} — remplis à la main, ou{' '}
            <button className="btn-small" onClick={() => loadRepos(true)}>
              🔄 Réessayer
            </button>
          </p>
        ) : (
          <div className="topic-bar">
            <select
              className="season-select"
              value={repo}
              disabled={briefBusy}
              onChange={(e) => setRepo(e.target.value)}
            >
              <option value="">
                {reposLoading
                  ? 'chargement des dépôts…'
                  : repos.length
                    ? '— choisis un dépôt —'
                    : 'aucun dépôt trouvé sur ce compte'}
              </option>
              {repos.map((r) => (
                <option key={r.fullName} value={r.fullName}>
                  {r.private ? '🔒 ' : ''}
                  {r.label}
                  {r.description ? ` — ${r.description.slice(0, 60)}` : ''}
                </option>
              ))}
            </select>
            <button
              className="btn-small"
              disabled={reposLoading || briefBusy}
              title="Recharger la liste des dépôts"
              onClick={() => loadRepos(true)}
            >
              🔄
            </button>
            <button
              className="btn-small"
              disabled={!repo || briefBusy}
              onClick={() => fillFrom(() => api.repoBrief(repo))}
            >
              {briefBusy ? '⏳ Lecture…' : '✨ Remplir la fiche'}
            </button>
          </div>
        )}
        <div className="topic-bar" style={{ marginTop: 8 }}>
          <input
            value={siteUrl}
            disabled={briefBusy}
            placeholder="ou l'adresse d'un site — ex. : keurcook.com"
            onChange={(e) => setSiteUrl(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="btn-small"
            disabled={siteUrl.trim().length < 4 || briefBusy}
            onClick={() => fillFrom(() => api.siteBrief(siteUrl.trim()))}
          >
            {briefBusy ? '⏳ Lecture…' : '🌐 Lire le site'}
          </button>
        </div>
        {briefInfo && <p className="field-hint">{briefInfo}</p>}
        {briefError && <p className="error">{briefError}</p>}
      </div>
      <div className="form-field">
        <label>1. 📱 Nom de l'appli (obligatoire)</label>
        <input
          value={name}
          maxLength={80}
          placeholder="Ex. : Erea"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label>2. 💡 Ce qu'elle fait, en une phrase (obligatoire)</label>
        <p className="field-hint">Comme si tu l'expliquais à un ami — le bénéfice, pas la technique.</p>
        <input
          value={pitch}
          maxLength={400}
          placeholder="Ex. : un jeu de culture historique où l'on place les événements sur une grande frise du temps"
          onChange={(e) => setPitch(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label>3. 🎯 À qui elle s'adresse</label>
        <input
          value={audience}
          maxLength={200}
          placeholder="Ex. : familles, curieux d'histoire, joueurs de quiz de 15 à 60 ans"
          onChange={(e) => setAudience(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label>4. ✨ Ce qu'elle propose (une ligne par élément)</label>
        <p className="field-hint">
          Modes de jeu, fonctions clés, chiffres réels… Claude y pioche des arguments concrets —
          il n'invente rien d'autre.
        </p>
        <textarea
          rows={5}
          value={features}
          maxLength={800}
          placeholder={'Défi du jour : 10 mêmes questions pour tout le monde\nMode Chrono : 10 secondes par question\n1 738 événements vérifiés\nClassements mondiaux Game Center'}
          onChange={(e) => setFeatures(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label>5. 🎭 Ton des pubs</label>
        <select value={tone} onChange={(e) => setTone(e.target.value)}>
          <option value="probleme">😤 Problème → solution</option>
          <option value="temoignage">🗣️ Témoignage</option>
          <option value="demo">📲 Démo de l'appli</option>
          <option value="punchy">⚡ Punchy / rythme TikTok</option>
          <option value="storytelling">📖 Mini-histoire</option>
        </select>
      </div>
      <div className="form-field">
        <label>6. 📣 Appel à l'action final</label>
        <input
          value={cta}
          maxLength={120}
          placeholder={name ? `Télécharge ${name} sur l'App Store` : "Télécharge l'appli sur l'App Store"}
          onChange={(e) => setCta(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label>7. 🎨 Style des images générées</label>
        <select value={visualStyle} onChange={(e) => setVisualStyle(e.target.value)}>
          <option value="photorealiste">📷 Photoréaliste</option>
          <option value="illustration">🖌️ Illustration moderne</option>
          <option value="archives">🎞️ Style archives / sépia</option>
          <option value="epure">◻️ Épuré / minimaliste</option>
        </select>
      </div>
      <div className="form-field">
        <label>8. ⏱️ Durée des pubs</label>
        <select value={targetSeconds} onChange={(e) => setTargetSeconds(Number(e.target.value))}>
          {[30, 40, 45, 50, 60].map((sec) => (
            <option key={sec} value={sec}>
              {sec} secondes {sec === 30 ? '(recommandé)' : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label>9. 🎙️ La voix des pubs</label>
        <select value={narratorVoice} onChange={(e) => setNarratorVoice(e.target.value)}>
          {voices.map((v) => (
            <option key={v.id} value={v.id}>
              🎙️ {v.name} — {v.desc}
            </option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label>10. 🔗 Lien de la fiche (optionnel)</label>
        <input
          value={storeUrl}
          maxLength={300}
          placeholder="https://apps.apple.com/…"
          onChange={(e) => setStoreUrl(e.target.value)}
        />
      </div>
      {error && <p className="error">{error}</p>}
      <button
        className="btn-primary"
        disabled={name.trim().length < 2 || pitch.trim().length < 10}
        onClick={() =>
          onSubmit({
            name: name.trim(),
            pitch: pitch.trim(),
            platform,
            audience: audience.trim(),
            features,
            tone,
            cta: cta.trim(),
            storeUrl: storeUrl.trim(),
            visualStyle,
            targetSeconds,
            narratorVoice,
          })
        }
      >
        📱 Ajouter l'appli
      </button>
    </section>
  );
}


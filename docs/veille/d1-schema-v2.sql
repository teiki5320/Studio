-- Schéma Cloudflare D1 — veille actus (option hybride) — v2 : images
-- Option A n'en a pas besoin : elle écrit directement actus.json sur GitHub.

-- Flux RSS suivis
CREATE TABLE IF NOT EXISTS sources (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nom         TEXT    NOT NULL,              -- ex. 'RFI Afrique'
  url_flux    TEXT    NOT NULL UNIQUE,       -- URL du flux RSS
  site        TEXT    NOT NULL CHECK (site IN ('keurfoot','palabre')),
  theme       TEXT    NOT NULL,              -- 'foot', 'politique'…
  pays        TEXT,                          -- 'SN', 'TG,BJ'… (NULL = tous)
  mots_cles   TEXT,                          -- filtre optionnel, séparés par des virgules
  actif       INTEGER NOT NULL DEFAULT 1,
  dernier_ok  TEXT,                          -- date dernière lecture réussie
  erreurs     INTEGER NOT NULL DEFAULT 0     -- échecs consécutifs
);

-- Actus collectées puis résumées
CREATE TABLE IF NOT EXISTS actus (
  id             TEXT PRIMARY KEY,           -- SHA-1 de source_url
  site           TEXT NOT NULL CHECK (site IN ('keurfoot','palabre')),
  theme          TEXT,
  pays           TEXT,                       -- 'SN' ou 'SN,BJ'
  competition    TEXT,                       -- Keur Foot uniquement
  titre_original TEXT NOT NULL,              -- usage interne, jamais affiché
  titre          TEXT,                       -- reformulé par Claude
  resume         TEXT,                       -- 2-3 lignes réécrites
  source_id      INTEGER REFERENCES sources(id),
  source_nom     TEXT NOT NULL,
  source_url     TEXT NOT NULL UNIQUE,
  autres_sources TEXT,                       -- JSON array d'URLs (doublons fusionnés)
  image_url      TEXT,                       -- jamais l'image de l'article source
  image_source   TEXT CHECK (image_source IN ('wikimedia','pexels','unsplash','pixabay','banque','carte')),
  image_credit   TEXT,
  image_licence  TEXT,
  image_page     TEXT,                       -- page d'origine (attribution)
  image_alt      TEXT,
  publie_le      TEXT NOT NULL,
  collecte_le    TEXT NOT NULL DEFAULT (datetime('now')),
  resume_le      TEXT,
  statut         TEXT NOT NULL DEFAULT 'nouveau'
                 CHECK (statut IN ('nouveau','resume','ignore','erreur'))
);

CREATE INDEX IF NOT EXISTS idx_actus_statut   ON actus (statut, collecte_le);
CREATE INDEX IF NOT EXISTS idx_actus_affichage ON actus (site, statut, publie_le DESC);
CREATE INDEX IF NOT EXISTS idx_actus_pays     ON actus (site, pays, publie_le DESC);

-- Anti-répétition : pas la même image_url dans les 20 dernières actus du site
CREATE INDEX IF NOT EXISTS idx_actus_image ON actus (site, image_url);

-- Requêtes utilisées par l'API du Worker
-- GET /a-resumer (clé requise)
--   SELECT id, site, theme, pays, titre_original, source_nom, source_url
--   FROM actus WHERE statut = 'nouveau' ORDER BY collecte_le LIMIT 30;
-- POST /resumes (clé requise)
--   UPDATE actus SET titre = ?, resume = ?, image_url = ?, image_source = ?, image_credit = ?, image_licence = ?, image_page = ?, image_alt = ?, statut = 'resume', resume_le = datetime('now') WHERE id = ?;
-- GET /actus?site=palabre&pays=SN (public)
--   SELECT id, titre, resume, image_url, image_credit, image_licence, image_page, image_alt, theme, pays, competition, source_nom, source_url, publie_le
--   FROM actus WHERE site = ? AND statut = 'resume' AND (? IS NULL OR pays LIKE '%' || ? || '%')
--   ORDER BY publie_le DESC LIMIT 50;

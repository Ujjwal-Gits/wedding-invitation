// Theme slot manifests (src/themes/<slug>/slots.js, THEME-CONTRACT §9). Plain-data ES modules in
// this repository, loaded with a dynamic import. Only the eight known theme slugs are ever loaded,
// so no user input reaches the import path. A manifest that does not exist yet is simply null.
import { statSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT_DIR } from './env.js';
import { listThemes, isTheme } from './catalog.js';
import { normParts } from '../../src/core/mix-rules.js';

const cache = new Map(); // theme -> { mtime, manifest }
let vocabCache = { mtime: -1, vocab: { images: {}, texts: {} } };

/** The shared slot vocabulary (src/core/slot-vocab.js): { images: { key: label }, texts: { key: label } }. */
export async function loadVocab() {
  const file = resolve(ROOT_DIR, 'src', 'core', 'slot-vocab.js');
  let mtime;
  try { mtime = statSync(file).mtimeMs; } catch { return vocabCache.vocab; }
  if (mtime === vocabCache.mtime) return vocabCache.vocab;
  try {
    const mod = await import(`${pathToFileURL(file).href}?v=${mtime}`);
    const v = mod.SHARED_SLOTS || mod.default || {};
    vocabCache = { mtime, vocab: { images: { ...(v.images || {}) }, texts: { ...(v.texts || {}) } } };
  } catch (err) {
    console.warn(`[slots] could not load slot-vocab.js: ${err.message}`);
  }
  return vocabCache.vocab;
}

const ID_RE = /^[a-z0-9][a-zA-Z0-9._-]{0,63}$/;
export const COLOR_TOKEN_RE = /^--[a-z0-9-]{1,40}$/;
export const COLOR_HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function clean(raw, theme) {
  const m = raw?.default ?? raw;
  if (!m || typeof m !== 'object') return null;
  const images = {};
  const texts = {};
  for (const [id, s] of Object.entries(m.images || {})) {
    if (!ID_RE.test(id) || !s || typeof s !== 'object') continue;
    images[id] = {
      label: String(s.label || id).slice(0, 160),
      kind: ['couple', 'bride', 'groom', 'scene', 'detail'].includes(s.kind) ? s.kind : 'scene',
      default: s.default ?? null,
      note: s.note ? String(s.note).slice(0, 300) : '',
      shared: typeof s.shared === 'string' && ID_RE.test(s.shared) ? s.shared : null,
    };
  }
  for (const [id, s] of Object.entries(m.texts || {})) {
    if (!ID_RE.test(id) || !s || typeof s !== 'object') continue;
    const max = Number.isInteger(s.max) && s.max > 0 ? Math.min(s.max, 2000) : 200;
    texts[id] = {
      label: String(s.label || id).slice(0, 160),
      default: { en: String(s.default?.en ?? ''), ne: String(s.default?.ne ?? '') },
      max,
      multiline: Boolean(s.multiline),
      shared: typeof s.shared === 'string' && ID_RE.test(s.shared) ? s.shared : null,
    };
  }
  // colors: { '--token': { label, default: '#hex', note? } } (PLATFORM.md: theme colour manifests)
  const colors = {};
  for (const [token, s] of Object.entries(m.colors && typeof m.colors === 'object' ? m.colors : {})) {
    if (!COLOR_TOKEN_RE.test(token) || !s || typeof s !== 'object') continue;
    colors[token] = {
      label: String(s.label || token).slice(0, 160),
      default: typeof s.default === 'string' && COLOR_HEX_RE.test(s.default) ? s.default.toLowerCase() : '',
      note: s.note ? String(s.note).slice(0, 300) : '',
    };
  }
  const name = typeof m.name === 'string' ? m.name.slice(0, 40) : '';
  const description = typeof m.description === 'string' ? m.description.slice(0, 160) : '';
  // Mix (docs/MIX.md): what the theme gives and takes. Booleans only; `uses` lists keep only ids and tokens this
  // manifest declares; `why` lines at most 200 characters. Whether the modules exist is checked on every load.
  const rawParts = m.parts && typeof m.parts === 'object' && !Array.isArray(m.parts) ? m.parts : null;
  return { theme, name, description, images, texts, colors, rawParts };
}

/** The theme's `parts`, given only when its module file exists (src/themes/<slug>/gate.js, hero.js). */
function partsWithFiles(manifest) {
  const dir = resolve(ROOT_DIR, 'src', 'themes', manifest.theme);
  const files = { gate: existsSync(resolve(dir, 'gate.js')), hero: existsSync(resolve(dir, 'hero.js')) };
  return normParts(manifest.rawParts, manifest.theme, manifest, files);
}

/** The manifest for a theme, or null while the theme has not published one. Reloaded when the file changes. */
export async function loadManifest(theme) {
  if (!isTheme(theme)) return null;
  const file = resolve(ROOT_DIR, 'src', 'themes', theme, 'slots.js');
  let mtime;
  try { mtime = statSync(file).mtimeMs; } catch { cache.delete(theme); return null; }
  const hit = cache.get(theme);
  if (hit && hit.mtime === mtime) return withParts(hit.manifest);
  let manifest = null;
  try {
    manifest = clean(await import(`${pathToFileURL(file).href}?v=${mtime}`), theme);
  } catch (err) {
    console.warn(`[slots] could not load ${theme}/slots.js: ${err.message}`);
    manifest = hit?.manifest ?? null; // keep the last good one while a theme is mid-edit
  }
  cache.set(theme, { mtime, manifest });
  return withParts(manifest);
}

/** A copy with `parts` resolved against the module files on disk now (a module can arrive after its manifest). */
function withParts(manifest) {
  if (!manifest) return null;
  const { rawParts, ...rest } = manifest;
  return { ...rest, parts: partsWithFiles(manifest) };
}

/**
 * Everything the validator needs about slots: every theme's manifest (null when missing),
 * the shared vocabulary, and for each shared text key the smallest `max` any theme allows
 * (so a shared line fits in every theme that shows it).
 */
export async function slotInfo() {
  const manifests = {};
  for (const t of listThemes()) manifests[t.slug] = await loadManifest(t.slug);
  const vocab = await loadVocab();
  const sharedMax = {};
  for (const m of Object.values(manifests)) {
    for (const spec of Object.values(m?.texts || {})) {
      if (spec.shared) sharedMax[spec.shared] = Math.min(sharedMax[spec.shared] ?? Infinity, spec.max);
    }
  }
  return { manifests, vocab, sharedMax };
}

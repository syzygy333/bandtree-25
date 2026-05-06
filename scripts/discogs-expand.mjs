import { DiscogsClient } from './lib/discogs-client.mjs';
import {
  ContentfulExpandStore,
  normalizeKey,
  slugify,
} from './lib/contentful-expand-store.mjs';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function stripWrappingQuotes(value) {
  if (!value) return value;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function loadDotEnv() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.resolve(scriptDir, '../.env');
  if (!existsSync(envPath)) return;

  const raw = readFileSync(envPath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const equalIdx = trimmed.indexOf('=');
    if (equalIdx < 1) return;

    const key = trimmed.slice(0, equalIdx).trim();
    const value = stripWrappingQuotes(trimmed.slice(equalIdx + 1).trim());
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

function readEnv(primaryKey, aliases = []) {
  const candidates = [primaryKey, ...aliases];
  for (const key of candidates) {
    const value = process.env[key];
    if (value && value.trim()) return value.trim();
  }
  return '';
}

function parseArgs(argv) {
  const args = {
    genre: [],
    style: [],
    label: [],
    artist: [],
    query: '',
    country: '',
    startYear: undefined,
    endYear: undefined,
    maxBands: 25,
    maxReleasesPerBand: 10,
    maxSearchPages: 5,
    maxCandidateReleases: 150,
    maxApiCalls: 600,
    requestGapMs: 1200,
    checkpointFile: '.discogs-expand-state.json',
    dryRun: false,
    verbose: false,
    skipExisting: true,
    updateExisting: false,
    masterOnly: true,
    musicianRoleMode: 'performance-only',
    albumOnly: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    const requiresValue = (value) => {
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for ${token}`);
      }
      return value;
    };

    if (token === '--genre') args.genre.push(requiresValue(next)), i += 1;
    else if (token === '--style') args.style.push(requiresValue(next)), i += 1;
    else if (token === '--label') args.label.push(requiresValue(next)), i += 1;
    else if (token === '--artist') args.artist.push(requiresValue(next)), i += 1;
    else if (token === '--query') args.query = requiresValue(next), i += 1;
    else if (token === '--country') args.country = requiresValue(next), i += 1;
    else if (token === '--start-year') args.startYear = Number(requiresValue(next)), i += 1;
    else if (token === '--end-year') args.endYear = Number(requiresValue(next)), i += 1;
    else if (token === '--max-bands') args.maxBands = Number(requiresValue(next)), i += 1;
    else if (token === '--max-releases-per-band') args.maxReleasesPerBand = Number(requiresValue(next)), i += 1;
    else if (token === '--max-search-pages') args.maxSearchPages = Number(requiresValue(next)), i += 1;
    else if (token === '--max-candidate-releases') args.maxCandidateReleases = Number(requiresValue(next)), i += 1;
    else if (token === '--max-api-calls') args.maxApiCalls = Number(requiresValue(next)), i += 1;
    else if (token === '--request-gap-ms') args.requestGapMs = Number(requiresValue(next)), i += 1;
    else if (token === '--checkpoint-file') args.checkpointFile = requiresValue(next), i += 1;
    else if (token === '--dry-run') args.dryRun = true;
    else if (token === '--verbose') args.verbose = true;
    else if (token === '--skip-existing') args.skipExisting = true;
    else if (token === '--no-skip-existing') args.skipExisting = false;
    else if (token === '--update-existing') args.updateExisting = true;
    else if (token === '--master-only') args.masterOnly = true;
    else if (token === '--no-master-only') args.masterOnly = false;
    else if (token === '--musician-role-mode') args.musicianRoleMode = requiresValue(next), i += 1;
    else if (token === '--album-only') args.albumOnly = true;
    else if (token === '--no-album-only') args.albumOnly = false;
  }

  return args;
}

function buildDiscoverySearches(options) {
  const searches = [];

  if (options.label.length) {
    options.label.forEach((label) => {
      searches.push({
        type: 'release',
        label,
      });
    });
  }

  if (options.artist.length) {
    options.artist.forEach((artist) => {
      searches.push({
        type: 'release',
        artist,
      });
    });
  }

  if (options.genre.length || options.style.length || options.query || options.country) {
    searches.push({
      type: 'release',
      q: options.query || undefined,
      genre: options.genre[0] || undefined,
      style: options.style[0] || undefined,
      country: options.country || undefined,
    });
  }

  if (!searches.length) {
    searches.push({ type: 'release', q: 'rock' });
  }

  return searches;
}

function buildTracksRichText(tracklist) {
  if (!Array.isArray(tracklist) || !tracklist.length) return null;

  const items = tracklist
    .map((track) => {
      const title = String(track?.title || '').trim();
      if (!title) return null;

      return {
        nodeType: 'list-item',
        data: {},
        content: [
          {
            nodeType: 'paragraph',
            data: {},
            content: [
              {
                nodeType: 'text',
                value: title,
                marks: [],
                data: {},
              },
            ],
          },
        ],
      };
    })
    .filter(Boolean);

  if (!items.length) return null;

  return {
    nodeType: 'document',
    data: {},
    content: [
      {
        nodeType: 'ordered-list',
        data: {},
        content: items,
      },
    ],
  };
}

function hasAlbumFormat(formatValues) {
  if (!Array.isArray(formatValues)) return false;
  return formatValues.some((value) => String(value || '').toLowerCase() === 'album');
}

function isAlbumSearchResult(row) {
  return hasAlbumFormat(row?.format);
}

function isAlbumRelease(release) {
  if (!Array.isArray(release?.formats)) return false;
  return release.formats.some((format) => hasAlbumFormat(format?.descriptions || []));
}

function mapReleaseToFields(release, bandName) {
  const yearValue = Number(release.year);
  const safeYear = Number.isFinite(yearValue) && yearValue >= 1877 && yearValue <= 3000
    ? yearValue
    : null;
  const title = release.title || 'Untitled release';

  return {
    title,
    slug: slugify(title),
    year: safeYear,
    tracks: buildTracksRichText(release.tracklist),
    _bandName: bandName,
  };
}

function mapMusicianFromCredit(credit) {
  const name = credit.name || credit.anv || '';
  if (!name) return null;
  return {
    name,
    slug: slugify(name),
  };
}

const NON_PERFORMANCE_ROLE_KEYWORDS = [
  'producer',
  'engineer',
  'mastered',
  'mixed',
  'recorded by',
  'programmed by',
  'design',
  'layout',
  'artwork',
  'illustration',
  'photography',
  'photo',
  'liner notes',
  'management',
  'a&r',
  'legal',
];

function isPerformerCredit(credit, roleMode) {
  if (roleMode === 'all') return true;
  const role = String(credit?.role || '').toLowerCase();
  if (!role) return true;
  return !NON_PERFORMANCE_ROLE_KEYWORDS.some((keyword) => role.includes(keyword));
}

function collectMusicianCredits(release, bandName, roleMode = 'performance-only') {
  const combined = [
    ...(Array.isArray(release.artists) ? release.artists : []),
    ...(Array.isArray(release.extraartists) ? release.extraartists : []),
  ];

  const dedupedByName = new Map();
  const normalizedBandName = normalizeKey(bandName || '');
  combined.forEach((credit) => {
    if (!isPerformerCredit(credit, roleMode)) return;
    const mapped = mapMusicianFromCredit(credit);
    if (!mapped) return;
    const key = normalizeKey(mapped.name);
    if (normalizedBandName && key === normalizedBandName) return;
    if (!dedupedByName.has(key)) {
      dedupedByName.set(key, mapped);
    }
  });

  return [...dedupedByName.values()];
}

async function discoverCandidates(client, options) {
  const searches = buildDiscoverySearches(options);
  const candidateReleaseIds = new Set();
  const seenMasterIds = new Set();

  for (const searchParams of searches) {
    for (let page = 1; page <= options.maxSearchPages; page += 1) {
      if (client.getCallCount() >= options.maxApiCalls) break;
      const searchResults = await client.search({
        ...searchParams,
        page,
        per_page: 50,
      });

      for (const row of searchResults.results || []) {
        if (row.type !== 'release' || !row.id) continue;
        if (options.albumOnly && !isAlbumSearchResult(row)) continue;
        const rowYear = Number(row.year);
        if (options.startYear && Number.isFinite(rowYear) && rowYear < options.startYear) continue;
        if (options.endYear && Number.isFinite(rowYear) && rowYear > options.endYear) continue;

        if (options.masterOnly) {
          const masterId = Number(row.master_id);
          if (!Number.isFinite(masterId) || masterId <= 0) continue;
          if (seenMasterIds.has(masterId)) continue;
          seenMasterIds.add(masterId);
        }

        candidateReleaseIds.add(row.id);
        if (candidateReleaseIds.size >= options.maxCandidateReleases) break;
      }

      const paginationItems = searchResults.pagination?.items;
      const pageSize = searchResults.pagination?.per_page;
      if (!paginationItems || !pageSize || page * pageSize >= paginationItems) {
        break;
      }
      if (candidateReleaseIds.size >= options.maxCandidateReleases) {
        break;
      }
    }
    if (candidateReleaseIds.size >= options.maxCandidateReleases) {
      break;
    }
  }

  return {
    candidateReleaseIds: [...candidateReleaseIds],
  };
}

async function runExpand(options) {
  loadDotEnv();

  const discogs = new DiscogsClient({
    userToken: readEnv('DISCOGS_USER_TOKEN'),
    userAgent: process.env.DISCOGS_USER_AGENT || 'react-test-app-discogs-expander/0.1',
    maxCalls: options.maxApiCalls,
    minGapMs: options.requestGapMs,
    verbose: options.verbose,
  });
  const store = new ContentfulExpandStore({
    spaceId: readEnv('CONTENTFUL_SPACE_ID', ['VITE_REACT_APP_CONTENTFUL_SPACE_ID']),
    environmentId: readEnv('CONTENTFUL_ENVIRONMENT_ID', ['VITE_REACT_APP_CONTENTFUL_ENVIRONMENT_ID']) || 'master',
    managementToken: readEnv('CONTENTFUL_MANAGEMENT_TOKEN', ['VITE_REACT_APP_CONTENTFUL_MANAGEMENT_TOKEN']),
    dryRun: options.dryRun,
    verbose: options.verbose,
  });

  const counters = {
    createdBands: 0,
    createdReleases: 0,
    createdMusicians: 0,
    skippedExisting: 0,
    skippedInvalid: 0,
  };

  const startedAt = Date.now();
  await store.init();

  const { candidateReleaseIds } = await discoverCandidates(discogs, options);

  for (const releaseId of candidateReleaseIds) {
    if (counters.createdBands >= options.maxBands) break;
    if (discogs.getCallCount() >= options.maxApiCalls) break;

    const release = await discogs.getRelease(releaseId);
    if (!release || !release.title) {
      counters.skippedInvalid += 1;
      continue;
    }
    if (options.albumOnly && !isAlbumRelease(release)) {
      counters.skippedInvalid += 1;
      continue;
    }

    if (options.startYear && release.year && release.year < options.startYear) continue;
    if (options.endYear && release.year && release.year > options.endYear) continue;

    const firstArtist = Array.isArray(release.artists) && release.artists.length
      ? release.artists[0]
      : null;
    if (!firstArtist?.name) {
      counters.skippedInvalid += 1;
      continue;
    }

    const bandName = firstArtist.name;
    const bandFields = { name: bandName, slug: slugify(bandName) };
    const bandKey = normalizeKey(`band:${bandFields.name}`);
    const existingBand = await store.findBandByKey(bandKey);

    let bandEntryId;
    if (existingBand && options.skipExisting && !options.updateExisting) {
      counters.skippedExisting += 1;
      bandEntryId = existingBand.sys.id;
    } else {
      const bandResult = await store.upsertBand({
        key: bandKey,
        fields: bandFields,
        existingEntry: existingBand,
        updateExisting: options.updateExisting,
      });
      bandEntryId = bandResult.entryId;
      if (bandResult.created) counters.createdBands += 1;
    }

    const releaseFields = mapReleaseToFields(release, bandName);
    const releaseKey = normalizeKey(`release:${releaseFields.title}:${releaseFields.year}:${bandFields.name}`);
    const existingRelease = await store.findReleaseByKey(releaseKey);
    const releaseResult = await store.upsertRelease({
      key: releaseKey,
      fields: releaseFields,
      existingEntry: existingRelease,
      updateExisting: options.updateExisting,
    });
    if (releaseResult.created) counters.createdReleases += 1;

    const musicianLinks = [];
    for (const mapped of collectMusicianCredits(release, bandName, options.musicianRoleMode)) {

      const musicianKey = normalizeKey(`musician:${mapped.name}`);
      const existingMusician = await store.findMusicianByKey(musicianKey);
      const musicianResult = await store.upsertMusician({
        key: musicianKey,
        fields: mapped,
        existingEntry: existingMusician,
        updateExisting: options.updateExisting,
      });
      if (musicianResult.created) counters.createdMusicians += 1;
      musicianLinks.push(musicianResult.entryId);
    }

    await store.linkBandRelease(bandEntryId, releaseResult.entryId);
    await store.linkReleaseMusicians(releaseResult.entryId, musicianLinks);
  }

  const report = {
    ...counters,
    discoveredReleaseCandidates: candidateReleaseIds.length,
    apiCallsUsed: discogs.getCallCount(),
    durationMs: Date.now() - startedAt,
    dryRun: options.dryRun,
  };

  console.log(JSON.stringify(report, null, 2));
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    await runExpand(options);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

main();

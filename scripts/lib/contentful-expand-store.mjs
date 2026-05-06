const CONTENTFUL_CMA_BASE_URL = 'https://api.contentful.com';

function localeField(value) {
  return { 'en-US': value };
}

function parseMaybeJson(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function formatContentfulValidationDetails(payload) {
  const details = payload?.details;
  if (!details || !Array.isArray(details.errors) || !details.errors.length) return '';
  const summary = details.errors
    .map((error) => {
      const field = error?.details?.errors?.[0]?.name || error?.name || 'unknown';
      const path = error?.path || '';
      return `${field}${path ? ` @ ${path}` : ''}`;
    })
    .join('; ');
  return summary ? ` Details: ${summary}` : '';
}

export function slugify(input = '') {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeKey(input = '') {
  return input.toLowerCase().trim().replace(/\s+/g, ' ');
}

export class ContentfulExpandStore {
  constructor({ spaceId, environmentId, managementToken, dryRun = false, verbose = false }) {
    this.spaceId = spaceId;
    this.environmentId = environmentId;
    this.managementToken = managementToken;
    this.dryRun = dryRun;
    this.verbose = verbose;
    this.cache = {
      bandByKey: new Map(),
      releaseByKey: new Map(),
      musicianByKey: new Map(),
    };
  }

  async init() {
    if (this.dryRun) return;
    if (!this.spaceId || !this.managementToken) {
      throw new Error('VITE_REACT_APP_CONTENTFUL_SPACE_ID and VITE_REACT_APP_CONTENTFUL_MANAGEMENT_TOKEN are required unless using --dry-run.');
    }
  }

  endpoint(path, query = '') {
    const base = `${CONTENTFUL_CMA_BASE_URL}/spaces/${this.spaceId}/environments/${this.environmentId}`;
    return `${base}${path}${query ? `?${query}` : ''}`;
  }

  async request(path, { method = 'GET', body, query = '', headers = {} } = {}) {
    if (this.dryRun) return {};
    const url = this.endpoint(path, query);
    if (this.verbose) console.log(`[contentful] ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.managementToken}`,
        'Content-Type': 'application/vnd.contentful.management.v1+json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      const payload = parseMaybeJson(text);
      const message = payload.message || text || 'Unknown Contentful error';
      const details = formatContentfulValidationDetails(payload);
      throw new Error(`Contentful request failed (${response.status}): ${message}${details}`);
    }

    if (response.status === 204) return {};
    const text = await response.text();
    return parseMaybeJson(text);
  }

  async findEntryByField(contentType, fieldId, value) {
    if (this.dryRun) return null;
    const params = new URLSearchParams({
      content_type: contentType,
      [`fields.${fieldId}[match]`]: value,
      limit: '1',
    });
    const response = await this.request('/entries', { query: params.toString() });
    return response.items?.[0] || null;
  }

  async findBandByKey(key) {
    if (this.cache.bandByKey.has(key)) return this.cache.bandByKey.get(key);
    const entry = await this.findEntryByField('band', 'name', key.replace(/^band:/, ''));
    this.cache.bandByKey.set(key, entry);
    return entry;
  }

  async findReleaseByKey(key) {
    if (this.cache.releaseByKey.has(key)) return this.cache.releaseByKey.get(key);
    const title = key.split(':')[1] || '';
    const entry = await this.findEntryByField('release', 'title', title);
    this.cache.releaseByKey.set(key, entry);
    return entry;
  }

  async findMusicianByKey(key) {
    if (this.cache.musicianByKey.has(key)) return this.cache.musicianByKey.get(key);
    const entry = await this.findEntryByField('musician', 'name', key.replace(/^musician:/, ''));
    this.cache.musicianByKey.set(key, entry);
    return entry;
  }

  async createEntry(contentType, fields) {
    if (this.dryRun) {
      return { sys: { id: `dry-${contentType}-${Math.random().toString(36).slice(2, 10)}` } };
    }
    const payload = { fields };
    return this.request('/entries', {
      method: 'POST',
      body: payload,
      headers: {
        'X-Contentful-Content-Type': contentType,
      },
    });
  }

  async publishEntry(entryId, version) {
    if (this.dryRun) return {};
    return this.request(`/entries/${entryId}/published`, {
      method: 'PUT',
      body: {},
      query: '',
    });
  }

  async updateEntry(entry, fields) {
    if (this.dryRun) return entry;
    const version = entry.sys?.version;
    const url = this.endpoint(`/entries/${entry.sys.id}`);
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.managementToken}`,
        'Content-Type': 'application/vnd.contentful.management.v1+json',
        'X-Contentful-Version': String(version),
      },
      body: JSON.stringify({ fields: { ...entry.fields, ...fields } }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Contentful update failed (${response.status}): ${text}`);
    }
    return response.json();
  }

  async upsertBand({ fields, existingEntry, updateExisting }) {
    const mappedFields = {
      name: localeField(fields.name),
      slug: localeField(fields.slug),
    };
    if (existingEntry) {
      if (updateExisting) {
        const updated = await this.updateEntry(existingEntry, mappedFields);
        return { entryId: updated.sys.id, created: false };
      }
      return { entryId: existingEntry.sys.id, created: false };
    }
    const created = await this.createEntry('band', mappedFields);
    return { entryId: created.sys.id, created: true };
  }

  async upsertRelease({ fields, existingEntry, updateExisting }) {
    const mappedFields = {
      title: localeField(fields.title),
      slug: localeField(fields.slug),
    };
    if (typeof fields.year === 'number') {
      mappedFields.year = localeField(fields.year);
    }
    if (fields.tracks) {
      mappedFields.tracks = localeField(fields.tracks);
    }
    if (existingEntry) {
      if (updateExisting) {
        const updated = await this.updateEntry(existingEntry, mappedFields);
        return { entryId: updated.sys.id, created: false };
      }
      return { entryId: existingEntry.sys.id, created: false };
    }
    mappedFields.musicians = localeField([]);
    const created = await this.createEntry('release', mappedFields);
    return { entryId: created.sys.id, created: true };
  }

  async upsertMusician({ fields, existingEntry, updateExisting }) {
    const mappedFields = {
      name: localeField(fields.name),
      slug: localeField(fields.slug),
    };
    if (existingEntry) {
      if (updateExisting) {
        const updated = await this.updateEntry(existingEntry, mappedFields);
        return { entryId: updated.sys.id, created: false };
      }
      return { entryId: existingEntry.sys.id, created: false };
    }
    const created = await this.createEntry('musician', mappedFields);
    return { entryId: created.sys.id, created: true };
  }

  async fetchEntry(entryId) {
    if (this.dryRun) return { sys: { id: entryId }, fields: {} };
    return this.request(`/entries/${entryId}`);
  }

  asLink(entryId) {
    return { sys: { type: 'Link', linkType: 'Entry', id: entryId } };
  }

  async linkBandRelease(bandEntryId, releaseEntryId) {
    const band = await this.fetchEntry(bandEntryId);
    const existing = band.fields?.releases?.['en-US'] || [];
    const hasLink = existing.some((item) => item?.sys?.id === releaseEntryId);
    if (hasLink) return;

    const next = [...existing, this.asLink(releaseEntryId)];
    await this.updateEntry(band, { releases: localeField(next) });
  }

  async linkReleaseMusicians(releaseEntryId, musicianEntryIds) {
    if (!musicianEntryIds.length) return;
    const release = await this.fetchEntry(releaseEntryId);
    const existing = release.fields?.musicians?.['en-US'] || [];
    const existingIds = new Set(existing.map((item) => item?.sys?.id));
    const additions = musicianEntryIds
      .filter((id) => !existingIds.has(id))
      .map((id) => this.asLink(id));
    if (!additions.length) return;

    await this.updateEntry(release, { musicians: localeField([...existing, ...additions]) });
  }
}

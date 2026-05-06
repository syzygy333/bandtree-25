const DISCOGS_BASE_URL = 'https://api.discogs.com';

function toQueryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  return search.toString();
}

export class DiscogsClient {
  constructor({ userToken, userAgent, maxCalls = 600, minGapMs = 1200, verbose = false }) {
    if (!userToken) {
      throw new Error('DISCOGS_USER_TOKEN is required.');
    }
    if (!userAgent) {
      throw new Error('DISCOGS_USER_AGENT is required.');
    }

    this.userToken = userToken;
    this.userAgent = userAgent;
    this.maxCalls = maxCalls;
    this.verbose = verbose;
    this.callCount = 0;
    this.lastCallAt = 0;
    this.minGapMs = minGapMs;
    this.maxRetries = 4;
  }

  getCallCount() {
    return this.callCount;
  }

  async throttle() {
    const now = Date.now();
    const elapsed = now - this.lastCallAt;
    if (elapsed < this.minGapMs) {
      await new Promise((resolve) => setTimeout(resolve, this.minGapMs - elapsed));
    }
  }

  async request(path, params = {}, options = {}) {
    const { allow404 = false } = options;
    if (this.callCount >= this.maxCalls) {
      throw new Error(`Reached max API calls (${this.maxCalls}).`);
    }
    const query = toQueryString(params);
    const url = `${DISCOGS_BASE_URL}${path}${query ? `?${query}` : ''}`;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      await this.throttle();

      if (this.verbose) {
        console.log(`[discogs] GET ${url}`);
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Discogs token=${this.userToken}`,
          'User-Agent': this.userAgent,
        },
      });

      this.callCount += 1;
      this.lastCallAt = Date.now();

      if (response.ok) {
        return response.json();
      }

      const rawText = await response.text();
      const bodySnippet = rawText?.trim()
        ? rawText.trim().slice(0, 240)
        : '(empty response body)';

      if (response.status === 429 && attempt < this.maxRetries) {
        const retryAfterHeader = Number(response.headers.get('Retry-After'));
        const resetHeader = Number(response.headers.get('X-Discogs-Ratelimit-Reset'));
        const retryMsFromRetryAfter = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
          ? retryAfterHeader * 1000
          : 0;
        const retryMsFromReset = Number.isFinite(resetHeader) && resetHeader > 0
          ? resetHeader * 1000
          : 0;
        const exponentialBackoffMs = 1000 * (2 ** attempt);
        const waitMs = Math.max(retryMsFromRetryAfter, retryMsFromReset, exponentialBackoffMs);
        this.minGapMs = Math.min(this.minGapMs + 250, 5000);

        if (this.verbose) {
          console.warn(
            `[discogs] 429 rate-limited; retrying in ${waitMs}ms (attempt ${attempt + 1}/${this.maxRetries}, minGapMs=${this.minGapMs})`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      if (allow404 && response.status === 404) {
        if (this.verbose) {
          console.warn(`[discogs] 404 not found for ${url}; skipping candidate`);
        }
        return null;
      }

      throw new Error(
        `Discogs request failed: ${response.status} ${response.statusText} for ${url}. ` +
        `Response: ${bodySnippet}`
      );
    }

    throw new Error(`Discogs request failed after retries for ${url}.`);
  }

  async search(params) {
    return this.request('/database/search', params);
  }

  async getRelease(releaseId) {
    return this.request(`/releases/${releaseId}`, {}, { allow404: true });
  }
}

// Step 3 of Tracker Feed: fetch a URL with the guards the security layer promised.
// - only http(s), only hosts on the allowlist built from sources.json
// - every redirect hop is checked against the same list
// - a time limit and a size limit, so one slow or huge page cannot stall or flood a run
// - no cookies, no credentials, a plain user agent

export const DEFAULT_TIMEOUT_MS = 15_000;
export const DEFAULT_MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 5;
const USER_AGENT = "tracker-feed/0.1 (reads public pages for a personal tracker)";

export class FetchBlocked extends Error {}

export function hostAllowed(url, allowedHosts) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  return allowedHosts.some((h) => host === h || host.endsWith("." + h));
}

async function readCapped(response, maxBytes) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new FetchBlocked(`Response larger than ${maxBytes} bytes: ${response.url}`);
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
}

// Returns { url, status, contentType, text }. `fetchImpl` is only for tests.
export async function safeFetch(
  url,
  { allowedHosts, timeoutMs = DEFAULT_TIMEOUT_MS, maxBytes = DEFAULT_MAX_BYTES, headers = {}, fetchImpl = fetch } = {}
) {
  if (!Array.isArray(allowedHosts) || allowedHosts.length === 0) {
    throw new FetchBlocked("No allowed hosts given; refusing to fetch anything");
  }

  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!hostAllowed(current, allowedHosts)) {
      throw new FetchBlocked(`Blocked: ${current} is not on the allowed host list`);
    }

    const response = await fetchImpl(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      credentials: "omit",
      headers: { "user-agent": USER_AGENT, accept: "application/json, application/xml, text/xml, application/rss+xml, application/atom+xml, text/html;q=0.9, */*;q=0.5", ...headers },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new FetchBlocked(`Redirect without a location from ${current}`);
      current = new URL(location, current).toString();
      continue;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${current}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    const text = await readCapped(response, maxBytes);
    return { url: current, status: response.status, contentType, text };
  }
  throw new FetchBlocked(`Too many redirects starting at ${url}`);
}

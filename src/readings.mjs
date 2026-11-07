// Readings: the page's numbers, read straight from X's code with no model involved.
//
// `home-mixer/params/param.rs` declares every tunable as
//     param!(Name, type, "feature_switch_key", default);
// and `home-mixer/params/config.rs` holds plain `pub const NAME: type = value;` lines.
// Each run reads both files at their current commit, keeps the values in data/readings.json,
// and reports exactly which values moved since the last reading.
import fs from "node:fs";
import path from "node:path";
import { safeFetch } from "./fetch.mjs";

export const REPO = "xai-org/x-algorithm";
export const FILES = ["home-mixer/params/param.rs", "home-mixer/params/config.rs"];
const GITHUB_API = "api.github.com";
export const READINGS_FILE = "data/readings.json";

// The values the tracker page shows, in page order. Names are the param!/const names in the code.
export const HEADLINE = [
  ["ReplyWeight", "Reply"],
  ["QuoteWeight", "Quote"],
  ["ShareViaDmWeight", "Share via DM"],
  ["ShareViaCopyLinkWeight", "Share via copy link"],
  ["ShareWeight", "Share"],
  ["RetweetWeight", "Repost"],
  ["FavoriteWeight", "Like"],
  ["ClickWeight", "Click"],
  ["OpenLinkWeight", "Open link"],
  ["DwellWeight", "Dwell"],
  ["PhotoExpandWeight", "Photo expand"],
  ["VideoOpenWeight", "Video open"],
  ["ProfileClickWeight", "Profile click"],
  ["NotInterestedWeight", "Not interested"],
  ["MuteAuthorWeight", "Mute author"],
  ["BlockAuthorWeight", "Block author"],
  ["ReportWeight", "Report"],
  ["EnablePhoenixOonReplies", "Replies from strangers shown"],
  ["MAX_POST_AGE", "Max post age (seconds)"],
  ["ColdStartFollowerCap", "Small-account lift: follower cap"],
  ["ColdStartImpressionThreshold", "Small-account lift: impression threshold"],
  ["ColdStartMaxPostAgeSecs", "Small-account lift: max post age (seconds)"],
];

// --- parsing ---

function parseValue(raw) {
  const t = raw.trim().replace(/_/g, "");
  if (t === "true" || t === "false") return t === "true";
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  // Simple arithmetic like `48 * 60 * 60`: digits, spaces, * and + only. Anything else stays text.
  if (/^[\d\s*+]+$/.test(t)) {
    return t.split("+").reduce((sum, term) => sum + term.split("*").reduce((p, f) => p * Number(f), 1), 0);
  }
  return raw.trim();
}

export function parseParams(rust) {
  const out = {};
  const re = /param!\(\s*(\w+)\s*,\s*[\w:<>]+\s*,\s*"([^"]+)"\s*,\s*([\s\S]*?)\s*\)\s*;/g;
  for (const m of rust.matchAll(re)) out[m[1]] = { key: m[2], value: parseValue(m[3]) };
  return out;
}

export function parseConsts(rust) {
  const out = {};
  const re = /pub const (\w+)\s*:\s*[^=]+=\s*([^;]+);/g;
  for (const m of rust.matchAll(re)) out[m[1]] = { key: null, value: parseValue(m[2]) };
  return out;
}

// xAI stamps param.rs with "last sync <timestamp>" in its first line.
export function parseSync(rust) {
  return rust.match(/last sync\s+(\S+)/)?.[1] ?? null;
}

// --- fetching ---

export async function fetchReadings({ fetchImpl } = {}) {
  const opts = { allowedHosts: [GITHUB_API], ...(fetchImpl ? { fetchImpl } : {}) };
  const headers = { accept: "application/vnd.github.raw+json", "x-github-api-version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const values = {};
  let sync = null;
  for (const file of FILES) {
    const { text } = await safeFetch(`https://${GITHUB_API}/repos/${REPO}/contents/${file}`, { ...opts, headers });
    Object.assign(values, file.endsWith("param.rs") ? parseParams(text) : parseConsts(text));
    if (file.endsWith("param.rs")) sync = parseSync(text);
  }
  if (Object.keys(values).length < 50) throw new Error("param.rs parsed to too few values; the file layout may have changed");

  // The newest commit touching param.rs, for the record.
  const { text: commitsJson } = await safeFetch(
    `https://${GITHUB_API}/repos/${REPO}/commits?path=${encodeURIComponent(FILES[0])}&per_page=1`,
    { ...opts, headers: { ...headers, accept: "application/vnd.github+json" } }
  );
  const latest = JSON.parse(commitsJson)[0];
  return {
    read_at: new Date().toISOString(),
    sync,
    commit: latest?.sha?.slice(0, 7) ?? null,
    commit_date: latest?.commit?.author?.date?.slice(0, 10) ?? null,
    commit_url: latest?.html_url ?? null,
    values,
  };
}

// --- comparing and storing ---

export function diffReadings(previous, current) {
  const changes = [];
  const names = new Set([...Object.keys(previous?.values ?? {}), ...Object.keys(current.values)]);
  for (const name of [...names].sort()) {
    const from = previous?.values?.[name]?.value;
    const to = current.values[name]?.value;
    if (from === undefined && to !== undefined) changes.push({ name, from: null, to, kind: "added" });
    else if (from !== undefined && to === undefined) changes.push({ name, from, to: null, kind: "removed" });
    else if (from !== to) changes.push({ name, from, to, kind: "changed" });
  }
  return changes;
}

export function loadPrevious(file = READINGS_FILE) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

export function saveReadings(current, { file = READINGS_FILE, history = path.join(path.dirname(file), "readings-history.jsonl") } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(current, null, 2) + "\n");
  fs.appendFileSync(history, JSON.stringify({ read_at: current.read_at, commit: current.commit, sync: current.sync, values: current.values }) + "\n");
}

export function headline(current) {
  return HEADLINE.map(([name, label]) => ({ name, label, value: current.values[name]?.value ?? null }));
}

// One call for the pipeline: fetch, compare with the last reading, save, return what the draft needs.
export async function takeReadings({ fetchImpl, file = READINGS_FILE } = {}) {
  const previous = loadPrevious(file);
  const current = await fetchReadings({ fetchImpl });
  const changes = diffReadings(previous, current);
  saveReadings(current, { file });
  return { current, previous, changes, headline: headline(current), first: previous === null };
}

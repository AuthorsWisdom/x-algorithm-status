// Daily status for the X Algorithm Tracker page (wisdomnexus.io/x-algorithm).
// Reads X's public feed code, compares with yesterday, appends any headline move to
// data/changes.json, and writes status.json with everything the page's embeds render.
// No model, no key.
import fs from "node:fs";
import { takeReadings, HEADLINE } from "./readings.mjs";

// What the page shows, in page order. Values come from the code; labels are the page's words.
export const HELPS = [
  ["ShareViaCopyLinkWeight", "Share (copy link)"],
  ["ReplyWeight", "Reply"],
  ["QuoteWeight", "Quote post"],
  ["FollowAuthorWeight", "Follow"],
  ["RetweetWeight", "Repost"],
  ["FavoriteWeight", "Like"],
  ["OpenLinkWeight", "Link click"],
];
export const HURTS = [
  ["ReportWeight", "Report"],
  ["MuteAuthorWeight", "Mute"],
  ["NotInterestedWeight", "Not interested"],
  ["BlockAuthorWeight", "Block"],
];
// Plural names for the "What changed" cards.
export const CHANGE_LABELS = {
  FavoriteWeight: "Likes", ShareWeight: "Shares", ClickWeight: "Clicks", VideoOpenWeight: "Video opens",
  ReplyWeight: "Replies", QuoteWeight: "Quote posts", RetweetWeight: "Reposts",
  ShareViaCopyLinkWeight: "Copy-link shares", ShareViaDmWeight: "DM shares", FollowAuthorWeight: "Follows",
  OpenLinkWeight: "Link clicks", DwellWeight: "Dwell", PhotoExpandWeight: "Photo expands",
  ProfileClickWeight: "Profile clicks", NotInterestedWeight: "Not interested", MuteAuthorWeight: "Mutes",
  BlockAuthorWeight: "Blocks", ReportWeight: "Reports", EnablePhoenixOonReplies: "Stranger replies",
  MAX_POST_AGE: "Max post age", ColdStartFollowerCap: "Small-account cap",
  ColdStartImpressionThreshold: "Small-account threshold", ColdStartMaxPostAgeSecs: "Small-account window",
};
const CHANGES_FILE = "data/changes.json";
const TRACKED = new Set([...HEADLINE.map(([n]) => n), "FollowAuthorWeight"]);

const r = await takeReadings({ file: "data/readings.json" });
const c = r.current;
const v = (name) => c.values[name]?.value ?? null;
const today = c.read_at.slice(0, 10);

// Append today's moves (only when there was a previous reading to compare with).
const changes = fs.existsSync(CHANGES_FILE) ? JSON.parse(fs.readFileSync(CHANGES_FILE, "utf8")) : [];
const moved = (r.first ? [] : r.changes)
  .filter((ch) => TRACKED.has(ch.name) && typeof ch.to === "number" && typeof ch.from === "number")
  .map((ch) => ({ date: today, commit: c.commit, name: ch.name, from: ch.from, to: ch.to }));
for (const m of moved) {
  if (!changes.some((x) => x.date === m.date && x.name === m.name)) changes.push(m);
}
changes.sort((a, b) => a.date.localeCompare(b.date));
fs.writeFileSync(CHANGES_FILE, JSON.stringify(changes, null, 2) + "\n");

// The four most recent moves, biggest relative move first on a tie of dates.
const rel = (x) => (x.from === 0 ? Infinity : Math.abs((x.to - x.from) / x.from));
const recent = [...changes]
  .filter((x) => CHANGE_LABELS[x.name])
  .sort((a, b) => b.date.localeCompare(a.date) || rel(b) - rel(a))
  .slice(0, 4)
  .map((x) => ({ ...x, label: CHANGE_LABELS[x.name], up: x.to > x.from }))
  .sort((a, b) => Number(b.up) - Number(a.up)); // ups first, then downs

const fmtDate = (iso, opts) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
const label = new Date(c.read_at)
  .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" })
  .toUpperCase();

const status = {
  checked_at: c.read_at,
  label,
  commit: c.commit,
  commit_url: c.commit_url,
  sync: c.sync,
  headline_moved: moved.map((m) => ({ ...m, label: CHANGE_LABELS[m.name] ?? m.name })),
  helps: HELPS.map(([name, lbl]) => ({ name, label: lbl, value: v(name) })),
  hurts: HURTS.map(([name, lbl]) => ({ name, label: lbl, value: v(name) })),
  recent,
  since: recent.length ? fmtDate(recent[recent.length - 1].date, { month: "short", day: "numeric" }) : null,
  headline: Object.fromEntries(r.headline.map((h) => [h.name, h.value])),
};
fs.writeFileSync("status.json", JSON.stringify(status, null, 2) + "\n");
console.log(`${label}: commit ${c.commit}, ${moved.length} tracked value(s) moved; ${changes.length} moves on record; since ${status.since}.`);
for (const m of moved) console.log(`  ${m.name}: ${m.from} -> ${m.to}`);

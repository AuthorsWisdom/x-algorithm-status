// Daily status for the X Algorithm Tracker page (wisdomnexus.io/x-algorithm).
// Reads X's public feed code, compares with yesterday, writes status.json. No model, no key.
import fs from "node:fs";
import { takeReadings, HEADLINE } from "./readings.mjs";

const r = await takeReadings({ file: "data/readings.json" });
const c = r.current;
const headlineNames = new Set(HEADLINE.map(([n]) => n));
const moved = (r.first ? [] : r.changes).filter((ch) => headlineNames.has(ch.name)).map((ch) => ({
  name: ch.name,
  label: HEADLINE.find(([n]) => n === ch.name)[1],
  from: ch.from,
  to: ch.to,
}));
const d = new Date(c.read_at);
const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" }).toUpperCase();

const status = {
  checked_at: c.read_at,
  label,
  commit: c.commit,
  commit_url: c.commit_url,
  sync: c.sync,
  headline_moved: moved,
  other_changes: r.first ? 0 : r.changes.length - moved.length,
  headline: Object.fromEntries(r.headline.map((h) => [h.name, h.value])),
};
fs.writeFileSync("status.json", JSON.stringify(status, null, 2) + "\n");
console.log(`${label}: commit ${c.commit}, ${moved.length} headline value(s) moved, ${status.other_changes} other change(s).`);
for (const m of moved) console.log(`  ${m.label}: ${m.from} -> ${m.to}`);

# x-algorithm-status

Every morning a GitHub Action reads the ranking defaults in X's public feed code
([xai-org/x-algorithm](https://github.com/xai-org/x-algorithm)) and writes `status.json`.
The [X Algorithm Tracker](https://wisdomnexus.io/x-algorithm) page reads that file to show
when it was last checked and whether anything moved.

`src/readings.mjs` and `src/fetch.mjs` are copies of the same files in the private
tracker-feed repo. Change them there first, then copy them here.

Run by hand: `node src/status.mjs`

## Page blocks

`node src/embeds.mjs` builds `build/bars.html` and `build/changes.html` from `status.json`. Each is
the `html` of one beehiiv `embed` node on the tracker page (ids `a14025b5-…` bars, `a923f2bf-…`
what changed, `e504bff2-…` the "Last checked" line). They render today's numbers as plain markup,
then re-render from the live `status.json`, so a weight change shows on the page without a publish.
Only re-save the embeds when the design changes.

`data/changes.json` is the record of headline moves (seeded from the private repo's changelog on
2026-11-07); the daily run appends to it. The "What changed" block shows the four most recent.

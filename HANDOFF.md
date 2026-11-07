# Handoff — x-algorithm-status

Read `README.md` first. This repo is public; nothing private goes in it.

## 2026-11-07 — Session close (compline)

**Shipped:** the whole repo. Daily Action (`.github/workflows/daily.yml`, 12:00 UTC) runs
`src/status.mjs`, which reads xai-org/x-algorithm, appends headline moves to `data/changes.json`,
and commits `status.json`. `src/embeds.mjs` builds the three self-updating blocks the beehiiv
tracker page embeds (build/ is git-ignored). Two runs green on 2026-11-07, both "nothing moved".

**Decisions:** parser files are copies of the private tracker-feed repo's; change there first.
The "What changed" block shows the four most recent moves, ups first. Bars scale linearly to the
largest value in each column, minimum 1%.

**State at close:** date-line embed is live on wisdomnexus.io/x-algorithm; bars and what-changed
embeds are in the beehiiv draft, waiting on Christopher's publish click.

**Single next action:** none here. The publish click is tracked in tracker-feed's HANDOFF.md.

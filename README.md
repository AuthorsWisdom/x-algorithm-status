# x-algorithm-status

Every morning a GitHub Action reads the ranking defaults in X's public feed code
([xai-org/x-algorithm](https://github.com/xai-org/x-algorithm)) and writes `status.json`.
The [X Algorithm Tracker](https://wisdomnexus.io/x-algorithm) page reads that file to show
when it was last checked and whether anything moved.

`src/readings.mjs` and `src/fetch.mjs` are copies of the same files in the private
tracker-feed repo. Change them there first, then copy them here.

Run by hand: `node src/status.mjs`

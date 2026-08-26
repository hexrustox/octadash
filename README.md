# octadash

A read-only window onto GitHub: search repositories, page through the results feed, and open a per-repo dashboard of live snapshots — commit activity, language breakdown, and contributors leaderboard.

octadash owns no data of its own. The browser talks to `api.github.com` directly; there is no backend. It runs locally and is never deployed.

- **Domain vocabulary**: see [CONTEXT.md](./CONTEXT.md)
- **Why frontend-only**: see [docs/adr/0001-frontend-only-no-backend.md](./docs/adr/0001-frontend-only-no-backend.md)

## Running

The dev shell comes from the Nix flake (Node + pnpm in the capsule container):

```bash
nix develop .#container -c pnpm start
```

Then open http://localhost:4200/. A plain `pnpm install && pnpm start` also works with any local Node 20+.

Anonymous GitHub limits are low (~60 core requests/hour, ~10 searches/minute). Paste a personal access token under **Access token** (top bar) to lift them to 5,000/hour — it is stored only in your browser's `localStorage` and sent nowhere except github.com.

## Building

```bash
nix develop .#container -c pnpm run build
```

Artifacts land in `dist/octadash`.

## Stack

Angular (standalone components + signals) · Bootstrap 5 + ng-bootstrap · ng2-charts / Chart.js · Bootstrap Icons.

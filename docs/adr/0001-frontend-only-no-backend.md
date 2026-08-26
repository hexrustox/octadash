# Frontend-only: the browser talks to api.github.com directly

octadash is an Angular SPA with no backend. The browser calls `api.github.com` directly, anonymously by default (~60 core requests/hour, ~10 search requests/minute per IP), with an optional user-supplied Personal Access Token stored in `localStorage` and sent only to github.com to lift limits. We accept low anonymous quotas instead of running a token-holding proxy server, because the product is a locally-run demonstration that must be deployable as static files alone; rate-limit pressure is handled client-side via session caching, ETag revalidation (304s are quota-free), and designed rate-limit states rather than hidden behind a backend.

## Considered Options

- **GitHub OAuth app with small proxy**: best real-product answer (everyone gets 5,000 req/hr without pasting tokens) but requires a long-lived server process and secret management, contradicting the local-only/static deployment constraint.
- **User-supplied PAT only, no anonymous mode**: excludes people who just want to try it; rejected in favor of anonymous-first with PAT as opt-in.

## Consequences

- GraphQL is unavailable (requires auth), so only REST endpoints shape what the dashboards can show.
- Stats endpoints returning `202 Accepted` while GitHub computes them must be retried from the client.
- If octadash ever becomes a hosted public product, adding the proxy is additive: it slots in front of the existing API client without changing the domain model.

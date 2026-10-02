# iconic-portal

The agent portal for Iconic. Nuxt 4, **SPA** (`ssr: false`), on port **3002**. Travel advisors at an approved agency sign in here to see their net rates, availability, bookings, commissions and sales materials. It extends the `iconic-ui` layer and uses the API's agency session cookie. It does not track visits.

| | |
|---|---|
| Port | **3002** |
| Render | SPA |
| Layer | local `../iconic-ui`; otherwise `github:iconic-project/iconic-ui#dev` |
| API | `NUXT_PUBLIC_API_BASE` (default `http://localhost:8000`) |

The API must already allow this origin. CORS and Sanctum stateful domains use `FRONTEND_PORTAL_URL=http://localhost:3002`.

## Setup

```bash
pnpm install
cp .env.example .env
```

`.env`:

```
NUXT_PUBLIC_API_BASE=http://localhost:8000
```

The API has to be running (Docker, port 8000) before sign-in will work.

## Run

```bash
pnpm dev
```

Open `http://localhost:3002`.

## Quality

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

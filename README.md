# SANYOG – Unified Government Service Layer

SANYOG is a hackathon-ready middleware prototype for sending one citizen request to multiple independent government department portals through reusable connectors. It does not replace or modify those portals. It normalizes a request once, checks consent and routing rules, dispatches to the selected departments, and exposes one tracking ID with a per-department outcome.

## What is implemented

The prototype includes a public landing page, role-aware demo login, citizen submission and tracking, an official operations dashboard, and an admin console. The demo data is intentionally seeded with three departments: MahaDBT is healthy and succeeds, Aaple Sarkar is delayed and enters retrying, and Grievance Cell is down and reaches manual review after three failed attempts.

The service layer includes SHA-256 Citizen Master ID generation, a mandatory normalized request shape, consent hard-blocking, Jaccard duplicate detection at a 0.8 threshold, request-type routing validation, connector adapters, partial-failure behavior, exponential-backoff metadata, and append-only audit events. Raw Aadhaar-linked numbers are never accepted by a connector and are not persisted in the request model.

## Stack

| Layer | Implementation |
| --- | --- |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS 4, Wouter, TanStack Query, tRPC client |
| Backend | Node.js, Express, tRPC 11 |
| Persistence | Drizzle ORM with MySQL/TiDB schema; seeded in-memory store keeps the first-run demo deterministic |
| UI | Government-style blue, white, green palette, card-based tables, status badges, responsive layout |
| Testing | Vitest, TypeScript check, Vite production build |

## Setup

The WebDev scaffold provides the system environment variables. Do not commit `.env` files or hard-code credentials. The relevant variables are `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, and the built-in API variables listed by the scaffold README.

```bash
pnpm install
pnpm drizzle-kit generate
pnpm db:push
pnpm dev
```

The development server is started with `NODE_ENV=development tsx watch server/_core/index.ts` and serves both the Vite client and `/api/trpc`.

## Seed and demo data

The deterministic demo store is initialized on server import. To reset its sample records during development, run:

```bash
pnpm tsx server/seed.ts
```

Seed identities:

| Role | Demo identity |
| --- | --- |
| Citizen | Ananya Deshmukh |
| Official | Rahul Patil · MahaDBT |
| Admin | Meera Kulkarni · Platform Operations |

Useful tracking IDs are `SYN-7K2P4Q` for partial success, `SYN-4M9R1T` for manual review, and `SYN-2B8N6X` for completed status.

## API contract

All feature procedures return `{ success: true, message, data }` on success and `{ success: false, message, data }` when a user-facing validation path needs to return a controlled failure. The scaffold-compatible auth logout endpoint remains `{ success: true }` for the built-in session test.

| Procedure | Input | Behavior |
| --- | --- | --- |
| `catalog.bootstrap` | none | Departments, routing rules, and demo users |
| `citizen.submit` | Citizen name, request type, description, departments, location, attachments, language, consent, priority | Normalizes, validates consent and routing, deduplicates, dispatches, and returns a tracking ID immediately |
| `citizen.track` | `trackingId` | Returns the request and `statusPerDepartment`, or the invalid-ID empty state |
| `citizen.myRequests` | Optional citizen name | Lists citizen requests |
| `official.dashboard` | Department, priority, location filters | Returns analytics and assigned requests |
| `official.action` | Tracking ID, department, Approve/Reject/Forward, optional note | Updates only the acting department and appends an audit event |
| `admin.overview` | none | Users, connector registry, routing rules, and audit log |
| `admin.toggleConnector` | Department and `UP`/`DELAYED`/`DOWN` | Changes demo connector health and appends an audit event |
| `admin.updateRule` | Rule ID, request type, departments, active | Saves routing configuration and appends an audit event |

## Normalized request shape

```ts
{
  citizenMasterId,
  requestType,
  description,
  location: { lat, lng, address },
  attachments: string[],
  departments: string[],
  timestamp
}
```

The stored request additionally carries the tracking ID, priority, duplicate flag, SLA deadline, overall status, and `statusPerDepartment` entries with `department`, `status`, `retryCount`, `lastUpdated`, and optional `externalRefId` or note.

## Connector behavior

Each connector exports `processRequest(normalizedData)`. The sample adapters are:

- **MahaDBT:** success with an external reference.
- **Aaple Sarkar:** delayed; the UI marks it retrying with attempt `1/3` and records the `1s → 2s → 4s` retry policy in the note.
- **Grievance Cell:** failed after three attempts and marked `failed — needs manual review`.

A connector outcome never rejects the overall citizen request. The tracking ID is created before dispatch and every department keeps an independent status.

## Validation commands

```bash
pnpm check
pnpm test
pnpm build
```

The test suite covers consent hard-blocking, tracking ID generation, partial connector outcomes, tracking lookup, and routing-rule filtering.

## Live recipient API configuration

The certificate submission flow calls the configured recipient API from the server when these environment variables are present: `SANYOG_MAHADBT_API_URL` with optional `SANYOG_MAHADBT_API_TOKEN`, and `SANYOG_AAPLE_SARKAR_API_URL` with optional `SANYOG_AAPLE_SARKAR_API_TOKEN`. Each endpoint receives a normalized JSON request and may return `externalRefId` or `referenceId`. If an endpoint is not configured, the deterministic demo connector remains active so local development and demos continue to work.


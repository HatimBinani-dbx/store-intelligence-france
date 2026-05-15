# Store Intelligence France

> Multi-tenant retail intelligence dashboard for France and Europe, built on Databricks SQL + Lakebase Postgres.

**Client:** Standalone retail demo (used as starter for multiple French and European retail accounts)
**Demo context:** Public demo and starter kit for retail Solution Architecture conversations (Pharmacy, Grocery, DIY, Convenience, Fashion verticals via config).
**Status:** Live (public demo)

## What it does
Vite + React frontend and Express + Node backend wired to Databricks SQL Warehouse, with optional Lakebase Postgres for personalization and chat memory. Surfaces store-level KPIs, an interactive France-and-Europe store map (deck.gl + leaflet), a vertical-aware metrics panel, and a Claude-powered retail agent for natural-language Q&A. Tenant configuration is data-driven through `public/config/vertical-presets.json` (currently includes pharmacy, grocery, generic retail, and more) and `src/config/navigation.js`, so the same app reskins for different retail verticals without code changes.

## Architecture
- **Frontend:** React 18 + Vite + TailwindCSS + shadcn/ui + Radix + deck.gl + Leaflet + Recharts + react-router (in `src/app/src/`)
- **Backend:** Express (Node 18+) with `@databricks/sql` SDK and `pg` driver for Lakebase (in `src/app/app.js`)
- **Data:** Unity Catalog catalog `ops_dispatch_hb_catalog`, schema `store_intelligence` (default; overridable via `STORE_INTEL_CATALOG` / `STORE_INTEL_SCHEMA`)
- **AI/ML:** Foundation Model API via the retail agent prompt template in `src/app/lib/agentPromptTemplate.js`; Lakebase for personalization in `src/app/lib/lakebasePostgres.js`
- **Compute:** Serverless SQL Warehouse (`2dfc76f4d7c64141` default) + Lakebase Postgres (for chat memory and saved demos)

## Dependencies (Databricks-side)
- [ ] Genie space: optional (agent uses prompt-template flow, not Genie)
- [ ] SQL warehouse: required (default warehouse id `2dfc76f4d7c64141`)
- [ ] Lakebase instance: yes (used for personalization, saved demo wizards, chat memory)
- [ ] Lakeview dashboards: none
- [ ] SDP pipelines: none (assumes UC tables are already populated)
- [ ] Model serving endpoints: foundation model endpoint queried via `databricks-sdk` for agent responses
- [ ] Vector Search indexes: none
- [ ] UC tables expected: `<catalog>.<schema>.stores`, `<catalog>.<schema>.metrics`, vertical-specific tables under `store_intelligence` schema
- [ ] Secrets required: none (uses Databricks Apps service principal OAuth at runtime; PAT via env in local dev)

## Local development
```bash
cd src/app
npm install
cp .env.example .env  # then fill DATABRICKS_SERVER_HOSTNAME + DATABRICKS_TOKEN
npm run start:dev     # concurrently runs vite dev + nodemon on app.js
```

Required local env vars:
- `DATABRICKS_SERVER_HOSTNAME` - workspace hostname (no scheme)
- `DATABRICKS_TOKEN` - PAT
- `DATABRICKS_HTTP_PATH` - SQL warehouse path (default `/sql/1.0/warehouses/2dfc76f4d7c64141`)
- `STORE_INTEL_CATALOG`, `STORE_INTEL_SCHEMA` - optional overrides

## Deployment to Databricks
```bash
cd src/app
npm run build
databricks apps deploy store-intelligence-france \
  --source-code-path /Workspace/Users/<user>/store-intelligence-france/src/app
```

When deployed, the app auto-detects `DATABRICKS_APP_PORT` / `DATABRICKS_RUNTIME_VERSION` and uses the injected service-principal OAuth credentials (`DATABRICKS_CLIENT_ID` / `DATABRICKS_CLIENT_SECRET`) instead of a PAT.

## Files
- `src/app/app.js` - Express backend, Databricks SQL client with connection pool, REST endpoints proxying UC + Lakebase
- `src/app/package.json` - frontend + backend deps (vite, react, express, @databricks/sql, deck.gl, pg, ...)
- `src/app/vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `components.json` - Vite + Tailwind + shadcn setup
- `src/app/api/demoAPI.js`, `src/app/api/logoAPI.js` - server-side API handlers
- `src/app/lib/databricksSQL.js` - SQL warehouse helpers
- `src/app/lib/lakebasePostgres.js` - Lakebase OAuth + connection helpers
- `src/app/lib/agentPromptTemplate.js`, `lib/personalizationPrompt.js` - Claude prompt builders for the retail agent
- `src/app/src/` - React app (`App.jsx`, `RetailApp.jsx`, `pages/`, `components/`, `services/retailAgentAPI.js`)
- `src/app/public/config/vertical-presets.json` - vertical configs (pharmacy, grocery, ...)
- `src/app/public/databricks-logo.svg`, `databricks-favicon.svg`, `us-states.json` - static assets

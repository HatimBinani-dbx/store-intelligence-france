# Setup — store-intelligence-france

This bundle deploys the multi-tenant retail intelligence app (Vite + Express + deck.gl) with bindings to the showcase SQL warehouse and `databricks-gpt-5-mini`. The Node app lives at `src/app/`, so `source_code_path` points there.

## 1. Deploy the bundle

```bash
databricks bundle validate --profile fe-vm-hatim-apps-showcase
databricks bundle deploy   --profile fe-vm-hatim-apps-showcase
```

Creates:
- Databricks App `store-intelligence-france` with:
  - `CAN_USE` on SQL warehouse `3fc248c3b00a28bc`
  - `CAN_QUERY` on serving endpoint `databricks-gpt-5-mini`

NOTE: the UC schema `dev_hatim_binani_store_intelligence` already exists under `hatim_apps_showcase_catalog` (owned by the `retail-intel-platform` bundle). This bundle reuses it instead of redeclaring it. If you want to take ownership here, rename `var.schema_name` to something new or import the existing schema via `databricks bundle import`.

## 2. Seed UC tables

The backend queries `${STORE_INTEL_CATALOG}.${STORE_INTEL_SCHEMA}.dim_demo_stores`. The retail-intel-platform bundle seeds:
- `dim_demo_stores` (stores with lat/lon, performance scores, footprint type)
- vertical-specific dim/fact tables

If you need to seed independently of `retail-intel-platform`:
1. Generate synthetic data via the `databricks-synthetic-data-gen` skill targeting `hatim_apps_showcase_catalog.<schema>.dim_demo_stores` with columns: `store_id, store_name, region, lat, lon, performance_score, dos_score, footprint_type`.
2. Or copy `dim_demo_stores` from `dev_hatim_binani_store_intelligence`.

## 3. Lakebase (chat memory + personalization)

The app's `lib/lakebasePostgres.js` connects via:
- Auto-injected `PGHOST` / `PGUSER` (when deployed) plus OAuth via SP
- Database defaults to `demo_platform`

TODO seed: provision a Lakebase project and grant the Apps service principal access. Lakebase isn't yet a managed bundle resource. Quick path:
```bash
# create a Lakebase project + database, then grant the app SP via the workspace UI
# or the databricks-lakebase-provisioned skill
```

The app falls back to mock data if Lakebase isn't reachable; the SQL+FM paths still work.

## 4. Genie space (optional)

The retail agent calls Genie space `01f11daa8be21b1388425bb25f53f00d` for `/api/genie/*` endpoints. If it doesn't exist in this workspace, the agent returns an error from those routes only. Either:
- Replicate it via the `databricks-genie` skill, then override `GENIE_SPACE_ID` in `src/app/app.yaml`
- Or accept that Genie-backed routes will fail and rely on the prompt-template agent path

## 5. Start the app

```bash
databricks apps start store-intelligence-france --profile fe-vm-hatim-apps-showcase
```

## Secrets
None required. The app uses OAuth via `DATABRICKS_CLIENT_ID` / `DATABRICKS_CLIENT_SECRET` injected by the Apps runtime. Local dev uses a PAT in `.env`.

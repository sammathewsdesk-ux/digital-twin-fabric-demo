# O&G Digital Twin Demo for Microsoft Fabric

An anonymized mixed oil and gas Digital Twin demo showing the value of semantic modelling, ontologies, real-time PI-style telemetry, asset health, and KPI rollups in Microsoft Fabric.

## What is included

| Area | Files |
|---|---|
| Ontology and asset hierarchy | `ontology-seed.json`, `asset-classes.csv`, `example-assets.csv` |
| Semantic relationships | `relationship-types.csv`, `relationship-edges.csv` |
| PI-style telemetry | `telemetry-tag-patterns.csv`, `data/pi_telemetry_loop.csv`, `scripts/replay_pi_telemetry.js` |
| Events, failure modes, KPIs | `data/pi_event_frames.csv`, `failure-modes.csv`, `kpi-definitions.csv`, `data/kpi-timeseries.csv`, `data/asset-health-scores.csv` |
| Fabric mapping | `fabric-data-model-mapping.md`, `fabric-table-schemas.csv`, `fabric-semantic-measures.csv`, `fabric-realtime-flow.json`, `fabric-sql-ddl.sql` |
| Demo app | `react-app/` |

## React app

The React app includes:

- Control room screen
- PI Vision-style process mimic
- Ontology browser
- Scenario controls
- Fabric architecture view

Run locally:

```powershell
cd react-app
npm.cmd install
npm.cmd run dev
```

Build:

```powershell
cd react-app
npm.cmd run build
```

## Real-time telemetry replay

Generate the deterministic synthetic PI-style loop:

```powershell
node scripts/generate_synthetic_pi_data.js
```

Replay as live JSONL with current timestamps:

```powershell
node scripts/replay_pi_telemetry.js --speed 300 --duration-seconds 120 --loop
```

## Fabric positioning

The recommended Fabric architecture is:

```text
Synthetic PI Replay
  -> Eventstream / Real-Time Hub
    -> Eventhouse for hot telemetry
    -> Lakehouse Delta tables for history
      -> Direct Lake / Power BI semantic model
        -> React app and operational visualizations
```

## Anonymization

All assets, locations, facilities, tags, operating scenarios, and business context are synthetic and anonymized. The demo does not use real operator names, real field names, real facility names, or real PI tags.

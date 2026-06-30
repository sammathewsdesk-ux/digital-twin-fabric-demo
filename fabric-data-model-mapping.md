# Fabric Data Model Mapping

## Purpose

This document maps the anonymized O&G Digital Twin demo assets into a Microsoft Fabric-ready data model. The aim is to show how semantic modelling, asset ontology, PI-style telemetry, events, health, and business KPIs can sit together in Fabric.

## Target Fabric architecture

```text
Synthetic PI Replay
  -> Fabric Eventstream / Real-Time Hub
    -> Eventhouse KQL Database for hot telemetry
    -> Lakehouse Delta tables for bronze/silver history
      -> Warehouse or Direct Lake semantic model
        -> Power BI / React app / Control room screen / PI Vision-style screen
```

## Fabric layers

| Layer | Fabric component | Demo purpose |
|---|---|---|
| Bronze | Lakehouse files/tables | Raw ontology files, raw telemetry loop, raw replay stream |
| Silver | Lakehouse Delta tables | Cleaned dimensions, relationship edges, telemetry facts, event facts |
| Gold | Warehouse or Lakehouse curated tables | KPI time series, asset health scores, event impact, semantic model measures |
| Hot path | Eventstream + Eventhouse | Live replay stream and latest tag values |
| Semantic | Power BI semantic model / Direct Lake | Measures, relationships, KPI rollups, health scoring, cross-filtering |
| App | React / HTML demo | Control room and PI Vision-style screens |

## Existing artifact to Fabric table mapping

| Existing file | Fabric table | Table type | Layer | Notes |
|---|---|---|---|---|
| `asset-classes.csv` | `DimAssetClass` | Dimension | Silver | Ontology class catalog |
| `example-assets.csv` | `DimAsset` | Dimension | Silver | Asset hierarchy nodes |
| `relationship-types.csv` | `DimRelationshipType` | Dimension | Silver | Semantic edge type catalog |
| `relationship-edges.csv` | `BridgeAssetRelationship` | Bridge / graph edge | Silver | Enables semantic navigation |
| `telemetry-tag-patterns.csv` | `DimTelemetryTag` | Dimension | Silver | PI-style tag catalog |
| `data/pi_telemetry_loop.csv` | `FactTelemetry` | Fact | Bronze/Silver | Historical loopable telemetry |
| `data/live_pi_stream.jsonl` | `FactTelemetryHot` | Event stream / Eventhouse | Hot path | Re-stamped live replay events |
| `data/live_pi_latest_snapshot.json` | `CurrentTelemetrySnapshot` | Snapshot | Hot path / Gold | Latest value per tag |
| `data/pi_event_frames.csv` | `FactEventFrame` | Fact | Silver | Event frames linked to assets and tags |
| `failure-modes.csv` | `DimFailureMode` | Dimension | Silver | Failure-mode ontology |
| `kpi-definitions.csv` | `DimKPI` | Dimension | Gold | KPI catalog and semantic definitions |
| `data/kpi-timeseries.csv` | `FactKPITimeSeries` | Fact | Gold | Derived KPI values |
| `data/asset-health-scores.csv` | `FactAssetHealth` | Fact / snapshot | Gold | Current asset health diagnostics |
| `data/event-impact-map.csv` | `BridgeEventImpact` | Bridge | Gold | Event-to-KPI and failure-mode impact mapping |

## Recommended table relationships

| From table | From column | To table | To column | Cardinality | Purpose |
|---|---|---|---|---|---|
| `DimAsset` | `class_id` | `DimAssetClass` | `class_id` | Many-to-one | Asset instance to ontology class |
| `DimAsset` | `parent_asset_id` | `DimAsset` | `asset_id` | Many-to-one | Hierarchy parent-child |
| `BridgeAssetRelationship` | `source_asset_id` | `DimAsset` | `asset_id` | Many-to-one | Relationship source |
| `BridgeAssetRelationship` | `target_asset_id` | `DimAsset` | `asset_id` | Many-to-one, nullable | Relationship target when target is an asset |
| `BridgeAssetRelationship` | `relationship_type` | `DimRelationshipType` | `relationship_id` | Many-to-one | Semantic edge classification |
| `DimTelemetryTag` | `asset_id` | `DimAsset` | `asset_id` | Many-to-one | Tag belongs to asset |
| `FactTelemetry` | `tag_id` | `DimTelemetryTag` | `tag_id` | Many-to-one | Time-series value to tag metadata |
| `FactEventFrame` | `asset_id` | `DimAsset` | `asset_id` | Many-to-one | Event to impacted asset |
| `FactEventFrame` | `source_tag_id` | `DimTelemetryTag` | `tag_id` | Many-to-one | Event trigger tag |
| `BridgeEventImpact` | `event_id` | `FactEventFrame` | `event_id` | Many-to-one | Business impact of event |
| `BridgeEventImpact` | `likely_failure_mode_id` | `DimFailureMode` | `failure_mode_id` | Many-to-one | Event to likely failure mode |
| `FactKPITimeSeries` | `kpi_id` | `DimKPI` | `kpi_id` | Many-to-one | KPI values to KPI catalog |
| `FactKPITimeSeries` | `asset_id` | `DimAsset` | `asset_id` | Many-to-one | KPI values to asset context |
| `FactAssetHealth` | `asset_id` | `DimAsset` | `asset_id` | One-to-one or many-to-one | Health snapshot to asset |

## Semantic model star schema

Use `DimAsset` as the core conformed dimension. It connects the asset hierarchy, telemetry, events, health, and KPI facts.

```text
DimAssetClass
    |
DimAsset -- DimTelemetryTag -- FactTelemetry
   |  \                     \-- FactEventFrame -- BridgeEventImpact -- DimFailureMode
   |   \
   |    \-- BridgeAssetRelationship -- DimRelationshipType
   |
   \-- FactAssetHealth
   |
   \-- FactKPITimeSeries -- DimKPI
```

## Eventhouse / KQL hot path

Use Eventstream to ingest JSONL messages from `scripts/replay_pi_telemetry.js`. Route the events to:

1. Eventhouse table `TelemetryHot`
2. Lakehouse table `FactTelemetry` for persistence
3. Optional Activator rule for threshold or semantic event triggers

Suggested Eventhouse table columns:

| Column | Type |
|---|---|
| `timestamp` | datetime |
| `source_loop_second` | int |
| `tag_id` | string |
| `tag_name` | string |
| `asset_id` | string |
| `value` | real |
| `engineering_unit` | string |
| `quality` | string |
| `scenario` | string |

## Lakehouse medallion pattern

| Table | Bronze | Silver | Gold |
|---|---|---|---|
| Asset ontology | Raw CSV files | `DimAssetClass`, `DimAsset`, `DimRelationshipType`, `BridgeAssetRelationship` | Asset hierarchy and graph views |
| Telemetry | Raw replay stream / loop CSV | `FactTelemetry`, `DimTelemetryTag` | KPI calculations and latest snapshot |
| Events | Raw event frame CSV | `FactEventFrame` | `BridgeEventImpact` |
| KPIs | Generator output | `DimKPI`, `FactKPITimeSeries` | Semantic model measures |
| Health | Generator output | `FactAssetHealth` | Control room asset health rollups |

## Demo narrative enabled by this model

1. Operator sees K101 vibration rising in the PI Vision-style screen.
2. The semantic model maps the tag to the compressor asset through `DimTelemetryTag`.
3. The asset graph shows K101 is part of Gas Processing and feeds Gas Export Reliability.
4. Event impact mapping identifies the likely failure mode as compressor bearing degradation.
5. KPI measures show reduced compression efficiency and gas export reliability.
6. The control room screen surfaces the business impact and recommended action.


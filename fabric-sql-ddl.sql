CREATE TABLE DimAssetClass (
  class_id VARCHAR(100) NOT NULL,
  parent_class VARCHAR(100) NULL,
  domain VARCHAR(100) NULL,
  description VARCHAR(1000) NULL,
  key_attributes VARCHAR(1000) NULL
);

CREATE TABLE DimAsset (
  asset_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  class_id VARCHAR(100) NOT NULL,
  parent_asset_id VARCHAR(100) NULL,
  domain VARCHAR(100) NULL,
  description VARCHAR(1000) NULL
);

CREATE TABLE DimRelationshipType (
  relationship_id VARCHAR(100) NOT NULL,
  inverse_relationship VARCHAR(100) NULL,
  description VARCHAR(1000) NULL,
  example VARCHAR(1000) NULL
);

CREATE TABLE BridgeAssetRelationship (
  edge_id VARCHAR(100) NOT NULL,
  source_asset_id VARCHAR(100) NOT NULL,
  relationship_type VARCHAR(100) NOT NULL,
  target_asset_id VARCHAR(100) NOT NULL,
  relationship_context VARCHAR(100) NULL,
  description VARCHAR(1000) NULL
);

CREATE TABLE DimTelemetryTag (
  tag_id VARCHAR(150) NOT NULL,
  tag_name VARCHAR(255) NOT NULL,
  asset_id VARCHAR(100) NOT NULL,
  asset_class VARCHAR(100) NULL,
  variable VARCHAR(100) NULL,
  measurement_type VARCHAR(50) NULL,
  engineering_unit VARCHAR(100) NULL,
  sample_interval_seconds INT NOT NULL,
  normal_min DECIMAL(18, 6) NULL,
  normal_max DECIMAL(18, 6) NULL,
  description VARCHAR(1000) NULL
);

CREATE TABLE FactTelemetry (
  sequence BIGINT NOT NULL,
  event_time DATETIME2(3) NOT NULL,
  loop_second INT NOT NULL,
  tag_id VARCHAR(150) NOT NULL,
  tag_name VARCHAR(255) NOT NULL,
  asset_id VARCHAR(100) NOT NULL,
  value DECIMAL(18, 6) NOT NULL,
  engineering_unit VARCHAR(100) NULL,
  quality VARCHAR(50) NULL,
  scenario VARCHAR(500) NULL
);

CREATE TABLE FactEventFrame (
  event_id VARCHAR(150) NOT NULL,
  asset_id VARCHAR(100) NOT NULL,
  source_tag_id VARCHAR(150) NULL,
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  start_loop_second INT NOT NULL,
  end_loop_second INT NOT NULL,
  description VARCHAR(1000) NULL
);

CREATE TABLE DimFailureMode (
  failure_mode_id VARCHAR(150) NOT NULL,
  asset_class VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(1000) NULL,
  detection_pattern VARCHAR(1000) NULL,
  operational_impact VARCHAR(1000) NULL,
  recommended_action VARCHAR(1000) NULL
);

CREATE TABLE DimKPI (
  kpi_id VARCHAR(150) NOT NULL,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(100) NOT NULL,
  semantic_definition VARCHAR(1000) NULL,
  applies_to VARCHAR(255) NULL,
  aggregation_window VARCHAR(100) NULL
);

CREATE TABLE FactKPITimeSeries (
  timestamp DATETIME2(3) NOT NULL,
  loop_second INT NOT NULL,
  kpi_id VARCHAR(150) NOT NULL,
  asset_id VARCHAR(100) NOT NULL,
  value DECIMAL(18, 6) NOT NULL,
  unit VARCHAR(100) NULL,
  status VARCHAR(50) NULL
);

CREATE TABLE FactAssetHealth (
  asset_id VARCHAR(100) NOT NULL,
  asset_name VARCHAR(255) NOT NULL,
  asset_class VARCHAR(100) NOT NULL,
  area VARCHAR(255) NULL,
  health_score DECIMAL(6, 2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  diagnostic_summary VARCHAR(1000) NULL,
  dominant_condition VARCHAR(255) NULL,
  recommended_action VARCHAR(1000) NULL
);

CREATE TABLE BridgeEventImpact (
  event_id VARCHAR(150) NOT NULL,
  impacted_asset_id VARCHAR(100) NOT NULL,
  likely_failure_mode_id VARCHAR(150) NOT NULL,
  impacted_kpis VARCHAR(1000) NULL,
  business_impact_severity VARCHAR(50) NULL,
  operational_impact VARCHAR(1000) NULL,
  recommended_action VARCHAR(1000) NULL
);

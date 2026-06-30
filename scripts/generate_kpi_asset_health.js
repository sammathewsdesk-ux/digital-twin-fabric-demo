const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const telemetryFile = path.join(dataDir, "pi_telemetry_loop.csv");
const tagCatalogFile = path.join(root, "telemetry-tag-patterns.csv");

const out = {
  failureModes: path.join(root, "failure-modes.csv"),
  kpiDefinitions: path.join(root, "kpi-definitions.csv"),
  assetHealth: path.join(dataDir, "asset-health-scores.csv"),
  kpiTimeseries: path.join(dataDir, "kpi-timeseries.csv"),
  eventImpact: path.join(dataDir, "event-impact-map.csv")
};

function parseCsv(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/);
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, headers, rows) {
  fs.writeFileSync(
    filePath,
    `${[headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n")}\n`,
    "utf8"
  );
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function scoreRange(value, low, high, direction = "inside") {
  if (direction === "lowGood") {
    if (value <= low) return 100;
    if (value >= high) return 0;
    return 100 - ((value - low) / (high - low)) * 100;
  }
  if (direction === "highGood") {
    if (value >= high) return 100;
    if (value <= low) return 0;
    return ((value - low) / (high - low)) * 100;
  }
  if (value >= low && value <= high) return 100;
  const span = high - low;
  const distance = value < low ? low - value : value - high;
  return clamp(100 - (distance / Math.max(span * 0.25, 1)) * 100, 0, 100);
}

function avg(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function buildWindowIndex(rows) {
  const windows = new Map();
  for (const row of rows) {
    const loopSecond = Number(row.loop_second);
    const windowSecond = Math.floor(loopSecond / 300) * 300;
    if (!windows.has(windowSecond)) windows.set(windowSecond, []);
    windows.get(windowSecond).push({ ...row, value: Number(row.value), loopSecond });
  }
  return [...windows.entries()].sort((a, b) => a[0] - b[0]);
}

function latestByTag(rows, maxLoopSecond) {
  const latest = {};
  for (const row of rows) {
    if (row.loopSecond <= maxLoopSecond) latest[row.tag_id] = row.value;
  }
  return latest;
}

function tagValue(latest, tagId) {
  return Number(latest[tagId] ?? 0);
}

function healthForAsset(assetId, latest) {
  if (assetId === "OPH-A-K101") {
    const vibration = tagValue(latest, "TAG-OPH-A-K101-VIB-PV");
    const temp = tagValue(latest, "TAG-OPH-A-K101-TEMP-PV");
    const power = tagValue(latest, "TAG-OPH-A-M101-POWER-PV");
    const discharge = tagValue(latest, "TAG-OPH-A-K101-DP-PV");
    return clamp(
      avg([
        scoreRange(vibration, 0, 6, "lowGood"),
        scoreRange(temp, 45, 95, "inside"),
        scoreRange(power, 500, 8500, "inside"),
        scoreRange(discharge, 90, 155, "inside")
      ]),
      0,
      100
    );
  }
  if (assetId === "OPH-A-V101") {
    const pressure = tagValue(latest, "TAG-OPH-A-V101-PRESS-PV");
    const level = tagValue(latest, "TAG-OPH-A-V101-LEVEL-PV");
    return clamp(avg([scoreRange(pressure, 15, 45, "inside"), scoreRange(level, 38, 68, "inside")]), 0, 100);
  }
  if (assetId === "OPH-A-W01") {
    const pressure = tagValue(latest, "TAG-OPH-A-W01-THP-PV");
    const flow = tagValue(latest, "TAG-OPH-A-W01-FLOW-PV");
    const choke = tagValue(latest, "TAG-OPH-A-W01-CHOKE-POS");
    return clamp(avg([scoreRange(pressure, 90, 210, "inside"), scoreRange(flow, 3500, 10000, "inside"), scoreRange(choke, 15, 80, "inside")]), 0, 100);
  }
  if (assetId === "OPH-A-P101") {
    return 91.2;
  }
  if (assetId === "ORC-B-P101") {
    const flow = tagValue(latest, "TAG-ORC-B-P101-FLOW-PV");
    const vibration = tagValue(latest, "TAG-ORC-B-P101-VIB-PV");
    return clamp(avg([scoreRange(flow, 350, 1050, "inside"), scoreRange(vibration, 0, 5, "lowGood")]), 0, 100);
  }
  if (assetId === "ORC-B-H101") {
    const fuel = tagValue(latest, "TAG-ORC-B-H101-FUEL-PV");
    const outletTemp = tagValue(latest, "TAG-ORC-B-H101-TEMP-PV");
    return clamp(avg([scoreRange(fuel, 500, 5000, "inside"), scoreRange(outletTemp, 310, 385, "inside")]), 0, 100);
  }
  if (assetId === "ORC-B-C101") {
    const topTemp = tagValue(latest, "TAG-ORC-B-C101-TOP-TEMP");
    const diffPressure = tagValue(latest, "TAG-ORC-B-C101-DP-PV");
    return clamp(avg([scoreRange(topTemp, 85, 145, "inside"), scoreRange(diffPressure, 10, 80, "lowGood")]), 0, 100);
  }
  return 95;
}

function statusFor(score) {
  if (score >= 85) return "Normal";
  if (score >= 70) return "Watch";
  if (score >= 50) return "Degraded";
  return "Critical";
}

function generateFailureModes() {
  const rows = [
    ["FM-COMP-001", "RotatingEquipment", "Compressor bearing degradation", "Rising vibration and bearing temperature; falling efficiency", "High vibration; bearing temp drift; power increase", "Reduced gas export capacity; potential trip", "Inspect bearings and lube oil; reduce load if trend persists"],
    ["FM-COMP-002", "RotatingEquipment", "Compressor surge proximity", "Operating point approaches unstable region", "Discharge pressure instability; flow oscillation", "Compressor protection risk; throughput loss", "Check anti-surge valve response and suction conditions"],
    ["FM-PUMP-001", "RotatingEquipment", "Pump seal leakage", "Seal degradation or process contamination", "Rising vibration; falling flow; seal pot level change", "Environmental and reliability risk", "Inspect seal system and plan maintenance window"],
    ["FM-SEP-001", "StaticEquipment", "Separator level instability", "Poor level control or unstable inlet slugging", "Level oscillation; pressure oscillation", "Liquid carryover risk and downstream upset", "Tune level control; check inlet slugging and valve response"],
    ["FM-HEAT-001", "StaticEquipment", "Fired heater efficiency drift", "Fouling or combustion inefficiency", "Fuel flow increases while outlet temperature is flat or falling", "Higher energy intensity and emissions", "Check burner performance and schedule cleaning assessment"],
    ["FM-COL-001", "StaticEquipment", "Column flooding or tray loading", "Hydraulic constraint in column internals", "Differential pressure increase; top temperature instability", "Product quality risk and throughput constraint", "Reduce charge rate; inspect operating envelope and draw balance"]
  ].map(([failure_mode_id, asset_class, name, description, detection_pattern, operational_impact, recommended_action]) => ({
    failure_mode_id, asset_class, name, description, detection_pattern, operational_impact, recommended_action
  }));
  writeCsv(out.failureModes, Object.keys(rows[0]), rows);
}

function generateKpiDefinitions() {
  const rows = [
    ["AssetHealthScore", "Asset health score", "0-100", "Weighted score derived from current telemetry against normal operating envelopes and known degradation patterns.", "Asset", "5 minutes"],
    ["ProductionThroughput", "Production throughput", "boe/d", "Synthetic well flow converted to production throughput for the offshore hub.", "Offshore hub", "5 minutes"],
    ["GasExportReliability", "Gas export reliability", "percent", "Reliability proxy from compressor health, vibration, discharge pressure, and driver power.", "Gas processing", "5 minutes"],
    ["CompressionEfficiency", "Compression efficiency", "percent", "Proxy from discharge pressure achieved per unit driver power, penalized for vibration and bearing temperature.", "Gas compressor", "5 minutes"],
    ["SeparatorStability", "Separator stability", "percent", "Proxy from separator level and pressure staying within stable operating bands.", "Inlet separator", "5 minutes"],
    ["RefineryUtilization", "Refinery utilization", "percent", "Crude charge pump flow as a proxy for refinery load against synthetic nameplate.", "Refinery complex", "5 minutes"],
    ["EnergyIntensity", "Energy intensity", "kg fuel per m3 charge", "Fired heater fuel consumption normalized by crude charge flow.", "Refinery primary processing", "5 minutes"],
    ["EmissionsIntensity", "Emissions intensity", "kg CO2e per m3 charge", "Synthetic emissions factor applied to fuel gas flow and normalized by charge flow.", "Refinery complex", "5 minutes"]
  ].map(([kpi_id, name, unit, semantic_definition, applies_to, aggregation_window]) => ({
    kpi_id, name, unit, semantic_definition, applies_to, aggregation_window
  }));
  writeCsv(out.kpiDefinitions, Object.keys(rows[0]), rows);
}

function generateKpiTimeseries(telemetryRows) {
  const windows = buildWindowIndex(telemetryRows);
  const allRows = telemetryRows.map((row) => ({ ...row, loopSecond: Number(row.loop_second), value: Number(row.value) }));
  const kpiRows = [];

  for (const [windowSecond, rows] of windows) {
    const latest = latestByTag(allRows, windowSecond + 299);
    const compressorHealth = healthForAsset("OPH-A-K101", latest);
    const separatorHealth = healthForAsset("OPH-A-V101", latest);
    const heaterHealth = healthForAsset("ORC-B-H101", latest);
    const columnHealth = healthForAsset("ORC-B-C101", latest);
    const wellFlow = avg(rows.filter((row) => row.tag_id === "TAG-OPH-A-W01-FLOW-PV").map((row) => row.value));
    const gasExportReliability = clamp(compressorHealth * 0.72 + scoreRange(tagValue(latest, "TAG-OPH-A-K101-DP-PV"), 90, 155, "inside") * 0.28, 0, 100);
    const compressionEfficiency = clamp(scoreRange(tagValue(latest, "TAG-OPH-A-K101-DP-PV") / Math.max(tagValue(latest, "TAG-OPH-A-M101-POWER-PV"), 1), 0.012, 0.028, "highGood") * 0.75 + compressorHealth * 0.25, 0, 100);
    const separatorStability = separatorHealth;
    const crudeFlow = avg(rows.filter((row) => row.tag_id === "TAG-ORC-B-P101-FLOW-PV").map((row) => row.value));
    const heaterFuel = avg(rows.filter((row) => row.tag_id === "TAG-ORC-B-H101-FUEL-PV").map((row) => row.value));
    const refineryUtilization = clamp((crudeFlow / 1200) * 100, 0, 110);
    const energyIntensity = crudeFlow > 0 ? heaterFuel / crudeFlow : 0;
    const emissionsIntensity = energyIntensity * 2.75;
    const totalHealth = avg([compressorHealth, separatorHealth, heaterHealth, columnHealth, healthForAsset("ORC-B-P101", latest), healthForAsset("OPH-A-W01", latest)]);

    const timestamp = new Date(Date.parse("2026-06-30T08:00:00.000Z") + windowSecond * 1000).toISOString();
    const records = [
      ["AssetHealthScore", "Portfolio", totalHealth, "0-100"],
      ["ProductionThroughput", "OPH-A", wellFlow, "boe/d"],
      ["GasExportReliability", "OPH-A-GAS", gasExportReliability, "percent"],
      ["CompressionEfficiency", "OPH-A-K101", compressionEfficiency, "percent"],
      ["SeparatorStability", "OPH-A-V101", separatorStability, "percent"],
      ["RefineryUtilization", "ORC-B", refineryUtilization, "percent"],
      ["EnergyIntensity", "ORC-B-H101", energyIntensity, "kg fuel per m3 charge"],
      ["EmissionsIntensity", "ORC-B", emissionsIntensity, "kg CO2e per m3 charge"]
    ];
    for (const [kpi_id, asset_id, value, unit] of records) {
      kpiRows.push({
        timestamp,
        loop_second: windowSecond,
        kpi_id,
        asset_id,
        value: Number(value.toFixed(3)),
        unit,
        status: statusFor(kpi_id === "ProductionThroughput" ? scoreRange(value, 3500, 10000, "inside") : kpi_id.includes("Intensity") ? scoreRange(value, 0, kpi_id === "EnergyIntensity" ? 8 : 22, "lowGood") : value)
      });
    }
  }
  writeCsv(out.kpiTimeseries, Object.keys(kpiRows[0]), kpiRows);
}

function generateAssetHealth(telemetryRows) {
  const allRows = telemetryRows.map((row) => ({ ...row, loopSecond: Number(row.loop_second), value: Number(row.value) }));
  const latest = latestByTag(allRows, 21600);
  const rows = [
    ["OPH-A-W01", "Production Well W01", "Well", "Offshore Production Hub A", healthForAsset("OPH-A-W01", latest), "Stable producer; monitor tubing pressure and choke-flow relationship.", "Normal operations"],
    ["OPH-A-V101", "Inlet Separator V101", "StaticEquipment", "Inlet Processing", healthForAsset("OPH-A-V101", latest), "Recovered from level instability; monitor level controller performance.", "Separator level instability"],
    ["OPH-A-K101", "Gas Compressor K101", "RotatingEquipment", "Gas Processing", healthForAsset("OPH-A-K101", latest), "Vibration and bearing temperature trend indicates degradation.", "Compressor bearing degradation"],
    ["OPH-A-P101", "Oil Export Pump P101", "RotatingEquipment", "Oil Processing", healthForAsset("OPH-A-P101", latest), "Operating inside expected export envelope.", "Normal operations"],
    ["ORC-B-P101", "Crude Charge Pump P101", "RotatingEquipment", "Crude Receiving", healthForAsset("ORC-B-P101", latest), "Flow and vibration are within operating envelope.", "Normal operations"],
    ["ORC-B-H101", "Fired Heater H101", "StaticEquipment", "Crude Distillation Unit", healthForAsset("ORC-B-H101", latest), "Fuel demand drift suggests reduced thermal efficiency.", "Fired heater efficiency drift"],
    ["ORC-B-C101", "Atmospheric Column C101", "StaticEquipment", "Crude Distillation Unit", healthForAsset("ORC-B-C101", latest), "Differential pressure trend indicates developing hydraulic constraint.", "Column differential pressure drift"]
  ].map(([asset_id, asset_name, asset_class, area, score, diagnostic_summary, dominant_condition]) => ({
    asset_id,
    asset_name,
    asset_class,
    area,
    health_score: Number(score.toFixed(1)),
    status: statusFor(score),
    diagnostic_summary,
    dominant_condition,
    recommended_action: score < 70 ? "Raise operations review and reliability work order candidate." : score < 85 ? "Add to watchlist and review trend during next shift handover." : "Continue normal monitoring."
  }));
  writeCsv(out.assetHealth, Object.keys(rows[0]), rows);
}

function generateEventImpact() {
  const rows = [
    ["EVT-OPH-A-K101-VIB-001", "OPH-A-K101", "FM-COMP-001", "GasExportReliability;CompressionEfficiency;ProductionThroughput", "High", "Potential gas export constraint and compressor trip risk", "Inspect compressor bearing/lube oil condition; consider load reduction if vibration persists"],
    ["EVT-OPH-A-K101-TEMP-001", "OPH-A-K101", "FM-COMP-001", "AssetHealthScore;CompressionEfficiency", "Medium", "Reduced compressor health and reliability margin", "Correlate bearing temperature with vibration and driver power"],
    ["EVT-OPH-A-V101-LVL-001", "OPH-A-V101", "FM-SEP-001", "SeparatorStability;ProductionThroughput", "Medium", "Liquid carryover risk and downstream gas compression upset", "Review inlet slugging and level control loop response"],
    ["EVT-ORC-B-H101-EFF-001", "ORC-B-H101", "FM-HEAT-001", "EnergyIntensity;EmissionsIntensity;RefineryUtilization", "Medium", "Higher fuel cost and emissions per unit throughput", "Check burner balance and schedule fouling assessment"],
    ["EVT-ORC-B-C101-DP-001", "ORC-B-C101", "FM-COL-001", "RefineryUtilization;EnergyIntensity", "Low", "Early indicator of column hydraulic constraint", "Monitor differential pressure and side draw quality trends"]
  ].map(([event_id, impacted_asset_id, likely_failure_mode_id, impacted_kpis, business_impact_severity, operational_impact, recommended_action]) => ({
    event_id, impacted_asset_id, likely_failure_mode_id, impacted_kpis, business_impact_severity, operational_impact, recommended_action
  }));
  writeCsv(out.eventImpact, Object.keys(rows[0]), rows);
}

function main() {
  const telemetryRows = parseCsv(telemetryFile);
  parseCsv(tagCatalogFile);
  generateFailureModes();
  generateKpiDefinitions();
  generateKpiTimeseries(telemetryRows);
  generateAssetHealth(telemetryRows);
  generateEventImpact();
  console.log(JSON.stringify({
    failureModes: parseCsv(out.failureModes).length,
    kpiDefinitions: parseCsv(out.kpiDefinitions).length,
    assetHealthRows: parseCsv(out.assetHealth).length,
    kpiTimeseriesRows: parseCsv(out.kpiTimeseries).length,
    eventImpactRows: parseCsv(out.eventImpact).length
  }, null, 2));
}

main();

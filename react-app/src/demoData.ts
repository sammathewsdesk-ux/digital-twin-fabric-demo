export type Status = "Normal" | "Watch" | "Degraded" | "Critical";

export type ScenarioId =
  | "normal"
  | "compressor"
  | "separator"
  | "refinery";

export type AssetHealth = {
  assetId: string;
  assetName: string;
  classId: string;
  area: string;
  score: number;
  status: Status;
  diagnostic: string;
  condition: string;
  action: string;
};

export type TagState = {
  tagId: string;
  label: string;
  assetId: string;
  value: number;
  unit: string;
  normalMin: number;
  normalMax: number;
  precision: number;
};

export type AssetNode = {
  id: string;
  name: string;
  classId: string;
  parentId?: string;
  domain: string;
};

export type Relationship = {
  source: string;
  type: string;
  target: string;
  context: string;
};

export const scenarios: Record<ScenarioId, { name: string; description: string; multiplier: number }> = {
  normal: {
    name: "Normal operations",
    description: "Stable offshore production and refinery operations with routine process noise.",
    multiplier: 0
  },
  compressor: {
    name: "Compressor degradation",
    description: "Gas compressor K101 vibration and bearing temperature rise, reducing export reliability.",
    multiplier: 1
  },
  separator: {
    name: "Separator instability",
    description: "Inlet separator V101 level oscillates, creating carryover and compression upset risk.",
    multiplier: 1
  },
  refinery: {
    name: "Refinery efficiency drift",
    description: "Fired heater fuel use and column differential pressure rise, indicating CDU constraint risk.",
    multiplier: 1
  }
};

export const baseTags: TagState[] = [
  { tagId: "TAG-OPH-A-W01-THP-PV", label: "W01 THP", assetId: "OPH-A-W01", value: 151.2, unit: "barg", normalMin: 80, normalMax: 220, precision: 1 },
  { tagId: "TAG-OPH-A-W01-FLOW-PV", label: "W01 FLOW", assetId: "OPH-A-W01", value: 7420, unit: "boe/d", normalMin: 1000, normalMax: 12000, precision: 0 },
  { tagId: "TAG-OPH-A-W01-CHOKE-POS", label: "W01 CHOKE", assetId: "OPH-A-W01", value: 55.4, unit: "%", normalMin: 10, normalMax: 85, precision: 1 },
  { tagId: "TAG-OPH-A-V101-PRESS-PV", label: "V101 PRESS", assetId: "OPH-A-V101", value: 31.4, unit: "barg", normalMin: 15, normalMax: 45, precision: 1 },
  { tagId: "TAG-OPH-A-V101-LEVEL-PV", label: "V101 LEVEL", assetId: "OPH-A-V101", value: 62.1, unit: "%", normalMin: 35, normalMax: 70, precision: 1 },
  { tagId: "TAG-OPH-A-K101-DP-PV", label: "K101 DISCH", assetId: "OPH-A-K101", value: 128.5, unit: "barg", normalMin: 80, normalMax: 160, precision: 1 },
  { tagId: "TAG-OPH-A-K101-VIB-PV", label: "K101 VIB", assetId: "OPH-A-K101", value: 4.8, unit: "mm/s", normalMin: 0, normalMax: 6, precision: 1 },
  { tagId: "TAG-OPH-A-K101-TEMP-PV", label: "K101 BRG", assetId: "OPH-A-K101", value: 86.4, unit: "degC", normalMin: 45, normalMax: 95, precision: 1 },
  { tagId: "TAG-OPH-A-M101-POWER-PV", label: "M101 LOAD", assetId: "OPH-A-M101", value: 6730, unit: "kW", normalMin: 500, normalMax: 8500, precision: 0 },
  { tagId: "TAG-ORC-B-T101-LEVEL-PV", label: "T101 LEVEL", assetId: "ORC-B-T101", value: 69.2, unit: "%", normalMin: 20, normalMax: 90, precision: 1 },
  { tagId: "TAG-ORC-B-P101-FLOW-PV", label: "P101 FLOW", assetId: "ORC-B-P101", value: 706, unit: "m3/h", normalMin: 100, normalMax: 1200, precision: 0 },
  { tagId: "TAG-ORC-B-P101-VIB-PV", label: "P101 VIB", assetId: "ORC-B-P101", value: 3.7, unit: "mm/s", normalMin: 0, normalMax: 5, precision: 1 },
  { tagId: "TAG-ORC-B-H101-FUEL-PV", label: "H101 FUEL", assetId: "ORC-B-H101", value: 3580, unit: "kg/h", normalMin: 500, normalMax: 5000, precision: 0 },
  { tagId: "TAG-ORC-B-H101-TEMP-PV", label: "H101 OUT", assetId: "ORC-B-H101", value: 346, unit: "degC", normalMin: 280, normalMax: 390, precision: 0 },
  { tagId: "TAG-ORC-B-C101-TOP-TEMP", label: "C101 TOP", assetId: "ORC-B-C101", value: 122.8, unit: "degC", normalMin: 80, normalMax: 150, precision: 1 },
  { tagId: "TAG-ORC-B-C101-DP-PV", label: "C101 DP", assetId: "ORC-B-C101", value: 79.4, unit: "kPa", normalMin: 10, normalMax: 80, precision: 1 }
];

export const assetHealth: AssetHealth[] = [
  { assetId: "OPH-A-W01", assetName: "Production Well W01", classId: "Well", area: "Offshore Production Hub A", score: 100, status: "Normal", diagnostic: "Stable producer; monitor tubing pressure and choke-flow relationship.", condition: "Normal operations", action: "Continue normal monitoring." },
  { assetId: "OPH-A-V101", assetName: "Inlet Separator V101", classId: "StaticEquipment", area: "Inlet Processing", score: 100, status: "Normal", diagnostic: "Recovered from level instability; monitor level controller performance.", condition: "Separator level instability", action: "Continue normal monitoring." },
  { assetId: "OPH-A-K101", assetName: "Gas Compressor K101", classId: "RotatingEquipment", area: "Gas Processing", score: 79.4, status: "Watch", diagnostic: "Vibration and bearing temperature trend indicates degradation.", condition: "Compressor bearing degradation", action: "Add to watchlist and review trend during next shift handover." },
  { assetId: "OPH-A-P101", assetName: "Oil Export Pump P101", classId: "RotatingEquipment", area: "Oil Processing", score: 91.2, status: "Normal", diagnostic: "Operating inside expected export envelope.", condition: "Normal operations", action: "Continue normal monitoring." },
  { assetId: "ORC-B-P101", assetName: "Crude Charge Pump P101", classId: "RotatingEquipment", area: "Crude Receiving", score: 76, status: "Watch", diagnostic: "Flow and vibration are within operating envelope.", condition: "Normal operations", action: "Add to watchlist and review trend during next shift handover." },
  { assetId: "ORC-B-H101", assetName: "Fired Heater H101", classId: "StaticEquipment", area: "Crude Distillation Unit", score: 100, status: "Normal", diagnostic: "Fuel demand drift suggests reduced thermal efficiency.", condition: "Fired heater efficiency drift", action: "Continue normal monitoring." },
  { assetId: "ORC-B-C101", assetName: "Atmospheric Column C101", classId: "StaticEquipment", area: "Crude Distillation Unit", score: 66.2, status: "Degraded", diagnostic: "Differential pressure trend indicates developing hydraulic constraint.", condition: "Column differential pressure drift", action: "Raise operations review and reliability work order candidate." }
];

export const assets: AssetNode[] = [
  { id: "DEMO-ENERGY", name: "Demo Energy Company", classId: "Enterprise", domain: "Corporate" },
  { id: "SEG-UPSTREAM", name: "Upstream Business", classId: "BusinessSegment", parentId: "DEMO-ENERGY", domain: "Corporate" },
  { id: "REG-ALPHA", name: "Offshore Basin Alpha", classId: "OperatingRegion", parentId: "SEG-UPSTREAM", domain: "Corporate" },
  { id: "OPH-A", name: "Offshore Production Hub A", classId: "ProductionFacility", parentId: "REG-ALPHA", domain: "SurfaceProduction" },
  { id: "OPH-A-SUB", name: "Subsurface Asset", classId: "ProcessArea", parentId: "OPH-A", domain: "Subsurface" },
  { id: "OPH-A-RES-ALPHA", name: "Reservoir Alpha", classId: "Reservoir", parentId: "OPH-A-SUB", domain: "Subsurface" },
  { id: "OPH-A-WELLS", name: "Wells and Wellbores", classId: "ProcessArea", parentId: "OPH-A", domain: "Wells" },
  { id: "OPH-A-W01", name: "Production Well W01", classId: "Well", parentId: "OPH-A-WELLS", domain: "Wells" },
  { id: "OPH-A-SURF", name: "Offshore Production Platform", classId: "ProcessArea", parentId: "OPH-A", domain: "SurfaceProduction" },
  { id: "OPH-A-INLET", name: "Inlet Processing", classId: "ProcessUnit", parentId: "OPH-A-SURF", domain: "SurfaceProduction" },
  { id: "OPH-A-V101", name: "Inlet Separator V101", classId: "StaticEquipment", parentId: "OPH-A-INLET", domain: "SurfaceProduction" },
  { id: "OPH-A-GAS", name: "Gas Processing", classId: "ProcessUnit", parentId: "OPH-A-SURF", domain: "SurfaceProduction" },
  { id: "OPH-A-K101", name: "Gas Compressor K101", classId: "RotatingEquipment", parentId: "OPH-A-GAS", domain: "SurfaceProduction" },
  { id: "SEG-DOWNSTREAM", name: "Downstream Business", classId: "BusinessSegment", parentId: "DEMO-ENERGY", domain: "Corporate" },
  { id: "REG-BETA", name: "Industrial Region Beta", classId: "OperatingRegion", parentId: "SEG-DOWNSTREAM", domain: "Corporate" },
  { id: "ORC-B", name: "Onshore Refinery Complex B", classId: "RefineryComplex", parentId: "REG-BETA", domain: "Refining" },
  { id: "ORC-B-RECV", name: "Crude Receiving", classId: "ProcessArea", parentId: "ORC-B", domain: "Refining" },
  { id: "ORC-B-P101", name: "Crude Charge Pump P101", classId: "RotatingEquipment", parentId: "ORC-B-RECV", domain: "Refining" },
  { id: "ORC-B-CDU101", name: "Crude Distillation Unit CDU101", classId: "ProcessUnit", parentId: "ORC-B", domain: "Refining" },
  { id: "ORC-B-H101", name: "Fired Heater H101", classId: "StaticEquipment", parentId: "ORC-B-CDU101", domain: "Refining" },
  { id: "ORC-B-C101", name: "Atmospheric Column C101", classId: "StaticEquipment", parentId: "ORC-B-CDU101", domain: "Refining" }
];

export const relationships: Relationship[] = [
  { source: "OPH-A-W01", type: "producesFrom", target: "OPH-A-RES-ALPHA", context: "Subsurface" },
  { source: "OPH-A-W01", type: "flowsTo", target: "OPH-A-INLET", context: "ProcessFlow" },
  { source: "OPH-A-INLET", type: "flowsTo", target: "OPH-A-V101", context: "ProcessFlow" },
  { source: "OPH-A-V101", type: "flowsTo", target: "OPH-A-GAS", context: "ProcessFlow" },
  { source: "OPH-A-GAS", type: "flowsTo", target: "OPH-A-K101", context: "ProcessFlow" },
  { source: "OPH-A-K101", type: "hasKPI", target: "CompressionEfficiency", context: "BusinessSemantics" },
  { source: "OPH-A-K101", type: "hasTelemetry", target: "TAG-OPH-A-K101-VIB-PV", context: "Telemetry" },
  { source: "OPH-A-K101", type: "hasTelemetry", target: "TAG-OPH-A-K101-TEMP-PV", context: "Telemetry" },
  { source: "ORC-B-P101", type: "feeds", target: "ORC-B-H101", context: "ProcessFlow" },
  { source: "ORC-B-H101", type: "feeds", target: "ORC-B-C101", context: "ProcessFlow" },
  { source: "ORC-B-H101", type: "hasKPI", target: "EnergyIntensity", context: "BusinessSemantics" },
  { source: "ORC-B-C101", type: "hasTelemetry", target: "TAG-ORC-B-C101-DP-PV", context: "Telemetry" }
];

export const fabricSteps = [
  ["Synthetic PI Replay", "Node replay emits JSONL telemetry with re-stamped current timestamps."],
  ["Eventstream", "Routes hot telemetry to Eventhouse and persisted telemetry to Lakehouse."],
  ["Eventhouse", "Stores live telemetry for PI Vision-style and control-room views."],
  ["Lakehouse", "Hosts ontology, asset graph, telemetry history, event frames, KPIs, and health tables."],
  ["Semantic Model", "Direct Lake model exposes measures for health, reliability, throughput, energy, and emissions."],
  ["React App", "Combines semantic model context with live telemetry for operator and executive experiences."]
];

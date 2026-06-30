# O&G Digital Twin React Demo

## What this is

This is the React application version of the anonymized O&G Digital Twin demo. It uses bundled synthetic data and live client-side replay behaviour to demonstrate:

- Control room operations screen
- PI Vision-style process mimic
- Ontology / digital spine browser
- Scenario controls
- Fabric data model architecture view

## Run locally

```powershell
cd "C:\Users\sammathew\OneDrive - Microsoft\Documents\Microsoft Scout\digital-twin-ontology\react-app"
npm.cmd run dev
```

Then open the Vite local URL shown in the terminal.

## Build for sharing

```powershell
cd "C:\Users\sammathew\OneDrive - Microsoft\Documents\Microsoft Scout\digital-twin-ontology\react-app"
npm.cmd run build
```

The production output is created in:

```text
dist\
```

## Demo screens

| Screen | Purpose |
|---|---|
| Control room | Asset health, KPIs, semantic event impact, recommended actions |
| PI Vision-style | Industrial process mimic with live PI-style values |
| Ontology browser | Digital spine, asset classes, relationships, and telemetry tags |
| Fabric model | Eventstream, Eventhouse, Lakehouse, semantic model, and app flow |

## Anonymization

All assets, regions, fields, facilities, tags, and operational references are synthetic and anonymized.

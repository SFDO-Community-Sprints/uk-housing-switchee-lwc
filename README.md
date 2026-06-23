# UK Housing — Switchee LWC

A Salesforce.org Community Sprint project delivering Lightning Web Components that surface [Switchee](https://switchee.co) IoT property data inside Salesforce for UK social housing organisations.

---
#### Contributors

Full Name | Team Role | GitHub Username
--- | --- | ---
Nathan Gibbs | Author | —
Jamie Jackaman | Author | —
Raksha Sanganee | Author | —


## Project Overview

### Vision & Goals

Switchee provides smart thermostats and sensors to social housing properties, generating rich daily data on indoor conditions, energy use, and risk indicators (mould, fuel poverty, overheating). This project brings that data directly into Salesforce on the **Location** record page, giving housing officers a single view of each property's health without needing to switch to the Switchee portal.

**Goals:**
- Surface Switchee IoT data (temperature, humidity, mould risk, energy) on the Salesforce Location record page
- Provide a 30-day trend chart for key metrics with an energy breakdown
- Show per-room sensor data linked to Asset records representing rooms within the property
- Deliver reusable, open-source components that any UK housing organisation using Salesforce and Switchee can deploy

### Project Vertical

Housing / Nonprofit

---

## Components

### Switchee Trend Panel (`switchee_asset_LWC_panel`)

Placed on the Location record page. Shows a property-level summary including:

- **Risk badges** — Mould, Fuel Poverty, Overheating, Heat Loss, Time-to-Heat (colour-coded High / Medium / Low)
- **Latest readings** — average temperature, humidity, heating hours, hot water hours
- **Energy summary** — solar generated, whole-home consumption, net from grid (latest day)
- **30-day trend chart** — SVG polyline chart with tabs for Mould Risk, Indoor Temp, Humidity, Heating Hours, and Energy kWh, with a date X-axis

### Switchee Rooms & Energy Panel (`switcheeRoomsEnergyPanel`)

Placed on the Location record page alongside the Trend Panel. Shows:

- **Room cards** — one card per Switchee device installed at the property, showing the room name, min/avg/max temperature, humidity, and any active warnings (condensation risk, cold home)
- **Drill-down chart** — click any room card to expand a 30-day inline chart for that room, with tabs for Indoor Temp, Humidity, and Heating Hours

---

## Data Model

The components rely on four objects linked to the standard `Location` object:

| Object | Description |
|---|---|
| `Location` | Standard Salesforce object representing the physical property |
| `Switchee_Device__c` | Physical hardware devices installed at the property (one per room) |
| `Switchee_Insight__c` | Daily aggregated analytics — risk scores, temp, humidity, heating (one per day) |
| `Switchee_Energy_Reading__c` | Daily meter clamp readings — solar and whole-home energy (one per day per meter) |

Full field-level documentation is in [`docs/switchee-lwc-technical-documentation.md`](docs/switchee-lwc-technical-documentation.md).

---

## Getting Started

### Prerequisites

- Salesforce org with the Switchee custom objects deployed
- Salesforce CLI (`sf`) installed and authenticated
- System Administrator profile with Read/Write access to all Switchee objects

### Deploy the components

```bash
# Clone the repo
git clone https://github.com/SFDO-Community-Sprints/uk-housing-switchee-lwc.git
cd uk-housing-switchee-lwc

# Deploy Apex and LWCs
sf project deploy start \
  --source-dir force-app/main/default/classes \
  --source-dir force-app/main/default/lwc/switchee_asset_LWC_panel \
  --source-dir force-app/main/default/lwc/switcheeRoomsEnergyPanel \
  --target-org <your-org-alias> --wait 10
```

### Load sample data

The `data/` folder contains numbered CSV files and a full import guide. See [`data/README.md`](data/README.md) for step-by-step instructions.

### Add to a Location page

1. Open **Lightning App Builder** on any Location record
2. Search for *Switchee* in the component panel
3. Drag **Switchee Trend Panel** and **Switchee Rooms & Energy Panel** onto the page
4. Save and activate

---

## Repository Structure

```
uk-housing-switchee-lwc/
├── force-app/main/default/
│   ├── classes/
│   │   ├── SwitcheeTrendController.cls          Apex for Trend Panel
│   │   └── SwitcheeRoomsEnergyController.cls    Apex for Rooms & Energy Panel
│   └── lwc/
│       ├── switchee_asset_LWC_panel/            Switchee Trend Panel
│       └── switcheeRoomsEnergyPanel/            Switchee Rooms & Energy Panel
├── data/
│   ├── README.md                                Import guide & field reference
│   ├── 01_Location.csv
│   ├── 02_Asset.csv
│   ├── 03_Switchee_Device__c.csv
│   ├── 04_Switchee_Insight__c.csv
│   └── 05_Switchee_Energy_Reading__c.csv
├── docs/
│   └── switchee-lwc-technical-documentation.md Full technical documentation
└── sfdx-project.json
```

---

## Project Resources and Documentation

- **Technical documentation:** [`docs/switchee-lwc-technical-documentation.md`](docs/switchee-lwc-technical-documentation.md)
- **Data import guide:** [`data/README.md`](data/README.md)
- **Switchee portal:** [portal.switchee.co](https://portal.switchee.co)

---

## Sprint Participation

### Sprint — June 2026

#### What we built

- Initialised the SFDX project structure and deployed to a Salesforce org
- Built `SwitcheeTrendController` Apex class and `switchee_asset_LWC_panel` LWC with risk badges, readings summary, energy tiles, and a 5-tab 30-day SVG trend chart with date X-axis
- Built `SwitcheeRoomsEnergyController` Apex class and `switcheeRoomsEnergyPanel` LWC with room cards (min/avg/max temperature, humidity, warnings) and a clickable per-room drill-down chart
- Created 10 sample Asset records (rooms and home components) linked to the Location
- Set FLS for System Administrator profile across all Switchee objects
- Produced full technical documentation and sample data CSV files with import guide



---

## How to Contribute

- Raise an issue or pull request on this repository
- Join the Salesforce.org Commons Slack for discussion
- See the [Known Limitations](docs/switchee-lwc-technical-documentation.md#known-limitations--future-work) section in the technical docs for areas where contributions are most needed

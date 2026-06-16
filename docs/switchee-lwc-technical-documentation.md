# Switchee Lightning Web Components — Technical Documentation

**Space:** UK Housing · Switchee Integration  
**Status:** Live  
**Last updated:** 16 Jun 2026  

---

## Overview

Two Lightning Web Components surface Switchee IoT data inside the Salesforce **Location** record page. Together they give housing officers a complete, at-a-glance view of a property's health — from high-level risk indicators and 30-day trends down to room-level conditions and energy consumption.

| Component | Label in App Builder | Purpose |
|---|---|---|
| `switchee_asset_LWC_panel` | Switchee Trend Panel | Property-level risk badges, readings summary, energy tiles, and 30-day trend charts |
| `switcheeRoomsEnergyPanel` | Switchee Rooms & Energy Panel | Per-room sensor cards with min/avg/max temperature, clickable drill-down chart per room |

Both components are placed on the **Location** record page and receive the record ID automatically via `@api recordId`.

---

## Data Model

### Objects involved

```
Location (standard)
│
├── Switchee_Device__c           one per physical sensor/device installed at the property
├── Switchee_Insight__c          one per day per property — aggregated analytics
└── Switchee_Energy_Reading__c   one per day per meter clamp
```

#### `Location` (standard Salesforce object)

The anchor record. Represents a physical property (e.g. *1 Nath Street, London, L1*). The standard object has no Switchee-specific fields — all Switchee data is held on the related custom objects below.

---

#### `Switchee_Device__c` — Switchee Device

Represents a single piece of Switchee hardware physically installed at the property. Each device maps to a room or location within the home.

| Field | Type | Description |
|---|---|---|
| `Name` | Auto-number | System-generated record name (e.g. `SD-0000001`) |
| `Property_Location__c` | Lookup → `Location` | The property this device is installed at |
| `Device_Type__c` | Text | Hardware type code: `SWT` (thermostat), `Z_MS` (multi-sensor), `Z_EN` (energy node) |
| `Model__c` | Text | Hardware model (e.g. `G2`, `MS6`, `EN1`) |
| `Room__c` | Text | Room key in SCREAMING_SNAKE_CASE (e.g. `LIVING_ROOM`, `MASTER_BEDROOM`, `ROOF`) |
| `Serial__c` | Text | Switchee serial number — format `SWX-{LocationId}-{DeviceType}-{sequence}` |

---

#### `Switchee_Insight__c` — Switchee Insight

The core analytics object. One record per calendar day per property. Populated by the Switchee platform with computed risk assessments and aggregated environmental metrics derived from the raw sensor data.

**Key / Date fields**

| Field | Type | Required | Description |
|---|---|---|---|
| `Context_Date__c` | Date | ✓ | The calendar date this insight covers |
| `Property_Location__c` | Lookup → `Location` | ✓ | The property this insight belongs to |
| `External_Key__c` | Text | | Switchee's own internal reference |
| `Property_UID__c` | Text | | Switchee portal property ID (`SWX-{LocationId}`) |

**Risk assessments** (Picklist: `High` / `Medium` / `Low`)

| Field | Description |
|---|---|
| `Mould_Risk__c` | Overall mould risk classification |
| `Mould_Risk_Pct__c` | Mould probability as a decimal percentage (0–100) |
| `Mould_Risk_Version__c` | Version of the mould risk algorithm used |
| `Fuel_Poverty_Risk__c` | Fuel poverty risk classification |
| `Overheating_Risk__c` | Overheating risk classification |
| `Overheating_Peak__c` | Peak overheating period classification |
| `Heat_Loss_Band__c` | Heat loss band classification |
| `Time_To_Heat_Band__c` | Time-to-heat band classification |

**Environmental aggregates** (daily min / avg / max)

| Field | Type | Description |
|---|---|---|
| `Avg_Indoor_Temp__c` | Number | Average indoor temperature (°C) |
| `Min_Indoor_Temp__c` | Number | Minimum indoor temperature (°C) |
| `Max_Indoor_Temp__c` | Number | Maximum indoor temperature (°C) |
| `Avg_Weather_Temp__c` | Number | Average external temperature (°C) |
| `Min_Weather_Temp__c` | Number | Minimum external temperature (°C) |
| `Max_Weather_Temp__c` | Number | Maximum external temperature (°C) |
| `Avg_Humidity__c` | Number | Average indoor relative humidity (%) |
| `Min_Humidity__c` | Number | Minimum indoor relative humidity (%) |
| `Max_Humidity__c` | Number | Maximum indoor relative humidity (%) |
| `Avg_Weather_Humidity__c` | Number | Average external humidity (%) |
| `Min_Target_Temp__c` | Number | Minimum thermostat setpoint (°C) |
| `Max_Target_Temp__c` | Number | Maximum thermostat setpoint (°C) |

**Heating & hot water**

| Field | Type | Description |
|---|---|---|
| `Heating_Hrs__c` | Number | Hours of active heating that day |
| `Heating_Zone__c` | Number | Number of active heating zones |
| `Hot_Water_Hrs__c` | Number | Hours of active hot water that day |
| `Heat_Loss_Rate_Hrs__c` | Number | Rate of heat loss (hours) |
| `Time_To_Heat_Hrs__c` | Number | Time taken to heat the property to setpoint (hours) |

---

#### `Switchee_Energy_Reading__c` — Switchee Energy Reading

One record per day per meter clamp. Tracks cumulative and daily energy consumption and generation. Has two lookups — directly to the `Location` and to the `Switchee_Insight__c` for the same date — so energy data is always contextualised alongside the daily insight.

| Field | Type | Description |
|---|---|---|
| `Context_Date__c` | Date | The date of this reading |
| `Property_Location__c` | Lookup → `Location` | The property |
| `Insight__c` | Lookup → `Switchee_Insight__c` | The insight record for the same date |
| `Meter_Type__c` | Text | Device type of the clamp (e.g. `Z_EN`) |
| `Purpose__c` | Picklist | Meter purpose: `S` = Solar PV generation, `W` = Whole-home consumption. Other values (`X`, `A`, `G`, `M`, `E`, `L`, `I`) represent additional clamp types |
| `Delta_kWh__c` | Number | Energy for this day (kWh) |
| `Cumulative_kWh__c` | Number | Running cumulative total (kWh) |
| `Reading_Timestamp__c` | DateTime | Exact timestamp of reading |
| `Room__c` | Text | Room location of the clamp |
| `Property_UID__c` | Text | Switchee portal property ID |
| `External_Key__c` | Text | Switchee's own reference |

---

#### `Switchee_Sensor_Reading__c` — Switchee Sensor Reading

A placeholder object for raw per-device telemetry (one reading per sensor firing). Currently the custom field payload (`Asset__c` lookup and `Switchee_Room_Key__c`) exists in the schema but the fields are not yet populated in this org. When fully populated this object will hold granular readings per room per device. The LWCs currently fall back to property-level `Switchee_Insight__c` data for room cards.

---

### Relationship diagram

```
Location
  │
  ├─[1:M]─► Switchee_Device__c
  │              Property_Location__c → Location
  │
  ├─[1:M]─► Switchee_Insight__c          (1 per day)
  │              Property_Location__c → Location
  │              │
  │              └─[1:M]─► Switchee_Energy_Reading__c
  │                             Property_Location__c → Location
  │                             Insight__c → Switchee_Insight__c
  │
  └─[1:M]─► Switchee_Sensor_Reading__c   (raw telemetry — fields TBD)
                 Asset__c → Asset (room)
```

---

## Apex Controllers

### `SwitcheeTrendController`

**Used by:** `switchee_asset_LWC_panel`  
**Sharing model:** `with sharing` (respects the running user's record access)

#### Inner class: `DashboardData`

A lightweight wrapper returned as a single serialised object to the wire service. Avoids multiple round-trips.

| Property | Type | Description |
|---|---|---|
| `locationRecord` | `Schema.Location` | The Location record (Id, Name only) |
| `latestInsight` | `Switchee_Insight__c` | The most recent insight — used for badges and readings tiles |
| `insights30Days` | `List<Switchee_Insight__c>` | 30 days of insights ordered ascending — used to build chart arrays |
| `energy30Days` | `List<Switchee_Energy_Reading__c>` | 30 days of energy readings ordered ascending |

> **Note:** `Schema.Location` is used explicitly (not just `Location`) to avoid a compile-time name collision with `System.Location`, which is a Salesforce built-in geolocation type.

#### Method: `getDashboardData(Id locationId)`

Annotated `@AuraEnabled(cacheable=true)` — results are cached by the LWC wire service and refreshed only when the record ID changes.

**Execution steps:**

1. **Guard clause** — returns `null` immediately if `locationId` is blank, preventing a SOQL query against a null bind.
2. **Location query** — fetches `Id` and `Name` from `Location`. Only these two fields are queried because the standard `Location` object carries no Switchee custom fields.
3. **Existence check** — returns an empty `DashboardData` wrapper (not `null`) if the Location record doesn't exist, so the LWC receives a non-null object and can safely check `data.locationRecord`.
4. **30-day insights query** — fetches all `Switchee_Insight__c` records for the location within the last 30 days, ordered ascending by `Context_Date__c`. The full set of risk, environmental, and heating fields is included so both the badge section and the chart tabs are populated from one query.
5. **Latest insight extraction** — takes the last element of `insights30Days` (most recent date, since ordered ascending) and assigns it to `latestInsight`. No additional query needed.
6. **30-day energy query** — fetches `Context_Date__c`, `Delta_kWh__c`, and `Purpose__c` from `Switchee_Energy_Reading__c` for the same 30-day window, ordered ascending. The `Purpose__c` filter is applied in JavaScript rather than SOQL so all meter types are returned in one query.

---

### `SwitcheeRoomsEnergyController`

**Used by:** `switcheeRoomsEnergyPanel`  
**Sharing model:** `with sharing`

#### Inner class: `PanelData`

| Property | Type | Description |
|---|---|---|
| `contextDate` | `Date` | The date of the latest insight — shown in the panel header |
| `devices` | `List<Switchee_Device__c>` | All Switchee devices at the property, one card per device |
| `latestInsight` | `Switchee_Insight__c` | Most recent insight — used for per-room temperature and humidity display |
| `insights30Days` | `List<Switchee_Insight__c>` | 30 days of insights ordered ascending — drives the drill-down chart |

#### Method: `getPanelData(Id locationId)`

Annotated `@AuraEnabled(cacheable=true)`.

**Execution steps:**

1. **Guard clause** — returns `null` if `locationId` is blank.
2. **Devices query** — fetches all `Switchee_Device__c` records for the location, ordered by `Room__c`. Each device represents a room in the property and becomes one room card in the UI.
3. **Latest insight query** — a separate `LIMIT 1 ORDER BY Context_Date__c DESC` query to get the single most recent insight. Used for the current-day temperature and humidity values displayed on every room card. A separate query is used here (rather than taking the last of a 30-day list) because the 30-day query uses `LIMIT 30` and in a production environment might not always include the most recent record if data is sparse.
4. **30-day insight history query** — fetches the 30 most recent insights ordered ascending. Used to build the chart arrays in the drill-down view. Uses `LIMIT 30` rather than `LAST_N_DAYS:30` to ensure exactly 30 data points regardless of calendar gaps.

---

## LWC: Switchee Trend Panel (`switchee_asset_LWC_panel`)

**Target:** `lightning__RecordPage` → `Location` object only  
**Apex dependency:** `SwitcheeTrendController.getDashboardData`

### What it shows

| Section | Data source | Description |
|---|---|---|
| Header | `locationRecord.Name` | Property address and last-sync / context dates |
| Risk badges (5) | `latestInsight` | Mould, Fuel Poverty, Overheating, Heat Loss, Time-to-Heat — colour-coded High/Medium/Low |
| Readings row | `latestInsight` | Latest avg temp, avg humidity, heating hours, hot water hours |
| Energy tiles (3) | `energy30Days` (latest day) | Solar generated, whole-home use, net from grid in kWh |
| 30-day chart | `insights30Days` + `energy30Days` | SVG polyline chart with 5 tabs and a date X-axis |

### Wire service

```js
@wire(getDashboardData, { locationId: '$recordId' })
wiredData({ error, data }) { ... }
```

The `$recordId` reactive property means the wire re-fires automatically whenever the record ID changes. The handler populates local tracked state from the response.

### Chart system

The chart is a hand-drawn SVG polyline — no third-party library. All chart logic is in computed getters.

**Five tabs:**

| Tab key | Data field | Colour | Unit |
|---|---|---|---|
| `mould` | `Mould_Risk_Pct__c` | `#D85A30` (orange-red) | % |
| `temp` | `Avg_Indoor_Temp__c` | `#378ADD` (blue) | °C |
| `humidity` | `Avg_Humidity__c` | `#1D9E75` (green) | % |
| `heating` | `Heating_Hrs__c` | `#BA7517` (amber) | hrs |
| `energy` | Sum of `Delta_kWh__c` per day | `#6B4FBB` (purple) | kWh |

**Chart coordinate system** (SVG viewBox `0 0 600 196`):

| Constant | Value | Purpose |
|---|---|---|
| `x0` | 44 | Left edge of the plot area (space for Y-axis labels) |
| `x1` | 590 | Right edge of the plot area |
| `yTop` | 16 | Top of the plot area |
| `yBot` | 126 | Bottom of the plot area / baseline |

Y values are scaled linearly between `stats.min` and `stats.max`, with 15% padding above and below the data range to prevent the line touching the edges. The end of the line is marked with a filled circle (`r=3.5`).

**X-axis date labels** — the `xAxisLabels` getter selects up to 6 evenly-spaced indices from `chartDates`, converts each ISO date string to a locale-formatted label (e.g. `17 May`), and places tick marks at `y=126–133` with labels at `y=146`. A UTC-offset correction (`dt.getTimezoneOffset() * 60000`) is applied to prevent the date displaying one day early.

### Risk badge colouring

The `getRiskStyle` helper returns inline `background` and `color` CSS strings based on the picklist value:

| Value | Background | Text colour |
|---|---|---|
| `High` | `#FDE8E9` (light red) | `#C23934` (red) |
| `Medium` | `#FFF3E0` (light amber) | `#A46F25` (amber) |
| `Low` | `#EBF7E6` (light green) | `#2E844A` (green) |
| null / unknown | `#F3F2F2` (grey) | `#3E3E3C` (dark grey) |

### Energy summary tile logic

Energy data arrives as one row per meter per day (multiple `Purpose__c` values possible per date). The JS:

1. Builds a `energyByDate` map summing all `Delta_kWh__c` values per date — used for the chart array
2. Isolates the latest date's records to compute the day's solar (`Purpose__c === 'S'`) and whole-home (`Purpose__c === 'W'`) totals
3. Net from grid = whole-home − solar (can be negative if solar exceeds consumption)

---

## LWC: Switchee Rooms & Energy Panel (`switcheeRoomsEnergyPanel`)

**Target:** `lightning__RecordPage` → `Location` object only  
**Apex dependency:** `SwitcheeRoomsEnergyController.getPanelData`

### What it shows

| Section | Data source | Description |
|---|---|---|
| Header | `contextDate` | Context date and "daily aggregates" label |
| Room cards (1 per device) | `devices` + `latestInsight` | Room name, icon, temperature min/avg/max block, humidity, CO₂ indicator, warning badges |
| Drill-down chart | `insights30Days` | Inline SVG chart that opens below the grid when a room card is clicked |

### Room card rendering

Each `Switchee_Device__c` record becomes one room card. The `Room__c` field value (e.g. `LIVING_ROOM`) is mapped to a human-readable label via the `ROOM_LABELS` constant in the JS. If the key isn't in the map, the `_formatRoomKey` helper converts `SCREAMING_SNAKE_CASE` to `Title Case` as a fallback.

**Icon mapping:**

| Room name contains | SLDS icon |
|---|---|
| `bed` | `utility:sleep` |
| `bath` | `utility:classic_interface` |
| `living` | `utility:company` |
| `kitchen` | `utility:food_and_drink` |
| `roof` | `utility:apex` |
| anything else | `utility:home` |

**Temperature block** — The three-column min/avg/max display reads from `latestInsight`. Because `Switchee_Sensor_Reading__c` per-room data is not yet populated in this org, all room cards show the same property-level values from the insight. This will automatically resolve to per-room values when `Asset__c` and per-room fields are populated on `Switchee_Sensor_Reading__c`.

**Warning badges** — Applied automatically based on thresholds:

| Condition | Badge text | Colour |
|---|---|---|
| `Avg_Humidity__c > 75%` | Condensation risk | Red |
| `Avg_Temp__c < 18°C` | (temp value turns red, no badge) | Red text |

### Room card drill-down

Clicking a room card sets `selectedRoomId` to the clicked device's Id. The `selectedRoom` getter returns the matching room object from the `rooms` array, which triggers `if:true={selectedRoom}` in the template to render the chart panel below the grid. Clicking the same card again — or pressing the ✕ close button — sets `selectedRoomId` to `null` and collapses the chart.

### Drill-down chart

Uses the same SVG polyline system as the Trend Panel, but scoped to the `assetChart*` getter family.

**Three tabs:**

| Tab key | Data field | Colour | Unit |
|---|---|---|---|
| `temp` | `Avg_Indoor_Temp__c` | `#378ADD` (blue) | °C |
| `humidity` | `Avg_Humidity__c` | `#1D9E75` (green) | % |
| `heating` | `Heating_Hrs__c` | `#BA7517` (amber) | hrs |

The chart data (`assetChartData`) and dates (`assetChartDates`) are populated once from the wire response and shared across all room cards — the same 30-day property-level data is shown regardless of which room card is clicked, until per-room sensor data is available.

---

## Known Limitations & Future Work

| Item | Detail |
|---|---|
| Per-room sensor data | `Switchee_Sensor_Reading__c.Asset__c` and field payload are currently null in this org. Room cards and the drill-down chart show property-level `Switchee_Insight__c` data as a fallback. Once per-room data is populated, the Apex queries and JS processing will need updating to read from `Switchee_Sensor_Reading__c` grouped by `Asset__c` |
| Energy `Purpose__c` values | Only `S` (Solar) and `W` (Whole-home) are handled in the JS. The picklist also contains `X`, `A`, `G`, `M`, `E`, `L`, `I` — these are summed into the energy chart total but not split out as separate tiles |
| X-axis tick count | Hard-coded at `Math.min(6, n)`. If the data window is extended beyond 30 days the tick density may need increasing |
| `Device_Type__c` and `Model__c` on room cards | These fields are fetched by the Rooms controller but not currently displayed in the UI — they are available on the room objects for future use |

---

## Deployment & Configuration

**File locations in SFDX project:**

```
force-app/main/default/
├── classes/
│   ├── SwitcheeTrendController.cls
│   └── SwitcheeRoomsEnergyController.cls
└── lwc/
    ├── switchee_asset_LWC_panel/
    │   ├── switchee_asset_LWC_panel.html
    │   ├── switchee_asset_LWC_panel.js
    │   ├── switchee_asset_LWC_panel.css
    │   └── switchee_asset_LWC_panel.js-meta.xml
    └── switcheeRoomsEnergyPanel/
        ├── switcheeRoomsEnergyPanel.html
        ├── switcheeRoomsEnergyPanel.js
        ├── switcheeRoomsEnergyPanel.css
        └── switcheeRoomsEnergyPanel.js-meta.xml
```

**To deploy:**

```bash
sf project deploy start \
  --source-dir force-app/main/default/classes \
  --source-dir force-app/main/default/lwc/switchee_asset_LWC_panel \
  --source-dir force-app/main/default/lwc/switcheeRoomsEnergyPanel \
  --target-org switchee --wait 10
```

**App Builder placement:** Both components appear under *Custom* in the Lightning App Builder component palette when a `Location` record page is open. They are not exposed on any other object — the `targetConfig` in each `.js-meta.xml` restricts them to `Location` pages only.

**Permissions required:** The running user must have at minimum Read access to `Location`, `Switchee_Insight__c`, `Switchee_Device__c`, and `Switchee_Energy_Reading__c`. Full FLS and object-level permissions for the System Administrator profile were deployed to this org as part of the initial setup.

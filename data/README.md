# Sample Data — Switchee LWC

This folder contains CSV seed files for loading the sample data required to demonstrate the two Switchee Lightning Web Components. The files are numbered to indicate the order in which they must be imported — each file may depend on records created by the previous one.

---

## Prerequisites

- A Salesforce org with the Switchee managed package (or equivalent unmanaged metadata) installed, including the four custom objects: `Switchee_Device__c`, `Switchee_Insight__c`, `Switchee_Energy_Reading__c`, `Switchee_Sensor_Reading__c`
- The `System Administrator` profile must have Read/Write access to all four Switchee objects and their fields (see the FLS deployment notes in the technical documentation)
- Salesforce CLI (`sf`) installed and authenticated to the target org

---

## Files

| # | File | Object | Rows | Description |
|---|---|---|---|---|
| 1 | `01_Location.csv` | `Location` | 1 | The property record that anchors all other data |
| 2 | `02_Asset.csv` | `Asset` | 10 | Rooms and home components within the property |
| 3 | `03_Switchee_Device__c.csv` | `Switchee_Device__c` | 3 | Physical Switchee hardware devices installed at the property |
| 4 | `04_Switchee_Insight__c.csv` | `Switchee_Insight__c` | 30 | One daily insight record per day for 30 days |
| 5 | `05_Switchee_Energy_Reading__c.csv` | `Switchee_Energy_Reading__c` | 30 | One daily solar energy reading per day for 30 days |

---

## Object & Field Reference

### `Location` (standard)

The anchor record representing the physical property. All Switchee objects look up to this record.

| Column | Field API Name | Type | Notes |
|---|---|---|---|
| Name | `Name` | Text | Property address — used as the page title in both LWCs |
| LocationType | `LocationType` | Picklist | Set to `Test Location` for sample data |

> After inserting the Location, note the generated Salesforce ID. All subsequent files reference it via `REF:Location:1 Nath Street, London, L1` — replace this token with the actual ID when importing manually, or use the `sf data import` tooling which resolves references automatically.

---

### `Asset` (standard)

Rooms and home components within the property. Used to represent the physical spaces that Switchee devices monitor. Each Asset looks up to the Location via `LocationId`.

| Column | Field API Name | Type | Notes |
|---|---|---|---|
| Name | `Name` | Text | Room or component name (e.g. `Living Room`, `Boiler`) |
| LocationId | `LocationId` | Lookup → Location | Parent property |
| Status | `Status` | Picklist | `Installed` for all active assets |
| InstallDate | `InstallDate` | Date | Date the room/component was registered |
| SerialNumber | `SerialNumber` | Text | Unique identifier for the asset |
| Description | `Description` | Text Area | Human-readable description of the room or component |

**Asset types in the sample data:**

| Category | Assets |
|---|---|
| Rooms (sensor locations) | Living Room, Master Bedroom, Kitchen, Bathroom, Roof Space |
| Heating system | Boiler, Radiator - Living Room, Radiator - Master Bedroom |
| Metering | Smart Meter (Gas), Smart Meter (Electricity) |

---

### `Switchee_Device__c` — Switchee Device

The physical hardware devices installed at the property. Each device corresponds to one room and generates the sensor readings that feed the Switchee platform.

| Column | Field API Name | Type | Notes |
|---|---|---|---|
| Name | `Name` | Auto-number | Auto-generated (e.g. `SD-0000000`) |
| Property_Location__c | `Property_Location__c` | Lookup → Location | Parent property |
| Device_Type__c | `Device_Type__c` | Text | Hardware type — see table below |
| Model__c | `Model__c` | Text | Hardware model number |
| Room__c | `Room__c` | Text | Room key in `SCREAMING_SNAKE_CASE` |
| Serial__c | `Serial__c` | Text | Format: `SWX-{LocationId}-{DeviceType}-{sequence}` |

**Device types:**

| Code | Description | Room |
|---|---|---|
| `SWT` | Switchee smart thermostat | `LIVING_ROOM` |
| `Z_MS` | Zigbee multi-sensor (temp, humidity, motion) | `MASTER_BEDROOM` |
| `Z_EN` | Zigbee energy node (clamp meter) | `ROOF` |

---

### `Switchee_Insight__c` — Switchee Insight

One record per calendar day per property. Contains all computed risk assessments and aggregated environmental metrics for that day. This is the primary data source for both LWCs.

| Column | Field API Name | Type | Notes |
|---|---|---|---|
| Context_Date__c | `Context_Date__c` | Date | **Required.** The date this insight covers |
| Property_Location__c | `Property_Location__c` | Lookup → Location | **Required.** Parent property |
| Property_UID__c | `Property_UID__c` | Text | Switchee portal ID — format `SWX-{LocationId}` |
| External_Key__c | `External_Key__c` | Text | Unique key — format `SWX-{LocationId}_{YYYY-MM-DD}` |
| Mould_Risk__c | `Mould_Risk__c` | Picklist | `High` / `Medium` / `Low` |
| Mould_Risk_Pct__c | `Mould_Risk_Pct__c` | Number | Mould probability 0–100 |
| Mould_Risk_Version__c | `Mould_Risk_Version__c` | Number | Algorithm version (e.g. `2`) |
| Fuel_Poverty_Risk__c | `Fuel_Poverty_Risk__c` | Picklist | `High` / `Medium` / `Low` |
| Overheating_Risk__c | `Overheating_Risk__c` | Picklist | `High` / `Medium` / `Low` |
| Overheating_Peak__c | `Overheating_Peak__c` | Picklist | `High` / `Medium` / `Low` |
| Heat_Loss_Band__c | `Heat_Loss_Band__c` | Picklist | `High` / `Medium` / `Low` |
| Heat_Loss_Rate_Hrs__c | `Heat_Loss_Rate_Hrs__c` | Number | Hours to lose a degree of heat |
| Time_To_Heat_Band__c | `Time_To_Heat_Band__c` | Picklist | `High` / `Medium` / `Low` |
| Time_To_Heat_Hrs__c | `Time_To_Heat_Hrs__c` | Number | Hours to reach setpoint |
| Avg_Indoor_Temp__c | `Avg_Indoor_Temp__c` | Number | Average indoor temperature (°C) |
| Min_Indoor_Temp__c | `Min_Indoor_Temp__c` | Number | Minimum indoor temperature (°C) |
| Max_Indoor_Temp__c | `Max_Indoor_Temp__c` | Number | Maximum indoor temperature (°C) |
| Avg_Weather_Temp__c | `Avg_Weather_Temp__c` | Number | Average external temperature (°C) |
| Min_Weather_Temp__c | `Min_Weather_Temp__c` | Number | Minimum external temperature (°C) |
| Max_Weather_Temp__c | `Max_Weather_Temp__c` | Number | Maximum external temperature (°C) |
| Avg_Humidity__c | `Avg_Humidity__c` | Number | Average indoor humidity (%) |
| Min_Humidity__c | `Min_Humidity__c` | Number | Minimum indoor humidity (%) |
| Max_Humidity__c | `Max_Humidity__c` | Number | Maximum indoor humidity (%) |
| Avg_Weather_Humidity__c | `Avg_Weather_Humidity__c` | Number | Average external humidity (%) |
| Min_Target_Temp__c | `Min_Target_Temp__c` | Number | Minimum thermostat setpoint (°C) |
| Max_Target_Temp__c | `Max_Target_Temp__c` | Number | Maximum thermostat setpoint (°C) |
| Heating_Hrs__c | `Heating_Hrs__c` | Number | Hours of active heating |
| Heating_Zone__c | `Heating_Zone__c` | Number | Number of active heating zones |
| Hot_Water_Hrs__c | `Hot_Water_Hrs__c` | Number | Hours of active hot water |

---

### `Switchee_Energy_Reading__c` — Switchee Energy Reading

One record per day per meter clamp. Tracks daily and cumulative energy. Must be inserted **after** `Switchee_Insight__c` as it holds a lookup to the matching insight record.

| Column | Field API Name | Type | Notes |
|---|---|---|---|
| Context_Date__c | `Context_Date__c` | Date | The date of this reading — must match an Insight date |
| Property_Location__c | `Property_Location__c` | Lookup → Location | Parent property |
| Property_UID__c | `Property_UID__c` | Text | Switchee portal ID — format `SWX-{LocationId}` |
| External_Key__c | `External_Key__c` | Text | Unique key — format `SWX-{LocationId}_{YYYY-MM-DD}_{Purpose}` |
| Insight__c | `Insight__c` | Lookup → Switchee_Insight__c | The insight for the same date — resolved via `External_Key__c` |
| Meter_Type__c | `Meter_Type__c` | Text | Device type of the clamp (e.g. `Z_EN`) |
| Purpose__c | `Purpose__c` | Picklist | `S` = Solar PV generation, `W` = Whole-home consumption |
| Delta_kWh__c | `Delta_kWh__c` | Number | Energy consumed/generated that day (kWh) |
| Cumulative_kWh__c | `Cumulative_kWh__c` | Number | Running cumulative total (kWh) |
| Room__c | `Room__c` | Text | Room where the clamp is installed (e.g. `ROOF`) |

---

## Import Instructions

### Option A — Salesforce CLI bulk import (recommended)

Import each file in order, substituting the Location ID returned by step 1 into all subsequent files.

```bash
# Step 1 — Location
sf data import bulk --sobject Location \
  --file data/01_Location.csv \
  --target-org <your-org-alias> --wait 5

# Note the Location Id returned, then update REF tokens in files 02–05
# (or use a script — see Option B below)

# Step 2 — Assets
sf data import bulk --sobject Asset \
  --file data/02_Asset.csv \
  --target-org <your-org-alias> --wait 5

# Step 3 — Switchee Devices
sf data import bulk --sobject Switchee_Device__c \
  --file data/03_Switchee_Device__c.csv \
  --target-org <your-org-alias> --wait 5

# Step 4 — Switchee Insights (30 rows)
sf data import bulk --sobject Switchee_Insight__c \
  --file data/04_Switchee_Insight__c.csv \
  --target-org <your-org-alias> --wait 5

# Step 5 — Energy Readings (30 rows, depends on Insights)
sf data import bulk --sobject Switchee_Energy_Reading__c \
  --file data/05_Switchee_Energy_Reading__c.csv \
  --target-org <your-org-alias> --wait 5
```

### Option B — Scripted import with ID substitution

After creating the Location, replace the `REF:Location:1 Nath Street, London, L1` token in all files with the actual Salesforce ID before importing:

```bash
LOCATION_ID=$(sf data query \
  --query "SELECT Id FROM Location WHERE Name = '1 Nath Street, London, L1' LIMIT 1" \
  --target-org <your-org-alias> --json | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['result']['records'][0]['Id'])")

for f in data/02_Asset.csv data/03_Switchee_Device__c.csv \
          data/04_Switchee_Insight__c.csv data/05_Switchee_Energy_Reading__c.csv; do
  sed -i '' "s/REF:Location:1 Nath Street, London, L1/$LOCATION_ID/g" "$f"
done
```

Then run the bulk imports from Option A steps 2–5.

### Option C — Dataloader / manual upload

Open each CSV in Salesforce Data Loader or the Setup → Data Import Wizard. Map columns to fields using the Field API Name column in the tables above. Import in the numbered order to satisfy lookup dependencies.

---

## Data shape notes

- **Dates** — all dates use ISO format `YYYY-MM-DD`. The 30 insight and energy rows cover a rolling window; adjust the `Context_Date__c` values if you need the data to align with "today".
- **`REF:` tokens** — these are placeholder strings indicating a cross-file lookup. Replace them with the real Salesforce ID before bulk import, or use a tool that supports reference resolution.
- **Serial numbers with `LOCATION_ID`** — the `Serial__c` field on `Switchee_Device__c` and `SerialNumber` on some Assets use `LOCATION_ID` as a placeholder. Replace with the actual Location Id after creation to match the Switchee naming convention (`SWX-{LocationId}-{DeviceType}-{sequence}`).
- **Insight lookup on Energy Readings** — the `Insight__c` column uses the pattern `REF:Switchee_Insight__c:External_Key__c:{key}`. After insights are inserted, query their IDs by `External_Key__c` and substitute before importing energy readings.

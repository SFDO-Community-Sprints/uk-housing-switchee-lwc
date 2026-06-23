# AI Install Instructions — Switchee LWC
## Scratchpad for next AI instance — written during install testing session 2026-06-23

---

## What this repo is

Two Salesforce Lightning Web Components for UK social housing orgs. They display Switchee IoT property data (smart thermostats, sensors) on a Salesforce Location record page.

**Components:**
- `switchee_asset_LWC_panel` — Trend Panel: risk badges, latest readings, energy tile, 30-day SVG chart
- `switcheeRoomsEnergyPanel` — Rooms & Energy Panel: per-room cards, clickable drill-down chart

**Apex controllers:**
- `SwitcheeTrendController` — serves the Trend Panel
- `SwitcheeRoomsEnergyController` — serves the Rooms & Energy Panel

**Data model (custom objects required):**
- `Switchee_Device__c` — physical hardware per room
- `Switchee_Insight__c` — daily aggregated analytics (risk scores, temp, humidity, heating)
- `Switchee_Energy_Reading__c` — daily meter clamp readings (solar, whole-home)
- `Switchee_Sensor_Reading__c` — placeholder for raw telemetry (not yet populated)

---

## Repo status (as of 2026-06-23 session)

- Remote: `https://github.com/SFDO-Community-Sprints/uk-housing-switchee-lwc`
- Local synced to HEAD: `d9f5d37`
- **Custom object metadata WAS MISSING from the repo** — we generated and added it during this session
- Objects are now at: `force-app/main/default/objects/` (4 object folders, all fields as `.field-meta.xml` files)
- These have NOT yet been committed/pushed to origin — needs to happen

---

## Pre-requisites for install

### Tools
- Salesforce CLI `sf` (v2+)
- Git
- Python 3 (for CSV ID substitution script)

### Org requirements
- **Use a sandbox or Developer Edition org — NOT a scratch org** (see blocker below)
- System Administrator profile
- `sf` authenticated to the org

### GitHub account
This repo is under `SFDO-Community-Sprints`. Use `Etienne-SFDO` GitHub account:
```bash
gh auth switch --user Etienne-SFDO
gh auth status
```

---

### Scratch org note
Scratch orgs from DevHub `sdo-0626` have a known problem where custom fields remain invisible even after the permission set is assigned. Use a sandbox or Developer Edition org for reliable results.

---

## Step-by-step install (for sandbox/DE org)

### Step 1 — Authenticate to org
```bash
sf org login web --alias <your-org-alias>
# or if already authenticated:
sf org list
```

### Step 2 — Clone and sync repo
```bash
gh auth switch --user Etienne-SFDO
git clone https://github.com/SFDO-Community-Sprints/uk-housing-switchee-lwc.git
cd uk-housing-switchee-lwc
git pull origin main
```

### Step 3 — Deploy custom objects (MUST be first)

The custom object metadata is now in the repo. Deploy objects before Apex classes (classes reference the objects and won't compile without them).

```bash
sf project deploy start \
  --source-dir force-app/main/default/objects \
  --target-org <your-org-alias> --wait 10
```

**Known fix applied:** Required Lookup fields need `<deleteConstraint>Restrict</deleteConstraint>` — already in the field XML files. Without it you get: `field integrity exception: must specify either cascade delete or restrict delete for required lookup`.

**If deploy shows "Unchanged" but fields don't work** (scratch org symptom): use the metadata package format instead:
```bash
sf project convert source \
  --source-dir force-app/main/default/objects \
  --output-dir /tmp/mdpkg

sf project deploy start \
  --metadata-dir /tmp/mdpkg \
  --target-org <your-org-alias> --wait 10
```

### Step 4 — Deploy and assign the permission set

Custom fields deployed via SFDX source format are not visible to SOQL until Field-Level Security is explicitly granted — even for System Administrators. Do this immediately after the objects deploy, before verifying field access.

```bash
sf project deploy start \
  --source-dir force-app/main/default/permissionsets \
  --target-org <your-org-alias> --wait 10

sf org assign permset --name Switchee_Access --target-org <your-org-alias>
```

### Step 5 — Verify objects deployed correctly

Run this SOQL check — all should return rows (0 rows is fine, errors are not):
```bash
sf data query --query "SELECT Device_Type__c, Room__c FROM Switchee_Device__c LIMIT 1" --target-org <alias>
sf data query --query "SELECT Mould_Risk_Pct__c, Avg_Indoor_Temp__c FROM Switchee_Insight__c LIMIT 1" --target-org <alias>
sf data query --query "SELECT Purpose__c, Delta_kWh__c FROM Switchee_Energy_Reading__c LIMIT 1" --target-org <alias>
```

If you get "No such column" errors, the objects didn't deploy correctly — do NOT proceed to Apex deploy.

### Step 6 — Deploy Apex classes and LWC components

```bash
sf project deploy start \
  --source-dir force-app/main/default/classes \
  --source-dir force-app/main/default/lwc/switchee_asset_LWC_panel \
  --source-dir force-app/main/default/lwc/switcheeRoomsEnergyPanel \
  --target-org <your-org-alias> --wait 10
```

Expected output: 12 components deployed (2 Apex classes × 2 files + 2 LWC bundles × 4 files).

### Step 7 — Load seed data

The CSVs live in `data/`. They must be imported in numbered order due to lookup dependencies.

**Important pre-processing required — the CSVs have two types of placeholders:**

1. `REF:Location:1 Nath Street, London, L1` — needs real Location ID
2. `131fj000000Fjw5AAC` (hardcoded old Location ID in `Property_UID__c` / `External_Key__c` text fields) — needs replacing with new Location ID
3. `LOCATION_ID` — placeholder in `Serial__c` and `SerialNumber` fields
4. `REF:Switchee_Insight__c:External_Key__c:{key}` — needs real Insight IDs (for energy readings)

**Run the import script:**

```bash
# Step 1 — Import Location (no lookups to resolve)
sf data import bulk --sobject Location \
  --file data/01_Location.csv \
  --target-org <alias> --wait 5 --line-ending CRLF

# Step 2 — Get the Location ID and substitute in all downstream files
LOCATION_ID=$(sf data query \
  --query "SELECT Id FROM Location WHERE Name = '1 Nath Street, London, L1' LIMIT 1" \
  --target-org <alias> --json | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['result']['records'][0]['Id'])")
echo "Location ID: $LOCATION_ID"

OLD_LOC_ID="131fj000000Fjw5AAC"   # hardcoded placeholder in CSV text fields

# Work on temp copies to avoid modifying the repo files
cp data/02_Asset.csv /tmp/02_Asset.csv
cp data/03_Switchee_Device__c.csv /tmp/03_Device.csv
cp data/04_Switchee_Insight__c.csv /tmp/04_Insight.csv
cp data/05_Switchee_Energy_Reading__c.csv /tmp/05_Energy.csv

for f in /tmp/02_Asset.csv /tmp/03_Device.csv /tmp/04_Insight.csv /tmp/05_Energy.csv; do
  sed -i '' "s/REF:Location:1 Nath Street, London, L1/$LOCATION_ID/g" "$f"
  sed -i '' "s/$OLD_LOC_ID/$LOCATION_ID/g" "$f"
  sed -i '' "s/LOCATION_ID/$LOCATION_ID/g" "$f"
done

# Step 3 — Import Assets
# IMPORTANT: Asset object requires AccountId — create a placeholder Account first
ACCT_ID=$(echo "Account a = new Account(Name='Switchee Demo Housing'); insert a; System.debug(a.Id);" | sf apex run --target-org <alias> 2>&1 | grep "USER_DEBUG" | sed 's/.*DEBUG|//')
echo "Account ID: $ACCT_ID"

# Add AccountId column to Asset CSV
python3 - << PYEOF
import csv
with open('/tmp/02_Asset.csv', newline='') as f:
    rows = list(csv.DictReader(f))
fieldnames = ['AccountId'] + list(rows[0].keys())
for row in rows:
    row['AccountId'] = '$ACCT_ID'
with open('/tmp/02_Asset.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
PYEOF

sf data import bulk --sobject Asset \
  --file /tmp/02_Asset.csv \
  --target-org <alias> --wait 5 --line-ending CRLF

# Step 4 — Import Switchee Devices
# Remove Name column (auto-number field, read-only on insert)
python3 - << PYEOF
import csv
with open('/tmp/03_Device.csv', newline='') as f:
    rows = list(csv.DictReader(f))
for row in rows:
    del row['Name']
fieldnames = list(rows[0].keys())
with open('/tmp/03_Device.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
PYEOF

sf data import bulk --sobject Switchee_Device__c \
  --file /tmp/03_Device.csv \
  --target-org <alias> --wait 5 --line-ending CRLF

# Step 5 — Import Switchee Insights (30 rows)
# Remove Name column too
python3 -c "
import csv
with open('/tmp/04_Insight.csv', newline='') as f:
    rows = list(csv.DictReader(f))
# Check if Name column exists
if 'Name' in rows[0]:
    for row in rows: del row['Name']
fieldnames = list(rows[0].keys())
with open('/tmp/04_Insight.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
"

sf data import bulk --sobject Switchee_Insight__c \
  --file /tmp/04_Insight.csv \
  --target-org <alias> --wait 5 --line-ending CRLF

# Step 6 — Resolve Insight lookup IDs in Energy readings
# The energy CSV references insights by External_Key__c
python3 - << PYEOF
import subprocess, json, csv, re

result = subprocess.run(
    ['sf', 'data', 'query', '--query',
     "SELECT Id, External_Key__c FROM Switchee_Insight__c WHERE External_Key__c != null",
     '--target-org', '<alias>', '--json'],
    capture_output=True, text=True
)
records = json.loads(result.stdout)['result']['records']
key_to_id = {r['External_Key__c']: r['Id'] for r in records}
print(f"Loaded {len(key_to_id)} insight key-to-ID mappings")

with open('/tmp/05_Energy.csv', newline='') as f:
    rows = list(csv.DictReader(f))

for row in rows:
    insight_ref = row.get('Insight__c', '')
    if insight_ref.startswith('REF:Switchee_Insight__c:External_Key__c:'):
        key = insight_ref.replace('REF:Switchee_Insight__c:External_Key__c:', '')
        row['Insight__c'] = key_to_id.get(key, '')

fieldnames = list(rows[0].keys())
with open('/tmp/05_Energy.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
print("Energy CSV updated with resolved Insight IDs")
PYEOF

sf data import bulk --sobject Switchee_Energy_Reading__c \
  --file /tmp/05_Energy.csv \
  --target-org <alias> --wait 5 --line-ending CRLF
```

**Verify record counts:**
```bash
sf data query --query "SELECT COUNT() FROM Location" --target-org <alias>           # expect 1
sf data query --query "SELECT COUNT() FROM Asset" --target-org <alias>              # expect 10
sf data query --query "SELECT COUNT() FROM Switchee_Device__c" --target-org <alias> # expect 3
sf data query --query "SELECT COUNT() FROM Switchee_Insight__c" --target-org <alias># expect 30
sf data query --query "SELECT COUNT() FROM Switchee_Energy_Reading__c" --target-org <alias> # expect 30
```

### Step 8 — Test Apex controller

```bash
cat > /tmp/test_controller.apex << 'EOF'
try {
  // NOTE: cannot use "Location loc = [SELECT Id FROM Location ...]" in Anonymous Apex
  // — "Location" collides with System.Location built-in. Use Database.query() instead.
  List<SObject> locs = Database.query('SELECT Id FROM Location LIMIT 1');
  Id locId = (Id) locs[0].get('Id');
  Object result = SwitcheeTrendController.getDashboardData(locId);
  System.debug('TrendController OK: ' + result);
  Object result2 = SwitcheeRoomsEnergyController.getPanelData(locId);
  System.debug('RoomsController OK: ' + result2);
} catch(Exception e) {
  System.debug('Error: ' + e.getTypeName() + ' — ' + e.getMessage());
}
EOF
sf apex run --file /tmp/test_controller.apex --target-org <alias>
```

Should print `TrendController OK:` and `RoomsController OK:` with data wrappers. Any "No such column" error means the objects didn't deploy correctly or the permission set wasn't assigned.

### Step 9 — Add components to Lightning page (manual step)

1. Open any Location record in the org
2. Click the gear icon → Edit Page (or Setup → Object Manager → Location → Lightning Record Pages)
3. Search "Switchee" in the component panel on the left
4. Drag **Switchee Trend Panel** onto the page
5. Drag **Switchee Rooms & Energy Panel** onto the page
6. Save → Activate (activate for all users)
7. Go back to the Location record for "1 Nath Street, London, L1"

### Step 10 — Smoke test checklist

- [ ] **Switchee Trend Panel** visible on Location record
  - [ ] 5 risk badges shown (Mould, Fuel Poverty, Overheating, Heat Loss, Time-to-Heat) with colour coding
  - [ ] Latest readings tile: avg temp, humidity, heating hours, hot water hours
  - [ ] Energy tile: solar generated and whole-home consumption
  - [ ] 30-day chart renders with 5 tabs (Mould Risk, Indoor Temp, Humidity, Heating Hours, Energy kWh)
  - [ ] Chart has date labels on X-axis
- [ ] **Switchee Rooms & Energy Panel** visible on Location record
  - [ ] 3 room cards visible: Living Room, Master Bedroom, Roof
  - [ ] Each card shows temperature and humidity values
  - [ ] Clicking a room card expands an inline chart
  - [ ] Expanded chart has tabs for Indoor Temp, Humidity, Heating Hours
- [ ] No JS console errors (open browser DevTools)
- [ ] No Apex errors in Setup → Apex Jobs or debug log

---

## Custom object field inventory

### `Switchee_Device__c`
| Field | Type | Notes |
|---|---|---|
| `Property_Location__c` | Lookup → Location | Required, deleteConstraint=Restrict |
| `Device_Type__c` | Text(20) | SWT / Z_MS / Z_EN |
| `Model__c` | Text(20) | |
| `Room__c` | Text(50) | SCREAMING_SNAKE_CASE e.g. LIVING_ROOM |
| `Serial__c` | Text(30) | |

### `Switchee_Insight__c`
| Field | Type |
|---|---|
| `Context_Date__c` | Date (Required) |
| `Property_Location__c` | Lookup → Location (Required, deleteConstraint=Restrict) |
| `Property_UID__c` | Text(50) |
| `External_Key__c` | Text(100) |
| `Mould_Risk__c` | Picklist: High/Medium/Low |
| `Mould_Risk_Pct__c` | Number(8,2) |
| `Mould_Risk_Version__c` | Number(4,0) |
| `Fuel_Poverty_Risk__c` | Picklist: High/Medium/Low |
| `Overheating_Risk__c` | Picklist: High/Medium/Low |
| `Overheating_Peak__c` | Picklist: High/Medium/Low |
| `Heat_Loss_Band__c` | Picklist: High/Medium/Low |
| `Time_To_Heat_Band__c` | Picklist: High/Medium/Low |
| `Avg_Indoor_Temp__c` | Number(8,2) |
| `Min_Indoor_Temp__c` | Number(8,2) |
| `Max_Indoor_Temp__c` | Number(8,2) |
| `Avg_Weather_Temp__c` | Number(8,2) |
| `Min_Weather_Temp__c` | Number(8,2) |
| `Max_Weather_Temp__c` | Number(8,2) |
| `Avg_Humidity__c` | Number(8,2) |
| `Min_Humidity__c` | Number(8,2) |
| `Max_Humidity__c` | Number(8,2) |
| `Avg_Weather_Humidity__c` | Number(8,2) |
| `Min_Target_Temp__c` | Number(8,2) |
| `Max_Target_Temp__c` | Number(8,2) |
| `Heating_Hrs__c` | Number(8,2) |
| `Heating_Zone__c` | Number(4,0) |
| `Hot_Water_Hrs__c` | Number(8,2) |
| `Heat_Loss_Rate_Hrs__c` | Number(8,2) |
| `Time_To_Heat_Hrs__c` | Number(8,2) |

### `Switchee_Energy_Reading__c`
| Field | Type |
|---|---|
| `Context_Date__c` | Date |
| `Property_Location__c` | Lookup → Location |
| `Insight__c` | Lookup → Switchee_Insight__c |
| `Purpose__c` | Picklist: S/W/X/A/G/M/E/L/I |
| `Meter_Type__c` | Text(20) |
| `Delta_kWh__c` | Number(10,4) |
| `Cumulative_kWh__c` | Number(12,4) |
| `Reading_Timestamp__c` | DateTime |
| `Room__c` | Text(50) |
| `Property_UID__c` | Text(50) |
| `External_Key__c` | Text(100) |

### `Switchee_Sensor_Reading__c`
Placeholder only — not populated in sample data.
| Field | Type |
|---|---|
| `Asset__c` | Lookup → Asset |
| `Switchee_Room_Key__c` | Text(50) |

---

## Known issues & gotchas discovered during testing

### 1. Asset object requires AccountId
The standard Salesforce Asset object requires either `AccountId` or `ContactId`. The sample CSV (`02_Asset.csv`) does not include one. You must create a placeholder Account and add its ID as a column before importing. See Step 7 import script above.

### 2. CSV bulk import requires `--line-ending CRLF`
Running `sf data import bulk` without `--line-ending CRLF` fails with: `LineEnding is invalid on user data. Current LineEnding setting is LF`. Always add this flag.

### 3. Auto-number Name field must be removed from Device CSV
The `03_Switchee_Device__c.csv` has a `Name` column with values like `SD-0000000`. This is a read-only auto-number field — the Bulk API rejects the import if Name is included. Strip the column before importing.

### 4. REF tokens AND hardcoded old Location ID in CSVs
Two substitution passes are needed:
- Replace `REF:Location:1 Nath Street, London, L1` with real Location ID (lookup token)
- Replace `131fj000000Fjw5AAC` (hardcoded old org's Location ID baked into text fields) with new Location ID

### 5. Required Lookup fields need `<deleteConstraint>`
When generating custom object XML, required Lookup fields must include `<deleteConstraint>Restrict</deleteConstraint>`. Without it, SOAP API deploy fails: `field integrity exception: must specify either cascade delete or restrict delete for required lookup foreign key`.

### 6. Insight lookup on Energy Readings needs post-import ID resolution
`05_Switchee_Energy_Reading__c.csv` references Insight records via `REF:Switchee_Insight__c:External_Key__c:{key}` tokens. These must be resolved after Insights are imported — query Insight IDs by `External_Key__c` and substitute. See import script above.

### 7. Custom object metadata was not in the original repo
The repo originally only contained Apex classes and LWC components. We added the custom object metadata during this session (in `force-app/main/default/objects/`). These need to be committed and pushed to origin so future installers don't have to recreate them.

### 8. Anonymous Apex `Location` conflicts with `System.Location` built-in class
In Anonymous Apex, `Location loc = [SELECT Id FROM Location LIMIT 1]` fails to compile with: `Illegal assignment from List<Location> to System.Location`. The `Location` SObject name collides with the `System.Location` built-in. Workaround: use `Database.query()` with a `List<SObject>` return type, or add a cast: `List<Schema.Location>`. The Apex install test script in Step 8 has been updated to use `Database.query()`. Note: this is an Anonymous Apex limitation only — the Apex controllers themselves compile fine (they use `Schema.Location` implicitly via object queries).

---

## Todo for next session

- [x] Test full install on a sandbox (switch1 — 2026-06-23) — PASSED
- [x] Verify the metadata deploys correctly on sandbox — PASSED (no scratch org field-visibility bug)
- [x] Verify seed data import end-to-end on sandbox — PASSED (all 5 objects, correct counts)
- [ ] Add LWC components to Lightning page and do smoke test (manual step)
- [ ] Commit and push the custom object metadata to origin
- [ ] Clean up this file into a proper install guide once flow is validated

---

## Known limitations (from technical docs)

1. Per-room sensor data (`Switchee_Sensor_Reading__c.Asset__c`) currently null — room cards show property-level data as fallback
2. Energy Purpose filtering — only `S` (Solar) and `W` (Whole-home) displayed as separate tiles; others summed
3. X-axis tick count hard-coded at `Math.min(6, n)` — may need adjustment for >30 day windows
4. `Device_Type__c` and `Model__c` fetched by controller but not displayed in UI

---

## Useful commands reference

```bash
# Switch to correct GitHub account
gh auth switch --user Etienne-SFDO

# List orgs
sf org list --all

# Open org in browser
sf org open --target-org <alias>

# Run anonymous Apex
sf apex run --file /path/to/file.apex --target-org <alias>

# Run SOQL
sf data query --query "SELECT ..." --target-org <alias>

# Check deploy status
sf project deploy report --job-id <id> --target-org <alias>

# Reset source tracking (if source tracking is stale/confused)
sf project reset tracking --target-org <alias> --no-prompt
```

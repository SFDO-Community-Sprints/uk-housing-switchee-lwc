public with sharing class SwitcheeTrendController {
    
    public class DashboardData {
        // Use Schema.Location to avoid collision with System.Location
        @AuraEnabled public Schema.Location locationRecord;
        @AuraEnabled public Switchee_Insight__c latestInsight;
        @AuraEnabled public List<Switchee_Insight__c> insights30Days;
        @AuraEnabled public List<Switchee_Energy_Reading__c> energy30Days;
    }

    @AuraEnabled(cacheable=true)
    public static DashboardData getDashboardData(Id locationId) {
        // 1. Guard clause: If no ID is passed, return null early
        if (String.isBlank(locationId)) {
            return null; 
        }

        DashboardData data = new DashboardData();

        // 2. SAFE QUERY: Explicitly declare as List<Schema.Location>
        // Only query fields that exist on the standard Location object.
        // Risk/insight summary fields live on Switchee_Insight__c, not Location.
        List<Schema.Location> locs = [
            SELECT Id, Name
            FROM Location
            WHERE Id = :locationId
            LIMIT 1
        ];

        // 3. Check if the record actually exists before proceeding
        if (locs.isEmpty()) {
            return data;
        }
        data.locationRecord = locs[0];

        // 4. Get historical insights using the exact API name of your lookup field.
        // Include risk/band summary fields so the badge panel and readings section can be populated.
        data.insights30Days = [
            SELECT Context_Date__c, Mould_Risk_Pct__c, Mould_Risk__c,
                   Fuel_Poverty_Risk__c, Overheating_Risk__c, Heat_Loss_Band__c,
                   Time_To_Heat_Band__c, Avg_Indoor_Temp__c, Avg_Humidity__c,
                   Heating_Hrs__c, Hot_Water_Hrs__c
            FROM Switchee_Insight__c
            WHERE Property_Location__c = :locationId AND Context_Date__c >= LAST_N_DAYS:30
            ORDER BY Context_Date__c ASC
        ];

        // 5. Extract latest insight
        if (!data.insights30Days.isEmpty()) {
            data.latestInsight = data.insights30Days[data.insights30Days.size() - 1];
        }

        // 6. Get daily energy readings for the same 30-day window, one row per day
        data.energy30Days = [
            SELECT Context_Date__c, Delta_kWh__c, Purpose__c
            FROM Switchee_Energy_Reading__c
            WHERE Property_Location__c = :locationId
            AND Context_Date__c >= LAST_N_DAYS:30
            ORDER BY Context_Date__c ASC
        ];

        return data;
    }
}
public with sharing class SwitcheeRoomsEnergyController {

    public class PanelData {
        @AuraEnabled public Date contextDate;
        @AuraEnabled public List<Switchee_Device__c> devices;
        @AuraEnabled public Switchee_Insight__c latestInsight;
        @AuraEnabled public List<Switchee_Insight__c> insights30Days;
    }

    @AuraEnabled(cacheable=true)
    public static PanelData getPanelData(Id locationId) {
        if (String.isBlank(locationId)) {
            return null;
        }

        PanelData data = new PanelData();

        // 1. Get all devices installed at this property (each device = a room/sensor point)
        data.devices = [
            SELECT Id, Name, Room__c, Device_Type__c, Model__c
            FROM Switchee_Device__c
            WHERE Property_Location__c = :locationId
            ORDER BY Room__c ASC
        ];

        // 2. Get the latest daily insight for property-level summary values
        List<Switchee_Insight__c> latest = [
            SELECT Context_Date__c, Avg_Indoor_Temp__c, Min_Indoor_Temp__c, Max_Indoor_Temp__c,
                   Avg_Humidity__c, Min_Humidity__c, Max_Humidity__c,
                   Heating_Hrs__c, Hot_Water_Hrs__c,
                   Mould_Risk__c, Fuel_Poverty_Risk__c
            FROM Switchee_Insight__c
            WHERE Property_Location__c = :locationId
            ORDER BY Context_Date__c DESC
            LIMIT 1
        ];

        if (!latest.isEmpty()) {
            data.latestInsight = latest[0];
            data.contextDate = latest[0].Context_Date__c;
        }

        // 3. Get 30 days of insight history for the asset drill-down chart
        data.insights30Days = [
            SELECT Context_Date__c, Avg_Indoor_Temp__c, Min_Indoor_Temp__c, Max_Indoor_Temp__c,
                   Avg_Humidity__c, Heating_Hrs__c, Hot_Water_Hrs__c
            FROM Switchee_Insight__c
            WHERE Property_Location__c = :locationId
            ORDER BY Context_Date__c ASC
            LIMIT 30
        ];

        return data;
    }
}

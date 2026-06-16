import { LightningElement, api, wire, track } from 'lwc';
import getPanelData from '@salesforce/apex/SwitcheeRoomsEnergyController.getPanelData';

const ROOM_LABELS = {
    LIVING_ROOM:    'Living Room',
    MASTER_BEDROOM: 'Master Bedroom',
    BEDROOM:        'Bedroom',
    KITCHEN:        'Kitchen',
    BATHROOM:       'Bathroom',
    HALLWAY:        'Hallway',
    ROOF:           'Roof Space',
};

const ASSET_CHART_META = {
    temp:     { color: '#378ADD', unit: '°C',   lbl: 'avg indoor temp',  dp: 1 },
    humidity: { color: '#1D9E75', unit: '%',    lbl: 'avg humidity',     dp: 0 },
    heating:  { color: '#BA7517', unit: ' hrs', lbl: 'heating use',      dp: 1 }
};

export default class SwitcheeRoomsEnergyPanel extends LightningElement {
    @api recordId;

    @track displayDate  = '--';
    @track rooms        = [];
    @track hasData      = false;

    // Asset drill-down chart state
    @track selectedRoomId  = null;
    @track assetActiveTab  = 'temp';
    @track assetChartData  = { temp: [], humidity: [], heating: [] };
    @track assetChartDates = [];

    assetChartMeta = ASSET_CHART_META;

    @wire(getPanelData, { locationId: '$recordId' })
    wiredData({ error, data }) {
        if (data && data.contextDate) {
            this.hasData = true;
            this.displayDate = new Date(data.contextDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            this.processDevices(data.devices, data.latestInsight);

            if (data.insights30Days) {
                this.assetChartDates = data.insights30Days.map(i => i.Context_Date__c);
                this.assetChartData = {
                    temp:     data.insights30Days.map(i => i.Avg_Indoor_Temp__c || 0),
                    humidity: data.insights30Days.map(i => i.Avg_Humidity__c    || 0),
                    heating:  data.insights30Days.map(i => i.Heating_Hrs__c     || 0)
                };
            }
        } else if (error) {
            console.error('Error fetching Switchee Rooms & Energy data:', error);
        }
    }

    processDevices(devices, insight) {
        if (!devices || !devices.length) return;

        const minTemp     = insight?.Min_Indoor_Temp__c ?? null;
        const avgTemp     = insight?.Avg_Indoor_Temp__c ?? null;
        const maxTemp     = insight?.Max_Indoor_Temp__c ?? null;
        const avgHumidity = insight?.Avg_Humidity__c    ?? null;

        this.rooms = devices.map(device => {
            const roomKey  = device.Room__c || '';
            const roomName = ROOM_LABELS[roomKey] || this._formatRoomKey(roomKey) || device.Name;

            let icon = 'utility:home';
            const lower = roomName.toLowerCase();
            if (lower.includes('bed'))      icon = 'utility:sleep';
            else if (lower.includes('bath'))     icon = 'utility:classic_interface';
            else if (lower.includes('living'))   icon = 'utility:company';
            else if (lower.includes('kitchen'))  icon = 'utility:food_and_drink';
            else if (lower.includes('roof'))     icon = 'utility:apex';

            let minTempClass = 'data-value';
            let avgTempClass = 'data-value';
            let humClass     = 'data-value';
            let warningText  = null;
            let warningClass = '';

            if (avgHumidity !== null && avgHumidity > 75) {
                humClass    += ' danger';
                warningText  = 'Condensation risk';
                warningClass = 'action-tag danger';
            }
            if (minTemp !== null && minTemp < 18) minTempClass += ' danger';
            if (avgTemp !== null && avgTemp < 18) avgTempClass += ' danger';

            return {
                id:           device.Id,
                name:         roomName,
                icon:         icon,
                minTemp:      minTemp !== null ? minTemp.toFixed(1) + '°C' : '--',
                avgTemp:      avgTemp !== null ? avgTemp.toFixed(1) + '°C' : '--',
                maxTemp:      maxTemp !== null ? maxTemp.toFixed(1) + '°C' : '--',
                minTempClass: minTempClass,
                avgTempClass: avgTempClass,
                maxTempClass: 'data-value',
                humidity:     avgHumidity !== null ? avgHumidity + '%' : '--',
                humClass:     humClass,
                co2:          '— no CO₂ sensor',
                co2Class:     'data-value',
                showWarning:  warningText !== null,
                warningText:  warningText,
                warningClass: warningClass
            };
        });
    }

    // --- ROOM CARD SELECTION ---
    handleRoomSelect(event) {
        const id = event.currentTarget.dataset.id;
        // Toggle: clicking the same card again collapses the chart
        this.selectedRoomId = this.selectedRoomId === id ? null : id;
        this.assetActiveTab = 'temp'; // reset tab on each open
    }

    handleCloseAsset() {
        this.selectedRoomId = null;
    }

    get selectedRoom() {
        if (!this.selectedRoomId) return null;
        return this.rooms.find(r => r.id === this.selectedRoomId) || null;
    }

    // --- ASSET CHART COMPUTATIONS ---
    get assetActiveMeta()  { return this.assetChartMeta[this.assetActiveTab]; }
    get assetActiveArray() {
        return this.assetChartData[this.assetActiveTab]?.length
            ? this.assetChartData[this.assetActiveTab]
            : [0];
    }

    get assetChartStats() {
        const arr = this.assetActiveArray;
        const mn  = Math.min(...arr);
        const mx  = Math.max(...arr);
        const pad = (mx - mn) * 0.15 || 1;
        return {
            min:          mn - pad,
            max:          mx + pad,
            displayMax:   (mx + pad).toFixed(this.assetActiveMeta.dp),
            displayMin:   (mn - pad).toFixed(this.assetActiveMeta.dp),
            currentValue: arr[arr.length - 1].toFixed(this.assetActiveMeta.dp) + this.assetActiveMeta.unit
        };
    }

    get assetPolylinePoints() {
        const arr   = this.assetActiveArray;
        const stats = this.assetChartStats;
        const x0 = 44, x1 = 590, yTop = 16, yBot = 126;
        return arr.map((v, i) => {
            const x = x0 + (x1 - x0) * (i / (arr.length - 1 || 1));
            const y = yBot - (yBot - yTop) * ((v - stats.min) / (stats.max - stats.min || 1));
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
    }

    get assetEndDot() {
        if (!this.assetPolylinePoints) return { cx: 0, cy: 0 };
        const pts    = this.assetPolylinePoints.split(' ');
        const lastPt = pts[pts.length - 1].split(',');
        return { cx: lastPt[0], cy: lastPt[1] };
    }

    get assetXAxisLabels() {
        const dates = this.assetChartDates;
        if (!dates || dates.length < 2) return [];
        const n = dates.length;
        const x0 = 44, x1 = 590;
        const tickCount = Math.min(6, n);
        return Array.from({ length: tickCount }, (_, t) => {
            const i  = Math.round(t * (n - 1) / (tickCount - 1));
            const x  = x0 + (x1 - x0) * (i / (n - 1));
            const dt = new Date(dates[i]);
            const label = new Date(dt.getTime() + dt.getTimezoneOffset() * 60000)
                .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            return { key: `atick-${i}`, x: x.toFixed(1), label };
        });
    }

    handleAssetTabClick(event) {
        this.assetActiveTab = event.target.dataset.m;
    }

    _getAssetTabStyle(tabName) {
        return this.assetActiveTab === tabName
            ? 'background: #EBF7E6; color: #2E844A; border: 1px solid #2E844A;'
            : 'background: transparent; color: #747474; border: 1px solid #DDDBDA;';
    }

    get assetTempBtnStyle()    { return this._getAssetTabStyle('temp'); }
    get assetHumBtnStyle()     { return this._getAssetTabStyle('humidity'); }
    get assetHeatingBtnStyle() { return this._getAssetTabStyle('heating'); }

    _formatRoomKey(key) {
        if (!key) return '';
        return key.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
}

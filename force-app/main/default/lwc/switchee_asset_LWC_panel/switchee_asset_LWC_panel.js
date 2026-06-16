import { LightningElement, api, wire, track } from 'lwc';
import getDashboardData from '@salesforce/apex/SwitcheeTrendController.getDashboardData';

export default class SwitcheeLocationTrendPanel extends LightningElement {
    @api recordId;

    @track locationRecord;
    @track latestInsight;

    lastSyncedDate = '--';
    contextDate = '--';

    @track activeTab = 'mould';
    @track chartData = { mould: [], temp: [], humidity: [], heating: [], energy: [] };
    @track chartDates = [];

    // Energy summary tiles (latest day)
    @track energySummary = { solar: '0.0', wholeHome: '0.0', netGrid: '0.0' };

    chartMeta = {
        mould:    { color: '#D85A30', unit: '%',    lbl: 'current mould risk',   dp: 0 },
        temp:     { color: '#378ADD', unit: '°C',   lbl: 'current avg temp',     dp: 1 },
        humidity: { color: '#1D9E75', unit: '%',    lbl: 'current avg humidity', dp: 0 },
        heating:  { color: '#BA7517', unit: ' hrs', lbl: 'current heating use',  dp: 1 },
        energy:   { color: '#6B4FBB', unit: ' kWh', lbl: 'daily energy (solar)', dp: 1 }
    };

    @wire(getDashboardData, { locationId: '$recordId' })
    wiredData({ error, data }) {
        if (data && data.locationRecord) {
            this.locationRecord = data.locationRecord;
            this.latestInsight  = data.latestInsight;

            if (this.latestInsight?.Context_Date__c) {
                this.lastSyncedDate = new Date(this.latestInsight.Context_Date__c).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                this.contextDate    = this.lastSyncedDate;
            }

            if (data.insights30Days) {
                this.chartDates = data.insights30Days.map(i => i.Context_Date__c);
                this.chartData = {
                    mould:    data.insights30Days.map(i => i.Mould_Risk_Pct__c  || 0),
                    temp:     data.insights30Days.map(i => i.Avg_Indoor_Temp__c || 0),
                    humidity: data.insights30Days.map(i => i.Avg_Humidity__c    || 0),
                    heating:  data.insights30Days.map(i => i.Heating_Hrs__c     || 0),
                    energy:   []
                };
            }

            if (data.energy30Days && data.energy30Days.length) {
                // Build energy chart (sum all purposes per day)
                const energyByDate = {};
                data.energy30Days.forEach(e => {
                    const d = e.Context_Date__c;
                    energyByDate[d] = (energyByDate[d] || 0) + (e.Delta_kWh__c || 0);
                });
                this.chartData = Object.assign({}, this.chartData, {
                    energy: this.chartDates.map(d => energyByDate[d] || 0)
                });

                // Energy summary tiles — latest day, split by purpose
                const latestDate = data.energy30Days[data.energy30Days.length - 1].Context_Date__c;
                let solar = 0, wholeHome = 0;
                data.energy30Days
                    .filter(e => e.Context_Date__c === latestDate)
                    .forEach(e => {
                        if (e.Purpose__c === 'S') solar     += e.Delta_kWh__c || 0;
                        else if (e.Purpose__c === 'W') wholeHome += e.Delta_kWh__c || 0;
                    });
                this.energySummary = {
                    solar:     solar.toFixed(1),
                    wholeHome: wholeHome.toFixed(1),
                    netGrid:   (wholeHome - solar).toFixed(1)
                };
            }
        } else if (error) {
            console.error('Error fetching Switchee data:', error);
        }
    }

    // --- BADGE STYLING ---
    get mouldStyle()       { return this.getRiskStyle(this.latestInsight?.Mould_Risk__c); }
    get fpStyle()          { return this.getRiskStyle(this.latestInsight?.Fuel_Poverty_Risk__c); }
    get overheatingStyle() { return this.getRiskStyle(this.latestInsight?.Overheating_Risk__c); }
    get heatLossStyle()    { return this.getRiskStyle(this.latestInsight?.Heat_Loss_Band__c); }
    get timeToHeatStyle()  { return this.getRiskStyle(this.latestInsight?.Time_To_Heat_Band__c); }

    getRiskStyle(level) {
        if (level === 'High')   return 'background: #FDE8E9; color: #C23934;';
        if (level === 'Medium') return 'background: #FFF3E0; color: #A46F25;';
        if (level === 'Low')    return 'background: #EBF7E6; color: #2E844A;';
        return 'background: #F3F2F2; color: #3E3E3C;';
    }

    // --- CHART ---
    get activeMeta()  { return this.chartMeta[this.activeTab]; }
    get activeArray() { return this.chartData[this.activeTab]?.length ? this.chartData[this.activeTab] : [0]; }

    get chartStats() {
        const arr = this.activeArray;
        const mn  = Math.min(...arr);
        const mx  = Math.max(...arr);
        const pad = (mx - mn) * 0.15 || 1;
        return {
            min:          mn - pad,
            max:          mx + pad,
            displayMax:   (mx + pad).toFixed(this.activeMeta.dp),
            displayMin:   (mn - pad).toFixed(this.activeMeta.dp),
            currentValue: arr[arr.length - 1].toFixed(this.activeMeta.dp) + this.activeMeta.unit
        };
    }

    get polylinePoints() {
        const arr   = this.activeArray;
        const stats = this.chartStats;
        const x0 = 44, x1 = 590, yTop = 16, yBot = 126;
        return arr.map((v, i) => {
            const x = x0 + (x1 - x0) * (i / (arr.length - 1 || 1));
            const y = yBot - (yBot - yTop) * ((v - stats.min) / (stats.max - stats.min || 1));
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
    }

    get endDot() {
        if (!this.polylinePoints) return { cx: 0, cy: 0 };
        const pts    = this.polylinePoints.split(' ');
        const lastPt = pts[pts.length - 1].split(',');
        return { cx: lastPt[0], cy: lastPt[1] };
    }

    get xAxisLabels() {
        const dates = this.chartDates;
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
            return { key: `tick-${i}`, x: x.toFixed(1), label };
        });
    }

    handleTabClick(event) {
        this.activeTab = event.target.dataset.m;
    }

    getTabStyle(tabName) {
        return this.activeTab === tabName
            ? 'background: #EBF7E6; color: #2E844A; border: 1px solid #2E844A;'
            : 'background: transparent; color: #747474; border: 1px solid #DDDBDA;';
    }

    get mouldBtnStyle()    { return this.getTabStyle('mould'); }
    get tempBtnStyle()     { return this.getTabStyle('temp'); }
    get humidityBtnStyle() { return this.getTabStyle('humidity'); }
    get heatingBtnStyle()  { return this.getTabStyle('heating'); }
    get energyBtnStyle()   { return this.getTabStyle('energy'); }
}

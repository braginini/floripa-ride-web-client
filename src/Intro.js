Ext.define('Ride.Intro', {
    extend: 'Ext.ux.Intro',

    showStepNumbers: 'tooltip',
    constructor: function(config) {
        this.callParent(config);
        this.on('beforestep', this.onBeforeStep, this);
        this.on('step', this.onStep, this);
        this.on('finish', this.onFinish, this);

        this.url = '/i18n/intro/' + App.lang + '.json';

        this.markerFlag = L.icon({
            iconUrl: 'images/marker-flag.png',
            iconSize: [48, 48],
            iconAnchor: [10,34]
        });
    },

    start: function() {
        if (!this.appToken) {
            Ext.History.init();
            this.appToken = Ext.History.getToken();
        }
        this.callParent();
    },

    onBeforeStep: function(step, next_step) {
        var map = App.map.getMap();

        if (this.marker) {
            map.removeLayer(this.marker);
            this.marker = null;
        }
    },

    onStep: function(step) {
        var latlng, fieldA, fieldB,
            map = App.map.getMap();
        switch (step.id) {
            case 'fieldA':
                latlng = L.latLng([-27.5973194,-48.55821700000001]);
                map.setView(latlng);

                fieldA = App.form.getForm().findField('departure');
                fieldA.setLatLngValue(latlng);
                break;
            case 'fieldB':
                latlng = L.latLng([-27.6285169,-48.44778629999996]);
                map.setView(latlng, 13);

                this.marker = L.marker(latlng,{icon: this.markerFlag});
                this.marker.addTo(map);
                break;
            case 'suggestion':
                latlng = L.latLng([-27.6285169,-48.44778629999996]);
                map.setView(latlng, 12);

                fieldB = App.form.getForm().findField('destination');
                fieldB.setLatLngValue(L.latLng([-27.6285169,-48.44778629999996]));
                break;
        }
    },

    onFinish: function() {
        var map = App.map;
        map.clearRoutes();

        if (this.marker) {
            map.getMap().removeLayer(this.marker);
            this.marker = null;
        }

        if (this.appToken !== '/') {
            Ext.Router.redirect(this.appToken);
        }
        this.appToken = null;
    }
});
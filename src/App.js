Ext.define('App',{
    singleton: true,

    constructor: function() {
        Ext.onReady(this.init,this);
         //this.init();
    },

    init: function() {
        Ext.tip.QuickTipManager.init();

        Ext.Ajax.on('requestexception', function (con, res) {
            Ext.Msg.alert(res.statusText,res.responseText);
        }, this);

        this.form = Ext.create('Ext.form.Panel',{
            layout: 'form',
            height: 120,
            defaultType: 'textfield',
            bodyPadding: 10,
            fieldDefaults: {
                labelWidth: 20
            },
            items: [{
                fieldLabel: 'A',
                name: 'departure',
                allowBlank: false,
                emptyText: 'Departure ...'
            },{
                fieldLabel: 'B',
                name: 'destination',
                allowBlank: false,
                emptyText: 'Destination ...'
            }],
            buttons: [{
                text: 'Search',
                handler: this.search,
                scope: this
            }]
        });

        this.suggView = Ext.create('Ride.SuggestedView',{
            height: 150,
            listeners: {
                scope: this,
                selectionchange: function(v,rs){
                    var r = rs[0];
                    if (r) {
                        this.selectSuggestion('select', r.get('legs'));
                    } else {
                        this.map.addRoute('select',false);
                    }
                },
                highlightitem: function(v,n){
                    var r = v.getRecord(n);
                    this.selectSuggestion('highlight', r.get('legs'));
                },
                unhighlightitem: function(v,n){
                    this.map.addRoute('highlight',false);
                }
            }
        });

        this.tripDescriptionView = Ext.create('Ride.TripDescriptionView',{
        });

        this.configPanel = Ext.create('Ext.panel.Panel',{
            layout: 'anchor',
            align: 'stretch',
            region: 'west',
            collapsible: true,
            width: 300,
            items: [this.form,this.suggView,this.tripDescriptionView]
        });

        this.map = Ext.create('Ext.ux.LeafletMap',{
            region: 'center',
            listeners: {
                scope: this,
                selectdestination: function(latlng) {
                    this.select('destination',latlng);
                },
                selectdeparture: function(latlng) {
                    this.select('departure',latlng);
                }
            }
        });

        this.viewport = Ext.create('Ext.Viewport',{
            layout: 'border',
            items: [this.configPanel,this.map]
        });
        this.initApp();
    },

    initApp: function() {
        Ext.fly('loading-mask').remove();
        Ext.fly('loading').remove();
    },

    select: function(direction,latlng) {
        var me = this;
        var name = direction + 'Marker';
        if(this[name]) {
            this.map.getMap().removeLayer(this[name]);
        }

        var icon = direction == 'departure' ? this.map.markerIconA : this.map.markerIconB;
        this[name] = L.marker([latlng.lat, latlng.lng],{icon:icon});
        this[name].addTo(this.map.getMap());

        var field = me.form.getForm().findField(direction);
        field.setValue(latlng);
        field.latlngValue = latlng;
        this.getGeocoder().geocode({'latLng': latlng}, function(results, status) {
            if (status == google.maps.GeocoderStatus.OK && results.length) {
                field.setValue(results[0].formatted_address);
            }
        });
    },

    geocode: function(latlng,callback,scope) {
        this.getGeocoder().geocode({'latLng': latlng}, function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                callback.call(scope,results);
            }
        });
    },

    getGeocoder: function() {
        if(!this.geocoder) {
            this.geocoder = new google.maps.Geocoder();
        }
        return this.geocoder;
    },

    search: function() {
        var fieldA = this.form.getForm().findField('departure');
        var fieldB = this.form.getForm().findField('destination');

        var pointA = fieldA.latlngValue.lat + ',' + fieldA.latlngValue.lng;
        var pointB = fieldB.latlngValue.lat + ',' + fieldB.latlngValue.lng;

        var now = new Date();
        var departureTime = Ext.Date.add(now,Ext.Date.MINUTE,5);
        Ext.data.JsonP.request({
            url: 'http://ec2-54-207-21-176.sa-east-1.compute.amazonaws.com:8080/opentripplanner-api-webapp/ws/plan',
            callbackKey: 'callback',
            async: false,
            timeout: 20000,
            scope: this,
            params: {
                _dc: Date.now(),
                fromPlace: pointA, //'-27.593692,-48.543871',
                toPlace: pointB, //'-27.589889,-48.516748',
                ui_date: Ext.Date.format(now,'d-n-Y'),// '10/3/2013',
                arriveBy: 0,
                time: Ext.Date.format(departureTime,'h:iA'),
                mode: 'TRANSIT,WALK',
                optimize: 'QUICK',
                maxWalkDistance: '840',
                date: Ext.Date.format(departureTime,'Y-m-d'),
                walkSpeed: '1.341'
            },

            success: function (result, request) {
                //todo handle errors sent by server
                if(result.plan) {
                    this.suggView.store.loadData(result.plan.itineraries);
                } else {
                    this.suggView.store.removeAll();
                }
            },

            failure: function (result, request) {
                alert("failed");
            }
        });
    },

    selectSuggestion: function(name,legs) {
        if(name == 'select') {
            this.showTripDescription(legs);
        }
        //var legs = rs[0].get('legs');
        polylines = [];
        for(var i=0;i<legs.length;i++) {
            var leg = legs[i];
            var polyline = L.Polyline.fromEncoded(leg.legGeometry.points);
            polylines.push(polyline);
        }
        this.map.addRoute(name,polylines);
    },

    showTripDescription: function(legs) {
        legs = Ext.Array.map(legs,function(l) {
            return l
        });
        this.tripDescriptionView.store.loadData(legs);
    }
});
Ext.define('App',{
    singleton: true,
    mode: 'TRANSIT,WALK',

    constructor: function() {
        Ext.onReady(this.init,this);
         //this.init();
    },

    init: function() {
        Ext.tip.QuickTipManager.init();

        this.markerWalk = L.AwesomeMarkers.icon({
            prefix: 'icon',
            icon: 'walk',
            markerColor: 'blue'
        });

        this.markerBus = L.AwesomeMarkers.icon({
            prefix: 'icon',
            icon: 'bus',
            markerColor: 'purple'
        });

        Ext.Ajax.on('requestexception', function (con, res) {
            Ext.Msg.alert(res.statusText,res.responseText);
        }, this);

        var now = new Date();

        this.form = Ext.create('Ext.form.Panel',{
            layout: {
                type: 'table',
                columns: 2
            },
            height: 200,
            defaultType: 'textfield',
            bodyPadding: 10,
            border: false,
            fieldDefaults: {
                labelWidth: 20
            },
            items: [{
                colspan: 2,
                cls: 'btn-group transportes-group',
                xtype: 'buttongroup',
                columns: 3,
                border: false,
                frame: false,
                defaults: {
                    //cls: 'btn',
                    scale: 'medium',
                    toggleGroup: 'transportes-group'
                },
                //title: 'Clipboard',
                items: [{
                    iconCls: 'icon-car',
                    margin: '0 0px 0 0',
                    cls: 'btn-group-first',
                    listeners: {
                        scope: this,
                        toggle: function(btn,pressed) {
                            if(pressed) {
                                this.mode = 'CAR';
                            }
                        }
                    }
                },{
                    iconCls: 'icon-bus',
                    pressed: true,
                    listeners: {
                        scope: this,
                        toggle: function(btn,pressed) {
                            if(pressed) {
                                this.mode = 'TRANSIT,WALK';
                                Ext.getCmp('triptime').show();
                            } else {
                                Ext.getCmp('triptime').hide();
                            }
                        }
                    }
                },{
                    iconCls: 'icon-walk',
                    cls: 'btn-group-last',
                    listeners: {
                        scope: this,
                        toggle: function(btn,pressed) {
                            if(pressed) {
                                this.mode = 'WALK';
                            }
                        }
                    }
                }]
            },{
                fieldLabel: 'A',
                cls: 'pointa',
                name: 'departure',
                allowBlank: false,
                emptyText: 'Departure ...'
            },{
                id:'change-a-b',
                xtype:'button',
                iconCls: 'fa fa-exchange',
                cls: 'x-btn-default-toolbar-small',
                rowspan: 2
            },{
                fieldLabel: 'B',
                cls: 'pointb',
                name: 'destination',
                allowBlank: false,
                emptyText: 'Destination ...'
            },{
                id: 'triptime',
                xtype: 'container',
                layout: 'column',
                colspan: 2,
                items: [{
                    id: 'departtime',
                    name: 'departtime',
                    xtype: 'timefield',
                    width: 100,
                    value: now
                },{
                    id: 'departdate',
                    name: 'departdate',
                    xtype: 'datefield',
                    width: 110,
                    value: now
                }]
            },{
                xtype: 'button',
                cls: 'btn btn-primary',
                margin: '10px 0 0 0',
                style: 'float: right',
                text: 'Get trip plan',
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
                        this.selectSuggestion('select', r.get('legs'), this.suggView.indexOf(r));
                    } else {
                        this.map.addRoute('select',false);
                    }
                },
                highlightitem: function(v,n){
                    var r = v.getRecord(n);
                    this.selectSuggestion('highlight', r.get('legs'), v.indexOf(r));
                },
                unhighlightitem: function(v,n){
                    this.map.addRoute('highlight',false);
                }
            }
        });

        this.tripDescriptionView = Ext.create('Ride.TripDescriptionView',{
        });

        this.configPanel = Ext.create('Ext.panel.Panel',{
            id: 'sidebar',
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

        var time = Ext.getCmp('departtime').getValue();
        var now = Ext.getCmp('departdate').getValue();
        now.setHours(time.getHours(),time.getMinutes());

        var departureTime = Ext.Date.add(now,Ext.Date.MINUTE,0);
        Ext.data.JsonP.request({
            //url: 'http://ec2-54-207-21-176.sa-east-1.compute.amazonaws.com:8080/opentripplanner-api-webapp/ws/plan',
            url: 'http://dev:8080/opentripplanner-api-webapp/ws/plan',
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
                mode: this.mode,// 'TRANSIT,WALK',
                optimize: 'QUICK',
                maxWalkDistance: this.mode == 'WALK' ? 100000 : 5000,
                date: Ext.Date.format(departureTime,'Y-m-d'),
                walkSpeed: '1.341'
            },

            success: function (result, request) {
                //todo handle errors sent by server
                if(result.plan) {
                    this.suggView.store.loadData(result.plan.itineraries);
                    this.suggView.setHeight(result.plan.itineraries.length * 52);
                } else {
                    this.suggView.store.removeAll();
                }
            },

            failure: function (result, request) {
                alert("failed");
            }
        });
    },

    selectSuggestion: function(name,legs,index) {
        var opacity = 0.5;
        if(name == 'select') {
            this.showTripDescription(legs);
            opacity = 0.8;
        }
        //var legs = rs[0].get('legs');
        var colors = ['#03f','#660099','#CC3366','#336633'];
        var color = colors[index] || '#03f';
        var polylines = [];
        for(var i=0;i<legs.length;i++) {
            var leg = legs[i];
            var opts = {
                color: color,
                opacity: opacity
            };

            var marker = null;

            switch (leg.mode) {
                case 'WALK':
                    opts['dashArray'] = '10, 10';
                    marker = this.markerWalk;
                    break;
                case 'BUS':
                    marker = this.markerBus;
                    break;
            }
            var polyline = L.Polyline.fromEncoded(leg.legGeometry.points,opts);
            var firstLatLng = polyline._latlngs[0];

            if(i > 0 && marker) {
                polylines.push(L.marker(firstLatLng, {icon: marker, zIndexOffset: 1000 + i}));
            }
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
Ext.define('App',{
    singleton: true,
    mode: 'BUS',

    departureText: 'Departure...',
    destinationText: 'Destination ...',
    sendMailText: 'Send a mail',
    googleMarketText: 'Application in the Google Play',
    tripPlanText: 'Get trip plan',
    routesText: 'Routes',
    shortUrlText: 'Short url',
    getShortUrlText: 'Get short url',

    constructor: function() {
        this.setupLanguage();
        this.syncRouteTask =  new Ext.util.DelayedTask(this.syncRoute, this);
        Ext.onReady(this.init,this);
    },

    init: function() {
        Ext.tip.QuickTipManager.init();

        //hack from here: http://stackoverflow.com/questions/15834689/extjs-4-2-tooltips-not-wide-enough-to-see-contents
        //delete
        Ext.tip.Tip.prototype.minWidth = 100;

        Ext.History.html5Mode = false;
        Ext.History.hashPrefix = '!';

        Ext.Router.route('/it', function(params) {
            var from, to, when;

            if (params['when']) {
                when = Ext.Date.parse(params['when'], 'Y-m-d@H:i');
                Ext.getCmp('departtime').setValue(when);
                Ext.getCmp('departdate').setValue(when);
            }

            if (params['mode']) {
                var mode = params['mode'];
                var btn = this.form.down('button[iconCls=icon-' + mode.toLowerCase() + ']');
                if (btn) {
                    this.mode = mode;
                    btn.toggle(true);
                }
            }

            if (params['from']) {
                from = L.latLng(params['from'].split(','));
                this.select('departure', from, true);
            }

            if (params['to']) {
                to = L.latLng(params['to'].split(','));
                this.select('destination', to, true);
            }
        }, this);

        this.markerIconA = L.icon({
            iconUrl: 'images/marker_greenA.png',
            iconSize: [20, 34],
            iconAnchor: [10,34]
        });

        this.markerIconB = L.icon({
            iconUrl: 'images/marker_greenB.png',
            iconSize: [20, 34],
            iconAnchor: [10,34]
        });

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

        var me = this;
        var checkToggle = function (btn) {
            var pressed = false, btnGroup = me.form.down('buttongroup');
            btnGroup.items.each(function(btn){
                if(btn.pressed) {
                    pressed = true;
                    return false;
                }
            });

            if(!pressed) {
                btn.toggle();
            }

            me.syncRoute();
            return pressed;
        };

        this.form = Ext.create('Ext.form.Panel',{
            layout: {
                type: 'table',
                columns: 2
            },
            height: 200,
            id: 'params_form',
            defaultType: 'textfield',
            bodyPadding: 10,
            border: false,
            fieldDefaults: {
                labelWidth: 20
            },
            items: [{
                //colspan: 2,
                id: 'mode',
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
                                this.search();
                            } else {
                                checkToggle(btn);
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
                                this.mode = 'BUS';
                                Ext.getCmp('triptime').show();
                                this.search();
                            } else {
                                if(checkToggle(btn)) {
                                    Ext.getCmp('triptime').hide();
                                }
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
                                this.search();
                            } else {
                                checkToggle(btn);
                            }
                        }
                    }
                }]
            },{
                xtype: 'button',
                id: 'shortlink',
                iconCls: 'fa fa-link',
                cls: 'x-btn-default-toolbar-small',
                tooltip: this.getShortUrlText,
                tdAttrs: {style: "vertical-align: top"},
                scope: this,
                handler: function() {
                    Ext.Ajax.useDefaultXhrHeader = false;
                    Ext.Ajax.request({
                        url: 'https://www.googleapis.com/urlshortener/v1/url',
                        method: 'POST',
                        headers: {'Content-Type': 'application/json; charset=utf-8'},
                        params: {
                            key: 'AIzaSyCIKPLopXCxEwwR8BLTm8fDs_ADfHB82A0'
                        },
                        jsonData: {
                            longUrl: window.location.href
                        },
                        scope: this,
                        success: function(response) {
                            var json = Ext.decode(response.responseText);
                            Ext.Msg.alert(this.shortUrlText, json.id);
                        }
                    });
                    Ext.Ajax.useDefaultXhrHeader = true;
                }
            },{
                xtype: 'addressfield',
                id: 'fieldA',
                fieldLabel: 'A',
                cls: 'pointa',
                name: 'departure',
                allowBlank: false,
                emptyText: me.departureText,
                width: 255,
                listeners: {
                    scope: me,
                    located: function(cb) {
                        this.select('departure',cb.latlngValue);
                    }
                }
            },{
                id:'change-a-b',
                xtype:'button',
                iconCls: 'fa fa-exchange',
                cls: 'x-btn-default-toolbar-small',
                rowspan: 2,
                scope: this,
                handler: function() {
                    var fieldA = this.form.getForm().findField('departure');
                    var fieldB = this.form.getForm().findField('destination');

                    var aval = fieldA.latlngValue;
                    var bval = fieldB.latlngValue;
                    fieldA.setValue(null);
                    fieldB.setValue(null);

                    if(bval) {
                        this.select('departure',bval,true);
                    }

                    if(aval) {
                        this.select('destination',aval,true);
                    }
                }
            },{
                xtype: 'addressfield',
                id: 'fieldB',
                fieldLabel: 'B',
                cls: 'pointb',
                name: 'destination',
                allowBlank: false,
                width: 255,
                emptyText: me.destinationText,
                listeners: {
                    scope: me,
                    located: function(cb) {
                        this.select('destination',cb.latlngValue);
                    }
                }
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
                id: 'searchbtn',
                cls: 'btn btn-primary',
                margin: '10px 0 0 0',
                style: 'float: right',
                text: me.tripPlanText,
                handler: this.search,
                scope: this
            }]
        });

        this.suggView = Ext.create('Ride.SuggestedView',{
            id: 'suggestion',
            height: 100,
            listeners: {
                scope: this,
                selectionchange: function(v,rs){
                    var r = rs[0];
                    if (r) {
                        this.selectSuggestion('select', this.suggView.indexOf(r));
                    } else {
                        this.map.addRoute('select',false);
                        this.tripDescriptionView.store.removeAll();
                    }
                },
                highlightitem: function(v,n){
                    var r = v.getRecord(n);
                    this.selectSuggestion('highlight', v.indexOf(r));
                },
                unhighlightitem: function(v,n){
                    this.map.addRoute('highlight',false);
                }
            }
        });

        this.tripDescriptionView = Ext.create('Ride.TripDescriptionView',{
            margin: '5px 0 0 0',
            autoScroll: true,
            listeners: {
                scope: this,
                highlightitem: function(v,n){
                    if(this.descriptionPopup) {
                        return;
                    }

                    var r = v.getRecord(n), from, content;

                    if(this.mode == 'BUS') {
                        from = r.get('from');
                        if(!from) {
                            return;
                        }
                        content = getModelIcon(r.data) + ' ' + from.name;
                        from = [from.lat,from.lon];
                    } else {
                        from = [r.get('lat'), r.get('lon')];
                        content = "<i class='"+getDirectionIcon(r.get('relativeDirection'), r.get('exit'), true)+" popup-dir-icon'></i> "+r.get('streetName');
                    }

                    this.descriptionPopup = L.popup({offset:[0,2], closeButton: false})
                        .setLatLng(from)
                        .setContent(content)
                        .openOn(this.map.map);
                },
                unhighlightitem: function(v,n){
                    if(this.descriptionPopup) {
                        this.descriptionPopup._close();
                        delete this.descriptionPopup;
                    }

                },
                select: function(v,r) {
                    if(this.mode == 'BUS') {
                        var from = r.get('from');
                        if(from) {
                            this.map.map.setView([from.lat,from.lon]);
                        }
                    } else {
                        this.map.map.setView([r.data.lat, r.data.lon]);
                    }
                }
            }
        });

        this.helpPanel = Ext.create('Ext.container.Container',{
            html: '<h3 style="margin-left: 20px">Como usar o aplicativo</h3>' +
                '<ul>' +
                '<li>Abrir o aplicativo ou website</li>' +
                '<li>Escolha o ponto de partida e o ponto de chegada no mapa ou digite o endereço na caixa de pesquisa</li>' +
                '<li>Selecione qual rota e a melhor para você</li>'+
                '</ul>'
        });

        this.sidePanel = Ext.create('Ext.panel.Panel',{
            id: 'sidebar',
            layout: 'border',
            align: 'stretch',
            region: 'west',
            collapsible: true,
            title: me.routesText,
            width: 300,
            items: [{
                xtype: 'container',
                layout: 'anchor',
                region: 'north',
                height: 300,
                items: [this.form,this.helpPanel,this.suggView]
            },{
                xtype: 'container',
                layout: 'fit',
                region: 'center',
                //autoScroll: true,
                items: [this.tripDescriptionView]
            }],
            listeners: {
                afterrender: function(p) {
                    p.el.child('div.x-panel-body').removeCls('x-border-layout-ct');
                }
            }
        });

        this.map = Ext.create('Ext.ux.LeafletMap',{
            id: 'map',
            region: 'center',
            tileLayerUrl: Ride.Config.tileLayerUrl,
            mapOptions: {
                initialCenter: [-27.592968,-48.551674],
                minZoom: 11,
                maxBounds: [
                    [-27.367499,-48.598709],
                    [-27.866396,-48.350143]
                ]
            },
            listeners: {
                scope: this,
                selectdestination: function(latlng) {
                    this.select('destination',latlng,true);
                },
                selectdeparture: function(latlng) {
                    this.select('departure',latlng, true);
                }
            }
        });

        this.mainTbar = Ext.create('Ext.toolbar.Toolbar', {
            region: 'north',
            cls: 'main-toolbar',
            defaults: {
                scale: 'large'
            },
            items: [
                // begin using the right-justified button container
                '->',
                {
                    xtype: 'button',
                    iconCls: 'img-icon-gplay',
                    scope: this,
                    tooltip: me.googleMarketText,
                    text: 'Google play',
                    handler: function() {
                        window.open('https://play.google.com/store/apps/details?id=com.floriparide.android');
                    }
                },{
                    xtype: 'button',
                    iconCls: 'fa fa-facebook',
                    scope: this,
                    handler: function() {
                        window.open('https://www.facebook.com/floriparide');
                    }
                },{
                    xtype: 'button',
                    iconCls: 'fa fa-envelope-o',
                    cls: 'btn-mail',
                    textAlign: 'left',
                    scope: this,
                    tooltip: me.sendMailText,
                    handler: function() {
                        window.location.href = "mailto:floriparide@gmail.com";
                    }
                },{
                    xtype: 'button',
                    iconCls: 'fa fa-question',
                    cls: 'btn-help',
                    //textAlign: 'left',
                    scope: this,
                    tooltip: me.sendMailText,
                    handler: function() {
                        App.showIntro();
                    }
                }, '|', {
                    iconCls:'lang-'+me.lang,
                    id: 'btn-lang',
                    menu: {
                        xtype: 'menu',
                        cls: 'lang-menu',
                        items: [{
                            id: 'lang-brasil',
                            icon: 'images/brazil16.png',
                            text: 'Português',
                            handler: function() {
                                window.location.search = Ext.urlEncode({"lang":"br"});
                            }
                        },{
                            id: 'lang-es',
                            icon: 'images/es16.png',
                            text: 'Español',
                            handler: function() {
                                window.location.search = Ext.urlEncode({"lang":"es"});
                            }
                        },
                        {
                            id:'lang-uk',
                            icon: 'images/uk16.png',
                            text: 'English',
                            handler: function() {
                                window.location.search = Ext.urlEncode({"lang":"en"});
                            }
                        },
                        {
                            id: 'lang-ru',
                            icon: 'images/rus16.png',
                            text: 'Русский',
                            handler: function() {
                                window.location.search = Ext.urlEncode({"lang":"ru"});
                            }
                        }]
                    }
                }

            ]
        });

        this.viewport = Ext.create('Ext.Viewport',{
            layout: 'border',
            items: [this.mainTbar,this.sidePanel,this.map]
        });
        this.initApp();
    },

    initApp: function() {
        Ext.fly('loading-mask').remove();
        Ext.fly('loading').remove();

        if (!Ext.util.Cookies.get('frfv')) {
            this.showIntro();
            var expire = new Date();
            expire.setFullYear(expire.getFullYear() + 10);
            Ext.util.Cookies.set('frfv', 1, expire);
        }

        Ext.Router.init();
    },

    setupLanguage: function(lang) {
        if(!lang) {
            var params = Ext.urlDecode(window.location.search.substring(1));
            if (params.lang) {
                lang = params.lang;
            } else {
                lang = window.navigator.userLanguage || window.navigator.language;
                lang = lang.split('-')[0];
            }
        }

        this.lang = lang;
        //Ext.Loader.injectScriptElement('assets/extjs/locale/ext-lang-'+lang+'.js',Ext.emptyFn,Ext.emptyFn,this);
        document.write('<script src="assets/extjs/locale/ext-lang-'+lang+'.js" type="text/javascript"></script>');
    },

    select: function(direction,latlng,set_value) {
        var me = this;
        var name = direction + 'Marker';
        if(this[name]) {
            this.map.getMap().removeLayer(this[name]);
        }

        var icon = direction == 'departure' ? this.markerIconA : this.markerIconB;
        this[name] = L.marker([latlng.lat, latlng.lng],{icon:icon});
        this[name].addTo(this.map.getMap());

        if(set_value) {
            var field = me.form.getForm().findField(direction);
            field.setLatLngValue(latlng);
        }
        this.syncRouteTask.delay(500);
        this.search();
    },

    syncRoute: function() {
        var cur, path, params = [];
        var fieldA = this.form.getForm().findField('departure');
        var fieldB = this.form.getForm().findField('destination');

        var time = Ext.getCmp('departtime').getValue();
        var now = Ext.getCmp('departdate').getValue();
        if(Ext.isString(now)) {
            now = new Date();
        }
        now.setHours(time.getHours(),time.getMinutes());

        if (fieldA.latlngValue) {
            params.push('from=' + fieldA.latlngValue.lat + ',' + fieldA.latlngValue.lng);
        }

        if (fieldB.latlngValue) {
            params.push('to=' + fieldB.latlngValue.lat + ',' + fieldB.latlngValue.lng);
        }

        if (!params.length) {
            return;
        }

        params.push('when=' + Ext.Date.format(now, 'Y-m-d@H:i'));
        params.push('mode=' + this.mode);

        cur = Ext.History.getToken();
        path = '/it?' + params.join('&');

        if (cur != path) {
            Ext.Router.redirect(path);
        }
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

        if(!fieldA.latlngValue || !fieldB.latlngValue) {
            return;
        }

        this.helpPanel.hide();

        var pointA = fieldA.latlngValue.lat + ',' + fieldA.latlngValue.lng;
        var pointB = fieldB.latlngValue.lat + ',' + fieldB.latlngValue.lng;

        var time = Ext.getCmp('departtime').getValue();
        var now = Ext.getCmp('departdate').getValue();
        if(Ext.isString(now)) {
            now = new Date();
        }
        now.setHours(time.getHours(),time.getMinutes());

        var searchBtn = Ext.getCmp('searchbtn');
        searchBtn.disable();
        this.suggView.store.removeAll();
        this.suggView.el.mask('Loading...');

        var departureTime = Ext.Date.add(now,Ext.Date.MINUTE,0);
        Ext.data.JsonP.request({
            url: Ride.Config.endpoints.tripplanner,
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
                mode: this.mode == 'BUS' ? 'TRANSIT,WALK' : this.mode,
                optimize: 'QUICK',
                maxWalkDistance: this.mode == 'WALK' ? 100000 : 700,
                date: Ext.Date.format(departureTime,'Y-m-d'),
                walkSpeed: '1.341',
                locale: 'en_US.UTF-8'
            },

            success: function (result, request) {
                //this.suggView.el.unmask();
                searchBtn.enable();

                if(result.plan) {
                    this.plan = result.plan;
                    this.suggView.store.loadData(result.plan.itineraries);
                    this.suggView.up().setHeight(this.suggView.getEl().child('ol').getHeight()+200);
                    //this.suggView.setHeight(result.plan.itineraries.length * 52);
                    this.suggView.getSelectionModel().select(0)
                } else {
                    delete this.plan;
                    this.suggView.store.removeAll();
                }
            },

            failure: function (result, request) {
                delete this.plan;
                searchBtn.enable();
                this.suggView.store.removeAll();
                alert(result);
            }
        });
    },

    selectSuggestion: function(name,index) {
        var opacity = 0.5;
        var route = this.plan.itineraries[index];
        if(name == 'select') {
            this.showTripDescription(index);
            opacity = 0.8;
        }

        var colors = ['#03f','#660099','#CC3366','#336633'];
        var color = colors[index] || '#03f';
        var polylines = [];
        for(var i=0;i<route.legs.length;i++) {
            var leg = route.legs[i];
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

            if(i && marker) {
                polylines.push(L.marker(firstLatLng, {icon: marker, zIndexOffset: 1000 + i}));
            }
            polylines.push(polyline);
        }
        this.map.addRoute(name,polylines);
    },

    showTripDescription: function(index) {
        this.tripDescriptionView.loadPlan(this.plan,index,this.mode);
    },

    showIntro: function() {
        var fieldA = App.form.getForm().findField('departure');
        var fieldB = App.form.getForm().findField('destination');

        fieldA.setValue(null);
        fieldB.setValue(null);

        App.map.clearRoutes();
        var intro = new Ride.Intro();
        intro.start();
        Ext.Router.skipInitToken = true;
        Ext.Router.init();
        Ext.Router.redirect('/');
    }
});


function getDirectionIcon (direction,exit,all_icons) {
    switch (direction) {
        case 'LEFT':
            return 'icon-turn-left';
        case 'RIGHT':
            return 'icon-turn-right';
        case 'SLIGHTLY_LEFT':
            return 'icon-turn-slight-left';
        case 'SLIGHTLY_RIGHT':
            return 'icon-turn-slight-right';
        case 'HARD_LEFT':
            return 'icon-turn-sharp-left';
        case 'HARD_RIGHT':
            return 'icon-turn-sharp-right';
        case 'CONTINUE':
            if(all_icons) {
                return 'icon-turn-continue';
            }
            break;
        case 'CIRCLE_CLOCKWISE':
            if(exit == 1) {
                return 'icon-turn-roundabout-first';
            } else if(exit == 2) {
                return 'icon-turn-roundabout-second';
            } else if(exit == 3) {
                return 'icon-turn-roundabout-third';
            }
            return 'icon-turn-roundabout-far';
    }
    return '';
}

function getModelIcon(l) {
    switch (l.mode) {
        case 'WALK':
            return '<i class="icon-walk"></i>';
        case 'BUS':
            return '<span class="agency_'+ l.agencyId+'"><i class="icon-bus"></i><span style="margin-left: 2px">'+ l.route+'</span></span>';
        case 'CAR':
            return '<i class="icon-car"></i>';
    }
    return '';
}
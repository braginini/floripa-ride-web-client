function address_extract(items,part) {
    for(var i=0;i< items.length;i++) {
        var item = items[i];
        if(Ext.Array.contains(item.types,part)) {
            return item.short_name;
        }
    }
    return '';
}

Ext.define('GoogleAddress', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'address_components', type: 'raw'},
        {name: 'geometry', type: 'raw'},
        {name: 'formatted_address', type: 'string'},
        {name: 'route_name', type: 'string',convert: function(v,r){
            var addr = address_extract(r.get('address_components'),'route') + ' ' + address_extract(r.get('address_components'),'street_number');
            if(addr.trim() == '' ) {
                addr = r.get('formatted_address');
                addr = addr.split(',')[0];
            }
            return addr;
        }},
        {name: 'locality', type: 'string', convert: function(v,r){
            return address_extract(r.get('address_components'),'locality');
        }},
        {name: 'neighborhood', type: 'string',convert: function(v,r){
            return address_extract(r.get('address_components'),'neighborhood');
        }},
        {name: 'area_level', type: 'string',convert: function(v,r){
            return address_extract(r.get('address_components'),'administrative_area_level_1');
        }}
    ]
});

Ext.define('Ride.AddressField',{
    extend: 'Ext.form.field.ComboBox',
    xtype: 'addressfield',
    valueField: 'formatted_address',
    displayField: 'route_name',
    hideTrigger: true,
    matchFieldWidth:false,
    listConfig:{
        minWidth: 250,
        maxWidth: 400,
        getInnerTpl: function() {
            return '<div class="address-item">{route_name}</div>' +
                '<div class="location-item">{neighborhood}&nbsp<div>{locality}</div></div>'
        }
    },
    initComponent: function() {
        var me = this;
        this.store = new Ext.data.JsonStore({
            proxy: {
                type: 'memory',
                reader: {
                    type: 'json',
                    root: 'results'
                }
            },
            model: 'GoogleAddress'
        });

        this.callParent();

        this.addEvents('located');

        this.mon(this,'afterrender',function() {
            me.triggerWrap.dom.removeAttribute('style');
        },this,{delay: 200});
    },

    doRemoteQuery: function(queryPlan) {
        var me = this;
        me.store.removeAll();
        me.expand();
        App.getGeocoder().geocode({
            region: 'Brasil',
            address: queryPlan.query + ' , Florianopolis, Santa Catarina',
            bounds: new google.maps.LatLngBounds(
              new google.maps.LatLng(-27.364449817684083,-48.618621826171875),
              new google.maps.LatLng(-27.839076094777802,-48.335723876953125)
            )
        }, function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                me.store.loadData(results,false);
                me.afterQuery(queryPlan);
            }
        });
    },

    setValue: function(value) {
        this.callParent([value]);
        var clear = true;
        if(value) {
            if(Ext.isArray(value)) {
                value = value[0].data[this.valueField];
            }
            var record = this.findRecordByValue(value);
            if(record) {
                clear = false;
                var l = record.get('geometry').location;
                this.latlngValue = {
                    lat: l.lat(),
                    lng: l.lng()
                };
                this.fireEvent('located',this);
            }
        }
        if(clear) {
            this.latlngValue = null;
        }
    },

    setLatLngValue: function(latlngValue) {
        var me = this;
        this.latlngValue = latlngValue;
        this.setRawValue(latlngValue);

        var callback = function(results, status) {
            if (status == google.maps.GeocoderStatus.OK && results.length) {
                me.store.loadData(results);


                me.setRawValue(
                    address_extract(results[0].address_components,'route') + ' ' +
                        address_extract(results[0].address_components,'street_number')
                );
                //me.value = results[0][me.valueField];
                me.setValue(results[0][me.valueField]);
            } else if (status ==  google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
                setTimeout(function(){
                    App.getGeocoder().geocode({'latLng': latlngValue}, callback);
                },100);
            }
        };

        App.getGeocoder().geocode({'latLng': latlngValue}, callback);
    }
});
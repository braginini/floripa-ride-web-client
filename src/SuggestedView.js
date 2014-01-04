Ext.define('Suggestion', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'duration',  type: 'string', convert: function(v){
            v = Math.round(v / 60000);
            if(v < 60) {
                min = v;
                hours = 0;
            } else {
                min = v % 60;
                hours = Math.round(v / 60);
            }
            var res = min + ' min';
            if(hours) {
                res = hours + 'h ' + res;
            }
            return res;
        }},
        {name: 'startTime',   type: 'date', dateFormat: 'time',convert2: function(v) {return Math.round(v/1000)}},
        {name: 'endTime',   type: 'date', dateFormat: 'time',convert2: function(v) {return Math.round(v/1000)}},
        {name: 'transfers', type: 'int'},
        {name: 'legs', type: 'raw'},
        {}
    ]
});

Ext.define('Ride.SuggestedView' , {
    extend: 'Ext.view.View',
    multiSelect: true,
    height: 310,
    trackOver: true,
    cls: 'suggestview',
    overItemCls: 'x-item-over',
    itemSelector: 'div.route-wrap',
    emptyText: 'No routes find',

    initComponent: function() {
        this.store = new Ext.data.JsonStore({
            model: 'Suggestion'
        });

        this.tpl = new Ext.XTemplate(
            '<ol class="routes">',
            '<tpl for=".">',
            '<li class="route {[ xindex == 1 ? \'first-route\' : \'\' ]}">',
            '<div class="route-wrap">',
                '<div class="route-info">' +
                    '<span>{duration}</span>{transfers:this.formatTransfers}' +
                '</div>' +
                '<div>{legs:this.formatLegs}</div>' +
                '<div class="route-time">{startTime:date("h:i a")} - {endTime:date("h:i a")}</div>',
                '<div class="x-clear"></div>' +
            '</div>',
            '</li>',
            '</tpl>',
            '</ol>',
            '<div class="x-clear"></div>'
        ,{
            formatLegs: function(legs) {
                var res = [];
                for(var i=0;i<legs.length;i++) {
                    var l = legs[i];
                    switch (l.mode) {
                        case 'WALK':
                            res.push('<i class="icon-walk"></i>');
                            break;
                        case 'BUS':
                            res.push('<span class="agency_'+ l.agencyId+'"><i class="icon-bus"></i><span style="margin-left: 2px">'+ l.route+'</span></span>');
                            break;
                        case 'CAR':
                            res.push('<i class="icon-car"></i>');
                            break;
                    }
                }
                return res.join('<i class="fa fa-arrow-right route-arrow"></i>');
            },
            formatTransfers: function(transfers) {
                if(transfers) {
                    transfers =  transfers > 1 ? transfers + 'transfers' : '1 transfer';
                    return '<br><span style="color: darkgray">'+transfers+'</span>';
                }
                return '';
            }
        });
        this.callParent();
    },
    listeners: {
        selectionchange2: function(dv, nodes ){
            var l = nodes.length,
                s = l !== 1 ? 's' : '';
            this.up('panel').setTitle('Simple DataView (' + l + ' item' + s + ' selected)');
        }
    }
});
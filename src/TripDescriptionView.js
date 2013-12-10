Ext.define('TripDescription', {
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
        {name: 'from',   type: 'raw'},
        {name: 'to',   type: 'raw'},
        {name: 'steps', type: 'raw'}
    ]
});

Ext.define('Ride.TripDescriptionView' , {
    extend: 'Ext.view.View',
    multiSelect: true,
    height: 310,
    trackOver: true,
    cls: 'tripdescrview',
    overItemCls: 'x-item-over',
    itemSelector: 'div.route-wrap',
    emptyText: 'No routes find',

    initComponent: function() {
        this.store = new Ext.data.JsonStore({
            model: 'TripDescription'
        });

        this.tpl = new Ext.XTemplate(
            '<table>',
            '<tpl for=".">',
            '<tr>',
                '<td><i class="{icon}"></i></td>',
                '<td>' +
                    '<div>{from.name}</div>',
                    '<div>{to.name}</div>',
                    '<div>{duration}</div>',
                '</td>',
            '</tr>',
            '</tpl>',
            '</table>',
            '<div class="x-clear"></div>'
            ,{
                formatTransfers: function(transfers) {
                    if(transfers) {
                        transfers =  transfers > 1 ? transfers + 'transfers' : '1 transfer';
                        return '<br><span>'+transfers+'</span>';
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
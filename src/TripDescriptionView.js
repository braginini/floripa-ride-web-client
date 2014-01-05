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
        {name: 'mode',   type: 'string'},
        {name: 'distance',   type: 'float'},
        {name: 'from',   type: 'raw'},
        {name: 'to',   type: 'raw'},
        {name: 'startTime',   type: 'date', dateFormat: 'time'},
        {name: 'endTime',   type: 'date', dateFormat: 'time'},
        {name: 'agencyId', type: 'string'},
        {name: 'route', type: 'string'},
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
    autoScroll: true,

    initComponent: function() {
        var me = this;

        this.store = new Ext.data.JsonStore({
            model: 'TripDescription'
        });

        this.tpl = new Ext.XTemplate(
            '<table class="tripdescr">',
            '<tbody class="endpoint endpointa"><tr>',
                '<td><img src="images/marker_greenA.png" class="endpoint-icon" align="middle"></td>',
                '<td><div class="endpoint-name">{[this.getFromPoint()]}</div></td>',
            '</tr></tbody>',
            '<tpl for=".">',
                '<tpl if="this.getMode() == \'BUS\'">',
                    '<tbody class="legdescr">',
                    '<tr>',
                        '<tpl if="mode == \'WALK\'">',
        //                    '<td>|</td>',
                            '<td colspan="2">',
                                '<div class="legroute"><i class="icon-walk"></i> Walk to <tpl if="xindex < xcount-1">Bus.st </tpl>{to.name}</div>',
                                '<div class="legduration">About {duration} ({distance:this.formatDistance})</div>',
                            '</td>',
                        '</tpl>',
                        '<tpl if="mode == \'BUS\'">',
                            '<td colspan="2">',
                                '<div class="legname">{from.name}</div>',
                                '<div class="legroute"><span class="agency_{agencyId}"><i class="icon-bus"></i> {route}</span> Bus towards {to.name}</div>',
                                '<div class="legduration">{startTime:date("g:i a")} - {endTime:date("g:i a")} ({duration}, {distance:this.formatDistance})</div>',
                            '</td>',
                        '</tpl>',
                    '</tr>',
                    '</tbody>',
                '</tpl>',


                '<tpl if="this.getMode() == \'WALK\'">',
                '{[this.setLastDirection(null)]}',
                    '<tpl for="steps">',
                        '<tbody class="legdescr">',
                        '<tr>',
                            '<td><i class="{[this.getDirectionIcon(values.relativeDirection,values.exit)]} direction-icon"></i> </td>',
//                            '<td>{relativeDirection}</td>',
                            '<td>',
                                '<div class="stepname">{[xindex]}. {[this.formatWalkDirection(values,xindex)]}</div>',
                                '<div class="stepdistance">{distance:this.formatDistance}</div>',
                            '</td>',
                        '</tr>',
                        '</tbody>',
                    '{[this.setLastDirection(values.relativeDirection)]}',
                    '</tpl>',
                '</tpl>',

                '<tpl if="this.getMode() == \'CAR\'">',
                    '<tpl for="steps">',
                        '<tbody class="legdescr">',
                            '<tr>',
                                '<td><i class="{[this.getDirectionIcon(values.relativeDirection,values.exit)]} direction-icon"></i> </td>',
                                '<td>',
                                    '<div class="stepname">{[xindex]}. {[this.formatCarDirection(values,xindex)]}</div>',
                                    '<div class="stepdistance">{distance:this.formatDistance}</div>',
                                '</td>',
                            '</tr>',
                        '</tbody>',
                    '</tpl>',
                '</tpl>',


            '</tpl>',
            '<tbody class="endpoint"><tr>',
                '<td><img src="images/marker_greenB.png" class="endpoint-icon" align="middle"></td>',
                '<td><div class="endpoint-name">{[this.getToPoint()]}</div></td>',
            '</tr></tbody>',
            '</table>',
            '<div class="x-clear"></div>'
            ,{
                getMode: function() {
                    return me.mode;
                },
                getFromPoint: function() {
                    return me.plan.from.name;
                },
                getToPoint: function() {
                    return me.plan.to.name;
                },
                formatDistance: function(distance) {
                    if (distance > 1000) {
                        distance = distance / 1000;
                        return distance.toFixed(1) + ' km.';
                    }
                    return distance.toFixed() + ' m.';
                },
                formatWalkDirection: function(r,index) {
                    if(index == 1) {
                        return 'Walk <b>' + r.absoluteDirection + '</b> on <b>' + r.streetName+'</b>';
                    }

                    var str = '';
                    var addStreet = true;
                    switch (r.relativeDirection) {
                        case 'LEFT':
                            str = 'Turn left ';
                            break;
                        case 'RIGHT':
                            str = 'Turn right ';
                            break;
                        case 'SLIGHTLY_LEFT':
                            str = 'Slight left ';
                            break;
                        case 'SLIGHTLY_RIGHT':
                            str = 'Slight right ';
                            break;
                        case 'HARD_LEFT':
                            str = 'Sharp left ';
                            break;
                        case 'HARD_RIGHT':
                            str = 'Sharp right ';
                            break;
                        case 'CONTINUE':
                            str = 'Continue walk ';
                            break;
                        case 'CIRCLE_CLOCKWISE':
                            addStreet = false;
                            str = 'Circular motion '+ r.exit+' exit on <b>'+ r.absoluteDirection+'</b>';
                            break;
                    }

                    if(addStreet) {
                        str += ' on <b>'+ r.streetName+'</b>';
                    }
                    return str;
                },
                formatCarDirection: function(r,index) {
                    if(index == 1) {
                        return 'Drive <b>' + r.absoluteDirection + '</b> on <b>' + r.streetName+'</b>';
                    }

                    var str = '';
                    var addStreet = true;
                    switch (r.relativeDirection) {
                        case 'LEFT':
                            str = 'Turn left ';
                            break;
                        case 'RIGHT':
                            str = 'Turn right ';
                            break;
                        case 'SLIGHTLY_LEFT':
                            str = 'Slight left ';
                            break;
                        case 'SLIGHTLY_RIGHT':
                            str = 'Slight right ';
                            break;
                        case 'HARD_LEFT':
                            str = 'Sharp left ';
                            break;
                        case 'HARD_RIGHT':
                            str = 'Sharp right ';
                            break;
                        case 'CONTINUE':
                            str = 'Continue drive ';
                            break;
                        case 'CIRCLE_CLOCKWISE':
                            addStreet = false;
                            str = 'Circular motion '+ r.exit+' exit on <b>'+ r.absoluteDirection+'</b>';
                            break;
                    }

                    if(addStreet) {
                        str += ' on <b>'+ r.streetName+'</b>';
                    }
                    return str;
                },
                getDirectionIcon: function(direction,exit) {
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
                },
                setLastDirection: function(direction) {
                    me.lastDirection = direction;
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
    },

    loadPlan: function(plan,index,mode) {
        this.mode = mode;
        this.plan = plan;
        this.route = this.plan.itineraries[index];

        this.store.loadData(this.route.legs);
    }
});
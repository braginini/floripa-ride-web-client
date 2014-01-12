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

Ext.define('StepDescription', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'mode',   type: 'string'},
        {name: 'distance',   type: 'float'},
        {name: 'relativeDirection', type: 'string'},
        {name: 'absoluteDirection', type: 'string'},
        {name: 'streetName', type: 'string'},
        {name: 'exit', type: 'int'},
        {name: 'relativeDirection', type: 'string'},
        {name: 'lon', type: 'float'},
        {name: 'lat', type: 'float'}
    ]
});

Ext.define('Ride.TripDescriptionView' , {
    extend: 'Ext.view.View',
    multiSelect: true,
    //height: 310,
    trackOver: true,
    cls: 'tripdescrview',
    overItemCls: 'x-item-over',
    itemSelector: 'tbody.trippoint',

    walkText: 'Walk',
    walkToText: 'Walk to',
    busStText: 'Bus.st',
    aboutText: 'About',
    busTowardsText: 'Bus towards',
    onText: 'on',
    turnLeftText: 'Turn left',
    turnRightText: 'Turn right',
    slightLeftText: 'Slight left',
    slightRightText: 'Slight right',
    sharpLeftText: 'Sharp left',
    sharpRightText: 'Sharp right',
    continueWalkText: 'Continue walk',
    continueDriveText: 'Continue drive',
    circularMotionText: 'Circular motion',
    exitOnText: 'exit on',
    driveText: 'Drive',

    autoScroll: true,

    initComponent: function() {
        var me = this;

        this.store = new Ext.data.JsonStore({
            model: 'TripDescription'
        });

        this.tpl = new Ext.XTemplate(
            '<table class="tripdescr">',
            '<tpl for=".">',
                '<tpl if="xindex==1">',
                    '<tbody class="trippoint endpoint endpointa">' +
                        '<tr>',
                            '<td><img src="images/marker_greenA.png" class="endpoint-icon" align="middle"></td>',
                            '<td><div class="endpoint-name">{[this.getFromPoint()]}</div></td>',
                        '</tr>' +
                    '</tbody>',
                '</tpl>',
                '<tpl if="xindex==xcount">',
                    '<tbody class="trippoint endpoint">',
                        '<tr>',
                            '<td><img src="images/marker_greenB.png" class="endpoint-icon" align="middle"></td>',
                            '<td><div class="endpoint-name">{[this.getToPoint()]}</div></td>',
                        '</tr>',
                    '</tbody>',
                '</tpl>',
                '{% if(xindex==xcount || xindex==1) continue; %}',

                '<tpl if="this.getMode() == \'BUS\'">',
                    '<tbody class="trippoint legdescr">',
                    '<tr>',
                        '<tpl if="mode == \'WALK\'">',
                            '<td colspan="2">',
                                '<div class="legroute">{[xindex-1]}. <i class="icon-walk"></i> '+me.walkToText+' <tpl if="xindex < xcount-1">'+me.busStText+' </tpl>{to.name}</div>',
                                '<div class="legduration">'+me.aboutText+' {duration} ({distance:this.formatDistance})</div>',
                            '</td>',
                        '</tpl>',
                        '<tpl if="mode == \'BUS\'">',
                            '<td colspan="2">',
                                '<div class="legname">{[xindex-1]}. {from.name}</div>',
                                '<div class="legroute"><span class="agency_{agencyId}"><i class="icon-bus"></i> {route}</span> '+me.busTowardsText+' {to.name}</div>',
                                '<div class="legduration">{startTime:date("g:i a")} - {endTime:date("g:i a")} ({duration}, {distance:this.formatDistance})</div>',
                            '</td>',
                        '</tpl>',
                    '</tr>',
                    '</tbody>',
                '</tpl>',


                '<tpl if="this.getMode() == \'WALK\'">',
//                    '<tpl for="steps">',
                        '<tbody class="trippoint legdescr">',
                        '<tr>',
                            '<td><i class="{[this.getDirectionIcon(values.relativeDirection,values.exit)]} direction-icon"></i> </td>',
                            '<td>',
                                '<div class="stepname">{[xindex-1]}. {[this.formatWalkDirection(values,xindex-1)]}</div>',
                                '<div class="stepdistance">{distance:this.formatDistance}</div>',
                            '</td>',
                        '</tr>',
                        '</tbody>',
//                    '</tpl>',
                '</tpl>',

                '<tpl if="this.getMode() == \'CAR\'">',
//                    '<tpl for="steps">',
                        '<tbody class="trippoint legdescr">',
                            '<tr>',
                                '<td><i class="{[this.getDirectionIcon(values.relativeDirection,values.exit)]} direction-icon"></i> </td>',
                                '<td>',
                                    '<div class="stepname">{[xindex-1]}. {[this.formatCarDirection(values,xindex-1)]}</div>',
                                    '<div class="stepdistance">{distance:this.formatDistance}</div>',
                                '</td>',
                            '</tr>',
                        '</tbody>',
//                    '</tpl>',
                '</tpl>',
            '</tpl>',
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
                        return me.walkText+' <b>' + r.absoluteDirection + '</b> '+ me.onText +' <b>' + r.streetName+'</b>';
                    }

                    var str = '';
                    var addStreet = true;
                    switch (r.relativeDirection) {
                        case 'LEFT':
                            str = me.turnLeftText;
                            break;
                        case 'RIGHT':
                            str = me.turnRightText;
                            break;
                        case 'SLIGHTLY_LEFT':
                            str = me.slightLeftText;
                            break;
                        case 'SLIGHTLY_RIGHT':
                            str = me.slightRightText;
                            break;
                        case 'HARD_LEFT':
                            str = me.sharpLeftText;
                            break;
                        case 'HARD_RIGHT':
                            str = me.sharpRightText;
                            break;
                        case 'CONTINUE':
                            str = me.continueWalkText;
                            break;
                        case 'CIRCLE_CLOCKWISE':
                            addStreet = false;
                            str = me.circularMotionText + ' ' + r.exit+' '+me.exitOnText+' <b>'+ r.absoluteDirection+'</b>';
                            break;
                    }
                    str += ' ';

                    if(addStreet) {
                        str += ' '+me.onText+' <b>'+ r.streetName+'</b>';
                    }
                    return str;
                },
                formatCarDirection: function(r,index) {
                    if(index == 1) {
                        return me.driveText + ' <b>' + r.absoluteDirection + '</b> '+me.onText+' <b>' + r.streetName+'</b>';
                    }

                    var str = '';
                    var addStreet = true;
                    switch (r.relativeDirection) {
                        case 'LEFT':
                            str = me.turnLeftText;
                            break;
                        case 'RIGHT':
                            str = me.turnRightText;
                            break;
                        case 'SLIGHTLY_LEFT':
                            str = me.slightLeftText;
                            break;
                        case 'SLIGHTLY_RIGHT':
                            str = me.slightRightText;
                            break;
                        case 'HARD_LEFT':
                            str = me.sharpLeftText;
                            break;
                        case 'HARD_RIGHT':
                            str = me.sharpRightText;
                            break;
                        case 'CONTINUE':
                            str = me.continueDriveText;
                            break;
                        case 'CIRCLE_CLOCKWISE':
                            addStreet = false;
                            str = me.circularMotionText + ' ' + r.exit+' '+me.exitOnText+' <b>'+ r.absoluteDirection+'</b>';
                            break;
                    }

                    if(addStreet) {
                        str += ' ' + me.onText + '  <b>'+ r.streetName+'</b>';
                    }
                    return str;
                },
                getDirectionIcon: function(direction,exit) {
                    return getDirectionIcon(direction,exit);
                }
            });
        this.callParent();
    },

    loadPlan: function(plan,index,mode) {
        this.mode = mode;
        this.plan = plan;
        this.route = this.plan.itineraries[index];

        var i,legs;
        this.store.removeAll(true);
        if(mode == 'BUS') {
            legs = Ext.clone(this.route.legs);
            this.store.proxy.setModel('TripDescription',true);

            legs.unshift({
                from: plan.from,
                to: plan.from,
                name: plan.from.name,
                mode: 'endpoint'
            });
            legs.push({
                from: plan.to,
                to: plan.to,
                name: plan.to.name,
                mode: 'endpoint'
            });
        } else {
            legs = [];
            for(i=0;i < this.route.legs.length;i++) {
                legs = legs.concat(this.route.legs[i].steps);
                break;
            }

            legs.unshift({
                lat: plan.from.lat,
                lon: plan.from.lon,
                streetName: plan.from.name,
                mode: 'endpoint'
            });
            legs.push({
                lat: plan.to.lat,
                lon: plan.to.lon,
                streetName: plan.to.name,
                mode: 'endpoint'
            });
            this.store.proxy.setModel('StepDescription',true);
        }

        this.store.model = this.store.proxy.model;
        this.store.loadData(legs);
    }
});
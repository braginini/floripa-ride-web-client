Ext.define('Ext.ux.mvc.Router', {
    singleton: true,
    alternateClassName: 'Ext.Router',
    skipInitToken: false,
    mixins: {
        observable: 'Ext.util.Observable',
        routable: 'Ext.ux.mvc.Routable'
    },

    // @private
    constructor: function() {
        var me = this;
        me.ready = false;
        me.mixins.observable.constructor.call(me);
        me.mixins.routable.constructor.call(me);
    },

    /**
     * Processes the routes for the given app and initializes Ext.History.
     */
    init: function() {
        var me = this,
            history = Ext.History;

        if (me.ready) {
            return;
        }
        me.ready = true;

        history.init();
        history.on('change', me.parse, me);

        if (!this.skipInitToken) {
            if (Ext.isReady) {
                history.fireEvent('change', history.getToken());
            } else {
                Ext.onReady(function() {
                    history.fireEvent('change', history.getToken());
                });
            }
        }
    }
},
function() {
    /*
     * Patch Ext.Application to auto-initialize Router
     */
    Ext.override(Ext.app.Application, {

        route: function(route, opts, scope) {
            scope = scope || this;
            if (Ext.isString(opts)) {
                var action = opts.split('#');
                opts = {
                    callback: this.dispatchController,
                    scope: this,
                    noEvents: true,
                    controller: action[0],
                    action: action[1]
                };
            }
            Ext.ux.mvc.Router.route(route, opts, scope);
        },

        redirect: function(route) {
            Ext.ux.mvc.Router.redirect(route);
        },

        dispatchController: function(params, path, route) {
            if (Ext.ux.mvc.Router.fireEvent('beforedispatch', path, route, params, this) === false) {
                return false;
            }

            var controllerFullName, controller,
                app         = this,
                action      = route.action,
                classMgr    = Ext.ClassManager,
                controllerName  = route.controller;

            // try regular name
            controllerFullName = app.getModuleClassName(controllerName, 'controller');

            if (!classMgr.get(controllerFullName)) {

                // try capitalized
                controllerName          = Ext.String.capitalize(controllerName);
                controllerFullName  = app.getModuleClassName(controllerName, 'controller');

                if (!classMgr.get(controllerFullName)) {
                    //<debug>
                    Ext.ux.mvc.Router.logError("Controller '" + route.controller + "' not found ");
                    //</debug>
                    return false;
                }

                // fix controller name
                route.controller = controllerName;
            }

            controller = app.getController(controllerName);

            if (!controller) {
                return false;
            }

            //<debug error>
            Ext.ux.mvc.Router.logError("Controller '" + route.controller + "' action '" + route.action + "' not found ");
            //</debug>
            controller[route.action].call(controller, params, path, route, this);
            Ext.ux.mvc.Router.fireEvent('dispatch', path, route, params, this);
        }
    });
});
Ext.define('Ext.ux.mvc.Routable', {
    alternateClassName: 'Ext.ux.mvc.Routable',
    routeBasePath: '',
    // @private
    constructor: function(config) {
        if (config) {
            if (config.routeBasePath) {
                this.routeBasePath = config.routeBasePath;
            }
        }
        var me = this;
        me.ready = false;
        me.routes = [];

        me.eventSupport = !!me.addEvents;
        if (me.eventSupport) {
            me.addEvents(
                /**
                 * @event routemissed
                 * Fires when no route is found for a given URI Token
                 * @param {String} uri The URI Token
                 */
                'routemissed',

                /**
                 * @event beforedispatch
                 * Fires before loading controller and calling its action.  Handlers can return false to cancel the dispatch
                 * process.
                 * @param {String} uri URI Token.
                 * @param {Object} match Route that matched the URI Token.
                 * @param {Object} params The params appended to the URI Token.
                 */
                'beforedispatch',

                /**
                 * @event dispatch
                 * Fires after loading controller and calling its action.
                 * @param {String} uri URI Token.
                 * @param {Object} match Route that matched the URI Token.
                 * @param {Object} params The params appended to the URI Token.
                 * @param {Object} controller The controller handling the action.
                 */
                'dispatch'
            );
        }
    },


    /**
     * Creates a matcher for a route config, based on
     * {@link https://github.com/cowboy/javascript-route-matcher javascript-route-matcher}
     * @private
     */
    routeMatcher: function(route, rules, scope) {
        var routeObj, action,
            me      = this,
            routes  = me.routes,
            reRoute = route,
            reParam = /([:*])(\w+)/g,
            reEscape= /([-.+?\^${}|\[\]\/\\])/g,
            names   = [];

        routeObj = {
            scope       : scope,
            route       : route
        };

        if (route instanceof RegExp) {
            routeObj.regex = route;
            routeObj.route = route.toString();
        }

        if (Ext.isFunction(rules)) {
            routeObj.callback = rules;
            routeObj.scope = scope;
            rules = {};
        } else if (rules.callback) {
            routeObj.callback = rules.callback;
            routeObj.scope = rules.scope || scope;
            delete rules.callback;
            delete rules.scope;
        }

        if (rules.regex || routeObj.regex) {
            routeObj.rules = rules;
        } else {
            reRoute = reRoute.replace(/\)/g,')*').replace(reEscape, "\\$1").replace(reParam, function(_, mode, name) {
                names.push(name);
                return mode === ":" ? "([^/]*)" : "(.*)";
            });

            routeObj.names = names;
            routeObj.matcher = new RegExp("^" + reRoute + "$");
            routeObj.manageArgs  = route.indexOf('?') !== -1;
        }

        routes.push(routeObj);
    },

    /**
     * Receives a url path and goes trough each of of the defined route objects searching
     * for a match.
     * @private
     */
    parse: function(path) {
        var route, matches, params, names, j, param, value, rules,
            tokenArgs, tokenWithoutArgs,
            me      = this,
            routes  = me.routes,
            i       = 0,
            len     = routes.length;

        path            = path||"";
        tokenWithoutArgs = path.split('?');
        tokenArgs        = tokenWithoutArgs[1];
        tokenWithoutArgs = tokenWithoutArgs[0];

        for (; i < len; i++) {
            route = routes[i];

            if (route.regex) {
                matches = path.match(route.regex);

                if (matches) {
                    matches = matches.slice(1);

                    if (me.dispatch(path, route, matches)) {
                        return { captures: matches };
                    }
                }
            }
            else {
                matches = route.manageArgs ? path.match(route.matcher) : tokenWithoutArgs.match(route.matcher);

                // special index rule
                if (tokenWithoutArgs === '' && route.route === '/' || tokenWithoutArgs === '/' && route.route === '') {
                    matches = [];
                }

                if (matches) {
                    params  = {};
                    names   = route.names;
                    rules   = route.rules;
                    j       = 0;

                    while (j < names.length) {
                        param = names[j++];
                        value = matches[j];

                        if (rules && param in rules && !this.validateRule(rules[param], value)) {
                            matches = false;
                            break;
                        }

                        params[param] = value;
                    }

                    if (tokenArgs && !route.manageArgs) {
                        params = Ext.applyIf(params, Ext.Object.fromQueryString(tokenArgs));
                    }

                    if (matches && me.dispatch(path, route, params)) {
                        return params;
                    }
                }
            }
        }

        if (me.eventSupport) {
            me.fireEvent('routemissed', path);
        }
        return false;
    },

    /**
     * Each route can have rules, and this function ensures these rules. They could be Functions,
     * Regular Expressions or simple string strong comparisson.
     * @private
     */
    validateRule: function(rule, value) {
        if (Ext.isFunction(rule)) {
            return rule(value);
        }
        else if (Ext.isFunction(rule.test)) {
            return rule.test(value);
        }

        return rule === value;
    },

    /**
     * Tries to dispatch a route to the controller action. Fires the 'beforedispatch' and
     * 'dispatch' events.
     * @private
     */
    dispatch: function(path, route, params) {
        var me = this,
            events= me.eventSupport && !route.noEvents;

        if (events && me.fireEvent('beforedispatch', path, route, params, me) === false) {
            return false;
        }

        route.callback.call(route.scope, params, path, route, me);

        if (events) {
            me.fireEvent('dispatch', path, route, params, me);
        }

        return true;
    },

    route: function(route, opts, scope) {
        var rules = {};
        scope = scope || this;
        if (Ext.isFunction(opts)) {
            rules.callback = opts;
            rules.scope = scope;
        } else if (opts.callback) {
            rules = opts;
            if (!rules.scope) {
                rules.scope = scope;
            }
        } else {
            this.logError("Callback should be defined for route " + route);
        }
        this.routeMatcher(route, rules, scope);
    },

    /**
     * Redirects the page to other URI.
     * @param {String} uri URI Token
     * @param {Boolean} [preventDuplicates=true] When true, if the passed path matches the current path
     * it will not save a new history step. Set to false if the same state can be saved more than once
     * at the same history stack location.
     */
    redirect: function(path, data, preventDup) {
        var history = Ext.History;

        path = this.routeBasePath + path.replace(this.routeBasePath, '');

        if (preventDup !== false && history.getToken() === path) {
            this.parse(path);
        } else {
            history.addToken(path, data);
        }
    },

    logError: function(msg) {
        if (Ext.isDefined(Ext.global.console)) {
            Ext.global.console.error("[" + this.$className + "] " + msg);
        }
    }
});
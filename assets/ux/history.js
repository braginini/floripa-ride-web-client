Ext.override(Ext.util.History,{

    html5Mode: true,
    states: null,
    currentState: null,
    basePath: null,
    hashPrefix: '',


    init: function() {
        var l = window.location;
        if (!this.basePath) {
            var baseEl = document.getElementsByTagName('base');
            if (baseEl && baseEl.length) {
                this.basePath = baseEl[0].getAttribute('href');
            } else {
                this.basePath = l.pathname.substring(0, l.pathname.length - (l.search.length + l.hash.length));
            }

            if (Ext.String.endsWith(this.basePath, '/')) {
                this.basePath = this.basePath.slice(0,-1);
            }
        }

        this.html5Mode = this.html5Mode && !!(window.history && window.history.pushState);

        if (this.html5Mode) {
            Ext.fly(window).on('popstate', function(e) {
                this.handleStateChangeBuffered(this.getToken(), e.browserEvent.state);
            }, this);
        } else {
            this.states = new Ext.util.MixedCollection();
            this.callOverridden();
        }

        this.handleStateChangeBuffered = Ext.Function.createBuffered(function(token, data) {
            this.currentToken = token;
            this.currentState = data;
            this.fireEvent('change', token, data);
        }, 50, this);
    },

    startUp: function() {
        this.callOverridden();
        if (this.hashPrefix && this.currentToken && Ext.String.startsWith(this.currentToken, this.hashPrefix)) {
            this.currentToken = this.currentToken.substring(this.hashPrefix.length);
        }
    },

    setHtml5Mode: function(mode) {
        this.html5Mode = mode;
    },

    handleStateChange: function(token) {
        this.currentToken = this.hashPrefix && Ext.String.startsWith(token,this.hashPrefix) ?
            token.substring(this.hashPrefix.length) : token;
        this.fireEvent('change', this.currentToken, this.states.get(token));
    },

    getHash: function() {
        var href = window.location.href,
            i = href.indexOf("#" + this.hashPrefix);

        return i >= 0 ? href.substr(i + 1) : null;
    },

    setHash: function (hash) {
        var me = this,
            win = me.useTopWindow ? window.top : window;
        try {
            win.location.hash = this.hashPrefix + hash;
        } catch (e) {
            // IE can give Access Denied (esp. in popup windows)
        }
    },

    getToken: function() {
        if (this.html5Mode) {
            return window.location.pathname.substring(this.basePath.length);
        } else {
            return this.callOverridden();
        }
    },

    getState: function() {
        if (this.html5Mode) {
            return this.currentState;
        } else {
            return this.states.get(this.getToken());
        }
    },

    add: function (token, preventDup) {
        if (this.html5Mode) {
            this.pushState(null, null, token);
        } else {
            this.callOverridden(arguments);
        }
    },

    addToken: function (token, data) {
        if (this.html5Mode) {
            this.pushState(data, null, token);
        } else {
            this.states.add(token, data);
            Ext.util.History.add.call(this, token, true);
        }
    },

    pushState: function(data, title, url) {
        url = url || '';
        url = url.replace(this.basePath, '');
        if (this.html5Mode) {
            url = this.basePath + url;
            if (window.location.pathname === url) {
                window.history.replaceState(data, title , url);
            } else {
                window.history.pushState(data, title , url);
            }
            this.handleStateChangeBuffered(url, data);
        } else {
            this.states.add(url, data);
            Ext.util.History.add.call(this, url, true);
        }
    }
});
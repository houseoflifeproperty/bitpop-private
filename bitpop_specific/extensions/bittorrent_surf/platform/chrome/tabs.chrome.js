define([
	'require',
    'events',
    'router',
    'observer',
    'underscore',
	'config'
], function ( require ) {

	var _         = require('underscore'),
        Events    = require('events'),
        Router    = require('router'),
        Observer  = require('observer'),
        config    = require('config'),
		my 	      = {};


//tabs module needs to manage all open tabs
//can possibly be common between browsers
//with a specific way to load the tab from a browser specific shim
    var tabs = {},
        active_tab = null;


    //Private methods
    var initialize = function () {
            //create instances for any open tabs
            chrome.tabs.query( {}, function ( tabs ) {
                console.error('GOT ALL TABS', tabs);
                _.each( tabs, make );
            });

            //and make an instance any time a new one opens
            chrome.tabs.onCreated.addListener( make );
            //listen for remove
            chrome.tabs.onRemoved.addListener( on_removed );
            //listen for update
            chrome.tabs.onUpdated.addListener( on_updated );
            //listen for activated
            chrome.tabs.onActivated.addListener( on_activated );

            //listen for port connections from injected scripts
            chrome.extension.onConnect.addListener( inject_port_connector );

            Router.on( Events.LOAD_TABS, on_load );
            Router.on( Events.INJECT, on_inject );
            Router.on( Events.OPEN, on_open_tab );
            //Tabs.on('open', make );
        },

        observer = Observer.load('tabs'),

        //creates a new ext tab instance from firefox's tab object and sets listeners
        make = function ( chrome_tab ) {
            return new Tab( chrome_tab );
        },

        on_open_tab = function ( msg ) {
            open.apply( this, msg.data );
        },

        open = function ( url, current, active ) {
            console.error('tab open in core', url, current, active );

            if ( current ) {
                // this command will keep the popup open,
                // and will just send the current active browser tab
                // to the link.
                chrome.tabs.query({
                    currentWindow: true,
                    active: true
                }, function ( tab ){
                    chrome.tabs.update( tab.id, { url: url });
                });   
            } else {
                chrome.tabs.create({ 
                    url: url,
                    active: !!active
                });
            }
        },

        //sandboxes call in for all known tabs when they initialize tabs module
        on_load = function ( msg ) {
            console.log('tabs.on_load core', JSON.stringify( _.toArray( arguments ) ) );

            var payload = [];
            _.each( tabs, function ( tab, id ) {
                payload.push( tab.to_JSON() );
            });

            //console.log('tabs on load payload to send: ', JSON.stringify( payload, null, 4 ) );
            Router.send( msg.worker, Events.LOAD_TABS, payload );
        },

        //callback for chrome.tabs.onActivated
        on_activated = function ( activeInfo ) {
            console.log('tab activated', JSON.stringify( activeInfo, null, 4 ) );

            var tab = get( activeInfo.tabId );
            if ( tab ) {
                tab.activated();
            } else {
                console.error('trying to activate tab that doesn\'t exist in module', activeInfo.tabId );
            }
        },

        on_updated = function ( tabId, changeInfo, chrome_tab ) {
            console.log('tab updated', tabId, JSON.stringify( changeInfo, null, 4 ) );

            var tab = get( tabId );
            if ( tab ) {
                tab.updated( chrome_tab );
            } else {
                console.error('trying to update tab that doesn\'t exist in module', tabId );
            }
        },

        //callback for chrome.tabs.onRemoved
        on_removed = function ( tabId, removeInfo ) {
            console.log( 'tab removed', tabId, JSON.stringify( removeInfo, null, 4 ) );

            var tab = get( tabId );
            if ( tab ) {
                tab.removed();
            } else {
                console.error('trying to remove tab that doesn\'t exist in module', tabId );
            }
        },

        //returns tab by tabId
        get = function ( id ) {
            return tabs[ id ];
        },

        set_active = function ( tab ) {
            active_tab = tab;
            observer.trigger('active', tab.id);
        },

        on_inject = function ( msg ) {
            console.log('core on_inject', msg );

            var worker = msg.worker,
                id = msg.data.id,
                src = msg.data.src,
                tab = get( id );

            if ( tab ) {
                tab.inject( src, worker );
            } else {
                console.error('trying to inject into tab that doesn\'t exist: ', id );
            }
        },

        inject_port_connector = function ( port ) {
            //injected scripts connect to port with 'tab_' prefix, 
            //followed by tab id, followed by worker that initiated injection
            if ( port.name.indexOf('tab_') === 0 ) {
                var params = port.name.split('_'),
                    id = params[1],
                    target = params[2];

                //console.log('tab port connected', port, params, id, target);

                //connect port to the router
                // XXX - right now, the injected scripts don't have any common message listeneers
                //       can build that in the future...
                Router.connect( port.name, port, function( worker, msg ) {
                    worker.postMessage( msg );
                });

                port.onMessage.addListener( function ( payload, _port ) {
                    console.log('got message from tab inject', payload );
                    var msg = {
                        worker: port.name,
                        target: target,
                        key:    payload.key,
                        data:   payload.data
                    };
                    Router.route( msg );
                });

                port.onDisconnect.addListener( function () {
                    Router.disconnect( port.name );
                });
            }
        };



    // //temporary logging fn
    // var log_tab = function ( tab ) {
    //     console.log('# of tabs', _.keys( tabs ).length )
    //     _.each( tab, function ( val, key ) {
    //         if ( !_.isFunction( val ) )
    //             console.log( key, ': ', val );
    //     });                
    // }



    //Instance constructor
    var Tab = function ( chrome_tab ) {
        //store the tab object
        this.tab = chrome_tab;

        //set the id
        this.id = this.tab.id;
        //keep track of this instance in the tabs object
        tabs[ this.id ] = this;

        //tell any listening sandboxes that a new tab has been created
        observer.trigger('create', this.to_JSON() );

        //debugging.  can remove
        console.log('new Tab: tab opened, instance created', this.id, this.get_url() );
    };

    Tab.prototype = {
        inject: function ( src, worker ) {
            console.log('tab instance inject', { src: src, worker: worker } );

            chrome.tabs.executeScript( this.id, {
                code: this.wrap_script( src, worker ),
                runAt: 'document_end'
            });
        },

        wrap_script: function ( source, worker ) {
            //wraps a content script with a browser specific Message.send function
            var name = 'tab_'+this.id+'_'+worker;
            return [
                "(function(){",
                    "var Port = chrome.extension.connect({name:'"+name+"'});",
                    'var Message = {send:function(key,pload){',
                        "Port.postMessage({key:key,data:pload});",
                    '}};',
                    source,
                '})();'
            ].join('');
        },

        to_JSON: function () {
            return {
                id: this.id,
                title: this.get_title(),
                url: this.get_url(),
                favicon: this.get_favicon()
            }
        },

        //close so we can remove it from the tabs object
        removed: function () {
            this.cleanup();
        },

        updated: function ( chrome_tab ) {
            this.tab = chrome_tab;
            observer.trigger( 'update', this.to_JSON() );
            if ( this.tab.status === 'complete' ) {
                observer.trigger('ready', this.id);
            }
            //console.log( 'updated tab', this.tab.url, this.tab.status );
        },

        //activate so we can keep track of the current tab
        activated: function () {
            //activate it?
            set_active( this );
        },
        //ready so we can listen and inject scripts?
        on_ready: function () {
            observer.trigger('ready', this.id);
        },

        get_url: function () {
            return this.tab.url
        },

        get_title: function () {
            return this.tab.title;
        },

        get_favicon: function () {
            return this.tab.favIconUrl;
        },

        cleanup: function () {
            //tell any listening sandboxes that a new tab has been destroyed
            observer.trigger( 'remove', this.to_JSON() );

            if ( active_tab === this ) {
                active_tab = null;
            }

            delete tabs[ this.id ];
        }
    };

//ok. idea is this.
// in chrome, if we want to make an 'extension tab',
// we load up /tabs/chrome/tab.chrome.html
// it generates an iframe that comes from the sandboxed 
// app folder and passes messages back and forth
// the port connector in that module needs to be really smart to manage multiple tab pages opened.....


    //module self-inits
    initialize();

	//Public methods
	_.extend( my, {
        open: open
		//init:       initialize
	});

	return my;

});
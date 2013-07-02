/*jshint white:false, camelcase:false */
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
        tabs_ct = 0,
        active_tab = null;

	//Private methods
	var initialize = function () {
            //called from loader module.  manifest passed in from there
    		console.error('initialize core tab_pages', config );

            setTimeout( function () {
                console.log('oh hello tabs');
            }, 5000 );

            //create instances for any open tabs
            _.each( Tabs.activeTab.window.tabs, make );
            //and make an instance any time a new one opens
            Tabs.on('open', make );

            Router.on( Events.LOAD_TABS, on_load );
            Router.on( Events.INJECT, on_inject );
            Router.on( Events.OPEN, on_open_tab );

        },

        observer = Observer.load('tabs'),

        //creates a new ext tab instance from firefox's tab object and sets listeners
        make = function ( ff_tab ) {
            console.log('MAKE... ie OPENED');
            return new Tab( ff_tab );
        },

        on_open_tab = function ( msg ) {
            open.apply( this, msg.data );
        },

        open = function ( url, current, active ) {
            console.error('tab open in core', url, current );

            if ( typeof active === 'undefined' ) {
                active = true;
            }

            if ( current ) {
                Tabs.activeTab.url = url;
            } else {
                //opens in new tab
                Tabs.open({
                    url: url,
                    inBackground: !active
                });
            }
        },

        // //allows me to inject listeners for opened tabs so i can pass messages back and forth
        // open_with_listeners = function () {

        // },

        on_load = function ( msg ) {
            console.log('tabs.on_load core', JSON.stringify( _.toArray( arguments ) ) );

            var payload = [];
            _.each( tabs, function ( tab, id ) {
                payload.push( tab.to_JSON() );
            });

            console.log('tabs on load payload to send: ', JSON.stringify( payload, null, 4 ) );

            Router.send( msg.worker, Events.LOAD_TABS, payload );
        },

        set_active = function ( tab ) {
            active_tab = tab;
            observer.trigger('active', tab.id);
        },

        get = function ( id ) {
            return tabs[ id ];
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
        };



    //temporary logging fn
    // var log_tab = function ( tab ) {
    //     console.log('# of tabs', _.keys( tabs ).length );
    //     _.each( tab, function ( val, key ) {
    //         if ( !_.isFunction( val ) )
    //             console.log( key, ': ', val );
    //         else
    //             console.log( key, ': ', typeof val );
    //     });                
    // }



    //Instance constructor
    var Tab = function ( ff_tab ) {
        console.log('new Tab', ff_tab);

        //store the tab object
        this.tab = ff_tab;

        //set the id
        this.id = tabs_ct;
        //increment count for the next one
        tabs_ct++;
        //keep track of this instance in the tabs object
        tabs[ this.id ] = this;

        //holds any attached script page-mod workers
        this.mod = null;

        //debugging.  can remove
        console.log('');
        console.log('tab opened, instance created', this.id);

        //tell any listening sandboxes that a new tab has been created
        observer.trigger('create', this.to_JSON() );

        //bind listeners
        ff_tab.on('close', _.bind( this.on_close, this ) );
        ff_tab.on('ready', _.bind( this.on_ready, this ) );
        ff_tab.on('activate', _.bind( this.on_activate, this ) );
        //tab.on('deactiavte', _.bind( this.on_deactivate, this ) );
    };

    Tab.prototype = {
        to_JSON: function () {
            return {
                id: this.id,
                title: this.get_title(),
                url: this.get_url(),
                favicon: this.get_favicon()
            }
        },

        //destroys any mage-mod workers created when scripts are injected/attached, 
        //  and fires disconnect call to router for this connected tab injected worker
        cleanup_injections: function () {
            //kill any previously detached page workers
            if ( this.mod ) {
                Router.disconnect( this.mod.name );
                this.mod.worker.destroy();
                this.mod = null;
            // } else {
            //     console.log('no injections to cleanup');
            }
        },

        inject: function ( src, worker ) {
            var name = 'tab_'+this.id+'_'+worker, //follows the chrome port name for my own arbitrary reason
                that = this;

            //only allow one script injected at a time
            // why?  because I am worried about having too many page workers not properly cleaned up and thus leaking memory
            // this is really just paranoia:  http://www.youtube.com/watch?v=rpRiSb_Ir-s
            this.cleanup_injections();

            this.mod = {
                name: name,
                worker: this.tab.attach({
                    contentScriptWhen: 'ready',
                    contentScript: this.wrap_script( src ),
                    // onDetach: function () {
                    //     console.error('WORKER ON DETACH', this);
                    //     //gets called on worker.destroy and when the tab itself is closed
                    //     // supposed to be called when location changes, but isn't, so I have the this.cleanup_injections scattered around
                    //     setTimeout( function () {
                    //         that.cleanup_injections();
                    //     }, 0 );
                    // },
                    onMessage: function ( payload ) {
                        //payload comes in with .key and .data
                        //add the worker and target
                        payload.worker = name;
                        payload.target = worker; //the sandboxed worker that initiated the inject

                        console.log('got payload from injected script', JSON.stringify( payload, null, 4 ) );

                        Router.route( payload );
                    }
                })
            };

            //connect it.  disconnect happens in this.cleanup_injections
            //  XXX - right now there is no real way elsewhere in the extension to message into the injected script.
            //        could solve that by providing name of source worker of message in the Message.on(... ) callback function in the sandbox.
            //        would also need a listener in the injected worker scripts.
            //        basically this is superfluous right now, but should stay in for infrastructure improvements in the future.
            Router.connect( this.mod.name, this.mod.worker, function ( worker, msg ){
                worker.postMessage( msg );
            });

            //console.error('core tab inject', this.mod.worker, this.id, worker, src );
        },

        wrap_script: function ( source ) {
            //wraps a content script with a browser specific Message.send function
            //var name = 'tab_'+this.id+'_'+worker;
            return [
                "(function(){",
                    'var Message = {send:function(key,pload){',
                        "self.postMessage({key:key,data:pload});",
                    '}};',
                    source,
                '})();'
            ].join('');
        },

        //close so we can remove it from the tabs object
        on_close: function ( ff_tab ) {
                // console.log('');
                // console.log('tab closed', this.id, ff_tab );

            this.cleanup();
        },
        //ready so we can listen and inject scripts?
        on_ready: function ( ff_tab ) {
            //update and send updates to listening sandboxes
            this.update( ff_tab );
            //kill any previously detached page workers
            this.cleanup_injections();
            //tell listening sandboxes that this tab is ready
            observer.trigger('ready', this.id);

                // console.log('');
                // console.log('tab ready', this.id, this.tab );
        },
        //activate so we can keep track of the current tab
        on_activate: function ( ff_tab ) {
            //send update to listening sandboxes
            this.update( ff_tab );
            //activate it?
            set_active( this );

                // console.log('');
                // console.log('tab activated', this.id, this.tab );
                //log_tab( this.tab );
        },

        //send updated data to listening sandboxes
        update: function ( ff_tab ) {
            this.tab = ff_tab;
            observer.trigger( 'update', this.to_JSON() );
        },

        get_url: function () {
            return this.tab.url;
        },

        get_title: function () {
            return this.tab.title;
        },

        get_favicon: function () {
            return this.tab.favicon;
        },

        cleanup: function () {
            //tell any listening sandboxes that a new tab has been destroyed
            //try / catch around the observer trigger, because exceptions are thrown when extension is shutting down.
            try {
                observer.trigger( 'remove', this.to_JSON() );
            } catch ( ex ) {}

            this.cleanup_injections();

            if ( active_tab === this ) {
                active_tab = null;
            }
            delete tabs[ this.id ];
        }
    };

    //module self-inits
    initialize();

	//Public methods
	_.extend( my, {
        open: open
		//init:       initialize
	});

	return my;

});
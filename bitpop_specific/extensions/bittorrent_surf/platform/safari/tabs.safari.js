// console.error('CLEARING LOCAL STORAGE... YOU BETTER DELETE THIS WHEN YOU ARE DONE DEVELOPING');
// localStorage.clear();

define([
	'require',
    'events',
    'router',
    'observer',
    'underscore',
    'loader',
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
    		//create instances for any open tabs
    		_.each( safari.application.browserWindows, function ( browser_window ) {
    			_.each( browser_window.tabs, make );
    		});

    		//Injects messaging shim into EVERY tab.
    		//if a worker wants to inject script into the tab, then it is this pre-injected code
    		//that recieves it and evals it.
            add_injector_script();

            //and make an instance any time a new one opens
			safari.application.addEventListener( 'open', function ( e ) {
                //open gets fired for new windows as well, so check on that.
                if ( e.target instanceof SafariBrowserTab ) {
                    make( e.target ); //e.target === SafariBrowserTab
                }
    		}, true);

            Router.on( Events.LOAD_TABS, on_load );
            Router.on( Events.INJECT, on_inject );
            Router.on( Events.OPEN, on_open_tab );
        },

        //idea.  inject a script into every page to trigger ready event
        add_injector_script = function () {
            console.log('add fake content script');
            //DOMString addContentScript (in DOMString source, in array whitelist, in array blacklist, in boolean runAtEnd);
            safari.extension.addContentScriptFromURL(
            	safari.extension.baseURI + 'platform/safari/tabs.injector.safari.js',
            	//whitelist
            	// ['http://*/*', 'https://*/*', safari.extension.baseURI+'*/*' ],
            	['http://*/*', 'https://*/*', 'safari-extension://*/*' ],
            	//blacklist
            	[],
            	//run at end ( false === run on DOM is ready, true = page has completely loaded )
            	true
            );
        },


        observer = Observer.load('tabs'),

        //creates a new ext tab instance from firefox's tab object and sets listeners
        make = function ( safari_tab ) {
            return new Tab( safari_tab );
        },

        on_open_tab = function ( msg ) {
            open.apply( this, msg.data );
        },

        open = function ( url, current, active ) {
        	var tab;

            console.error('tab open in core', url, current, active );

            if ( current ) {
                // this command will keep the popup open,
                // and will just send the current active browser tab
                // to the link.
            	var tab = safari.application.activeBrowserWindow.activeTab;
     
            } else {
   				//popup window still stays open.  no active logic needed
                var tab = safari.application.activeBrowserWindow.openTab();

                //need logic to set it to active or not?  --don't think so

            }

            tab.url = url;

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
        // },

        // inject_port_connector = function ( port ) {
        //     //injected scripts connect to port with 'tab_' prefix, 
        //     //followed by tab id, followed by worker that initiated injection
        //     if ( port.name.indexOf('tab_') === 0 ) {
        //         var params = port.name.split('_'),
        //             id = params[1],
        //             target = params[2];

        //         //console.log('tab port connected', port, params, id, target);

        //         //connect port to the router
        //         // XXX - right now, the injected scripts don't have any common message listeneers
        //         //       can build that in the future...
        //         Router.connect( port.name, port, function( worker, msg ) {
        //             worker.postMessage( msg );
        //         });

        //         port.onMessage.addListener( function ( payload, _port ) {
        //             console.log('got message from tab inject', payload );
        //             var msg = {
        //                 worker: port.name,
        //                 target: target,
        //                 key:    payload.key,
        //                 data:   payload.data
        //             };
        //             Router.route( msg );
        //         });

        //         port.onDisconnect.addListener( function () {
        //             Router.disconnect( port.name );
        //         });
        //     }
        };

    //Instance constructor
    var Tab = function ( safari_tab ) {
        //store the tab object
        this.tab = safari_tab;

        //set the id
        this.id = tabs_ct;
        this._worker_name = 'tab_'+this.id;

        //increment tabs_ct for the next one
        tabs_ct++;

        //keep track of this instance in the tabs object
        tabs[ this.id ] = this;

        //connect the tab to the router for messaging
        this.connect();

        //tell any listening sandboxes that a new tab has been created
        observer.trigger('create', this.to_JSON() );

        //debugging.  can remove
        console.log('new Tab: tab opened, instance created', this.id, this.get_url(), this.tab );

        //bind listeners
        safari_tab.addEventListener('close', _.bind( this.on_close, this ) );
        safari_tab.addEventListener('navigate', _.bind( this.on_navigate, this ) );
        safari_tab.addEventListener('activate', _.bind( this.on_activate, this ) );
        safari_tab.addEventListener('message', _.bind( this.on_message, this ) );
    };

    Tab.prototype = {

    	connect: function () {
			Router.connect( this._worker_name, this.tab.page, function ( worker, msg ) {
				console.error('posting message to ', worker, msg );
				worker.dispatchMessage('tab', msg);
			});    		
    	},

    	on_message: function ( e ) {
    		// //fire ready if it is the special ready call
    		// if ( e.name === 'ready' ) {
    		// 	// fake trigger a ready event
    		// 	//this.on_ready();
    		// } else
    		if ( e.name === 'msg' ) {
    			console.error('got some other message from tab', e, e.name, e.message);
    			//make the source the same as what is connected in the router
    			e.message.worker = this._worker_name;
    			Router.route( e.message );
    		}
    	},

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
            //disconnect the tab
            Router.disconnect( this._worker_name );
        },

        inject: function ( src, worker ) {
            var name = 'tab_'+this.id+'_'+worker, //follows the chrome port name for my own arbitrary reason
                that = this;

            console.error('inject in tab ', this._worker_name, this.id, { src: src, worker: worker });
 
            Router.send( this._worker_name, 'inject', this.wrap_script( src, worker ) );


            //only allow one script injected at a time
            // why?  because I am worried about having too many page workers not properly cleaned up and thus leaking memory
            // this is really just paranoia:  http://www.youtube.com/watch?v=rpRiSb_Ir-s
            // this.cleanup_injections();

            // this.mod = {
            //     name: name,
            //     worker: this.tab.attach({
            //         contentScriptWhen: 'ready',
            //         contentScript: this.wrap_script( src ),
            //         // onDetach: function () {
            //         //     console.error('WORKER ON DETACH', this);
            //         //     //gets called on worker.destroy and when the tab itself is closed
            //         //     // supposed to be called when location changes, but isn't, so I have the this.cleanup_injections scattered around
            //         //     setTimeout( function () {
            //         //         that.cleanup_injections();
            //         //     }, 0 );
            //         // },
            //         onMessage: function ( payload ) {
            //             //payload comes in with .key and .data
            //             //add the worker and target
            //             payload.worker = name;
            //             payload.target = worker; //the sandboxed worker that initiated the inject

            //             console.log('got payload from injected script', JSON.stringify( payload, null, 4 ) );

            //             Router.route( payload );
            //         }
            //     })
            // };

            //connect it.  disconnect happens in this.cleanup_injections
            //  XXX - right now there is no real way elsewhere in the extension to message into the injected script.
            //        could solve that by providing name of source worker of message in the Message.on(... ) callback function in the sandbox.
            //        would also need a listener in the injected worker scripts.
            //        basically this is superfluous right now, but should stay in for infrastructure improvements in the future.
            // Router.connect( this.mod.name, this.mod.worker, function ( worker, msg ){
            //     worker.postMessage( msg );
            // });

            //console.error('core tab inject', this.mod.worker, this.id, worker, src );
        },

        //worker is the worker where the inject call came from
        wrap_script: function ( source, worker ) {
            //wraps a content script with a browser specific Message.send function
            //var name = 'tab_'+this.id+'_'+worker;
            return [
                "(function(){",
                    "var Message = {",
                    	"on:_Message.on,",
                    	"send:function(key,data,target){",
                    		"target=target||'"+worker+"';",
                    		"_Message.send(key,data,target);",
                    	"}",
                    "};",
                    source,
                '})();'
            ].join('');
        },

        //close so we can remove it from the tabs object
        on_close: function ( e ) {
        	var safari_tab = e.target;
                // console.log('');
                // console.log('tab closed', this.id, ff_tab );
        	console.error('on_close', e, safari_tab);

            this.cleanup();
        },


        //ready so we can listen and inject scripts?
        on_navigate: function ( e ) {
        	var safari_tab = e.target;
        	console.error('on_navigate', safari_tab);
            //update and send updates to listening sandboxes
            this.update( safari_tab );

            this.on_ready();

            // //tell listening sandboxes that this tab is ready
            // observer.trigger('ready', this.id);

                // console.log('');
                // console.log('tab ready', this.id, this.tab );
        },

        //ready so we can listen and inject scripts?
        on_ready: function () {
            //tell listening sandboxes that this tab is ready
            observer.trigger('ready', this.id);
        },
        //activate so we can keep track of the current tab
        on_activate: function ( e ) {
        	var safari_tab = e.target;
        	console.error('on_activate', safari_tab);
            //send update to listening sandboxes
            this.update( safari_tab );
            //activate it?
            set_active( this );

                // console.log('');
                // console.log('tab activated', this.id, this.tab );
                //log_tab( this.tab );
        },

        //send updated data to listening sandboxes
        update: function ( safari_tab ) {
            this.tab = safari_tab;
            observer.trigger( 'update', this.to_JSON() );
        },

        get_url: function () {
            return this.tab.url;
        },

        get_title: function () {
            return this.tab.title;
        },

        get_favicon: function () {
            return null;
            // return this.tab.favicon;
        },

        cleanup: function () {
            //tell any listening sandboxes that a new tab has been destroyed
            observer.trigger( 'remove', this.to_JSON() );

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
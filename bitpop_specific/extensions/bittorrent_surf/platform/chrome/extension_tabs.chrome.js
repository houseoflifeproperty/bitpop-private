define([
	'require',
    'events',
    'router',
    'observer',
    'underscore',
    'tabs',
	'config'
], function ( require ) {

	var _         = require('underscore'),
        Events    = require('events'),
        Router    = require('router'),
        Observer  = require('observer'),
        Tabs      = require('tabs'),
        config    = require('config'),
        manifest  = null,
		my 	      = {};

	//Private methods
	var initialize = function ( _manifest ) {
            //called from loader module.  manifest passed in from there
    		console.error('initialize core extension tabs', _manifest, config );

            manifest = _manifest;

            //listen for port connections
            chrome.extension.onConnect.addListener( port_connector );

            //listen for open commands from sandboxes
            Router.on( Events.OPEN_EXT_TAB, on_open );

            //temporary open command while developing
            // open({
            //     name: 'tmp',
            //     foo: 'bar'
            // });
        },

        port_connector = function ( port ) {
            //injected scripts connect to port with 'tab_' prefix, 
            //followed by tab id, followed by worker that initiated injection
            if ( port.name.indexOf('ext_') === 0 ) {
                // var params = port.name.split('_'),
                //     id = params[1],
                //     target = params[2];

                console.log('ext tab port connected', port );

                //connect port to the router
                Router.connect( port.name, port, function( worker, msg ) {
                    worker.postMessage( msg );
                });

                port.onMessage.addListener( function ( payload, _port ) {
                    //console.log('got message from ext tab', payload );
                    // var msg = {
                    //     worker: port.name,
                    //     target: target,
                    //     key:    payload.key,
                    //     data:   payload.data
                    // };
                    Router.route( payload );
                });

                port.onDisconnect.addListener( function () {
                    Router.disconnect( port.name );
                });
            }
        },

        //handler for open requests from sandboxes
        on_open = function ( msg ) {
            open.call( this, msg.data );
        },

        open = function ( opts ) {
            console.warn('open extension tab', name, opts);
            if ( !opts.name ) { return; }

            if ( manifest && ( (manifest.tabs && manifest.tabs[ opts.name ]) || (manifest.popup === opts.name) ) ) {
                var enc_opts = btoa( JSON.stringify( opts ) ),
                    src = 'tabs/chrome/tab.chrome.html?'+enc_opts;

                //console.warn('ext tab pre open', enc_opts, src);

                Tabs.open( src, false, true );

            } else {
                throw "extension tab not in manifest.  will not open";
            }
        };

//ok. idea is this.
// in chrome, if we want to make an 'extension tab',
// we load up /tabs/chrome/tab.chrome.html
// it generates an iframe that comes from the sandboxed 
// app folder and passes messages back and forth
// the port connector in that module needs to be really smart to manage multiple tab pages opened.....



	//Public methods
	_.extend( my, {
		init:       initialize,
        open:       open
	});

	return my;

});
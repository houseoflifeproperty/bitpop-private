define([
	'require',
	'helpers/functional',
    'events',
    'router',
    'observer',
    'underscore',
	'config'
], function ( require ) {

	var _bt       = require('helpers/functional'),
        _         = require('underscore'),
        Events    = require('events'),
        Router    = require('router'),
        Observer  = require('observer'),
        config    = require('config'),
		my 	      = {};

	//Private methods
	var initialize = function ( manifest ) {
            //called from loader module.  manifest passed in from there
    		console.error('initialize core popup', manifest, config );

            var icon_src;

            if ( manifest.icons ) {
                icon_src = 'app/' + manifest.icons.popup_default;
            } else {
                icon_src = 'lib/img/popup_default.png';
            }

            //set the popup page
            chrome.browserAction.setPopup({
                popup: 'popup/chrome/popup.chrome.html'
            });
    	
            set_icon( icon_src );

            if ( manifest.meta.fullName ) {
                set_title( manifest.meta.fullName );
            }

            chrome.extension.onConnect.addListener( port_connector );

            //bind_messages
            Router.on( Events.POPUP_SET, on_set );

        },

        on_set = function ( payload ) {
            console.log('on_set', payload);

            var k  = payload.data.k,
                v  = payload.data.v,
                fn = my[ 'set_' + k ];

            if ( _.isFunction( fn ) ) {
                fn( v );
            }
        },

        set_icon = function ( path ) {
            path = config.data_path + path;
            
            chrome.browserAction.setIcon({
                path: path
            });
        },

        set_title = function ( str ) {
            chrome.browserAction.setTitle({
                title: str
            });
        },

        port_connector = function ( port ) {
            console.log('port connector', port);

            if ( port.name === 'popup' ) {
                //this needs to be in application logic
                //Bt.msg.send( Bt.events.COUNT_INTERACTION, 'popup', 'ext' );
                
                //connect to the router
                Router.connect( port.name, port, function( worker, msg ){
                    //console.log('posting message to worker', msg.worker, msg.target, msg);
                    worker.postMessage( msg );
                });

                port.onMessage.addListener( function ( msg, _port ) {
                    //console.log('got popup port message', msg, _port );
                    Router.route( msg )
                });

                port.onDisconnect.addListener( function () {
                    //console.log('disconnect popup port');
                    Router.disconnect( port.name );
                    observer.trigger( 'close' );
                });

                //trigger popup open.
                observer.trigger( 'open' );
            }
        },

        observer = Observer.load('popup');


//temporary space to mess around with tabs stuff in chrome
// var t;
// chrome.tabs.create({
//     url: config.data_path + 'app/tmp/tmp.html',
//     active: true
// }, function ( tab ) {
//     // console.error('tab created', tab, tab.id);

//     // chrome.tabs.executeScript( tab.id, {
//     //     file: config.data_path + 'lib/require.js',
//     //     runAt: 'document_end'
//     // }, function () {
//     //     chrome.tabs.executeScript( tab.id, {
//     //         file: config.data_path + 'sandbox/boot.sandbox.js',
//     //         runAt: 'document_end'
//     //     });
//     // });

//         // <!--script type="text/javascript" src="../../lib/require.js"></script>
//         // <script type="text/javascript" src="../../sandbox/boot.sandbox.js"></script-->

// });

//ok. idea is this.
// in chrome, if we want to make an 'extension tab',
// we load up /tabs/chrome/tab.chrome.html
// it generates an iframe that comes from the sandboxed 
// app folder and passes messages back and forth
// the port connector in that module needs to be really smart to manage multiple tab pages opened.....



	//Public methods
	_bt.extend( my, {
		init:       initialize,
        set_icon:   set_icon,
        set_title:  set_title
	});

	return my;

});
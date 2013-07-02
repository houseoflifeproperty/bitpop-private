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
		my 	      = {},

        tabs      = {};  //keep track of the open tabs so we can close them as well

	//Private methods
	var initialize = function ( _manifest ) {
            //called from loader module.  manifest passed in from there
    		console.error('initialize core extension tabs', _manifest, config );

            manifest = _manifest;

            //listen for extension tabs opening, and attach the scripts to them
            PageMod.PageMod({
                include: [ self.data.url('tabs/firefox/*') ],
                contentScriptWhen: 'ready',
                contentScriptFile: [ 
                    //self.data.url('lib/require.js'),  //can't get paths to work right.  forget it.  I don't need no stinking require in this simple boot shiv.
                    self.data.url('tabs/firefox/boot.tab.firefox.js')
                ],
                //this is key to deal with the message passing.
                onAttach: on_attach
            });

            //listen for open commands from sandboxes
            Router.on( Events.OPEN_EXT_TAB, on_open );

            //temporary open command while developing
            // setTimeout( function () {
            //     open({
            //         name: 'tmp',
            //         foo: 'bar'
            //     });
            // }, 1000 );

        },

        on_attach = function ( worker ) {
            console.log('page mod ATTACHED!', worker );

            //attach message is the first thing to come in.
            //  should be safe to assing the name here so I can use
            //  it in the disconnect below
            var name;

            worker.on('message', function ( msg ) {
                console.log('attached msg', msg, arguments.length );

                if ( _.isString( msg ) ) {
                    name = msg;
                    //keep track of the worker so we can destroy it
                    tabs[ name ] = worker;
                    Router.connect( name, worker, function ( _worker, _msg ) {
                        _worker.postMessage( _msg );
                    });
                } else {
                    Router.route( msg );
                }
            });

            worker.on('detach', function () {
                on_detach( name );
            });
        },

        on_detach = function ( name ) {
            //remove from tabs
            delete tabs[ name ];
            //disconnect from router
            Router.disconnect( name );

            console.error('TAB WORKER DETACHED', name, JSON.stringify( _.keys( tabs ), null, 4 ) );
        },

        //handler for open requests from sandboxes
        on_open = function ( msg ) {
            open.call( this, msg.data );
        },

        open = function ( opts ) {
            console.error('open extension tab', opts.name, opts);
            if ( !opts.name ) { return; }

            if ( manifest && ( (manifest.tabs && manifest.tabs[ opts.name ]) || (manifest.popup === opts.name) ) ) {
                var enc_opts = btoa( JSON.stringify( opts ) ),
                    src = config.data_path + 'tabs/firefox/tab.firefox.html?'+enc_opts;

                console.error('ext tab pre open', enc_opts, src );

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
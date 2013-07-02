define([
	'require',
    'underscore',
    'events',
    'router',
    'observer',
	'config'
], function ( require ) {

	var _         = require('underscore'),
        Events    = require('events'),
        Router    = require('router'),
        Observer  = require('observer'),
        Loader    = null, //set in init
        config    = require('config'),
        button    = null, //set in init, toolbarbutton
        panel     = null, //set on open/load, uses addon-sdk Panel
		my 	      = {};

	//Private methods
	var initialize = function ( manifest, loader ) {
            Loader = loader;

            //called from loader module.  manifest passed in from there
            var panel_src = self.data.url('app/' + manifest.popup + '/' + manifest.popup + '.html' ),
                icon_src;


            if ( manifest.icons ) {
                icon_src = 'app/' + manifest.icons.popup_default;
            } else {
                icon_src = 'lib/img/popup_default.png';
            }

            console.error('initialize core popup', panel_src, manifest, config );

            button = TBB.ToolbarButton({
                id:     'TBB',
                label:  'TBB',
                image:  self.data.url( icon_src ),
                onCommand: function () {
                    //set the panel
                    set_popup( panel_src );                    
                    console.log('tbb on command');
                }
            });

            //places the button on the nav bar
            button.moveTo({
              toolbarID: "nav-bar",
              forceMove: false // only move from palette
            });

            //bind messages
            Router.on( Events.POPUP_SET, on_set );
            Router.on( Events.RESIZE, on_resize );


        },

        on_resize = function ( msg ) {
            if ( panel ) {
                //panel.resize( msg.data.width - 1, msg.data.height );
                panel.resize( msg.data.width + 2, msg.data.height + 2 );
            } else {
                console.error('got resize command, but there is no panel to resize...  should not happen');
            }
        },

        on_set = function ( msg ) {
            console.log('on_set', msg);

            var k  = msg.data.k,
                v  = msg.data.v,
                fn = my[ 'set_' + k ];

            if ( _.isFunction( fn ) ) {
                fn( v );
            }
        },

        set_icon = function ( path ) {
            path = config.data_path + path;
            console.log('set_icon', path);

            button.setIcon({
                url: path
            });
        },

        set_popup = function ( path ) {
            console.log('set_popup', path );

            if ( !panel ) {
                panel = new Panel.Panel({
                    width: 400,
                    height: 1,
                    contentURL: path, //local var: String
                    onMessage:  Router.route, //external module public method
                    onShow:     open, //local method
                    onHide:     close //local method
                });

                Loader.set( 'popup', panel );

                button.setPanel( panel );

            } else {
                throw "panel already set.  should be closed and deleted before resetting";
            }

        },

        open = function () {
            console.log('open popup');
            observer.trigger('open');
        },

        close = function () {
            console.log('close popup');
            Router.disconnect( 'popup' );
            Loader.remove( 'popup' );
            panel.destroy();
            panel = null;
            observer.trigger( 'close' );
        },

        observer = Observer.load('popup');

	//Public methods
	_.extend( my, {
		init:     initialize,
        set_icon: set_icon
	});

	return my;

});
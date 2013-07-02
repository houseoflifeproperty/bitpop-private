define([
    'require',
    'underscore',
    'events',
    'router',
    'observer',
    'config'
], function () { 

    var _           = require('underscore'),
        Events      = require('events'),
        Router      = require('router'),
        Observer    = require('observer'),
        config      = require('config'),
        Loader,
        //reference to the toolbar button, set in init
        tbb,
        popup_name,
        icon_src,
        popover,
        my = {}; //holds the popup frame

    //set some variables outside of init method
    //find and reference the toolbar button to start so we can attach a plugin worker to it.
    //this 'toolbarbutton' is built into the info.plist, and if there is no popup in bt.manifest,
    //then this won't exist cause build/safari.py won't put it in there.  if you are tracking that bug,
    //then I apologize, but at least you know where it is now....
    for ( var i=0, len=safari.extension.toolbarItems.length; i<len; i++ ) {
        if ( safari.extension.toolbarItems[ i ].identifier === "toolbarbutton" ) {
            tbb = safari.extension.toolbarItems[ i ];
            break;
        }
    }

    var initialize = function ( manifest, loader ) {
            console.error( 'safari popup initialize', tbb, manifest, loader, loader.get() );

            Loader = loader;

            //store the popup path from the manifest
            popup_name = manifest.popup;

            //listen for clicks on the toolbar button
            safari.application.addEventListener( 'command', function ( e ){
                console.error('GOT COMMAND', arguments, tbb);

                if ( e.command === 'toolbarbutton' ) {
                    //set the tbb to this specific item that the user clicked.
                    //each toolbar item has it's own instance in every safari window
                    tbb = e.target;
                    open();
                }

            }, false );

            //listen for disconnect event coming from window blur
            Router.on( Events.DISCONNECT, function ( msg ) {
                console.error('events.disconnect', msg, msg.worker);
                //sanity condition that this is really from the popup
                if ( msg.worker === popup_name ) {
                    close()
                }
            });

            //listen for resize events coming in
            Router.on( Events.RESIZE, _.throttle( on_resize, 150 ) ); //throttle it because safari animates the resizing to disgusting effects.

            Router.on( Events.POPUP_SET, on_set );

            observer.on('show', open);

            console.log('tbb', tbb);

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
            //console.log('set_icon', path);
            set_button_property( 'image', path );
        },

        set_title = function ( str ) {
            set_button_property( 'toolTip', str );
        },

        //loop through all current toolbarItems, and set the icon on each of them ( could be multiple windows )
        set_button_property = function ( prop, str ) {
            //console.log('set_button_property', prop, str );
            for ( var i=0, len=safari.extension.toolbarItems.length; i<len; i++ ) {
                if ( safari.extension.toolbarItems[ i ].identifier === "toolbarbutton" ) {
                    safari.extension.toolbarItems[ i ][ prop ] = str;
                }
            }
        },

        on_resize = function ( msg ) {
            //sanity condition that this is really from the popup
            if ( msg.worker === popup_name && popover && msg.data.height > 30 ) {
                console.log('RESIZE', msg.data.height);
                popover.height = msg.data.height;
                popover.width = msg.data.width;
            }            
        },

        open = function () {
            console.log('open popup', popover);

            if ( !popover || ( tbb.popover && tbb.popover !== popover ) ) {

                var encoded_opts = btoa( JSON.stringify({
                    // name: popup_name
                    popover: true
                }) );

                popover = safari.extension.createPopover(
                    popup_name,
                    // popup_path,
                    // safari.extension.baseURI + 'popup/safari/popup.safari.html?'+encoded_opts,
                    safari.extension.baseURI + 'app/'+popup_name+'/'+popup_name+'.html?'+encoded_opts,
                    490, //width
                    0 //height
                );

                //set the popover to the toolbar button
                tbb.popover = popover;
                //let the loader have it to route messages to it
                Loader.set( popup_name, popover );
                //show it
                tbb.showPopover();
                //tell scaffold that popup has opened
                observer.trigger('open');

                return popover;
            } else {
                console.error('I don\'t think we should hit this...');
                close();
                //return open();
            }
        },

        close = function () {
            console.log('close popup', popover);
            Router.disconnect( popup_name );
            Loader.remove( popup_name );
            tbb.popover = null;
            safari.extension.removePopover( popup_name );
            popover = null;
        },

        get_tbb = function () {
            return tbb;
        },

        observer = Observer.load('popup');

    //PUBLIC METHODS
    _.extend( my, {
        init: initialize,
        get_tbb: get_tbb,
        set_icon: set_icon,
        set_title: set_title
    }); 

    return my;
});
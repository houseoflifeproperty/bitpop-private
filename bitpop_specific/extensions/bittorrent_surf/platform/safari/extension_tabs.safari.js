define([
    'require',
    'events',
    'router',
    'underscore',
    'tabs'
], function ( require ) {

    var _         = require('underscore'),
        Events    = require('events'),
        Router    = require('router'),
        Tabs      = require('tabs'),
        manifest  = null,
        my        = {};

    //Private methods
    var initialize = function ( _manifest ) {
            //called from loader module.  manifest passed in from there
            console.error('initialize core extension tabs', _manifest );

            manifest = _manifest;

            //listen for open commands from sandboxes
            Router.on( Events.OPEN_EXT_TAB, on_open );

            // temporary open command while developing
            // setTimeout( function () {
            //     open({
            //         "name": "popup",
            //         "foo": "bar",
            //         "baz": [
            //             1,
            //             2,
            //             3,
            //             [
            //                 4,
            //                 5,
            //                 6
            //             ]
            //         ]
            //     });
            // }, 3000 );
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
                    src = safari.extension.baseURI + 'tabs/safari/tab.safari.html?'+enc_opts;

                //console.warn('ext tab pre open', enc_opts, src);
                Tabs.open( src, false, true );

            } else {
                throw "extension tab not in manifest.  will not open";
            }
        };

    //Public methods
    _.extend( my, {
        init:       initialize,
        open:       open
    });

    return my;

});
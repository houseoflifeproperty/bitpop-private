/*jshint white:false, camelcase:false */
define( [
    'underscore',
    'observer'
], function( _bt, Events ) {
    

    var Observer    = require('observer'), //set in init
        _           = require('underscore'),
        observer    = null, //loads in init, 'clipboard'
        my          = {};

    //PRIVATE METHODS
        //hooks up how the different type of windows/workers/frames communicate with the router
    var init = function () {
            //load the clipboard observer
            observer = Observer.load('clipboard');
            //listen for commands
            observer.on( 'copy', on_clip );
        },

        //browser specific clip commands
        on_clip = function ( data ) {
            //firefox
            //Clipboard module from addon-sdk is loaded as const Clipboard in main.js
            //use it
            Clipboard.set( data, 'text' );
            //tell anyone listening that the text has been copied
            observer.trigger( 'copied', data );
        };

    //run it
    init();

    //public methods
    // _bt.extend( my, {});

    return my;

});
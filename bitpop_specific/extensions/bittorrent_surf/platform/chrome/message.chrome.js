/*jshint white:false, camelcase:false */
define( [
    'helpers/functional',
    'events',
    'router',
    'loader'
], function( _bt, Events ) {

    

    // var Router, //set in init
    //  Loader, //set in init
    var Router  = require('router'), //set in init
        Loader  = require('loader'), //set in init
        my      = {},

        //hooks up how the different type of windows/workers/frames communicate with the router
        init = function () {
            //sandboxed iFrames check in that the content window is ready for messages to be posted to it
            Router.on( Events.CONNECT, function( msg ){
                console.log('EVENT ROUTER CONNECT', msg);

                //popup in chrome connects through a port.  disregard it's connect message
                if ( msg.worker === 'popup' || msg.worker.indexOf('ext_') === 0 ) {
                    return;
                }

                Router.connect( msg.worker, Loader.get( msg.worker ).contentWindow, function( worker, msg ){
                    //console.log('posting message to worker', msg.worker, msg.target, msg);
                    worker.postMessage( msg, '*' );
                });
            });

            //how to connect sandboxed iframes
            window.addEventListener( 'message', function( event ) {
                Router.route( event.data );
                //console.log('got message from sandbox', event.data );
            }, false );
            
        };

    //run it
    init();

    //public methods
    _bt.extend( my, {});

    return my;

});
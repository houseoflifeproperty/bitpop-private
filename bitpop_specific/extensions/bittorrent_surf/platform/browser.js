/*jshint white:false, camelcase:false */
define([
    'require',
    'config',
    'router',
    'message', //tells the router how to connect workers
    'loader',
    'request',
    'tabs',
    'extension_storage',
    'observer',
    'clipboard'
], function ( require ) {
    

    console.log('hello inside browser module')

    var config            = require('config'),
        message           = require('message'),
        router            = require('router'),
        loader            = require('loader'),
        request           = require('request'),
        tabs              = require('tabs'), //self-inits
        extension_storage = require('extension_storage'),
        clipboard         = require('clipboard');

    var get_core = function () {
            return {
                router:             router,
                request:            request,
                loader:             loader,
                extension_storage:  extension_storage
            };
        },
        
        is_ready = false,
        
        ready_listeners = [],

        ready = function ( cb ) {
            ready_listeners.push( cb );
            if ( is_ready ) {
                call_ready();
            }
        },

        call_ready = function () {
            while ( ready_listeners.length ) {
                var cb = ready_listeners.shift();
                cb( get_core() );
            }
        },

        init = function () {
            //optionally change the request spacing
            request.init({
                spacing: 100
            });

            loader.init({
                //router: router
            });

            is_ready = true;

            call_ready();
        };

    //console.log('hello browser', config, get_core() );

    init();

    /* Browser delegate model the actual low-level browser operations that
     * differ from each other. The following interfaces need to be defined
     * for a delegate object:
     *      init(config): intiialization
     *      storage: storage interfaces
     *      requests: ajax request interfaces
     *      message: inter-component messaging interfaces
     */

    return {
        ready: ready,
        get_core: get_core
    };
});

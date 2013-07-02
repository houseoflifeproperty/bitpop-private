var global_require = require;

define([
	'require',
	'helpers/functional',
    'extension_storage.sandbox',
    'request.sandbox',
    'underscore',
    'jquery',
	'q',
    'sandbox_helpers'
], function ( require ) {
	

	var _bt           = require('helpers/functional'),
		Q             = require('q'),
        Storage       = require('extension_storage.sandbox'),
        Ajax          = require('request.sandbox'),
        name          = require('sandbox_helpers').get_name(),
        cache         = null, // set in init
		cache_ready   = false,
        observer      = null, //set in init
        ready         = Q.defer(),
        my            = {},
        is_sandboxed  = true;

    //private methods
    var init = function ( loader_observer ) {
            //console.log('initing sandbox loader', name, Storage, Ajax );

            //an observer is passed in here.  set it to the local variable
            observer = loader_observer;

            cache = Storage.load('sources');
            //cache.clear();
            //on cache reset is the real init
            cache.on( 'reset', on_cache_reset, 'core' );
        },
        
        //loads the script for this worker as has been cached by the core loader
        load_worker_script = function () {
            var manifest = get_manifest();
            //console.log('manifest in sandbox.loader?', name, ( manifest && manifest.meta ? manifest.meta.version : undefined ) );

            //styles
            if ( manifest.styles && manifest.styles[ name ] ) {
                execute_style( manifest.styles[ name ] );
            }

            //scripts
            if ( manifest.sources && manifest.sources[ name ] ) {
                execute_src( manifest.sources[ name ] );
                //now it is safe to assume that the source has been loaded,
                //  so the defined 'main' module is now defined and can be 
                //  required in the boot.sandbox's browser.ready callback
                //  but first, get the core loader config
                //ready.resolve();
                get_core_config();
            } else if ( manifest.sources && typeof manifest.workers[ name ] === 'boolean' ){
                //this is a non-sandboxed worker, so load it's module
                var module_path = './core/'+ name + '/' + name;
                //set config on global require so the module can be found
                global_require.config({
                    paths: {
                        main: module_path
                    }
                });

                //set is_sandboxed bool to false for any dependent logic later on
                my.is_sandboxed = false;

                console.warn('WORKER IS NON_SANDBOXED "'+ name +'".  ', module_path );
                //resolve the deferred object allowing boot.sandbox to require the 'main' module and then call it's init function
                //but first get core loader config
                // ready.resolve();
                get_core_config();
            } else {
                console.error('COULDN\'T FIND SOURCE TO LOAD IN SANDBOX WORKER "'+ name +'".  THIS IS VERY BAD');
                ready.reject(); //gotta figure out what to do with this
            }
        },

        //a function to get the loader config
        get_core_config = function () {
            var config_got = function ( config ) {
                //unregister this handler
                observer.off('config:got', config_got );
                //set the serialized core config as a public variable
                my.config = config;
                //add in version #
                my.config.version = get_manifest().meta.version;
                //make good on the ready promise
                ready.resolve();
            };
            //listen for config from loader
            observer.on('config:got', config_got);
            //ask core loader for core config
            observer.trigger('config:get');
        },

        execute_src = function ( src ) {
            //global eval concept:  http://weblogs.java.net/blog/driscoll/archive/2009/09/08/eval-javascript-global-context
            //this function has a fallback for ie... not in use, YET, but may be necessary in the future
            if ( window.execScript ) {
                window.execScript(src);
                return;
            }
            var fn = function() {
                console.log('evaling in ', name);
                window[ "eval" ].call( window, src );
            };
            fn();
        },

        execute_style = function ( src ) {
            var style = document.createElement('style');
            style.innerHTML = src;
            document.head.appendChild(style);
            // var style = $('<style />', { html: src });
            // $(document).ready( function () {
            //     $('head').append( style );
            //     console.error('EXECUTING STYLE on $(document).ready');
            // });
        },

        on_cache_reset = function ( data ) {

            if ( !cache_ready ) {
                cache_ready = true;

                console.log( 'sandbox loader cache reset', name );

                load_worker_script();

            } else {
                console.error('SANDBOX CACHE RESET AFTER READY IN LOADER. NO GOOD!!!!');
            }

        },

        get_manifest = function () {
            return cache.get( 'manifest' );
        };

	_bt.extend( my, {
        init: init,
        ready: ready.promise,
        config: null,
        is_sandboxed: is_sandboxed,
        get_manifest: get_manifest
	});

	return my;
});
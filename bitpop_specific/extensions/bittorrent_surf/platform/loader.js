/*jshint white:false, camelcase:false */
define( [
	'helpers/functional',
	'config',
	'q',
    'underscore',
	//'storage',
	'request',
	'extension_storage',
    'load_fn',
    'popup',
    'observer',
    //'tabs',
    'extension_tabs'
], function( _bt ) {

	

	var config    = require('config'),
		Storage   = require('extension_storage'),
		Q         = require('q'),
        _         = require('underscore'),
		Ajax 	  = require('request'),
        Popup     = require('popup'),
        load_fn   = require('load_fn'),
        Observer  = require('observer'),
        //Tabs      = require('tabs'),
        Ext_Tabs   = require('extension_tabs'),
		my        = {},
		frames    = {},
        //_manifest = null,
		// *** cache = storage.
		cache,
        observer,
		ready	  = false,

		//private methods

        //load a frame/worker by id/name
		load = function ( id, sandbox, needs_plugin ) {
            var dir = ( sandbox ? 'app' : 'core' );

            console.error( 'load', id, sandbox, dir, load_fn );
            //load_fn is browser specific, so once it is required we call it with the frames object as the scope;
            load_fn.apply( frames, [ id, dir, needs_plugin ] );
        },

		// ** gets the active frame/window/worker object
		get = function ( id ) {
			if ( !id ) {
				return frames;
			} else {
				return frames[ id ];
			}
		},

        //  ** allows us to set a connected frame publicly. ( i.e. outside the context of the load_fn )
        set = function ( id, frame ) {
            frames[ id ] = frame;
        },

		remove = function ( id ) {
			delete frames[ id ];
		},

        //always RESOLVES, with manifest... either null, or the manifest
		fetch_manifest = function ( base, file, is_remote ) {
			var dfd = Q.defer(),
                manifest = null,
                url = base + file,
				req = Ajax.request({
                    url: url,
                    dataType: 'html'
                }),
                //array to hold Q promises so i can wait on all to complete before loading
                wait = [];

            req.then(
                //success
                function ( response ) {
                    try {
                        manifest = JSON.parse( response.data );
                    } catch ( err ) {
                        console.error('manifest failed to parse', url);
                        dfd.resolve( null );
                        return;
                    }
                    console.log('manifest fetch done', url, manifest );

                    //give it a sources object to hold all of the fetched script source code.
                    manifest.sources = {};
                    //and styles for styles
                    manifest.styles  = {};
                    //and cscripts for the content scripts
                    manifest.cscripts = {};

                    //if this is a remote fetch, append the version number to the base url
                    if ( is_remote ) {
                        base += manifest.meta.version + '/';
                    }

                    var worker_scripts = fetch_worker_scripts( manifest, base );

                    worker_scripts
                        .then(
                            //resolved
                            function ( sources ) {
                                console.log( 'fetch manifest sources success!', sources );
                                //put the code into the manifest.sources object
                                _bt.extend( manifest.sources, sources );
                                //dfd.resolve( manifest );
                            },
                            //rejected
                            function ( sources ) {
                                console.error( 'fetch manifest sources FAIL', sources );
                                //dfd.resolve( null );
                            }
                        );

                    //this is one promise that needs to be resolved.
                    wait.push( worker_scripts );

                    if ( manifest.popup ) {
                        var popup_script = fetch_popup_asset( manifest, base, 'js' ),
                            popup_style = fetch_popup_asset( manifest, base, 'css' );

                        popup_script.then(
                            //resolved
                            function ( source ) {
                                _bt.extend( manifest.sources, {
                                    popup: source
                                })
                                //console.log('popup_script fetch SUCCESS', source );
                            },
                            //rejected
                            function ( source ) {
                                //console.error('popup_script fetch FAIL', source );
                            }
                        );

                        popup_style.then(
                            function ( source ) {
                                //console.log('popup_style fetch SUCCESS', source );
                                _bt.extend( manifest.styles, {
                                    popup: source
                                });
                            },
                            function ( source ) {
                                //console.error('popup_style fetch FAIL', source );
                            }
                        );

                        //push it into waitlist
                        wait.push( popup_script );
                        wait.push( popup_style );
                    }

                    if ( manifest.tabs ) {
                        console.error('have manifest tabs', manifest.tabs);

                        _.each( manifest.tabs, function ( val, tab ) {
                            console.log('each manifest tab', val, tab, arguments );
                            var script = fetch_source( base, tab, manifest.meta.version, 'js' ),
                                style  = fetch_source( base, tab, manifest.meta.version, 'css' );

                            script.then(
                                function ( source ) {
                                    console.log('tab script fetch SUCCESS', base );
                                    manifest.sources[ tab ] = source;
                                },
                                function () {}
                            );
                            style.then(
                                function ( source ) {
                                    console.log('tab style fetch SUCCESS', base );
                                    manifest.styles[ tab ] = source;
                                },
                                function () {}
                            );

                            wait.push( script );
                            wait.push( style );
                        });

                    }

                    //fetch any content scripts
                    if ( manifest.content_scripts ) {
                        _.each( manifest.content_scripts, function ( val, key ) {
                            var script = fetch_source( base, key, manifest.meta.version, 'js' );
                            script.then(
                                function ( source ) {
                                    console.log('content script fetch SUCCESS', base );
                                    manifest.cscripts[ key ] = source;
                                },
                                function () {}
                            );
                            wait.push( script );
                        });
                    }

                    //wait for all source fetch attempts to complete
                    Q.all( wait ).then(
                        //success
                        function () {
                            console.log('fetch manifest all SUCCESS', arguments);
                            dfd.resolve( manifest );
                        },
                        //error
                        function () {
                            console.error('fetch manifest all ERROR', arguments);
                            dfd.reject( null );
                        }
                    );

                    //dfd.resolve( manifest );
                },
                //fail
                function ( response ) {
                    console.log('manifest fetch fail', url, response);
                    dfd.resolve( manifest );
                }
            );

            return dfd.promise;
		},

        fetch_popup_asset = function ( manifest, base, type ) {
            var dfd = Q.defer(),
                src = fetch_source( base, manifest.popup, manifest.meta.version, type );
            
            //resolve or reject based on fetch_source promise
            src.then(
                //success
                function ( src_txt ) {
                    dfd.resolve( src_txt );
                },
                //fail
                function () {
                    dfd.reject( null );
                }
            );

            return dfd.promise;
        },

        fetch_worker_scripts = function ( manifest, base ) {
            var dfd = Q.defer();

            console.error('fetch_worker_scripts ALL', base, manifest, _bt );
            //loop through the workers, and fetch their main script source
            var scripts =  [],
                sources =  {};

            var each_worker = function ( sandbox, name ) {
                console.log('each worker', sandbox, name );
                if ( sandbox ) {
                    var src = fetch_source( base, name, manifest.meta.version );
                    //listen for success.  error handled in the all below
                    src.then( function ( src_txt ) {
                        sources[ name ] = src_txt
                    });
                    scripts.push( src );                    
                } else {
                    console.error('not valued as "sandbox"', name, sandbox );
                }
            };

            for ( var key in manifest.workers ) {
                //console.log('worker for', key );
                each_worker( manifest.workers[ key ], key );
            }

            //wait for all script fetches to come back before deciding what to do
            Q.all( scripts )
                .then(
                    //success
                    function () {
                        console.warn('all fetches success', arguments, sources);
                        dfd.resolve( sources );
                    },
                    //fail
                    function () {
                        console.error('all fetches error', arguments, sources);
                        dfd.reject( sources );
                    }
                );

            return dfd.promise;
        },

        //append manifest "version" as query param for cache-busting
        fetch_source = function ( base, name, version, type ) {
            console.log( 'fetch source', type, base, name, version );
            type = type || 'js';
            //version for cache-busting
            var dfd = Q.defer(),
                url = base + 'app/' + name + '/' + name + '.' + type + '?v=' + version,
                req = Ajax.request({
                    url: url,
                    dataType: 'html'
                });

            req.then(
                //success
                function ( response ) {
                    //console.log('fetch source success', type, base, name, version );
                    dfd.resolve( response.data );
                },
                //fail
                function ( response ) {
                    //console.error('fetch source FAIL', type, base, name, version );
                    dfd.reject( response.statusCode );
                }
            );

            //console.error( 'fetch worker script', base, name, url );
            return dfd.promise;
        },

		//updates loader from framework manifest
		//fetches remote source and sources first, then checks cache, then compares to local.
        //resolves with most recent one. ( manifest + sources );
		load_manifest = function ( ) {
			//return promise resolved with manifest file
			var dfd = Q.defer(),
				cached = cache.get('manifest'),
                local_version,
				remote,
				local,
                //get the correct remote path base depending on whether this is dev, stage, or prod
                remote_src = config.app.remote_src[ config.env ],
                fetch_remote = fetch_manifest( remote_src, 'latest.manifest.json', true ), //last boolean says this is remote
				fetch_local  = fetch_manifest( config.data_path, 'app/bt.manifest.json', false ); //last boolean says this is local

            //these .thens could dealt with in the all.then( below)
            //I am writing it out explicitly here for clarity
			fetch_remote.then( function ( manifest ) {
				console.log( 'remote resolved', manifest );
				remote = manifest;
			});
			fetch_local.then( function ( manifest ) {
                local_version = manifest.meta.version;
                console.warn( 'fetch_local resolved', local_version, manifest );
				local = manifest;
			});

			//wait for all before continuing
			Q.all([
				fetch_remote,
				fetch_local
			]).then( function ( remote_manifest, local_manifest ) {
				//console.log('q then', arguments);

                //now need to decide which to use
                var final_manifest,
                    final_location;
                //loop through the three options and pick most recent version ( highest version # )
                _.each({
                    remote: remote,
                    local:  local,
                    cached: cached
                }, function ( manifest, key ) {
                    console.log('manifest loop', ( ( manifest && typeof manifest.meta !== 'undefined' ) ? manifest.meta.version : null ), manifest);
                    
                    if ( manifest ) {
                        //compare versions
                        //  whoa.  weird.  this condition :
                        //  ( !final_manifest || manifest.meta.version > final_manifest.meta.version )
                        //  broke the code but didn't throw an error
                        //  next day: not as weird.  have seen it in other places
                        //      I think it is happening in any promise-based function.
                        //      Any error in the function causes promise to error/be rejected, 
                        //      and need an error handler defined in a 'then' ( ? just my thoughts )  
                        
                        //_.bind(console.warn, console, 'checking manifest', key, manifest.meta.version, 'local:', local_version )();
                        if ( !final_manifest || ( manifest.meta && manifest.meta.version > final_manifest.meta.version ) ) {
                            //check this manifests minimum required version against local version
                        
                            //_.bind(console.warn, console, 'passed base version check', key, manifest.meta.version, ( final_manifest ? final_manifest.meta.version_min : null ), 'version_min:', manifest.meta.version_min, 'local:', local_version )();
                            if ( ( local_version >= manifest.meta.version_min ) || key === 'local' ) {
                        
                                //_.bind(console.warn, console, 'passed min version check', key, manifest.meta.version_min, local_version )();
                                final_manifest = manifest;
                                final_location = key;
                            }
                        }
                    }

                });

                console.log('pre final manifest condition', final_manifest);

                //there had better be one.  if not, renounce all faith in whatever
                if ( final_manifest && final_location ) {
                    config.source = final_location;

                	console.log('final manifiest', final_location, final_manifest);
                    //store it in case user loses connection
                    cache_manifest( final_manifest );
                    //resolve the promise with the proper manifest
                    dfd.resolve( final_manifest );
                } else {
                    throw "Something went horribly wrong.  Couldn\'t load any form of bt.manifest.json";
                }
			});

			return dfd.promise;
		},


        //deals with the caching of the manifest and any related source files
        cache_manifest = function ( manifest ) {
            console.log('caching manifest', manifest);
            cache.set( 'manifest', manifest ).save();
        },

		process_manifest = function ( manifest ) {
			console.log('process_manifest', manifest );

            var key;

            //load the popup
            if ( manifest.popup ) {
                console.error('process_manifest popup exists');
                Popup.init( manifest, my );
            }

            //load the workers
            for ( key in manifest.workers ) {
                load( key, manifest.workers[ key ], manifest.plugin_worker === key );
            }

            //prepare for any tab windows that need to be used
            if ( manifest.tabs ) {
                console.error('process_manifest tabs exist');
                Ext_Tabs.init( manifest, my );
            }
		},

        //start of manifest updating
		on_cache_reset = function ( data ) {
			console.log('LOADER CACHE RESET... this should only happen at boot?', data);

			if ( !ready ) {
                ready = true;

				load_manifest()
                    .then( process_manifest );

			} else {
				console.error('CACHE RESET AFTER READY IN LOADER. NO GOOD!!!!');
			}

		},

		//init loads storage, sources ready on reset.
		init = function () {
            console.log('hello core loader', Popup);

            //set up a loader observer
            observer = Observer.load('loader');
            observer.on('config:get', function () {
                // console.error('want config', config.toJSON() );
                var _config = config.toJSON();
                //the global _install is set as true in the context of the extension core 
                //on first run in each browser's require.config.{{browser}}.js file
                //loader serves up this config
                _config._install = _install;

                observer.trigger( 'config:got', _config );
            });

			cache = Storage.load('sources');
			//cache.clear();
			cache.on( 'reset', on_cache_reset, 'core' );
		};

	_bt.extend( my, {
		load_manifest: load_manifest,
		load: load,
		get: get,
        set: set,
		remove: remove,
		init: init
	});

	return my;

});

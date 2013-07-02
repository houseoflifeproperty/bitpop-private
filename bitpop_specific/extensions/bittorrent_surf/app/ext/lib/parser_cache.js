//this entire module should be optimized now that it has 'direct' access to the extension storage.
(function(){
    
    define([
        'require',
        'underscore',
        'sandbox_helpers',
        'app_helpers',
        'jquery'
        //'parser_cache',
        //'q'
    ], function () {

		//the pattern cache module.  .check_is_special is now in app_helpers
    	var my = {},
    		_bt = require('sandbox_helpers'),
            _app_helpers = require('app_helpers'),
    		storage = null, //set in init
    		//overridable defaults
			opts = 		{
				monitor_time: 		1000 * 25, 					//25 seconds, in ms
				expiration_time: 	60 * 60 * 24 * 30, 			//30 days, in seconds
				pattern_update_time: 		1000 * 60 * 60,		//1 hr in ms... interval at which parser update check occurs
				pattern_expiration_time: 	60 * 60 * 24 * 30, 	//30 days in seconds

				engine_blacklists: 	{									//this is updated from a remote server
					google: 'webcache.googleusercontent.com@url?q=',	//split on '@'. left is comma delimited 
					bing: '',											//pattern list, right is the "decoder"
					yahoo: 'search.yahoo.com@**'						//delimiter for search engine anchor hrefs
				},

				update_url: 'https://s3.amazonaws.com/btsurf/parser_update.json'
			},
			//keep track of any changes for the timeout
			changed = 	false,
			timeout = 	null,
			pattern_update_timeout = null,
			cache = 	{
				l1: {},
				l2: {},
				l3: {},
				tr: { //trackers
					y: [], //reliable
					n: [], //not reliable
					q: []  //queue to test || questionable
				},
				en: false // will be { ts: (timestamp), dict: { (parser str dict ) } }
			};

		//private methods
		var initialize = function ( options ) {
				//override defaults
				_.extend( opts, options );
				//set storage
				//request stored cache
				storage = _sandbox.storage.load('pattern_cache', {
					wait: 500,
					defaults: cache
				});
				storage.on('reset', on_storage_reset );

				console.error('pattern cache init', _sandbox, _app_helpers );

				//start monitoring for any changes
				monitor_changes();

				//temporary clear the cache every time while developing
				// storage.clear();
			},

			on_storage_reset = function () {
				console.error('pattern cache storage reset', arguments);

                unstore();

				//look for an update to the pattern cache engines
                //think this is overkill now
				check_pattern_update();
			},

			monitor_changes = function () {
				clearTimeout( timeout );
				if( changed ) {
					console.error('CACHE HAS CHANGED.  SAVE IT!', cache );
					save();
				}
				timeout = setTimeout( function(){ monitor_changes(); }, opts.monitor_time );
				return;
			},

            //store and unstore are legacy from alpha core logic.  practice found that making the pattern cache a single string
            //was way more reliable for getting and setting.
            //this probably needs to be verified
			//something is weird with this, and I think the transform may not be necessary anymore,
			//so, I am turning off the transformations
			store = function () {
                var data = cache;
                // //level strings
                // for ( var key in data ) {
                //     if( key === 'en' )
                //         continue;
                //     //l1, l2, l3, tr
                //     var level = data[ key ];
                //     //then for each site
                //     for ( var path in level ) {
                //         //join the blacklist as a string
                //         var _blacklist = level[ path ].p,
                //             patterns = [];

                //         if ( _blacklist ) {

                //             for ( var pat in _blacklist )
                //                 patterns.push( pat )

                //             data[ key ][ path ].p = patterns.join(',');
                //         }
                //     }
                // }

                console.error('SET PARSER PATTERNS', _.clone(data), _.clone(cache) );
                storage.set(data).save();
			},

			//used to transform data before putting it into storage.
			//something is weird with that, and I think the transform may not be necessary anymore
			unstore = function () {
                var data = storage.get();
                //console.error('unstore', _.clone( cache ), data );

                // //split the strings and set up the object correctly
                // for ( var key in data ) {
                //     if( key === 'tr' || key === 'en' )
                //         continue;
                //     //l1, l2, l3, tr
                //     var level = data[ key ];
                //     //then for each site
                //     //console.log('in set', key);
                //     for ( var path in level ) {
                //         console.log('in level', key, path);

                //         var _blacklist = level[ path ].p,
                //             is_splittable = _blacklist.split,
                //             pattern_dict = {};

                //         if( _blacklist && is_splittable) {
                //             //console.error('blacklist', path, key, _blacklist );
                //             var patterns = _blacklist.split(',');

                //             for ( var i=0, len=patterns.length; i<len; i++ ) {
                //                 pattern_dict[ patterns[i] ] = true;
                //             }
                //         }
                 
                //         data[ key ][ path ].p = _.clone( pattern_dict );
                //     }
                // }
                //on_fetched logic now
                cache = data;
                //check for special engine patterns
                if ( data.en && data.en.dict ) {
                    set_special_patterns( data.en.dict );
                }
            },

			save = function(){
				store();
				changed = false;
			},

			create_pattern_entry = function ( level, path, base ) {
				var entry = {
						//timestamp
						ts: _bt.getTimestamp(),
						//blacklisted patterns
						p: {},
						//whitelisted view pattern
						w: false,
						//decoder for search engine links
						d: false
					},
					//when creating an entry, search engines need some predefined blacklist entries
					is_special = _app_helpers.check_is_special( base );

				if ( is_special ) {
					var arr = opts.engine_blacklists[ is_special ].split('@'),
						keys, decode, len;

					if ( arr.length > 0 ) {
						decode = arr[1];
					}

					keys = arr[ 0 ].split(',');
					len = keys.length;

					if( decode )
						entry.d = decode;

					if ( len ) {
						for ( var i=0; i<len; i++ ) {
							if( keys[i] )
								entry.p[ keys[i] ] = true;
						}
					}
				}

				cache[ level ][ path ] = entry;
				return;
			},

			set_special_patterns = function ( dict ) {
				opts.engine_blacklists = dict;
			},

			check_pattern_update = function () {
				clearTimeout( pattern_update_timeout );

				var now = _bt.getTimestamp();

				if ( !cache.en || now - cache.en.ts >= opts.pattern_expiration_time ) {
					//create_engine_entries( opts.engine_blacklists );
					console.log('fetching pattern update!');

			        _sandbox.request.request({
			            url: opts.update_url,
			            beforeSend: 'emptyAjaxHeader',
						dataType: 	'html'
			        }).then( 
                        function( response ){
                            //console.log('got parser update response', response);
    			        	try {
    			        		var data = JSON.parse( response.data );
    			        		//if they are the same, bail out
    			        		// if ( JSON.stringify( data ) === JSON.stringify( opts.engine_blacklists ) )
    			        		// 	return;
    			        		//otherwise, set them
    			        		set_special_patterns( data );
    			        		//create an entry in the persistent cache
    			        		cache.en = {
    			        			ts: _bt.getTimestamp(),
    			        			dict: data
    			        		};
    			        		//mark it as changed so it gets saved
    			        		changed = true;

    				        	console.error('PARSER UPDATE FETCHED, and there were changes', data );
    			        	} catch ( err ) {
    			        		console.error('something went wrong parsing new parser patterns')
    			        	}
    			        }, function () {
                            //req fail
                            console.error('Parser pattern update failed');
                        }
                    );
				}

				setTimeout( function(){
					check_pattern_update();
				}, opts.pattern_update_time );
			};

		//public methods
		_.extend( my, {
			
			init: initialize,

			get: function ( level, path ) {
				if ( ! level && ! path )
					return cache;
				if ( level && ! path )
					return cache[ level ];
				if( level && path )
					return cache[ level ][ path ]
				return undefined;
			},

			prepare: function ( level, path, base ) {
				//console.info('prepare cache');
				if ( cache[ level ][ path ] ) {
					//exists, check if expired
					var now = _bt.getTimestamp(),
						is_special = _app_helpers.check_is_special( base );

					//check if the entry has expired, or if there is a special pattern for search engines that has been loaded since this entry was created
					if( now - cache[ level ][ path ].ts > opts.expiration_time || is_special && cache.en && cache[ level ][ path ].ts < cache.en.ts ) {
						console.error('cache is expired.  clear it', level, path, now - cache[ level ][ path ].ts, opts.expiration_time );
						delete cache[ level ][ path ];
					}
				}

				//no cache for this site?  make an entry
				if ( ! cache[ level ][ path ] )
					create_pattern_entry( level, path, base );
			},
			whitelist: function ( level, path, pattern ) {
				if ( cache[ level ][ path ].w !== pattern ) {
					cache[ level ][ path ].w = pattern;
					changed = true;
					console.log('Whitelist', level, path, pattern, typeof pattern );
				}
			},
			blacklist: function ( level, path, pattern ) {
				if ( pattern && ! cache[ level ][ path ].p[ pattern ] ) {
					cache[ level ][ path ].p[ pattern ] = 1; //1 short for true
					changed = true;
					console.warn('BLACKLIST', level, path, pattern, typeof pattern );
				}
			},
			is_whitelisted: function ( level, path, pattern ) {
				var item_cache = cache[ level ][ path ];
				if( !item_cache ) return false;
				return ( item_cache.w && item_cache.w === pattern );
			},
			is_blacklisted: function ( level, path, pattern ) {
				var item_cache = cache[ level ][ path ];
				if( !item_cache ) return false;
				return ( item_cache.p && item_cache.p[ pattern ] );				
			}
		});

		return my;

    });

})();
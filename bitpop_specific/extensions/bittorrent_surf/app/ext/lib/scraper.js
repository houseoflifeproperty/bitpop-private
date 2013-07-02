(function () {

	define([
		'require',
		'underscore',
		'q',
		'sandbox_helpers'
	], function ( require ) {

		var Q = require('q'),
			_bt = require('sandbox_helpers'),
			my = {},
			
			inited = false,
			//search_observer = null,

	        info_keys =     ['complete', 'incomplete', 'downloaded'],
	        queue =         [],
	        timeout =       null,
	        delay =         100,
	        scraping =      false,
	        cache =         {},
	        cache_exp =     60 * 60 * 24 * 2, //in seconds, cache expiration time for a blacklisted url			
			
			app = null; //holds TorqueApp instance from app.torque.js, set in init


		//Private Methods
		var initialize = function ( app_instance ) {
				if ( !inited ) {
					inited = true;

					//we listen to the search observer to scrape results
					//search_observer = _sandbox.observer.load('search');
					//set app to btapp instance
					app = app_instance;
					//listen for events on observers
					bind_events();

					console.error('init scraper!')
				}

				return my;
			},

			bind_events = function () {
				app.observer.on( 'scrape', on_scrape );
			},

			on_scrape = function ( payload ) {
				//there is payload.data & payload.query

				//console.warn('on_scrape', arguments);

	            //set up the options
	            var query = 				payload.query,
	            	data = 					payload.data,
	            	opts =                  {},
	                tracker =               get_tracker( data.trackers ),
	                toUDP =                 false; //used to hold transformations of trackers.  super simple trial to use udp trackers

	            if ( data.hash && tracker ) {
	                //if there is a hash and a non-blacklisted tracker, use it first
	                opts.hash = data.hash;
	                opts.tracker = tracker;

	                //try a transform
	                // toUDP = _bt.httpToUdp( opts.tracker );
	                // if ( toUDP && !is_blacklisted( toUDP ) ) {
	                //     opts.tracker = toUDP;
	                // }
	            } else if ( data.download.torrent ) {
	                //otherwise, look for a torrent link
	                opts.url = data.download.torrent;
	                opts.tracker = tracker;
	            } else {
	                //no trackers, no torrent file
	                console.error('not enough info to perform scrape', data);
	                app.observer.trigger('result', {
                    	data: _.extend( data, { scraped: { error: 'no tracker or torrent' } } ),
                    	query: query
                    });
	                return;
	            }

	            var on_success = function ( info ) {
	                    if( info.hash ) {
	                        //console.error('FOUND HASH', info.hash);
	                        info.hash = info.hash.toUpperCase();
	                        data.hash = info.hash;
	                    }

	                    app.observer.trigger('result', {
	                    	data: _.extend( data, { scraped: info } ),
	                    	query: query
	                    });
	                },
	                on_error = function ( info ) {
	                    console.error('scrape failed', info);

	                    if ( info === 'app offline' ) {
	                    	app.observer.trigger('result', {
		                    	data: _.extend( data, { scraped: { error: info } } ),
		                    	query: query
		                    });
	                        return;
	                    }

	                    //console.error('scrape error', data.data.trackers.length, info.error, info, data, opts, _.clone( opts.tracker ) );
	                    //Bt.msg.send( Bt.events.TORRENT_LINK_UPDATED, { data: _.extend( data.data, { scraped: info } ), query: data.query } );
	                    
	                    if ( opts.tracker )
	                        blacklist( opts.tracker );

	                    _.defer( function(){
	                        //console.log('RETRYING');
	                        if ( opts.tracker ) {
	                            on_scrape( payload );
	                        } else {
	                        	app.observer.trigger('result', {
			                    	data: _.extend( data, { scraped: info } ),
			                    	query: query
			                    });
	                        }
	                    });
	                };

	            //console.log('pre queue scrape', data.data.download.torrent, JSON.stringify( trackers, null, 4 ) );

	            //this.get('tracker').scrape( opts );
	            make_request( opts ).then( on_success, on_error );



			},

			make_request = function ( opts ) {
	            var dfd = Q.defer();

	            queue.push({
	                dfd: dfd,
	                opts: opts
	            });

	            start_queue();

	            return dfd.promise;
	        },
	        start_queue = function () {
	            if ( !scraping ) {
	                scraping = true;
	                dequeue();
	            }
	        },
	        dequeue = function () {
	            clearTimeout( timeout );

	            if ( !queue.length ) {
	                scraping = false;
	                return;
	            }

	            var current = queue.shift();

	            //scraping crashes other current client builds, but not Torque
	            // XXX - TODO: think this could be legacy now the ut 3.3 is officially released
	            if( app.client && app.client.get('product') === 'Torque' ){

	                _.extend( current.opts, {
	                    callback: function( info ){
	                        if ( info.error ) {
	                            current.dfd.reject.apply( this, arguments );
	                        } else {

	                            info = process_results( info );
	                            //console.log( 'scrape complete', JSON.stringify( info ) );

	                            var pass = false;

	                            _.each( _.keys( info ), _.bind(function( key ){
	                                if( _.include( info_keys, key ) ){
	                                    pass = true;
	                                    return false;
	                                }
	                            }, this) );

	                            if( pass ){
	                                current.dfd.resolve( info );
	                            } else {
	                                //scrape request is empty object
	                                current.dfd.reject( { error: 'Nothing usable came back.' } );
	                            }
	                        }
	                    }
	                });

	                //do the scrape
	                app.get('tracker').scrape( current.opts );

	            } else {
	                current.dfd.reject('app offline');
	            }

	            //console.log('current', current );
	            timeout = setTimeout( dequeue, delay );
	        },
	        //pulls the info we are looking for into a normalized dictionary
	        process_results = function( data ){
	            //console.log('processing scrape', data)
	            var ret = {},
	                //walk flattens the data and converts number strings to numbers
	                walk = function( val, key ){
	                    if ( _.isObject( val ) ){
	                        _.each( val, walk );
	                    } else {
	                        ret[ key ] = ( _.isString( val ) && !/[a-z]/i.test(val) ) ? parseInt( val, 10) : val;
	                    }
	                };

	            _.each( data, walk );
	            return ret;
	        },

	        blacklist = function ( href ) {
	            if ( !cache[ href ] ) {
	                cache[ href ] = _bt.getTimestamp();
	                console.log( 'blacklisting tracker', href, cache );
	            }
	        },
	        is_blacklisted = function ( href ) {
	            var born = cache[ href ];
	            console.log('IS TRACKER BLACKLISTED?', born, href);
	            if ( !born ) return false;
	            if ( _bt.getTimestamp() - born > cache_exp ) {
	                //console.warn( 'blacklist expired for this tracker.  deleting', href );
	                delete cache[ href ];
	                return false;
	            }
	            return true;
	        },

	        get_tracker = function ( trackers ) {
	            tracker = false;

	            if ( trackers && trackers.length ) {
	                for ( var i=0,len=trackers.length; i<len; i++ ) {
	                    if ( !is_blacklisted( trackers[i] ) ){
	                        tracker = trackers[i];
	                        break;
	                    }
	                }
	            }
	            
	            return tracker;
	        };

		//Public Methods
		_.extend( my, {
			init: initialize
		});

		return my;
	});

})();
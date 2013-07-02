(function () {

	define([
		'require',
		'underscore',
		'parser',
		'sites',
		'settings',
		'sandbox_helpers',
		'download_urls',
		'q',
		'btfc_search'
	], function ( require ) {

		var Q = require('q'),
			_bt = require('sandbox_helpers'),
			sites = require('sites'),
			settings = require('settings'),
			parser = require('parser'),
			download_urls = require('download_urls'),
			btfc_search = require('btfc_search'),
			observer = null, //set in init
			parser_observer = null, //set in init
			torque_observer = null, //set in init
			Search = null, //set in init, holds extension_storage instance
			search_defaults = {
				query: '',
				results: {},
				history: []
			},
			inited = false,
			searching = false,
			max_cache_length = 10, //max length of search history
			cache_expiration_time = 2 * 60 * 60, //2 hours, timestamps are in seconds, not milliseconds
			my = {};

		//Private Methods
		var initialize = function () {
				if ( !inited ) {
					inited = true;

					observer = _sandbox.observer.load('search');
					parser_observer = _sandbox.observer.load('parser');
					torque_observer = _sandbox.observer.load('app');

					Search = _sandbox.storage.load( 'search', {
						wait: 1500,
						defaults: search_defaults
					});

					download_urls.init();
					sites.init();
					parser.init(); //sites inits it, but just in case...
					btfc_search.init();
					settings = settings.init(); //returns the extension storage object


					console.error('search module init', sites, parser, observer, settings );

					//listen to observer stuff
					bind_events();



					//temporarily expose sites as global for development
					// window.sites = sites;
					// window.search_observer = observer;

					// // temp initiate search while developing
					// setTimeout( function () {
					// 	settings.set({ search_default: 'google' }).save();
					// 	sites.add('google');
					// }, 1000);
					// //temp perform the search
					// Search.on('reset', function () {
					// 	setTimeout( function () {
					// 		observer.trigger('search', {
					// 			query: 'big buck bunny',
					// 			//cached: true
					// 			cached: false
					// 		});

					// 		console.log('settings?', settings.get() );
					// 	}, 2000);
					// });
				}
			},

			bind_events = function () {
				observer.on( 'search', on_search );
				//popup asks for search data
				observer.on( 'load', on_load );
				//on surf:reset, resend the empty info
				Search.on('reset', on_load );
				
				observer.on( 'clear', on_clear );
				//result data comes from the parser and the torque app ( after scrape )
				parser_observer.on( 'result', on_result );
				torque_observer.on( 'result', on_result );
			},

	        //makes an empty results object with timestamp
	        make_empty_results = function(){
	            return {
	                time: _bt.getTimestamp(),
	                data: {}
	            };
	        },

	        on_clear = function () {
	        	Search.clear();
	        	searching = false;
	        	on_load();
	        },

			on_search = function ( opts ) {
				var check_cache = opts.cached,
					query = opts.query,
					cached = is_cached( query ),
					btfc_adv = opts.btfc_adv;

				//set the current query... also handles max length checking
				set_current_query( query );

				if ( !opts.query ) { return; }

				add_to_history( query );

				if ( check_cache && cached ) {
					var now = _bt.getTimestamp(),
						cache = get_cache( query );
					//check that the cache results haven't expired
					if ( now - cache.time > cache_expiration_time ) {
						//cached object has expired;
						cached = false;
						set_cache( query, make_empty_results() );
					}

				} else if ( !check_cache && cached ) {
					//we don't care what is in the cache cause we have opted not to check it
					cached = false;
					set_cache( query, make_empty_results() );
				} else {
					//there is not a key with this query in the results, so make it
					set_cache( query, make_empty_results() );
				}

				//send a spell check request... maybe should do this in the popup
				if ( !btfc_adv ) {
					parser_observer.trigger('spellcheck', {
						query: query
					});
					console.warn('SENT SPELLCHECK REQUEST.  IS ANYTHING LISTENING?')
				}


				//do the search if the cached results aren't there when we want them
				if ( check_cache && cached ) {
					//cached results exist, so send them to the view
					announce_results( query );
					observer.trigger( 'complete', query, false );
				} else {
					execute_search( query, btfc_adv );
				}

			},

			execute_search = function ( query, btfc_adv ) {
				var wait = []; //hold deferred objects

				//hi, we are searching
				searching = 'primary';

				observer.trigger('search_start', query);

				if ( !btfc_adv ) {
					_.each( sites.get_enabled(), function( el ) {
						console.log(el);

						var search = null;
						if ( el.data.url.indexOf( _config.app.btfc_url[ _config.env ] ) >= 0 ) {
							console.warn('BTFC: getting btfc lookup promise');
							search = btfc_search.search(el.data, query);
						}
						else {
							search = parser.query({
								query: query,
								site: el.data
							});
						}
						if ( search ) {
							wait.push( search );
						}
					});
				} else {
					//this is an advanced taxonomy search against the recommendations engine.
					//so only search against the recommendations engine
					var btfc_site = sites.get_enabled().btfc;
					if ( btfc_site ) {
						console.warn('BTFC: getting btfc recommendation promise');
						search = btfc_search.search(btfc_site.data, [ query ]);
						wait.push( search );

						console.log('BTFC SITE: ', btfc_site, search, query );
					}
				}

				_bt.track( 'search', 'submit', null, wait.length );

				Q.all( wait ).then(
					function () {
						console.error('SEARCH MODULE SEARCH ALL DONE', arguments);
						wait_for_scrapes( query, 'success' );
					},
					function () {
						console.error('SEARCH MODULE SEARCH ALL ERROR', arguments);
						wait_for_scrapes( query, 'fail' );
					}
				);

			},

			//hold promises for scrape requests
			scrape_promises = {},

			//waits on promises created by scrape requests to 
			//resolve before triggering complete for a query
			wait_for_scrapes = function ( query, status ) {
				//scrape_promises[ query ][ result.id ]
				var wait = [];
				//get all the promises into an array.
				_.each( _.values( scrape_promises[ query ] ), function ( dfd ) {
					wait.push( dfd.promise );
				});
				//they always only resolve
				Q.all( wait ).then( function () {
					//console.error('SCRAPED SEARCH MODULE SEARCH ALL DONE', query, status);
					searching = false;
					observer.trigger('complete', query, searching );
					//then clean up the promises dict
					delete scrape_promises[ query ];
					console.log('not really. SCRAPED SEARCH MODULE SEARCH ALL DONE', query, status );
				}, function () {
					//fail
					debugger;
				});
				searching = 'scrape';
				console.log('WAIT FOR SCRAPES', query, searching );
				observer.trigger('complete', query, searching );

			},

			on_load = function () {
				var data = Search.get();
				//trigger an event saying the history has changed
				observer.trigger( 'history', data.history );
				announce_results( data.query );

				console.error('on search load', data );
			},

			//package cached results into a list and publishes them all at once to whoever is listening
			announce_results = function ( query ) {
				var payload = [],
					results = get_cache( query );

				if ( results ) {
					for ( var id in results.data ) {
						var result = results.data[ id ];
		                if ( is_downloading( result ) ) {
		                	//console.log('RESULT IS DOWNLOADING in announce', result.id);
		                    result = _.extend( result, { downloaded: true } );
		                } else {
		                	delete result.downloaded;
		                }
						payload.push( result );
					}
				}

				observer.trigger('full_results', {
					searching: searching, //keep track internally whether or not this module is searching and tell the popup when it loads
					query: query,
					results: payload,
					cached: true
				});

			},

			set_cache = function ( query, obj ) {
				var results = get_results();
				results[ query ] = obj;

				//is the set necessary?
				Search.set( 'results', results );

				Search.save();
			},

			//is this query already a key in the results object?
			is_cached = function ( query ) {
				return !!get_cache( query );
			},

			//updates the current persisted query
			set_current_query = function ( query ) {
				//set new query
				Search.set({
					query: query
				});

				Search.save();
			},

			//this pushes old query into history
			add_to_history = function ( query ) {
				//get old query and add it to history
				var history = get_history(),
					exists = history.indexOf( query );

				//if the query is already in the history, remove it and push it back to the top
				if ( exists > -1 ) {
					history.splice( exists, 1 );
				}
				//put query in at beginning of search history
				history.unshift( query );
				//keep max history length within bounds
				while ( history.length > max_cache_length ) {
					var query_to_remove = history.pop();
					remove_results( query_to_remove );
				}

				//set new query and history
				Search.set({
					history: history
				});

				//trigger an event saying the history has changed
				observer.trigger( 'history', history );

				Search.save();
			},

			remove_results = function ( query ) {
				var results = get_results();
				if ( results[ query ] ) {
					delete results[ query ];
				} else {
					console.error( 'can\'t remove "'+ query +'" from results because it isn\'t in there' );
				}
				//is this set necessary?
				Search.set('results', results);
				Search.save();
			},

			get_results = function () {
				return Search.get('results');
			},

			get_history = function () {
				return Search.get('history');
			},

			get_query = function () {
				return Search.get('query');
			},

			//returns the timestamped object with results data for a previous query
			get_cache = function ( query ) {
				return get_results()[ query ];
			},

			is_downloading = function ( result ) {
				if ( result.download.torrent && download_urls.exists( result.download.torrent ) ) { return true; }
				if ( result.download.magnet && download_urls.exists( result.download.magnet ) ) { return true; }
				if ( result.hash && download_urls.hash_exists( result.hash ) ) { return true; }
				return false;
			},

			//this consumes both the results from the parser and the scraped results from the app instance
			//at the end, it will trigger a 'result' event on this modules observer: 'search'
			on_result = function ( payload ) {
				//there is payload.data and payload.query
				var data = payload.data,
					query = payload.query,
					results = get_cache( query ),
					result;

				if ( !results ) {
					return;
				}

				result = results.data[ data.id ];

				//need to get the cached result of create one if not there
				if ( !result ) {
					//create the result in the results cache

					//deal with hash and tracking stuff here
					if ( data.download.magnet ) {
						var parsed = _bt.parseMagnetLink( data.download.magnet );
						//set the hash ( will override wrong hash from torrent decode if happened )
						data.hash = parsed.hash;
						//set the trackers
						if ( !data.trackers || data.trackers.length < parsed.trackers.length ) {
							data.trackers = parsed.trackers
						}
						// console.warn( 'parsed magnet', parsed, data.download.torrent );
					} else {
						//there is only a link to a .torrent
                        //right now, the calculation of an infohash from a .torrent binary returns the wrong hash.
                        //delete the hash and make torque do the heavy lifting to scrape and return the calculated hash
                        if ( data.hash ) {
                            delete data.hash;
                        }
					}

					// //check if the torrent is downloading
					// if ( is_downloading( data ) ) {
					// 	//legacy skip_check and downloaded keys.  want to work these out when we can.
					// 	data.skip_check = true;
					// 	data.downloaded = true;
					// }

					//put the result into the proper spot
					result = results.data[ data.id ] = data;

				}

				_.extend( result, data );

				//torrent will be scraped
                if( result.download.magnet && ( !result.hash && ( !result.trackers || !result.trackers.length ) ) ){
                    _.extend( result, _bt.parseMagnetLink( result.download.magnet ) );
                }

                // look for duplicates
                // XXX - TODO: This is so ridiculously ugly, and is left over from surf alpha.  refactor it (i.e. the duplicates checking)
                if ( !result.is_duplicate ) {

                    //filter all results for query for hash
                    var same_hash = _.filter(results.data, function (res) {
                        // var pass = ( res.id !== data.id && res.hash === data.hash );
                        // if( pass ){
                        //     _bt.extend( res, { is_duplicate: data.id });
                        // }
                        // return pass;
                        return res.id !== data.id && data.hash && res.hash === data.hash
                    });

                    //were duplicates found?
                    if ( same_hash.length ) {
                        for ( var i=0, len=same_hash.length; i<len; i++ ) {
                            var res = same_hash[i],
                                dup = results.data[ res.id ]
                                duplicates = result.duplicates || {};

                            results.data[ dup.id ].is_duplicate = data.id;
                            delete dup.duplicates;
                            duplicates[ res.id ] = _bt.clone( dup );
                        }
                        result.duplicates = duplicates;
                        console.warn('result is not a duplicate but I found some duplicates?', result, same_hash, results );
                    }
                    console.warn('!is_duplicate', same_hash)
                } else if ( result.is_duplicate ) {

                    // if is duplicate then updated it's data on the original
                    // torrent and update scrape data
                    var original = results.data[ result.is_duplicate ];

                    if ( result.scraped && !result.scraped.error && ( !results.data[ result.is_duplicate ].scraped || !results.data[ result.is_duplicate ].scraped.error ) ) {
                        results.data[ result.is_duplicate ].scraped = _bt.clone( result.scraped );
                    }

                    try {
                        results.data[ result.is_duplicate ].duplicates[ result.id ] = _bt.clone( result );
                    } catch ( err ) {
                        throw err.stack;
                        debugger;
                    }
                    console.warn('result is_duplicate for real?', result, original, same_hash, results );

                } else {
                    console.warn( 'THIS SHOULD NOT BE SEEN...  didn\'t pass duplicate check cases', result, data );

                }

                if ( is_downloading( result ) ) {
                	console.error('RESULT IS DOWNLOADING', result);
                    result = _.extend( result, { downloaded: true, skip_check: true } );
                }

				//might need to set here
				set_cache( query, results );

				//fake archive scrape results
				//TODO : this is legacy.  improve it
                if ( result.is_archive ) {
                    console.log( 'is_archive ');
                    result.scraped = {
                        downloaded: ~~( Math.random() * 1000 ) ,
                        complete: ~~( Math.random() * 100 ),
                        incomplete: 0
                    };
                } else if( !result.scraped && ( result.download.torrent || result.download.magnet ) ) {
	                //once it is scraped, I don't ever want to scrape again.
	                //	it is here that I can also create a promise that goes
	                //	into a dict keyed by the result.id or url or whatever 
                	var dfd = Q.defer();
                	//create the space for the query if it is not there
                	if ( !scrape_promises[ query ] ) { scrape_promises[ query ] = {}; }
                	scrape_promises[ query ][ result.id ] = dfd;

                	torque_observer.trigger('scrape', { query: query, data: result });
                    // Bt.send_message('app', Bt.events.SCRAPE_TORRENT, { data: result, query: msg.data.query } );
                } else {
                	//if it has been scraped, find its promise in scrape_promises and resolve it.
                	if ( scrape_promises[ query ] && scrape_promises[ query ][ result.id ] ) {
	                	var dfd = scrape_promises[ query ][ result.id ];
		            	dfd.resolve();
                	}
                }

                //once it is scraped, I don't ever want to scrape again.
                //	it is here that I can also create a promise that goes
                //	into a dict keyed by the result.id or url or whatever
              //   if( !result.scraped && ( result.download.torrent || result.download.magnet ) ) {
              //   	var dfd = Q.defer();
              //   	//create the space for the query if it is not there
              //   	if ( !scrape_promises[ query ] ) { scrape_promises[ query ] = {}; }
              //   	scrape_promises[ query ][ result.id ] = dfd;

              //   	torque_observer.trigger('scrape', { query: query, data: result });
              //       // Bt.send_message('app', Bt.events.SCRAPE_TORRENT, { data: result, query: msg.data.query } );
              //   } else {
              //   	//if it has been scraped, find its promise in scrape_promises and resolve it.
              //   	var dfd = scrape_promises[ query ][ result.id ];
	            	// dfd.resolve();
              //   }

                //if( !is_cached ( msg.data.query ) && JSON.stringify( result ) !== JSON.stringify( original_result) ){
                if( query === get_query() ){
                	//this is the current query
                    observer.trigger( 'result', result );

                    //Bt.send_message( 'popup', Bt.events.TORRENT_LINK_UPDATED, result );
                    //console.warn('ORIGINAL RESULT?', JSON.stringify( result ) === JSON.stringify( original_result), original_result, result);
                }

				console.warn( 'on_result', payload, result, results, arguments );


                // //once it is scraped, I don't ever want to scrape again.
                // if( !result.scraped && ( result.download.torrent || result.download.magnet ) ) {

                //     Bt.send_message('app', Bt.events.SCRAPE_TORRENT, { data: result, query: msg.data.query } );
                // }


				//torque_observer.trigger('scrape', result);
			};

		//Public Methods
		_.extend( my, {
			init: initialize,
			observer: observer,
			get_results: get_results,
			get_history: get_history,
			search: execute_search
		});

		return my;
	});

})();

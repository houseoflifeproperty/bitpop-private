(function () {

	define([
		'require',
		'underscore',
		'parser',
		'settings',
		'sandbox_helpers',
		'q',
		'sjcl'
	], function ( require ) {

		var Q = require('q'),
			_ = require('underscore'),
			_bt = require('sandbox_helpers'),
			settings = require('settings'),
			parser = require('parser'),
			sjcl = require('sjcl'),
			Ajax = null,
			observer = null, 
            // enable or disable caching of recommendations on surf server
            enable_recommendations_cache = true,
			inited = false;

		var search_object = {};

		var noOp = function() {};

		//Private Methods
		var initialize = function () {
			if ( !inited ) {
				inited = true;
				observer = _sandbox.observer.load('btfc_search');
				parser.init(); 
				settings = settings.init(); 
				Ajax = _sandbox.request;
				console.error('search.btfc module init');
			}
		};

		var get_freebase_request = function( query ) {
			console.warn('BTFC: constructing genre url', query);
			return {
				url: 'https://www.googleapis.com/freebase/v1/search',
				data: {
					query: query,
                    key: 'AIzaSyD2jLu5v1NMWak8iZRfe8AZQNHD_v_Ht14',
					filters: '(' + [
						'any', 
						'type:/music/artist', 
						'type:/music/album',
						'type:/book/book',
						'type:/film/film'
					].join(' ') + ')',
					mql_output: JSON.stringify({
						'name': [],
						'/music/artist/genre': [],
						'/music/album/genre': [],
						'/film/film/genre': [],
						'/book/written_work/subjects': [],
						'type': []
					})
				},
				beforeSend: 'emptyAjaxHeader',
				dataType: 'json',
				timeout: 10000
			};
		};

		var get_freebase_genres = function( response ) {
			console.warn('BTFC: Processing freebase response', response.data);
			var genre_names = [];
			var data = JSON.parse(response.data);
			if ( data.code === '/api/status/ok' && 
					data.result.length > 0 ) {
				for ( var key in data.result[0] ) {
					if ( /genre|subject/.test( key )) {
						genre_names.push.apply( genre_names, 
							data.result[0][key] );
					}
				}
			}
			return genre_names;
		};

		var cache_genres = function( query, genres ) {
			if ( genres.length === 0 || !enable_recommendations_cache) {
				return;
			}
			var hash = sjcl.codec.hex.fromBits( sjcl.hash.sha256.hash( query ));
			genres = genres.map( function( item ) { return 'g=' + item });
			var opts = {
				url: _config.app.btfc_url[ _config.env ] + '/api/cache/' + hash + '?' + genres.join('&'),
				type: 'PUT'
			};
			Ajax.request( opts ).then(noOp, noOp);
		};

		var get_btfc_recommendations = function ( btfc_site, query, dfd, genre_names ) {
			console.warn('BTFC: Fetching recommendations', genre_names);
			if ( genre_names.length == 0 ) {
				dfd.resolve( btfc_site );
				return;
			}
			var site = _bt.clone( btfc_site );
			site.url += '/api/recommend';
			site.hidden_els['g'] = genre_names;
			var search = parser.query({
				query: query,
				site: site
			});
			search.then(
				// success
				function( site ) {
					dfd.resolve( site );
				},
				// failure
				function( site ) {
					dfd.resolve( site );
				}
			);
		};

		var lookup_btfc_by_hash = function( btfc_site, query, dfd ) {
			console.warn('BTFC: Looking up cache', query);
			var hash = sjcl.codec.hex.fromBits( sjcl.hash.sha256.hash( query ));
			var site = _bt.clone( btfc_site );
			site.url += '/api/lookup/' + hash;
			site.cache_lookup_succeeded = true;
			var search = parser.query({
				query: query,
				site: site
			});
			search.then(
				// success
				function( site ) {
					// ugly ugly ugly ugly!!!!
					if ( ! site.cache_lookup_succeeded ) {
						console.warn('BTFC: Lookup failed falling back to Freebase');
						search_for_query( btfc_site, query, dfd );
					}
					else {
						dfd.resolve( site );
					}
				}
			);
		};

		var search_for_query = function ( site, query, dfd ) {
			console.warn('BTFC: Getting genres');
			Ajax.request( get_freebase_request( query )).then(
				// success
				function( response ){
					var genre_names = get_freebase_genres( response );
					cache_genres( query, genre_names );
					console.warn('BTFC: Got genres from freebase', genre_names);
					get_btfc_recommendations( site, query, dfd, genre_names );
				},
				// failure
				function( response ) {
					console.warn('BTFC: Genre request to freebase failed');
					dfd.resolve( response.data );
				}
			);
		};

		var do_search = function( site, query ) {
			var dfd = Q.defer();
			if ( _.isArray( query )) {
				get_btfc_recommendations( site, query[0], dfd, query );
			}
			else {
                if (enable_recommendations_cache) {
                    lookup_btfc_by_hash( site, query, dfd );
                }
                else {
                    search_for_query( site, query, dfd );
                }
			}
			return dfd.promise;
		};

		search_object.init = initialize;
		search_object.search = do_search;

		return search_object;
	});
})();

(function () {

	define([
		'require',
		'underscore',
		'sandbox_helpers'
	], function ( require ) {

		var _bt = require('sandbox_helpers'),
			my = {},
			urls = null, //extension storage set in init
			torque_observer = null, //set in init, listens to torque.app
			search_observer = null, //set in init, listens to torque.app
			inited = false;
			//search_observer = null,


		//Private Methods
		var initialize = function () {
				if ( !inited ) {
					inited = true;

					//listen to torque app
					torque_observer = _sandbox.observer.load('app');
					//listen to search module
					search_observer = _sandbox.observer.load('search');
					//load persistant storage
					urls = _sandbox.storage.load('dl_urls', {
						wait: 200
					});
					//try and debounce the urls' save method
					urls.save = _.debounce( _.bind( urls.save, urls ), 200 );
					//set up listeners
					bind_events();

					console.error('init download urls!')
				}

				return my;
			},

			bind_events = function () {
				torque_observer.on('torrents:ready', clean_urls );
			},

			//when the torrents are ready we need to clean out the persisted torrent urls
			//...methinks.  might not be necessary
			clean_urls = function ( torrents ) {

				var uris = [],
					stored = get();

				//list of torrents that are actually there
				for ( var i=0, len=torrents.length; i<len; i++ ) {
					uris.push( torrents[i].properties.uri );
				}

		        //iterate through links in the persisted uris,
		        //  and remove any that aren't actually in torque right now
		        for ( var key in stored ) {
		            if ( uris.indexOf( key ) < 0 ) {
		                console.error('bad key', key )
		                remove( key );
		            }
		        }

				console.warn('CLEAN_URLS... might not be necessary', torrents.length, uris.length );

			},

	        remove_by_hash = function( hash ){
	            var data = urls.get();

	            hash = hash.toUpperCase();
	            
	            for( var key in data ){
	                console.warn('checking', data[ key ] === hash, data[ key ] == hash, data[key], hash );
	                if( data[ key ] === hash ){
	                    //urls.remove( key ).save();
	                    remove( key );
	                    break;
	                }
	            }

	            console.warn('REMOVE BY HASH', hash, this, urls );

	            // send a message to the extension ( yes, I know we are at the ext level already in this module )
	            // to spoof a last search request from the popup.  this should force the results to recheck 
	            // the downloading state and resend back to the popup
	        	// definitely sub-optimal, but a quick fix before alpha-release
	        	// TODO - make a way to find and update one single result, and send a result update message to the popup
	        	search_observer.trigger('load');
	        	// Bt.send_message( 'ext', Bt.events.LAST_SEARCH, null );
	        },

	        add = function( uri, hash ){
	        	// if ( typeof hash === 'string' )
		        // 	hash = hash.toUpperCase();
	            //urls[ uri ] = hash.toUpperCase();
	            //var entry = urls.get( uri );

	            //if ( !entry || entry !== hash ) {
		            urls.set( uri, hash ).save();
		            console.warn('add download url', hash );
	            //} else {
	            //	console.warn('download url already exists', uri, hash);
	            //}

	        },
	        get = function( key ){
	            return urls.get( key );
	        },

	        clear = function () {
	        	urls.clear();
	        	return;
	        },

	        remove = function ( key ) {
	        	return urls.remove( key ).save();
	        },

	        //pass in a url and see if it is downloading
	        exists = function( url ){
	        	//console.error('exists?', url, urls.get() );
	            return ( url && urls.get( url ) );
	        },

	        hash_exists = function( hash ) {
	        	//console.error('hash_exists', hash);

	            var ret = false,
	            	data = urls.get();

	            // return !!_.invert( data )[ hash ];
	            // return _.contains( _.values( data ), hash );
	            for( var key in data ){
	                if( data[ key ] === hash ){
	                    //console.warn('HASH FOUND', hash);
	                    ret = true;
	                    break;
	                }
	            }

	            //if( ! ret ) console.warn( 'HASH NOT FOUND', hash );
	            return ret;
	        };

		//Public Methods
		_.extend( my, {
			init: initialize,
			remove_by_hash: remove_by_hash,
			add: add,
			get: get,
			clear: clear,
			remove: remove,
			exists: exists,
			hash_exists: hash_exists
		});

		return my;
	});

})();
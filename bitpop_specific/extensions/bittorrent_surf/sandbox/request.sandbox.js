define([
	'require',
	'underscore',
	'helpers/functional',
	'helpers/string',
	'events',
	'q'
], function ( require ) {
	

	var _bt = 					require('helpers/functional'),
		_string = 				require('helpers/string'),
		_ = 					require('underscore'),
		events = 				require('events'),
		Q = 					require('q'),
		Message = 				null, //set on init
		requests = 				{},
		//possible_callbacks = 	[ 'success', 'error', 'complete' ],
		possible_callbacks = 	{
									'success':  'done',
									'error': 	'fail',
									'complete': 'done'
								},
		//regex testers
		rquery =                /\?/,
        r20 =                   /%20/g,
        //public object
		my = 					{};

	//private methods
	var on_request_complete = function ( data ) {
			//this function is temporary
			var req = get( data.id );

			console.error('request complete in request.sandbox' );

			if ( data.response.status === 'success' ) {
				//ok, resolve
				req.dfd.resolve( data.response );
			} else {
				req.dfd.reject( data.response );
			}

		},

		get = function ( id ) {
			return requests[ id ];
		},

		//generate a unique id for a request for sure.
		get_request_id = function () {
			var id = _string.generateGuid();
			return ( requests[ id ] ? get_request_id() : id );
		},

		//converts an object into parameters
		get_params = function ( obj ) {
			var serialized = [];
			for ( var k in obj ) {
				if ( _.isArray( obj[ k ] )) {
					for ( var i=0, l=obj[k].length; i<l; i++) {
						serialized.push( encodeURIComponent( k ) + '=' + encodeURIComponent( obj[ k ][ i ] ) );
					}
				}
				else {
					serialized.push( encodeURIComponent( k ) + '=' + encodeURIComponent( obj[ k ] ) );
				}
			}
			serialized = serialized.join('&').replace( r20, "+" );
			//console.error('get params', serialized);
			return serialized;
		},

		//returns promise for when core module calls back
		make_request = function ( opts ) {
			var dfd = 		Q.defer(),
				id = 		get_request_id();

			if ( opts.data ) {
				opts.data = get_params( opts.data );
				opts.url += ( rquery.test( opts.url ) ? '&' : '?' ) + opts.data;
				delete opts.data;
			}

			//there can be callbacks passed into options to sort of spoof jQuery ajax behavior
			for ( var k in possible_callbacks ) {
				//if they are in there, attach them to the promise.
				//TODO - 'complete' should have a different behavior... called on pass OR fail.
				(function ( key, dfd_fn ) {
					if ( opts[ key ] ) {					
						var fn = opts[ key ];
						dfd.promise[ dfd_fn ]( function () {
							fn.apply( this, arguments );
						});
						delete opts[ key ];
					}
				})( k, possible_callbacks[ k ] );
			}

			//give it a way to abort
			dfd.promise.abort = function () {
				Message.send( events.ABORT_REQUEST, id, 'core' );
			};

			//store the dfd to fire callbacks on complete
			requests[ id ] = {
				dfd: 		dfd
			};

			console.error('sandbox make ajax request', arguments);

			//send it to the core to do the request where it needs to be done
			Message.send( events.MAKE_REQUEST, { opts: opts, id: id }, 'core' );

			return dfd.promise;
		};

	_bt.extend( my, {
		init: function ( message ) {
			Message = message;
			//bind messages
			Message.on( events.REQUEST_COMPLETE, on_request_complete );

			console.error('init sandbox request module', arguments);
		},

		request: make_request
	});

	return my;
});

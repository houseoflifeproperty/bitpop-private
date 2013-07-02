/*jshint white:false, camelcase:false */
define( [
	'require',
	'helpers/functional',
	'events'
], function( require ) {
	

	var functional = require('helpers/functional');
	var events = require('events');

	var router = {},
		options = {},
		listeners = {},
		handlers = {}, //for storing local callbacks to different keys/events
		connected = {
			//gets filled like ...
			//{ worker: reference to the worker to potentially post the message to,
			// 	fn: gets passed worker and message as parameter, and handles the specific way message needs to be passed }
		};

	//private methods
	var listen = function( worker_name, key ){
			if( !listeners[ key ] ) {
				listeners[ key ] = {};
			}
			// console.warn('listening for messages', worker_name, key);
			listeners[ key ][ worker_name ] = true;
		},

		connect_message = function( worker, msg ){
			//console.log('connect_message', worker, connected[ worker ], msg);
			// console.log('connect_message', worker, connected[ worker ], JSON.stringify( msg, null, 4 ) );
			if( connected[ worker ] ){
				var _worker, fn;
				_worker = connected[worker].worker;
				fn = connected[worker].fn;

				if( fn === 'local' ){
					route_local( worker, msg );
				} else {
					fn.apply( this, [ _worker, msg ] );
				}
			// } else {
			// 	if( !Bt.env.is_chrome() )
			// 		console.error('WORKER NOT CONNECTED', worker, JSON.stringify( msg, null, 4 ));
			}
		},

		route = function( msg ){
			// console.log('routing message', msg.target, msg.worker, msg.key, listeners[ msg.key ] );

			//iterate targets
			if( !msg.target ){
				//console.warn('no target for message, defaulting to ext', msg);
				msg.target = 'ext';
			}

			//   there is:    msg.target = string or array of strings, '*' is special
			//                msg.worker = string, name of source worker
			//                msg.key    = string (event name)
			//                msg.data   = JSON.serializable data
			if( msg.target === '*' && listeners[ msg.key ] ) {
				for( var _worker in listeners[ msg.key ] ){
					//console.log('routing message', msg.target, _worker, msg.key, listeners[ msg.key ] );
					connect_message( _worker, msg );
				}
			} else {
				var targets = functional.makeArray( msg.target );

				for ( var i = 0; i < targets.length; i ++ ) {
					var target = targets[i];
					//console.log('target: ', target, listeners[ msg.key ] );
					if ( listeners[ msg.key ] && listeners[ msg.key ][ target ] ) {
						//console.log('routing message', target, msg.worker, msg.key, listeners[ msg.key ] );
						connect_message( target, msg );
					}
				}
			}
		},

		route_local = function( worker, msg ){
			//console.error('ROUTE LOCAL', worker, msg, msg.key, msg.target, handlers[ worker ], handlers[ worker ][ msg.key ], typeof handlers[ worker ][ msg.key ] );
			if( handlers[ worker ] && handlers[ worker ][ msg.key ] && handlers[ worker ][ msg.key ].length ){
                var message_handlers,
                    fn;
				message_handlers = handlers[ worker ][ msg.key ];
				for ( var i = 0; i < message_handlers.length; i++ ) {
					fn = message_handlers[i];
					fn(msg);
				}

			}
		},

		//handles registering of local callbacks for events
		handle = function( worker, key, callback ){
			//make sure callback is function
			if( typeof callback !== 'function' ){
				throw 'message listener for key (' + key + ') callback must be a function';
				return;
			}
			//check if event being listened for in handlers already
			if( !handlers[ worker ] ){
				handlers[ worker ] = {};
			}
			if( !handlers[ worker ][ key ] ){
				handlers[ worker ][ key ] = [];
			}
			//add the callback to the array
			handlers[ worker ][ key ].push( callback );

			//console.warn('registering message handler', worker, key, handlers[ worker ], handlers);
		};


	//PUBLIC METHODS
	functional.extend( router, {
		
		// example init options:
		//{
		// 	workers: {
		// 		'app' : 'local',
		// 		'parser' : function( worker, message ){
		// 			worker.postMessage( message, '*');
		// 		}
		// 	}
		//}
		init: function( opts ){
			router.set_options( opts );

			//subscribe extension core
			router.connect( 'core', null, 'local' );

			//modules register listeners with the extension
			router.on( events.LISTEN, function( msg ){
				// console.log('got listen message', msg);
				listen( msg.worker, msg.data );
			});


			// //define legacy aliases
			// Bt.event_router = {
			// 	on: router.on,
			// 	route: route
			// };

			//Bt.send_message = router.send;
		},

		//allows the observer module to give one to the router 
		//for connect and disconnect and other useful messages
		observer: null,

		set_observer: function ( observer_instance ) {
			router.observer = observer_instance;
		},

		on: function( options, handler ) {
			console.log( 'router on', JSON.stringify( options, null, 4 ) );
			if( typeof options === 'string' ) {
				//add key to set extension is listening for
				listen( 'core', options );
				handle( 'core', options, handler );
			} else if( Array.isArray( options ) ) {
				//its an array of [ { key: 'String', fn: callback_function }, ... ]
				options.forEach( function( el ) {
					listen( 'core', el.key );
					handle( 'core', el.key, el.fn );
				});
			} else if( typeof options === 'object' ) {
				//hooray, its an object keyed by the name of the event
				for( var k in options ){
					(function( key, handler ){
						listen( 'core', key );
						handle( 'core', key, handler );
					})( k, options[ k ] );
				}
			}
		},

		set_options: function( opts ){
			if ( opts ) {
				functional.extend( options, opts );
            }
        },

		//send will replace send_message, so all messages come from the extension
		send: function( target, key, data ){
			var msg = {
				worker: 'core'
			};
			//can pass in arguments as hash
			if( typeof target === 'object' ){
				// key = target.key;
				// data = target.data;
				// target = target.target;
				functional.extend( msg, target );
			} else {
				functional.extend( msg, {
					key: key,
					data: data,
					target: target
				});
			}

			//route it like any other message
			route( msg );
		},

		//pulls out special case functions for how
		//to send message to specific worker
		//also 'pre-registers' a worker
		connect: function( worker_name, worker, messenger ){
			console.error('connect', worker_name);
			
			connected[ worker_name ] = {
				worker: worker,
				fn: messenger
			};
			router.observer && router.observer.trigger( 'connect', worker_name );
		},

		//checks if a certain module/worker has connected
		is_connected: function( name ){
			return !!connected[ name ];
		},

		disconnect: function( worker_name ){
			console.error('disconnect', worker_name );

			if( connected[ worker_name ] ) {
				console.log('disconnecting worker', worker_name );
				delete connected[ worker_name ];
				router.observer && router.observer.trigger( 'disconnect', worker_name );
            }
		},

		route: route
	});

	router.init();
	return router;

});


/*

define( [
	'require',
	'helpers/functional',
	'events'
], function( require ) {
	

	var functional = require('helpers/functional');
	var events = require('events');

	var router = {},
		options = {},
		listeners = {},
		handlers = {}, //for storing local callbacks to different keys/events
		connected = {
			//gets filled like ...
			//{ worker: reference to the worker to potentially post the message to,
			// 	fn: gets passed worker and message as parameter, and handles the specific way message needs to be passed }
		};

	//private methods
	var listen = function( worker_name, key ){
			if( !listeners[ key ] ) {
				listeners[ key ] = {};
			}
			// console.warn('listening for messages', worker_name, key);
			listeners[ key ][ worker_name ] = true;
		},

		connect_message = function( worker, msg ){
			//console.log('connect_message', worker, connected[ worker ], msg);
			//console.log('connect_message', worker, connected[ worker ], JSON.stringify( msg, null, 4 ) );
			if( connected[ worker ] ){
				var _worker, fn;
				_worker = connected[worker].worker;
				fn = connected[worker].fn;

				if( fn === 'local' ){
					route_local( worker, msg );
				} else {
					fn.apply( this, [ _worker, msg] );
				}
			// } else {
			// 	if( !Bt.env.is_chrome() )
			// 		console.error('WORKER NOT CONNECTED', worker, JSON.stringify( msg, null, 4 ));
			}
		},

		route = function( msg ){
			//console.log('routing message', msg.key, listeners[ msg.key ], JSON.stringify( msg, null, 4 ) );

			//iterate targets
			if( !msg.target ){
				//console.warn('no target for message, defaulting to ext', msg);
				msg.target = 'ext';
			}

			//   there is:    msg.target = string or array of strings, '*' is special
			//                msg.worker = string, name of source worker
			//                msg.key    = string (event name)
			//                msg.data   = JSON.serializable data
			if( msg.target === '*' && listeners[ msg.key ] ) {
				for( var _worker in listeners[ msg.key ] ){
					connect_message( _worker, msg );
				}
			} else {
				var targets = functional.makeArray( msg.target );

				for ( var i = 0; i < targets.length; i ++ ) {
					var target = targets[i];
					//console.log('target: ', target, listeners[ msg.key ] );
					if ( listeners[ msg.key ] && listeners[ msg.key ][ target ] ) {
						connect_message( target, msg );
					}
				}
			}
		},

		route_local = function( worker, msg ){
			//console.error('ROUTE LOCAL', worker, msg, msg.key, msg.target, handlers[ worker ], handlers[ worker ][ msg.key ], typeof handlers[ worker ][ msg.key ] );
			if( handlers[ worker ] && handlers[ worker ][ msg.key ] && handlers[ worker ][ msg.key ].length ){
                var message_handlers,
                    fn;
				message_handlers = handlers[ worker ][ msg.key ];
				for ( var i = 0; i < message_handlers.length; i++ ) {
					fn = message_handlers[i];
					fn(msg);
				}

			}
		},

		//handles registering of local callbacks for events
		handle = function( worker, key, callback ){
			//make sure callback is function
			if( typeof callback !== 'function' ){
				throw 'message listener for key (' + key + ') callback must be a function';
				return;
			}
			//check if event being listened for in handlers already
			if( !handlers[ worker ] ){
				handlers[ worker ] = {};
			}
			if( !handlers[ worker ][ key ] ){
				handlers[ worker ][ key ] = [];
			}
			//add the callback to the array
			handlers[ worker ][ key ].push( callback );

			//console.warn('registering message handler', worker, key, handlers[ worker ], handlers);
		};


	//PUBLIC METHODS
	functional.extend( router, {
		
		// example init options:
		//{
		// 	workers: {
		// 		'app' : 'local',
		// 		'parser' : function( worker, message ){
		// 			worker.postMessage( message, '*');
		// 		}
		// 	}
		//}
		init: function( opts ){
			router.set_options( opts );

			//subscribe extension core
			router.connect( 'core', null, 'local' );

			//modules register listeners with the extension
			router.on( events.LISTEN, function( msg ){
				// console.log('got listen message', msg);
				listen( msg.worker, msg.data );
			});


			// //define legacy aliases
			// Bt.event_router = {
			// 	on: router.on,
			// 	route: route
			// };

			//Bt.send_message = router.send;
		},

		on: function( options, handler ) {
			console.log( 'router on', arguments, JSON.stringify( options, null, 4 ) );
			if( typeof options === 'string' ) {
				//add key to set extension is listening for
				listen( 'core', options );
				handle( 'core', options, handler );
			} else if( Array.isArray( options ) ) {
				//its an array of [ { key: 'String', fn: callback_function }, ... ]
				options.forEach( function( el ) {
					listen( 'core', el.key );
					handle( 'core', el.key, el.fn );
				});
			} else if( typeof options === 'object' ) {
				//hooray, its an object keyed by the name of the event
				for( var k in options ){
					(function( key, handler ){
						listen( 'core', key );
						handle( 'core', key, handler );
					})( k, options[ k ] );
				}
			}
		},

		set_options: function( opts ){
			if ( opts ) {
				functional.extend( options, opts );
            }
        },

		//send will replace send_message, so all messages come from the extension
		send: function( target, key, data ){
			var msg = {
				worker: 'core'
			};
			//can pass in arguments as hash
			if( typeof target === 'object' ){
				// key = target.key;
				// data = target.data;
				// target = target.target;
				functional.extend( msg, target );
			} else {
				functional.extend( msg, {
					key: key,
					data: data,
					target: target
				});
			}

			//route it like any other message
			route( msg );
		},

		//pulls out special case functions for how
		//to send message to specific worker
		//also 'pre-registers' a worker
		connect: function( worker_name, worker, messenger ){
			connected[ worker_name ] = {
				worker: worker,
				fn: messenger
			};
		},

		//checks if a certain module/worker has connected
		is_connected: function( name ){
			return !!connected[ name ];
		},

		disconnect: function( worker_name ){
			if( connected[ worker_name ] ) {
				//console.log('disconnecting worker', worker_name );
				delete connected[ worker_name ];
            }
		},

		route: route
	});

	router.init();
	return router;

});

*/
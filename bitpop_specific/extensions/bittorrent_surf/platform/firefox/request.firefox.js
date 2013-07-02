/*jshint white:false, camelcase:false */

//firefox needs it's own version of request because 
//it needs to use a core chrome component for xhr2 standards requests
//this means 'arraybuffer', or whatever it is i use for binary requests

//attempting to use a common request shim.
define( [
	'helpers/functional',
	'events',
	'config',
	'router',
	'helpers/string',
	'helpers/torrent',
	'q'
], function( _bt, events ) {

	

	var Q                 = require('q'),
		_string           = require('helpers/string'),
		_torrent          = require('helpers/torrent'), //has arr2str for binary decoding
		config            = require('config'),
		Router            = require('router'),
		requests          = {},
		request_queue     = [],
		request_timeout   = null,
		request_spacing   = 100,
		my                = {};

	//private methods
	var init = function ( opts ) {
			if ( opts.spacing ) {
				request_spacing = opts.spacing;
			}
			//listen for request requests
			Router.on( events.MAKE_REQUEST, on_make_request );

			console.log('Inited request module', request_spacing, config );
		},

		on_make_request = function ( msg ) {
			//console.warn('ON MAKE REQUEST IN REQUEST.CHROME', msg);

			var _worker =   msg.worker,
				_id =       msg.data.id,
				opts =      msg.data.opts,
				dfd =       new Q.defer();
			//extend ids and stuff into the opts for callbacks
			_bt.extend( opts, {
				worker: _worker,
				id:     _id,
				dfd:    dfd
			});
			//queue it
			queue( function () {
				var req = make_request( opts );
				req.done( function ( response ) {
					console.error('req done!', _worker, response);
					Router.send( _worker, events.REQUEST_COMPLETE, {
						response:     response,
						id:           _id
					});
				});
				req.fail( function ( response ) {
					console.error('req fail!', _worker, response, opts );
					Router.send( _worker, events.REQUEST_COMPLETE, {
						response:     response,
						id:           _id
					}, _worker );
				});
			});
		},

		//for requests made in the core.  exposed publicly down in _bt.extend( my, ...)
		request = function ( opts ) {
			//this dfd is what is returned by make request.
			var dfd = new Q.defer(),
				id  = opts.id || get_request_id();

			_bt.extend( opts, {
				dfd: dfd,
				id:  id
			});

			//queue it
			queue( function () {
				make_request( opts );
			});

			return dfd.promise;
		},

		queue = function ( fn ) {
			request_queue.push( fn );
			process_queue();
		},

		process_queue = function () {
			if ( ! request_timeout ) {
				request_timeout = setTimeout( function () { dequeue(); }, request_spacing );
			}
		},
		
		dequeue = function () {
			clearTimeout( request_timeout );
			request_timeout = null;
			if ( request_queue.length ) {
				var req = request_queue.shift();
				req();
				process_queue();
			}
		},
		get_request_id = function () {
			var id = _string.generateGuid();
			return ( requests[ id ] ? get_request_id() : id );
		},

		//there are three kinds of requests we are interested in:
		//	html, headers, binary.
		//we will define callbacks for each type here.
		on_html_readystate = function ( opts, e ) {
			//this is xhr object
			//console.warn('ON HTML readystate', this.readyState, this.status, JSON.stringify( this, null, 4 ));

			if ( this.readyState === 4 ) {
				var req = get( opts.id );
				//clear the timeout timer
				clearTimeout( req.timer );

				//console.warn('ON HTML readystate', this, arguments, req);
				//console.log( this.status, this.responseText.length );

				if ( this.status === 200 || ( this.status === 0 && this.responseText.length ) ) {
					//request was a success
					//resolve like data, status, textStatus
					//q can only pass back one argument.
					req.dfd.resolve({
						data:         this.responseText,
						status:       'success',
						statusText:   this.statusText,
						statusCode:   this.status
					});
				// } else if ( this.status === 0 ) {
				// 	//aborted request?
				// 	req.dfd.reject({
				// 		data:         'abort',
				// 		status:       'error',
				// 		statusText:   'abort',
				// 		statusCode:   this.status
				// 	});
				} else {
					//request not successful
					req.dfd.reject({
						data:         this.status,
						status:       'error',
						statusText:   this.statusText,
						statusCode:   this.status
					});
				}

				delete requests[ opts.id ];
                cleanup.call( req.xhr );
                req.unload();
			}
		},
		on_header_readystate = function ( opts, e ) {
			//success
			if ( this.readyState === 2 && this.status === 200 ) {
				console.warn('ON HEADER readystate success');

				var req = get( opts.id ),
					data;
				//clear the timeout timer
				clearTimeout( req.timer );

				data = {
					all: this.getAllResponseHeaders(),
					'content-type': this.getResponseHeader('Content-Type'),
					'content-disposition': this.getResponseHeader('Content-Disposition')
				};

				req.dfd.resolve({
					data:          data,
					status:        'success',
					statusText:    this.statusText,
					statusCode:    this.status
				});

				delete requests[ opts.id ];

				this.abort();

                cleanup.call( req.xhr );
                req.unload();
			}
			//at end.  fail.  :(
			if ( this.readyState === 4 && this.status !== 200 ) {
				console.error('ON HEADER readystate FAIL');

				var req = get( opts.id );
				//clear the timeout timer
				clearTimeout( req.timer );

				req.dfd.reject({
					data:          this.status,
					status:        'error',
					statusText:    this.statusText,
					statusCode:    this.status
				});

				delete requests[ opts.id ];

                cleanup.call( req.xhr );
                req.unload();
			}

		},
		//called in scope of xhr instance.
		on_binary_load = function ( opts, e ) {
			if ( this.status === 200 ) {
				//success
				var str = _torrent.arr2str( new Uint8Array( this.response ) ),
					req = get( opts.id );

				//clear the timeout timer
				clearTimeout( req.timer );

				req.dfd.resolve({
					data:          str,  //data is a binary array converted to a string
					status:        'success',
					statusText:    this.statusText,
					statusCode:    this.status
				});
	
				delete requests[ opts.id ];

				//console.warn('ON BINARY LOAD SUCCESS', opts, { str: str });
                cleanup.call( req.xhr );
                req.unload();
			
            } else {
				//fail
				var req = get( opts.id );
				//clear the timeout timer
				clearTimeout( req.timer );
				
				req.dfd.reject({
					data:          null,
					status:        'error',
					statusText:    this.statusText,
					statusCode:    this.status
				});

				delete requests[ opts.id ];

				console.error('ON BINARY LOAD FAIL', opts); //waiting to see this in the wild

                cleanup.call( req.xhr );
                req.unload();
			}
		},
        
		//called in scope of xhr object
		on_binary_error = function ( opts, e ) {
			console.error('ON BINARY ERROR');

			//fail
			var req = get( opts.id );
			//clear the timeout timer
			clearTimeout( req.timer );
			
			req.dfd.reject({
				data:       null,
				status:     'error',
				statusText: this.statusText,
				statusCode: this.status
			});

			delete requests[ opts.id ];

            cleanup.call( req.xhr );
            req.unload();
		},

		on_abort = function ( opts, e ) {
			console.warn('XHR ON ABORT', arguments, this);

			var req = get( opts.id );
			if ( !req ) {
				console.error('NO REQ TO ABORT');
				return;
			}
			//clear the timeout timer
			clearTimeout( req.timer );

			req.dfd.reject({
				data:         null,
				status:       'error',
				statusText:   'abort',
				statusCode:   this.status
			});

			delete requests[ opts.id ];

            cleanup.call( req.xhr );
            req.unload();
		},


        //for firefox memory leakage
        //called in scope of xhr
        cleanup = function () {
            this.onreadystatechange = null;
            this.onload = null;
            this.onerror = null;
        },

		make_request = function ( opts, success, error ) {
			//think the success and error arguments are legacy, so lets try to get those into the opts immediately
			if ( typeof success === 'function' && typeof opts.success !== 'function' ) { opts.success = success; }
			if ( typeof error   === 'function' && typeof opts.error   !== 'function' ) { opts.error   = error;   }

			//alright.  lets get some variables going...
			var dfd =       opts.dfd || new Q.defer(),
				type =      opts.type ? opts.type.toUpperCase() : 'GET',
				dataType =  opts.dataType || 'html',
				id =        opts.id || get_request_id(),
				time =      opts.timeout || 10000,
                //NOTE: must use chrome authority for xhr2 expectations
				xhr =       Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIJSXMLHttpRequest),
                timer;

			//pick the right on_load / on_error callbacks 
			//for the type of request we are making:
			//html, headers, binary

			//success and error functions passed in?
			if ( opts.success ) {
				dfd.promise.done( opts.success );
			}
			if ( opts.error ) {
				dfd.promise.fail( opts.error );
			}

			//open the request
			xhr.open( type, opts.url, true );
			//set abort handler
			xhr.onabort = _bt.bind( on_abort, xhr, opts );

			//set the correct handlers
			if ( dataType === 'binary' ) {
				xhr.responseType = 'arraybuffer';
				xhr.onload = _bt.bind( on_binary_load, xhr, opts );
				xhr.onerror = _bt.bind( on_binary_error, xhr, opts );
			} else if ( dataType === 'head' ) {
				xhr.onreadystatechange = _bt.bind( on_header_readystate, xhr, opts );
                //headers.push( new Header( 'Range', 'bytes=1-2') ); //this kills subsequent requests
                xhr.setRequestHeader( "Range", 'bytes=1-2' );
			} else {
				console.log('sent html request', id, time, dataType );
		
				//html request
				xhr.onreadystatechange = _bt.bind( on_html_readystate, xhr, opts );
                // request header must be set after open, but before send
                xhr.setRequestHeader( "Content-Type", dataType );
			}
			//send the request
			xhr.send( null );

            console.log('making request.  look at config' );

            //deal with firefox memory leakage
            var on_unload = {
                unload: function () {
                    // Make sure to abort the request if the extension is disabled
                    try {
                        xhr.abort();
                    } catch ( e ) {}
                }
            };

			//start the timeout on the request
			timer = timeout( id, time );
			// timer = timeout( id, 10 );
			//keep track of the request
			requests[ id ] = {
				xhr:        xhr,
				dfd:        dfd,
				opts:       opts,
				timer:      timer,
                unload:     on_unload.unload
			};

            Unload.ensure( on_unload );

			return dfd.promise;
		},

		timeout = function ( id, time ) {
			return setTimeout( function () {
				abort( id, 'timeout' );
			}, time );
		},
		//TODO... this needs to actually abort
		abort = function ( id, reason ) {
			var reason = reason || 'abort';
			if ( exists( id ) ) {
				var req = get( id );
				req.xhr.abort();
				//requests[ id ].reject( null, 'error', reason );
				//delete requests[ id ];
			}
		},
		get = function ( id ) {
			return requests[ id ];
		},
		exists = function ( id ) {
			return !!requests[ id ];
		};

	_bt.extend( my, {
		init: init,
		//expose the request function for usage in the core
		request: request
	});

	return my;

});
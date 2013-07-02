define([
	'require',
	'underscore'
], function () {

	var Ajax = null; //set in init
	
	var ConnectionPool = function ( opts ) {
		var that = this;
		this.options = {
			size: 		4
		};
		_.extend( this.options, opts );
		this.in_use = 0;
	};

	ConnectionPool.prototype = {
		//asks if there are any free connections
		take: function(){
			//return false it we have reached limit
			if ( this.in_use < this.options.size ) {
				//console.log('can take', this.in_use, this.options.size);
				this.in_use++;
				return true;
			}
			//console.log('pool full', this.in_use, this.options.size);
			return false;
		},
		release: function(){
			if ( this.in_use > 0 )
				this.in_use--;
			//console.log('release', this.in_use );
		}
	};

	//limits the rate at which requests are executed
	var RequestQueue = function( opts ){
		var that = this;
		this.request_func = ( !opts.func ? Ajax.request : opts.func );
		this.queue = [];
		this.running = false;
		this.timeout = null;
		this.aborted = false;
		this.options = 	_.extend({
							spacing: 100,
							max_concurrent_requests: 4
						}, opts );
		this.requests = {};
		this.pool = new ConnectionPool({
			size: this.options.max_concurrent_requests
		});
	};

	RequestQueue.prototype = {
		//push in options for request
		//and the deferred object to resolve/reject
		push: function( request_opts ){
			var dfd = new $.Deferred();

			console.log('Request Queue push', request_opts );

			if ( !this.aborted ) {
				this.queue.push({
					opts: 	request_opts,
					dfd: 	dfd
				});

				this.start();
			} else {
				dfd.reject( null, 'abort', 'abort' );
			}
			//console.log('request queue PUSH', this);
			return dfd.promise();
		},

		//pulls out next request_options 
		//in queue to perform the request 
		dequeue: function(){
			//console.log('dequeue', this.queue.length );
			clearTimeout( this.timeout );

			if ( this.queue.length ) {
				if ( this.pool.take() ) {
					this.request();
				}
				//set a timeout to run the next one
				this.timeout = setTimeout( this.dequeue.bind( this ), this.options.spacing );
			} else {
				this.running = false;
			}
		},

		//logic to make the request
		request: function () {
			//pull out the first object in queue and make the request
			var current = 	this.queue.shift(),
				opts = 		current.opts,
				dfd = 		current.dfd;

			//console.log('dequeuing to make request', ( this.request_func === Bt.ajax.request ),  opts.url );

			//var req = Bt.ajax.request( opts )
			var req = this.request_func ( opts )

			req.then(
				//done
				_.bind( function ( response ) {
					// console.error('pre request queue request done');
					// console.error('request queue request done', dfd, arguments );
					dfd.resolve.apply( dfd, arguments );
					delete this.requests[ opts.url ];
					this.pool.release(); //release a spot in the pool
				}, this ),
				//fail
				_.bind( function ( response ) {
					console.warn('FAILED REQUEST QUEUE REQUEST', opts.url);
					dfd.reject.apply( dfd, arguments );
					delete this.requests[ opts.url ];
					this.pool.release(); //release a spot in the pool
					//console.error('after FAILED REQUEST QUEUE REQUEST');
				}, this )
			);

			//console.error('request made?', req, req.abort);
			this.requests[ opts.url ] = req;
		},

		//starts the queue
		start: function(){
			if( !this.running ){
				//console.log('START REQUEST QUEUE');
				this.running = true;
				this.dequeue();
			}
		},

		//aborts current request and 
		//flushes the queue
		abort: function(){
			clearTimeout( this.timeout );

			this.aborted = true;

			// _.each( this.requests, function( req, key ){
			// 	req.abort();
			// });

			console.log( 'request queue abort' );

			//'abort' queued requests that have yet to actually be requested
			// for ( var i=0, len=this.queue.length; i<len; i++ ) {
			// 	if( this.queue[i] )
			// 		this.queue[i].dfd.reject( null, 'abort', 'abort' );
			// 	else
			// 		console.error('no queue object at index', i, this.queue[i] );
			// }
			// this.queue = [];

			while ( this.queue.length ) {
				var req = this.queue.pop();
				req.dfd.reject( null, 'error', 'abort' );
			}

			//abort current requests
			setTimeout( _.bind( function(){
				for ( var key in this.requests ) {
					//console.log('aborting current requests', key, this.requests, this.requests[ key ] );
					//this.requests[ key ].reject( null, 'abort', 'abort' );
					var req = this.requests[ key ].abort();
					//req.abort();
				}
			}, this ), 0 );

			this.running = false;
		}
	};


	return {
		init: function () {
			Ajax = _sandbox.request;
			console.log('init request_queue')
		},
		RequestQueue: RequestQueue
	}
});
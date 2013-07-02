/*jshint white:false, camelcase:false */
define([
	'require',
	'underscore',
	'helpers/functional',
	'events',
	'storage',
	'observer',
	'router'
], function ( require ) {
	

	var _bt =       require('helpers/functional'),
		events =    require('events'),
		Router =    require('router'),
		//use observer in the future to cut down on redundant on/off/trigger code
		//require right now to make sure router has an observer available
		//	~observer module inits after router and gives it an observer instance
		observer = 	require('observer'),
		_ = 		require('underscore'),
		storage =   require('storage'),
		instances = {},
		registered= {},
		my =        {};


	//private methods
	var init = function () {
			//bind router messages
			Router.on( events.LOAD_STORAGE_INSTANCE, on_load_instance );
			Router.on( events.STORAGE_INSTANCE_SAVE, on_save_instance );
			Router.on( events.STORAGE_INSTANCE_REMOVE, on_instance_remove );
			Router.on( events.STORAGE_INSTANCE_CLEAR, on_instance_clear );
			Router.observer.on('disconnect', on_router_disconnect );
		},

		//when a worker goes offline, disconnect it from all instances
		//TODO - make this smarter so that it doesn't have to loop through all instances
		on_router_disconnect = function ( disconnected_target ) {
			_.each( instances, function ( instance, key ) {
				instance.unregister( disconnected_target );
			});
		},

		on_load_instance = function ( msg ) {
			var key = msg.data.key,
				instance; //holds the instance

			//now find the instance
			instance = load( key, msg.data.opts, msg.worker );

            console.log('load storage instance in core!', key, msg.worker, instance.loaded );

			//loading data is asynchronous ( in chrome, so we make that structure the same for all browsers.  LCD, yo )
			//get the data that exists right now
            if ( instance.loaded ) {
                console.log('instance is already loaded', key, msg.worker );
                var the_data = instance.get(); //to construct the data to fake a reset even for workers loading already created instance
                //do a get for all data on the instance
                instance.queue.add( 'get', instance.KEY, function ( obj ) {
                    //then extend that data just like in the instance load method
                    if ( obj && obj[ instance.KEY ] ) {
                        _bt.extend( the_data, obj[ instance.KEY ] );
                    }
                    console.log('core ext storage loaded callback, triggering reset', instance.KEY, msg.worker );
        
                    //then fake a reset message to the worker,
                    // XXX - this could cause the reset to be fired twice if instance is created from a worker.  fix that?
                    Router.send( msg.worker, events.STORAGE_INSTANCE_DATA, {
                        key: instance.KEY,
                        data: the_data
                    });
        
                    // //then register the reset listener
                    // instance.on('reset', function( data ){
                    //     Router.send( msg.worker, events.STORAGE_INSTANCE_DATA, {
                    //         key: this.KEY,
                    //         data: data
                    //     });
                    // }, msg.worker );
                });                
            }

			instance.on('reset', function( data ){
				Router.send( msg.worker, events.STORAGE_INSTANCE_DATA, {
					key: this.KEY,
					data: data
				});
			}, msg.worker );

			instance.on('change', function( data ) {
				Router.send( msg.worker, events.STORAGE_INSTANCE_CHANGE, {
					key: this.KEY,
					changes: data
				});
			}, msg.worker );

		},

		//returns an instance if created, or returns creates it and then returns it.
		load = function ( key, opts, worker ) {
			if ( !worker ) { worker = 'core'; }

			var instance;

			//if it exists, ship the data there for the worker.
			if ( get( key ) ) {
				instance = get( key );
			} else {
			//otherwise create it and sync the data to the worker
				instance = create( key, opts );
			}
			//register the worker, and send the associated data
			instance.register( worker );

			return instance;
		},

		on_save_instance = function ( msg ) {
			var key = msg.data.key,
				data = msg.data.data,
				instance = get( key );

			if ( !instance ) {
				throw 'Can\'t Save Unknown Storage Instance: ' + key;
				return;
			}
			instance.save( data );
		},

		on_instance_remove = function ( msg ) {
			//console.error('core instance remove', msg);
			var key = msg.data.key,
				data_key = msg.data.data,
				instance = get( key );

			if ( !instance ) {
				throw 'Can\'t Remove From Unknown Storage Instance: ' + key;
				return;
			}
			instance.remove( data_key );

		},

		on_instance_clear = function ( msg ) {
			var instance = get( msg.data.key );
			
			if ( !instance ) {
				throw 'Can\'t Clear Unknown Storage Instance';
				return;
			}
			instance.clear();
		},

		get = function ( key ) {
			if ( !key ) {
				return instances;
			} else {
				return instances[ key ];
			}
		},

		create = function ( key, opts ) {
			instances[ key ] = new Extension_Storage( key, opts );
			return instances[ key ];
		};

	//instance construction
	var Extension_Storage = function ( key, options ) {

		if ( !options ) { options = {}; }

		this.KEY = key;

        this.loaded = false;

		this.opts = _bt.extend({
			storage:     'local',
			wait:        0,
			defaults:    {}
		}, options );

		if ( this.opts.storage !== 'local' && this.opts.storage !== 'sync' ) {
			console.error('Unknown Storage Type: ' + this.opts.storage + '.  Should be \'local\' or \'sync\'');
			return;
		}

		//assume that atomic operations are async.  
		//so, we need to make sure previous operation 
		//has completed before taking on the next one
		//TODO - put all this function logic in the prototype.
		this.queue = (function( that ){
			var me = {},
				queue = [],
				hold = false;
			
			_bt.extend( me, {
				add: function ( method, arg, callback ) {
					queue.push({
						fn: method,
						arg: arg,
						cb: callback
					});
					me.process();
				},
				process: function () {
					if ( !hold && queue.length ) {
						hold = true;
						var job = queue.shift();
						//console.log( 'processing queue', job.fn, job );
						that.storage[ job.fn ]( job.arg, function(){
							if ( job.cb && typeof job.cb === 'function' )
								job.cb.apply( that, arguments );
	
							hold = false;
							me.process();
						});
					}
				}
			});
			return me;
		})( this );

		//set the low-level storage object
		this.storage = storage[ this.opts.storage ];
		//set default data
		this.set_defaults();

		//throttle save_persistent if necessary
		if ( this.opts.wait ) {
			this.save_persistent = _bt.throttle( _bt.bind( this.save_persistent, this ), this.opts.wait );
	    	console.info('EXT STORAGE INSTANCE IS THROTTLED', this.opts.wait, this.KEY );
		}

		//load it
		this.load();
		//defer loading fo that any reset listeners can be bound
		//_.defer(_.bind(this.load, this));
		// var that = this;
		// setTimeout(function(){
		// 	that.load();
		// }, 0);
		

		console.log('CORE instantialize Extension_Storage', key );
	};

	Extension_Storage.prototype = {
		//load runs at instansialization
		load: 	function () {
			var that = this;
			//load the data 'async' style from storage
			this.queue.add( 'get', this.KEY, function ( obj ) {
                this.loaded = true;

				if ( obj && obj[ that.KEY ] ) {
					_bt.extend( that.data, obj[ that.KEY ] );
				}

				console.log('core ext storage loaded callback, triggering reset', that.KEY );
				
				that.trigger( 'reset', that.data );				
			});
		},

		//sets the default data provided by the options
		set_defaults: function () {
			this.data = _bt.clone( this.opts.defaults );
		},

		//set key to value.  if key is object, set all keys to corresponding values
		set: function ( key, value ) {
			if ( typeof key === 'object' ) {
				for ( var k in key ) {
					this.set( k, key[ k ] );
				}
			} else {
				this.data[ key ] = value;
			}

			return this;
		},
		//get value for key, or get all data.  all is more likely to be used most often
		get: 	function ( key ) {
			return ( key ? this.data[ key ] : this.data );
		},

		//delete a key from the data
		remove: function ( key ) {
			console.log('core st remove', key);
			if ( key ) {
				delete this.data[ key ];
				this.save();
				//this.queue.add( 'remove', key );
				//this.storage.remove( key );
			}
			return this;
		},

		clear: 	function () {
			this.queue.add( 'remove', this.KEY, function () {
				this.set_defaults(); //overrides data with defaults
				//this.storage.remove( this.KEY );

				console.log( 'cleared in core', this.KEY );

				this.save();
			});
			
			return this;
		},

		//saves data to persistent storage,
		//if an object is passed in, it sets that data before sending saving
		save: 	function ( obj ) {
			var data = {};
			if ( obj && typeof obj === 'object' ) {
				this.set( obj );
			}
			data[ this.KEY ] = this.data;
			//persist it
			this.save_persistent( data );
			return this;
		},

		save_persistent: function ( data ) {
			//this.opts.wait
			console.log('SAVE PERSISTENT', this.KEY );
			var that = this,
				new_data = data,
				old_data = {},
				changes;
			//load the data 'async' style from storage
			this.queue.add( 'get', this.KEY, function ( obj ) {
				if ( obj && obj[ that.KEY ] ) {
					old_data = obj[ that.KEY ];
				}
				//got it, now i want to save the new
				that.queue.add( 'set', data );
				//that.storage.set( data );
				//then compare the new and old and send changes
				//console.log('triggering change in core', this.KEY, JSON.stringify( obj ), JSON.stringify( new_data[ that.KEY ] ), JSON.stringify( old_data ) );
				changes = _bt.changes( new_data[ that.KEY ], old_data );
				that.trigger('change', changes);
			});
		},
		
		//registers that a worker wants events and data from this instance
		register: function ( target ) {
			//meta registration
			if ( !registered[ this.KEY ] ) {
				registered[ this.KEY ] = {};
			}
			//register the target, overriding any previous registration
			//and clearing out the callbacks for certain events
			registered[ this.KEY ][ target ] = {}; //object holds event names
			return this;
		},

		//TODO - Delete the actual instance if there are no registered workers left?
		unregister: function ( target ) {
			//console.error('unregister', target);
			delete registered[ this.KEY ][ target ];
			return this;
		},
		on: function ( event, handler, target ) {
			console.log( 'core ext on', event, target, this.KEY );
			if ( !registered[ this.KEY ][ target ] ) {
				throw 'Trying to listen to storage instance event in core for unregistered target: ' + event + ', ' + target;
				return;
			}
			//array for handlers if it doesn't yet exist
			if ( !registered[ this.KEY ][ target ][ event ] )
				registered[ this.KEY ][ target ][ event ] = [];
			//push the handler
			registered[ this.KEY ][ target ][ event ].push( handler );
		},
		off: function ( event, handler, target ) {
			console.error('off doesn\'t yet do anything');
		},
		trigger: function ( event, data ) {
			var targets = registered[ this.KEY ];

			console.log('core ext storage trigger', this.KEY, event, targets, registered);

			for ( var key in targets ) {
				if ( !targets[ key ][ event ] ) continue;
				var handlers = targets[ key ][ event ];
				for ( var i=0, len=handlers.length; i<len; i++ ) {
					handlers[ i ].call( this, data );
				}
			}
		}

	};

	//run it
	init();

	//public methods
	_bt.extend( my, {
		load: load,

		get: get
	});

	return my;
});

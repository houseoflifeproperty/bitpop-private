define([
	'require',
	'helpers/functional',
	'sandbox_helpers',
	'events'
], function ( require ) {
	

	var _bt = 				require('helpers/functional'),
		events = 			require('events'),
		sandbox_helpers = 	require('sandbox_helpers'),
		Message = 			null, //set on init
		instances = 		{},
		my = 				{};

	_bt.extend( _bt, sandbox_helpers );
	sandbox_helpers = null;

	var Extension_Storage = function ( key, options ) {
		console.info('NEW EXTENSION STORAGE SANDBOX INSTANCE', key );

		this.opts = _bt.extend({
			storage: 'local',
			defaults: {}
		}, options);
		//KEY is also kind of the ID, as well as the key that this data is persisted under.
		this.KEY = key;

		this.data = {};

		//hold registered 'event' listeners
		this.events = {};
		//register the 'reset' handler
		this.on('reset', this.on_reset );
		this.on('change', this.on_core_change );
		Message.send( events.LOAD_STORAGE_INSTANCE, { key: this.KEY, opts: this.opts }, 'core' );
	};
	
	Extension_Storage.prototype = {
		on_reset: function ( data ) {
			//console.log('ON_RESET', document.title.toLowerCase(), typeof data);
			this.data = {};
			this.set( data );
		},
		//keeps instance up to date with core.
		on_core_change: function ( changes ) {
			console.warn( 'on change from core', document.title.toLowerCase(), this.KEY );

			// changes.new_values, changes.old_values
			//set new values
			var key, val;
			for ( key in changes.new_values ) {
				val = changes.new_values[ key ]
				this.set( key, val );
				//console.log( document.title.toLowerCase(), this.KEY, 'change:'+key )
				this.trigger( 'change:'+key, val );
			}
			//remove an old values that have been deleted and trigger remove event
			for ( key in changes.old_values ) {
				//figure out if this key has been deleted
				if ( changes.new_values[ key ] ) continue;
				//it has, so remove it silently from instance data
				//but save the old value first
				this.remove( key, true ); //true denotes silent
				//trigger remove event and pass in key as value
				this.trigger( 'remove', key );
				//trigger individual remove event and pass in current data
				//this.trigger( 'remove:'+key, this.get() );
			}
		},

		//set key to value.  if key is object, set all keys to corresponding values
		set: function ( key, value ) {
			//console.log( 'set?', typeof key, typeof value );
			
			try {
				if ( typeof key === 'object' ) {
					for ( var k in key ) {
						this.set( k, key[ k ] );
					}
				} else {
					this.data[ key ] = value;
				}
				return this;
			} catch ( err ) {
				console.error( 'catch err set?', typeof key, key, typeof value, value, typeof this, typeof this.data );
				//throw err;
			}
		},

		get: function ( key ) {
			return ( key ? this.data[ key ] : this.data );
		},

		//removes from local sandbox memory and send Message to core to remove it from memory there.
		//NON-SILENT REMOVE IS ATOMIC.  the Message sent to the core REMOVES the key from the persistent storage.
		remove: function ( key, silent ) {
			if ( key ) {
				delete this.data[ key ];
				if ( !silent )
					Message.send( events.STORAGE_INSTANCE_REMOVE, { key: this.KEY, data: key }, 'core' );
			}
			return this;
		},

		clear: 	function () {
			Message.send( events.STORAGE_INSTANCE_CLEAR, { key: this.KEY }, 'core' );
			this.trigger('reset', _bt.clone( this.opts.defaults ) );
		},

		//saves data to persistent storage,
		//if an object is passed in, it sets that data before sending save event
		save: 	function ( obj ) {
			if ( obj && typeof obj === 'object' ) {
				this.set( obj );
			}
			//send data to core 
			Message.send( events.STORAGE_INSTANCE_SAVE, { key: this.KEY, data: this.data }, 'core' );
			return this;
		},

		save_persistent: function () {},
		//register a callback for an event triggered by this.trigger
		on: function ( event, handler ) {
			if ( typeof handler !== 'function' ) {
				throw 'Handler must be a function';
				return;
			}
			//register this event if need be
			if ( !this.events[ event ] ) this.events[ event ] = [];
			//add the callback to the handlers array
			this.events[ event ].push( handler );
			return this;
		},
		//unregister callback
		off: function ( event, handler ) {
			if ( !handler ) {
				delete this.events[ event ];
			} else {
				//find the handler and remove it from the array
				for ( var i=0, len=this.events[ event ].length; i<len; i++ ) {
					var el = this.events[ event ][ i ];
					if ( el === handler ) {
						this.events[ event ].splice( i, 1 );
						break;
					}
				}
			}
			return this;
		},
		trigger: function ( event, data ) {
			//console.warn('TRIGGER ext_storage instance: ', document.title.toLowerCase(), arguments );
			
			//get the handlers for this event
			var handlers = this.events[ event ];
			if ( handlers && handlers.length ) {
				for ( var i=0, len=handlers.length; i<len; i++ ) {
					//console.warn('Triggering sandbox ext_storage:', document.title.toLowerCase(), event, data );
					handlers[ i ].call( this, data );
				}
			}
			return this;
		}
	};

	//private methods
	var on_data_received = function ( data ) {
		//data argument is the data portion of the Message
		// here it carries .key ( instance ) and .data ( payload )
		var instance = my.get( data.key );
		if ( !instance ) {
			throw "Recieved data for unknown storage instance: " + data.key;
			return;
		}
		instance.trigger( 'reset', data.data );
		//console.error('sandbox on_data_received', arguments);
	};

	var on_data_changed = function ( data ) {
		//data argument is the data portion of the Message
		// here it carries .key ( instance ) and .changes ( data changed? )
		var instance = my.get( data.key );
		if ( !instance ) {
			throw "Recieved changes for unknown storage instance: " + data.key;
			return;
		}
		instance.trigger( 'change', data.changes );
		//console.error( 'instance data changed', arguments );
	};

	_bt.extend( my, {
		init: function ( message ) {
			Message = message;
			//console.log( 'sandbox ext_storage initialize', document.title.toLowerCase(), Message );

			//bind Messages
			Message.on( events.STORAGE_INSTANCE_DATA, on_data_received );
			Message.on( events.STORAGE_INSTANCE_CHANGE, on_data_changed );

		},

		//not to be confused with {instance}.prototype.get.
		//this get method returns instantiated Extension_Storage's
		get: function ( key ) {
			if ( !key ) {
				return instances;
			} else {
				return instances[ key ];
			}
		},

		load: function ( key, opts ) {
			if ( my.get( key ) ) {
				//console.log( "Storage Instance already loaded: " + key );
				return my.get( key );
			} else {
				instances[ key ] = new Extension_Storage( key, opts );
				return instances[ key ];
			}
		}
	});

	return my;
});

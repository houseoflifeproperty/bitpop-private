//_sandbox.observer.load('search');

(function(){

	define([
		'require',
		'backbone',
		'sandbox_helpers',
		'torrent.model'
	], function (require) {
		//required components
		var Torrent = require('torrent.model'),
			_bt = require('sandbox_helpers');

		var Torrents = Backbone.Collection.extend({

			model: Torrent,

			_ready: false,

			observer: null, //set in init

			initialize: function( opts ){
				this.app = opts.app;
				//console.log('init torrents collection', this, opts);
				//set up the observer
				this.observer = _sandbox.observer.load('app');

				this.throttled_request_torrents = _.throttle( _.bind( this.request_torrents, this ), 1000 );

				this.bind_events();
				this.bind_messages();
				this.request_torrents();

			},

			bind_events: function(){
				this.observer.on('torrents:ready', _.bind( this.on_torrents_ready, this ) );
				this.observer.on('torrent:properties', _.bind( this.on_torrent_properties_update, this ) );
				this.observer.on('torrent:added', _.bind( this.on_torrent_added, this ) );
				this.observer.on('torrent:removed', _.bind( this.on_torrent_removed, this ) );
				//this.observer.on('torrent:completed', _.bind( this.on_torrent_completed, this ) );
			},

			bind_messages: function(){

				// Bt.msg.on( Bt.events.TORRENTS_GOT, _.bind( this.on_torrents_got, this ) );
				// Bt.msg.on( Bt.events.UPDATE_TORRENT, _.bind( this.on_torrent_update, this) );
				// Bt.msg.on( Bt.events.UPDATE_TORRENT_PROPERTIES, _.bind( this.on_torrent_properties_update, this ) );
				// Bt.msg.on( Bt.events.TORRENT_ADDED, _.bind( this.on_torrent_added, this) );
				// Bt.msg.on( Bt.events.TORRENT_REMOVED, _.bind( this.on_torrent_removed, this) );
			},

			request_torrents: function(){
				console.log('requesting torrents');
				this.observer.trigger('torrents:load');
			},

			on_torrents_ready: function ( data ) {
				console.error('TORRENTS READY IN COLLECTION', arguments );
				this._ready = true;
				//this.request_torrents();
				this.reset( data );
			},

			on_torrent_properties_update: function( torrent_id, changes ){
				//console.log('on_torrent_properties_update', torrent_id, JSON.stringify( changes, null, 4));

				var torrent = this.get( torrent_id );

				if( torrent ) {
					//torrent.set( 'properties', _.extend( torrent.get('properties'), data.changes ) ).trigger('change');
					_.extend( torrent.get('properties'), changes )
					torrent.trigger('change');
					//console.log('set new properties?', torrent);
				} else {
					console.error('NO TORRENT TO SET PROPERTIES DATA FOR', torrent_id );
					//this.throttled_request_torrents();
				}
			},

			on_torrent_added: function ( data ) {
				if ( ! this._ready )
					return;
				//console.error('message torrent added', data);
				//this.remove( data.properties.uri );

				this.add( data, { silent: true } );

				this.trigger('reset');
			},

			//data is the id of the torrent
			on_torrent_removed: function( data ){
				var torrent = this.get( data.id )

				if ( torrent ) {
					this.remove( torrent );
					console.error('ON TORRENT REMOVED', data, torrent);
				} else {
					console.error('no torrent to remove!', JSON.stringify( data, null, 4 ) );
				}
			},

			// //triggered when completed
			// on_torrent_completed: function ( ) {

			// },

			add_by_url: function( url, name ){
				//real view gets created on add
				this.observer.trigger('torrent:add_url', url, name );
				//Bt.msg.send( Bt.events.ADD_TORRENT, { url: url, name: name }, 'ext' );
			},

			open_containing: function( model ){
				if( !model ){
					model = this.first();
				}

				if( model ){
					//console.warn('open containing in torrents.collection', model, model.id );
					console.warn('open containing in torrents.collection', model.id );
					this.observer.trigger('torrent:open', model.id );
				}
			},

			//auto sorts the torrents as they come in
			comparator: function( a, b ){
				//console.log('comparator', typeof a, typeof b);
				var a_props = a.get('properties'),
					b_props = b.get('properties')

				//console.error('comparing', a, b, a_props.queue_order, b_props.queue_order );

				//set the completed_on on the root of the model's attributes
				a.set('completed_on', a_props.completed_on);
				b.set('completed_on', b_props.completed_on);

				if( a_props.queue_order !== b_props.queue_order ) {
					//console.error('returning based on queue_order',b_props.queue_order, a_props.queue_order )
					
					if( a_props.queue_order < 0 )
						return -1
					if( b_props.queue_order < 0 )
						return 1

					return b_props.queue_order - a_props.queue_order;

				//} else if( a_props.queue_order < 0 && b_props.queue_order < 0 ){
				} else {
					//completed at bottom
					var a_name = a_props.name.toLowerCase(),
						b_name = b_props.name.toLowerCase();

					if ( a_name < b_name )
						return 1;
					if ( a_name > b_name )
						return -1;
					return 0;
				}

			}
		});

		return Torrents;
	});

})();
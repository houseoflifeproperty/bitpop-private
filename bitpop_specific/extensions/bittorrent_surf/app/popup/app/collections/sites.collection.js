(function(){

	define([
		'require',
		'backbone',
		'site.model'
	], function (require) {
		//required components
		var Site = require('site.model');

		//app constructor
		var Sites = Backbone.Collection.extend({
			
			model: Site,

			observer: null, //set in init when global _sandbox is ready

			default_engines: [], //set on reset

			default_engine: null,

			detected: [], //stores detected sites for sites dialog

			initialize: function ( data, opts ) {
				this.app = opts.app;
				this.observer = _sandbox.observer.load('sites');

				this.bind_events();

				this.observer.trigger('load');

				console.error('init sites collection', this, this.app, opts);
				//Bt.msg.send( Bt.events.GET_SITES, {});
			},

			bind_events: function(){
				this.observer.on('reset', _.bind( this.on_sites_received, this ) );
			},

			enable: function ( id ) {
				this.observer.trigger('enable', { key: id });
			},

			disable: function ( id ) {
				console.error('disable site in sites collection', id);
				this.observer.trigger('disable', { key: id });

				// if( msg.data.track )
				// 	_bt.track( 'sites', 'remove', msg.data.data, null );
			},

			//get a big payload and consume it here
			on_sites_received: function( data ){
				console.error('SITES RECEIVED', data);

				//set the default keys
				this.default_engines = _.keys( data.defaults );
				//deal with default engine separately
				//set it to null so that it stays that way if no default engine is selected
				this.default_engine = null;
				//same way with detected sites
				this.detected = [];

				var sites = [],
					_this = this;

				_.each( data, function( val, type ){
					//store off detected sites
					//type is added or declined or detected, val is object of sites
					if ( _.contains( ['defaults', 'skipped'], type ) ) { return true; } //continue the loop
					//push the site into the collection
					_.each( val, function( v, k ){
						//deal with default engines separately
						if ( _.contains( _this.default_engines, k ) ) { 
							_this.default_engine = _.extend( v.data, { id: k, type: type });
							return true;
						}
						//push the site normally to the correct bin
						//sites for added and declined, detected for detected
						var bin = ( type === 'detected' ? _this.detected : sites );
						bin.push( _.extend( v.data, { id: k, type: type }) );
					});
				});

				console.log('on_sites_recieved', data, sites, this.default_engine );

				this.reset( sites );
			},

			comparator: function (site) {
				return site.get('id')
			}
		});

		return Sites;
	});

})();
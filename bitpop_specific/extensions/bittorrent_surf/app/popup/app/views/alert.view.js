(function(){

	define([
		'require',
		'backbone',
		'handlebars',
		'sandbox_helpers',
		'config'
	], function (require) {
		//required components
		var _bt = require('sandbox_helpers'),
			config = require('config');

		//app constructor
		var View = Backbone.View.extend({
			
			el: null,

			model: null,

			timeout: null,
			delay: 3000, //ms till fadeout
			transition: 100, //ms for transition time 

			types: [], //used to listen for certain notification types

			events: {
				'click .alert': 'on_action_click'
			},

			initialize: function ( opts ) {
				// this.dialogs = opts.parent.parent;
				this.app = opts.app;
				this.types = opts.types || this.types;
				this.collection = this.app.collections.notifications;

				this.bind_events();

				//this.render();


				console.log('initialize alert view');
			},

			bind_events: function () {
				this.collection.on('auto_open', this.on_auto_open, this );
				this.app.on('dialog:close', this.on_dialog_close, this);
			},

			on_dialog_close: function(){
				//this.hide();
				this.on_auto_open();
			},

			on_action_click: function ( e ) {
				console.error('clicked alert!', e);

				//interaction statistics
				if ( this.model ) {
					_bt.track( 'alert', 'click', this.model.get('type'), null );
				}

				//call the action that clicking on the notification for this alert would call
				var notifications_view = this.app.views.dialogs.get('notifications');
				notifications_view.on_action_click.call( notifications_view, e, true );
			},

			//force model param is used to force an alert to show instead of waitin for message from collection
			on_auto_open: function ( force_model ) {
				var model = force_model || this.collection.newest;

				if( !model || model.get('alert_seen') || !_.contains( this.types, model.get('type') ) ){
					return;
				}

				var type = type = model.get('type');

				//then, set model as instance var
				this.model = model.clone();

				if ( type === config.app.notifications.DOWNLOAD_STARTED || type === config.app.notifications.DOWNLOAD_COMPLETE ) {
		        	//auto focus started and completed downloads
		        	//var fn_str = this.app.views.notifications.get_method( type );
		        	console.error('auto open', this.collection, model, model.id, model.get('data') );

		        	_.delay( _.bind( function(){

			        	if( type === config.app.notifications.DOWNLOAD_COMPLETE ) {
			        		this.app.collections.torrents.sort();
			        	}

			        	this.app.collections.torrents.trigger('focus', model.get('data'), true );
		        		//this.app.views.torrents.focus_torrents( model.get('data') );

					}, this ), 0 );
       			}

				console.error('alert view on auto open', this.collection.toJSON(), this.collection.newest, this.collection.highest_priority );
			
				//then render
				this.render();
			},

			fade: function(){
				var _this = this;

				this.$el.find('.alert').stop(true, true).fadeOut( this.transition );
				//this.$el.stop(false, false).fadeOut( this.transition );
				
				this.set_seen();
				_.defer( function(){ this.model = null; });
			},

			hide: function( silent ){
				var _this = this;
				clearTimeout( this.timeout );
				this.$el.find('.alert').stop( true, true ).hide();

				if( !silent )
					this.set_seen();
			
				_.defer( function(){ this.model = null; });
			},

			//sets an alert as seen so that it doesn't show again
			set_seen: function(){
				//console.error('SET SEEN', this.model);
				if( this.model ){
					//this.model is a clone of the notification, so get the actual notification
					var notification = this.collection.get( this.model.id );

					if( notification )
						notification.alert_seen();
				}
			},

			render: function () {
				console.error('render alert view', this.model );

				if( this.app.views.dialogs.current ) {
					console.error('alert view bailing out cause a dialog is set');
					return this.hide( true );
				}

				//console.error( 'render alert', this.model );

				if( this.model && !this.model.get('alert_seen') ){
					var _this = this;
					var html = Handlebars.templates.alert( this.model.toJSON() );
					this.$el.html( html );

					clearTimeout( this.timeout );
					this.timeout = setTimeout( _.bind( this.fade, this ), this.delay );

				} else {
					//this.$el.hide();
					console.error('ALERT ALREADY SEEN?', this.model.get('alert_seen') );
					this.hide();
				}

			}

		});

    	//HANDLEBARS HELPERS
	    _.each({
	        alert_icon: function(notification){
	            console.log('icon helper', this, notification);

	            var img = ( this.img ? '<img src="'+ this.img +'" />' : '' ),
	            	grouped = ( this.data && this.data.length && this.data.length > 1 ? ' grouped' : '');

	            return new Handlebars.SafeString( '<span class="icon icon24 '+ this.type + grouped + '"><span class="line"></span>'+ img +'</span>' );
	        },
	        alert_text: function(notification){
	            var block = '<span class="text">' +
	                            _bt.capitalize( this.name ) + ' ' + this.action.toLowerCase() + ': ' + Handlebars.helpers.alert_title.apply( this, arguments ) +
	                        '</span>';

	            return new Handlebars.SafeString( block );
	        },
	        alert_data: function ( notification ) {
	        	var title = _bt.getNotificationTip( this.data );
	        	//var data = ' data-id="'+this.id+'" data-type="'+ this.type +'" data-resolved="'+ this.resolved +'" data-data="'+ JSON.stringify( this.data ) +'" data-tip="'+ title +'"';
	        	var data = ' data-id="'+this.id+'" data-type="'+ this.type +'" data-resolved="'+ this.resolved +'" data-data="'+ JSON.stringify( this.data ) +'"';
	        	return new Handlebars.SafeString( data );
	        },

	        alert_title: function(notification){
	        	return new Handlebars.SafeString( _bt.getNotificationTip( this.data ) );
	        }
	    }, function ( fn, name ) {
	    	//register the helper for use in handlebars templates
	    	Handlebars.registerHelper( name, fn );
	    });

		return View;
	});

})();